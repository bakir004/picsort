import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderIcon, MoveIcon, CheckIcon, XIcon, Folder, ChevronRightIcon } from 'lucide-react';

interface FolderStructure {
  name: string;
  path: string;
  subfolders: FolderStructure[];
}

interface PendingMove {
  imagePath: string;
  targetFolder: string;
  imageName: string;
}

interface PendingMovesMap {
  [imagePath: string]: PendingMove;
}

interface FolderManagerProps {
  onFolderSelect: (folderPath: string) => void;
  selectedImagePath?: string;
  imageFiles: Array<{ path: string; name: string; size: number; created: string; data?: string }>;
  onImageSelect?: (index: number) => void;
}

export default function FolderManager({ onFolderSelect, selectedImagePath, imageFiles, onImageSelect }: FolderManagerProps) {
  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [folderStructure, setFolderStructure] = useState<FolderStructure | null>(null);
  const [pendingMoves, setPendingMoves] = useState<PendingMovesMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [keyBuffer, setKeyBuffer] = useState<string>('');
  const [keyBufferTimeout, setKeyBufferTimeout] = useState<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showError, setShowError] = useState<boolean>(false);
  const [pingedFolder, setPingedFolder] = useState<string>('');
  const [showCopyResult, setShowCopyResult] = useState<boolean>(false);
  const [copyResult, setCopyResult] = useState<{ success: boolean; message: string; details?: string; failedFiles?: string[] } | null>(null);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState<boolean>(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState<boolean>(false);

  // Load auto-advance preference and listen for changes
  useEffect(() => {
    const loadAutoAdvance = () => {
      const saved = localStorage.getItem('autoAdvance');
      if (saved !== null) {
        setAutoAdvance(JSON.parse(saved));
      }
    };

    // Load initial value
    loadAutoAdvance();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'autoAdvance') {
        loadAutoAdvance();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for changes (in case localStorage event doesn't fire)
    const interval = setInterval(loadAutoAdvance, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleFolderUpload = async () => {
    try {
      // Use the existing Tauri dialog plugin
      const selected = await open({
        multiple: false,
        directory: true,
      });
      
      if (selected) {
        const folderPath = Array.isArray(selected) ? selected[0] : selected;
        setRootFolder(folderPath);
        
        // Get full folder structure recursively
        const structure = await buildFolderStructure(folderPath);
        setFolderStructure(structure);
        setCurrentPath([]);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const buildFolderStructure = async (path: string): Promise<FolderStructure> => {
    const name = path.split('/').pop() || path;
    const subfolders = await invoke('list_subfolders', { path }) as string[];
    
    const subfolderStructures: FolderStructure[] = [];
    for (const subfolder of subfolders) {
      const subfolderPath = `${path}/${subfolder}`;
      const subfolderStructure = await buildFolderStructure(subfolderPath);
      subfolderStructures.push(subfolderStructure);
    }
    
    return {
      name,
      path,
      subfolders: subfolderStructures
    };
  };

  const getCurrentFolder = (structure: FolderStructure, path: number[]): FolderStructure => {
    let current = structure;
    for (const index of path) {
      if (index >= 0 && index < current.subfolders.length) {
        current = current.subfolders[index];
      }
    }
    return current;
  };

  const getFullPath = (structure: FolderStructure, path: number[]): string => {
    let current = structure;
    for (const index of path) {
      if (index >= 0 && index < current.subfolders.length) {
        current = current.subfolders[index];
      }
    }
    return current.path;
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (!folderStructure || !selectedImagePath) return;

    const key = event.key;
    
    // Handle number keys for navigation
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      
      // Add to key buffer
      const newBuffer = keyBuffer + key;
      setKeyBuffer(newBuffer);
      
      // Validate the new sequence immediately
      validateKeySequence(newBuffer);
      
      // Clear existing timeout
      if (keyBufferTimeout) {
        clearTimeout(keyBufferTimeout);
      }
      
      // Check if we've reached a leaf folder (no subfolders) or sequence ends with 0
      if (isValidSequence(newBuffer) && (isLeafFolder(newBuffer) || newBuffer.endsWith('0'))) {
        // Process immediately for leaf folders or sequences ending with 0
        processKeySequence(newBuffer);
        setKeyBuffer('');
        
        // Ping the selected folder visually
        const targetFolder = getTargetFolder(newBuffer);
        if (targetFolder) {
          setPingedFolder(targetFolder.path);
          // Clear ping after 500ms
          setTimeout(() => setPingedFolder(''), 500);
        }
      } else {
        // Set timeout for folders with subfolders (potential ambiguity)
        const timeout = setTimeout(() => {
          if (isValidSequence(newBuffer)) {
            processKeySequence(newBuffer);
          }
          setKeyBuffer('');
        }, 1000); // 1 second timeout
        
        setKeyBufferTimeout(timeout);
      }
    }
    
    // Handle Enter to process immediately
    if (key === 'Enter' && keyBuffer) {
      event.preventDefault();
      if (isValidSequence(keyBuffer)) {
        processKeySequence(keyBuffer);
      }
      setKeyBuffer('');
      if (keyBufferTimeout) {
        clearTimeout(keyBufferTimeout);
      }
    }
  };

  const isValidSequence = (sequence: string): boolean => {
    if (!folderStructure) return false;

    const digits = sequence.split('').map(d => parseInt(d));
    let targetFolder = folderStructure;
    
    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i];
      
      if (digit === 0) {
        // If 0 is at the end, it's valid
        if (i === digits.length - 1) {
          return true;
        } else {
          // If 0 is in the middle, it's invalid
          return false;
        }
      } else if (digit > 0 && digit <= targetFolder.subfolders.length) {
        // Navigate to subfolder
        targetFolder = targetFolder.subfolders[digit - 1];
      } else {
        return false;
      }
    }
    
    return true;
  };

  const isLeafFolder = (sequence: string): boolean => {
    if (!folderStructure) return false;

    const digits = sequence.split('').map(d => parseInt(d));
    let targetFolder = folderStructure;
    
    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i];
      
      if (digit === 0) {
        // Root folder - check if it has subfolders
        return targetFolder.subfolders.length === 0;
      } else if (digit > 0 && digit <= targetFolder.subfolders.length) {
        // Navigate to subfolder
        targetFolder = targetFolder.subfolders[digit - 1];
      } else {
        return false;
      }
    }
    
    // Check if the final folder has no subfolders
    return targetFolder.subfolders.length === 0;
  };

  const getTargetFolder = (sequence: string): FolderStructure | null => {
    if (!folderStructure) return null;

    const digits = sequence.split('').map(d => parseInt(d));
    let targetFolder = folderStructure;
    
    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i];
      
      if (digit === 0) {
        // Root folder
        return targetFolder;
      } else if (digit > 0 && digit <= targetFolder.subfolders.length) {
        // Navigate to subfolder
        targetFolder = targetFolder.subfolders[digit - 1];
      } else {
        return null;
      }
    }
    
    return targetFolder;
  };

  const validateKeySequence = (sequence: string) => {
    if (!folderStructure) return;

    const digits = sequence.split('').map(d => parseInt(d));
    let targetFolder = folderStructure;
    
    // Check if this is a valid path
    let isValidPath = true;
    
    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i];
      
      if (digit === 0) {
        // If 0 is at the end, stay in current folder
        if (i === digits.length - 1) {
          // This is the final destination
          break;
        } else {
          // If 0 is in the middle, it's invalid
          isValidPath = false;
          break;
        }
      } else if (digit > 0 && digit <= targetFolder.subfolders.length) {
        // Navigate to subfolder
        targetFolder = targetFolder.subfolders[digit - 1];
      } else {
        isValidPath = false;
        break;
      }
    }
    
    if (!isValidPath) {
      // Show error for invalid sequence
      const maxFolders = targetFolder.subfolders.length;
      const errorMsg = maxFolders === 0 
        ? `Invalid sequence "${sequence}". No subfolders available.`
        : `Invalid sequence "${sequence}". Use 1-${maxFolders} for subfolders or 0 for root.`;
      
      setErrorMessage(errorMsg);
      setShowError(true);
      
      // Auto-hide error after 3 seconds
      setTimeout(() => {
        setShowError(false);
        setErrorMessage('');
      }, 3000);
    } else {
      // Clear any existing error
      setShowError(false);
      setErrorMessage('');
    }
  };

  const processKeySequence = (sequence: string) => {
    if (!folderStructure || !selectedImagePath) return;

    const digits = sequence.split('').map(d => parseInt(d));
    let targetFolder = folderStructure;
    
    // Check if this is a valid path
    let isValidPath = true;
    
    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i];
      
      if (digit === 0) {
        // If 0 is at the end, stay in current folder
        if (i === digits.length - 1) {
          // This is the final destination
          break;
        } else {
          // If 0 is in the middle, it's invalid
          isValidPath = false;
          break;
        }
      } else if (digit > 0 && digit <= targetFolder.subfolders.length) {
        // Navigate to subfolder
        targetFolder = targetFolder.subfolders[digit - 1];
      } else {
        isValidPath = false;
        break;
      }
    }
    
    if (isValidPath) {
      const selectedImage = imageFiles.find(img => img.path === selectedImagePath);
      
      if (selectedImage) {
        // Add or update move in hashmap
        setPendingMoves(prev => ({
          ...prev,
          [selectedImagePath]: {
            imagePath: selectedImagePath,
            targetFolder: targetFolder.path,
            imageName: selectedImage.name
          }
        }));

        // Show feedback
        console.log(`Image "${selectedImage.name}" will be copied to "${targetFolder.path}"`);
        
        // Auto-advance to next image if enabled
        if (autoAdvance && selectedImagePath && onImageSelect) {
          const currentIndex = imageFiles.findIndex(img => img.path === selectedImagePath);
          if (currentIndex !== -1 && currentIndex < imageFiles.length - 1) {
            // Advance to the next image
            onImageSelect(currentIndex + 1);
          }
        }
      }
    }
  };

  const navigateToPath = (path: number[]) => {
    setCurrentPath(path);
  };

  const renderFolderTree = (folder: FolderStructure, depth: number = 0, path: number[] = []) => {
    const indent = depth * 12; // 12px per level
    
    // Generate sequence for current folder
    const currentSequence = path.length > 0 ? path.map(p => p + 1).join('') : '0';
    
    // Check if this folder matches the current key buffer
    const isHighlighted = keyBuffer && currentSequence.startsWith(keyBuffer);
    const isExactMatch = keyBuffer === currentSequence;
    const isPinged = pingedFolder === folder.path;
    
    // Check if this is the target folder when sequence ends with 0
    const isTargetWithZero = keyBuffer && keyBuffer.endsWith('0') && currentSequence === keyBuffer.slice(0, -1);
    
    return (
      <div key={folder.path} className="space-y-1">
        {/* Current folder */}
        <div 
          className={`flex items-center justify-between px-1 py-0.5 rounded-md text-sm transition-all duration-300 ${
            isPinged
              ? 'bg-green-600/40 border border-green-500/60 shadow-lg shadow-green-500/20' 
              : isTargetWithZero
                ? 'bg-blue-600/30 border border-blue-500/50' 
                : isExactMatch 
                  ? 'bg-blue-600/30 border border-blue-500/50' 
                  : isHighlighted 
                    ? 'bg-blue-600/20 border border-blue-500/30' 
                    : 'hover:bg-zinc-800/50'
          }`}
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          <span className={`flex items-center gap-2 ${
            isPinged ? 'text-green-300' : isTargetWithZero || isExactMatch ? 'text-blue-300' : isHighlighted ? 'text-blue-400' : 'text-zinc-400'
          }`}>
            <Folder className={`w-4 h-4 ${
              isPinged ? 'text-green-300' : isTargetWithZero || isExactMatch ? 'text-blue-300' : isHighlighted ? 'text-blue-400' : 'text-zinc-400'
            }`} /> 
            {truncateFilename(folder.name)}
            {depth === 0 && <span className="text-xs text-zinc-500">(root)</span>}
          </span>
          <span className={`text-xs font-mono rounded border px-1 py-0.5 ${
            isPinged
              ? 'text-green-300 border-green-500 bg-green-600/20' 
              : isTargetWithZero || isExactMatch 
                ? 'text-blue-300 border-blue-500 bg-blue-600/20' 
                : isHighlighted 
                  ? 'text-blue-400 border-blue-500/50 bg-blue-600/10' 
                  : 'text-zinc-400 border-zinc-600'
          }`}>
            {currentSequence}
          </span>
        </div>
        
        {/* Recursive subfolders */}
        {folder.subfolders.map((subfolder, index) => 
          renderFolderTree(subfolder, depth + 1, [...path, index])
        )}
      </div>
    );
  };

  const commitChanges = async () => {
    const movesArray = Object.values(pendingMoves);
    if (movesArray.length === 0) return;

    setShowCopyConfirm(true);
  };

  const confirmCopyFiles = async () => {
    const movesArray = Object.values(pendingMoves);
    if (movesArray.length === 0) return;

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // console.log('Starting to copy files:', movesArray);
      
      for (const move of movesArray) {
        try {
          // console.log(`Copying ${move.imageName} to ${move.targetFolder}`);
          
          const result = await invoke('move_image', {
            sourcePath: move.imagePath,
            targetFolder: move.targetFolder
          });
          
          successCount++;
          // console.log('Copy result:', result);
        } catch (error) {
          errorCount++;
          const errorMsg = `Failed to copy "${move.imageName}": ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
      // Show grandiose result popup
      if (successCount > 0) {
        setCopyResult({
          success: true,
          message: `🎉 Successfully copied ${successCount} file${successCount > 1 ? 's' : ''}!`,
          details: errorCount > 0 ? `${errorCount} file${errorCount > 1 ? 's' : ''} failed to copy.` : undefined,
          failedFiles: errorCount > 0 ? errors : undefined
        });
        setShowCopyResult(true);
        setPendingMoves({});
        
        // Auto-advance to next image if enabled
        if (autoAdvance && selectedImagePath && onImageSelect) {
          const currentIndex = imageFiles.findIndex(img => img.path === selectedImagePath);
          if (currentIndex !== -1 && currentIndex < imageFiles.length - 1) {
            // Advance to the next image
            onImageSelect(currentIndex + 1);
          }
        }
      } else {
        setCopyResult({
          success: false,
          message: '❌ Failed to copy any files',
          details: errors.join('\n'),
          failedFiles: errors
        });
        setShowCopyResult(true);
      }
      
      console.log(`Copy operation completed: ${successCount} successful, ${errorCount} failed`);
    } catch (error) {
      console.error('Error during copy operation:', error);
      setCopyResult({
        success: false,
        message: '❌ Copy operation failed',
        details: error instanceof Error ? error.message : String(error)
      });
      setShowCopyResult(true);
    } finally {
      setIsLoading(false);
      setShowCopyConfirm(false);
    }
  };

  const removePendingMove = (imagePath: string) => {
    setPendingMoves(prev => {
      const newMoves = { ...prev };
      delete newMoves[imagePath];
      return newMoves;
    });
  };

  const clearAllPendingMoves = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    setPendingMoves({});
    setShowClearConfirm(false);
  };

  const copyFailedFilesToClipboard = async () => {
    if (copyResult?.failedFiles) {
      try {
        await navigator.clipboard.writeText(copyResult.failedFiles.join('\n'));
        console.log('Failed files copied to clipboard');
        setCopiedToClipboard(true);
        
        // Reset the feedback after 2 seconds
        setTimeout(() => {
          setCopiedToClipboard(false);
        }, 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  const truncateFilename = (filename: string, maxLength: number = 20) => {
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const maxNameLength = maxLength - (extension ? extension.length + 1 : 0) - 3; // 3 for "..."
    
    if (nameWithoutExt.length <= maxNameLength) return filename;
    
    return `${nameWithoutExt.substring(0, maxNameLength)}...${extension ? `.${extension}` : ''}`;
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (keyBufferTimeout) {
        clearTimeout(keyBufferTimeout);
      }
    };
  }, [folderStructure, selectedImagePath, imageFiles, keyBuffer, keyBufferTimeout]);

  return (
    <div className="w-full h-full px-3 py-2 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MoveIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-400">Folder Manager</span>
        </div>
        <Button
          onClick={handleFolderUpload}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs px-2 py-1 h-6"
        >
          Upload
        </Button>
      </div>

      {!folderStructure ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-zinc-500">
            <FolderIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div className="text-xs">Select a folder with subfolders</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden space-y-4">
          {/* Current Path */}
          {/* <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-medium text-zinc-400">Current Path:</span>
            </div>
            <div className="px-1 py-1 rounded-md bg-zinc-800/50">
              <div className="text-sm text-zinc-300">
                {currentPath.length === 0 ? 'Root' : currentPath.map((p, i) => 
                  `${p + 1}${i < currentPath.length - 1 ? ' → ' : ''}`
                ).join('')}
              </div>
            </div>
          </div> */}

          

          {/* Folder Structure */}
          <div className="space-y-2">
            <p>Destination folders</p>
            {/* <div className="flex items-center gap-2 px-1">
              <FolderIcon className="w-4 h-4 text-zinc-400" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-400 truncate">
                  {folderStructure.name}
                </div>
                <div className="text-xs text-zinc-500">
                  (Hierarchical navigation)
                </div>
              </div>
            </div> */}
            
            {renderFolderTree(folderStructure)}
          </div>

          {/* Selected Image */}
          {/* {selectedImagePath && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-medium text-zinc-400">Selected Image</span>
              </div>
              <div className="p-2 rounded-md bg-zinc-800/50">
                <div className="text-sm text-zinc-300">
                  {imageFiles.find(img => img.path === selectedImagePath)?.name.slice(0, 30)}...
                </div> */}
                <div className="text-xs text-zinc-500 mt-1">
                  Type sequence to navigate (e.g., "132" or "20" to stop at folder 2)
                </div>
              {/* </div>
            </div>
          )} */}

          {/* Error Notification */}
          {showError && (
            <div className="px-2 py-1 rounded-md bg-red-600/20 border border-red-500/30">
              <div className="text-xs text-red-400">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Pending Copies */}
          {Object.keys(pendingMoves).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-zinc-400">
                  Pending Copies ({Object.keys(pendingMoves).length})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={clearAllPendingMoves}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs -pl-4 py-1 h-6"
                  >
                    <XIcon className="w-3 h-3" />
                    Clear All
                  </Button>
                  <Button
                    onClick={commitChanges}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-6"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
                        <span>Copying...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <CheckIcon className="w-3 h-3" />
                        <span>Copy Files</span>
                      </div>
                    )}
                  </Button> 
                </div>
              </div>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {Object.values(pendingMoves).map((move) => {
                    const imageFile = imageFiles.find(img => img.path === move.imagePath);
                    return (
                      <div key={move.imagePath} className="flex items-center gap-2 p-2 rounded-md bg-zinc-800/50">
                        {/* Image Preview */}
                        <div className="w-6 h-6 rounded border border-zinc-600 overflow-hidden flex-shrink-0">
                          {imageFile?.data ? (
                            <img
                              src={`data:image/jpeg;base64,${imageFile.data}`}
                              alt={move.imageName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                              <span className="text-xs text-zinc-500">?</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Move Info */}
                         <div className="flex-1 min-w-0">
                           <div className="text-sm text-zinc-300 truncate" title={move.imageName}>
                             {move.imageName}
                           </div>
                           <div className="text-xs text-zinc-500 truncate">
                             → {move.targetFolder.replace(folderStructure?.path || '', '').replace(/^\/+/, '').split('/').filter(Boolean).join(' → ') || 'root'}
                           </div>
                         </div>
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => removePendingMove(move.imagePath)}
                          className="text-zinc-500 hover:text-red-400 p-0.5 flex-shrink-0"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
            </div>
          )}
        </div>
      )}

      {/* Modern Copy Result Popup */}
      {showCopyResult && copyResult && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="max-w-md w-full mx-4 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded-xl shadow-2xl transform transition-all duration-300">
            {/* Header */}
            <div className="text-center p-6 pb-4">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                copyResult.success 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <div className={`text-2xl ${copyResult.success ? 'animate-bounce' : 'animate-pulse'}`}>
                  {copyResult.success ? '✓' : '✕'}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                {copyResult.success ? 'Copy Complete' : 'Copy Failed'}
              </h3>
            </div>

            {/* Message */}
            <div className="px-6 pb-4">
              <p className="text-zinc-300 text-center mb-3">{copyResult.message}</p>
              {copyResult.details && (
                <div className={`rounded-lg p-3 border ${
                  copyResult.success 
                    ? 'bg-zinc-800/50 border-zinc-700/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <p className={`text-sm leading-relaxed ${
                    copyResult.success 
                      ? 'text-zinc-400' 
                      : 'text-red-300 font-medium'
                  }`} style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {copyResult.details}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 p-6 pt-0">
              {copyResult.failedFiles && copyResult.failedFiles.length > 0 && (
                <Button
                  onClick={copyFailedFilesToClipboard}
                  variant="outline"
                  size="sm"
                  className={`transition-all duration-200 ${
                    copiedToClipboard 
                      ? 'border-green-500 text-green-400 bg-green-500/10' 
                      : 'border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white'
                  }`}
                  disabled={copiedToClipboard}
                >
                  {copiedToClipboard ? (
                    <div className="flex items-center gap-2">
                      <CheckIcon className="w-3 h-3" />
                      Copied!
                    </div>
                  ) : (
                    'Copy Failed Filenames To Clipboard'
                  )}
                </Button>
              )}
                              <Button
                  onClick={() => {
                    setShowCopyResult(false);
                    setCopyResult(null);
                    setCopiedToClipboard(false);
                  }}
                  variant={copyResult.success ? "default" : "secondary"}
                  size="sm"
                  className={copyResult.success ? "bg-emerald-600 hover:bg-emerald-500" : ""}
                >
                  {copyResult.success ? 'Done' : 'Close'}
                </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="max-w-sm w-full mx-4 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded-xl shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <XIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Clear All Pending Copies?</h3>
                <p className="text-zinc-400 text-sm">
                  This will remove all {Object.keys(pendingMoves).length} pending copies. This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowClearConfirm(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmClearAll}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Files Confirmation Modal */}
      {showCopyConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="max-w-sm w-full mx-4 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded-xl shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Copy {Object.keys(pendingMoves).length} File{Object.keys(pendingMoves).length !== 1 ? 's' : ''}?</h3>
                <p className="text-zinc-400 text-sm">
                  This will copy {Object.keys(pendingMoves).length} file{Object.keys(pendingMoves).length !== 1 ? 's' : ''} to their destination folders. Original files will be preserved.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCopyConfirm(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmCopyFiles}
                  variant="default"
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Copy Files
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
