import { useState } from "react";
import UploadFolderButton from "../upload-folder-button";
import ImagePreview from "./image-preview";
import { invoke } from '@tauri-apps/api/core';
import { CheckIcon } from "lucide-react";

interface ImageFile {
  name: string;
  path: string;
  size: number;
  data?: string; // Base64 image data
  created: string; // Creation date
}

interface HomeProps {
  imageFiles: ImageFile[];
  setImageFiles: React.Dispatch<React.SetStateAction<ImageFile[]>>;
  selectedImageIndex: number | null;
  setSelectedImageIndex: (index: number | null) => void;
  folderPath: string | null;
  setFolderPath: (path: string | null) => void;
  setImagesLoading: (loading: boolean) => void;
}

// Natural sort function for proper alphanumeric sorting
const naturalSort = (a: string, b: string): number => {
  const splitA = a.split(/(\d+)/).map(part => isNaN(Number(part)) ? part : Number(part));
  const splitB = b.split(/(\d+)/).map(part => isNaN(Number(part)) ? part : Number(part));
  
  for (let i = 0; i < Math.min(splitA.length, splitB.length); i++) {
    const aPart = splitA[i];
    const bPart = splitB[i];
    
    if (typeof aPart === 'string' && typeof bPart === 'string') {
      const comparison = aPart.localeCompare(bPart, undefined, { numeric: true, sensitivity: 'base' });
      if (comparison !== 0) return comparison;
    } else if (typeof aPart === 'number' && typeof bPart === 'number') {
      if (aPart !== bPart) return aPart - bPart;
    } else {
      // Mixed types - convert to string for comparison
      const aStr = String(aPart);
      const bStr = String(bPart);
      const comparison = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
      if (comparison !== 0) return comparison;
    }
  }
  
  return splitA.length - splitB.length;
};

export default function Home({ imageFiles, setImageFiles, selectedImageIndex, setSelectedImageIndex, setFolderPath, setImagesLoading }: HomeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  
  const loadImagesFromFolder = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      const images = await invoke<ImageFile[]>('list_images_in_folder', { folderPath: path });
      
      // Sort images by filename using natural sort
      const sortedImages = images.sort((a, b) => naturalSort(a.name, b.name));
      
      setImageFiles(sortedImages);
      console.log('Loaded and sorted images:', sortedImages);
      
      // Start loading image data in the background (non-blocking)
      setLoadingImages(true);
      setImagesLoading(true);
      setLoadedCount(0);
      loadImageDataChunked(sortedImages);
    } catch (err) {
      console.error('Failed to load images:', err);
      setError('Failed to load images from folder');
    } finally {
      setLoading(false);
    }
  };

  const loadImageDataChunked = async (images: ImageFile[]) => {
    const CHUNK_SIZE = 3; // Process 3 images at a time
    const DELAY_BETWEEN_CHUNKS = 16; // ~60fps (16ms)
    
    try {
      for (let i = 0; i < images.length; i += CHUNK_SIZE) {
        const chunk = images.slice(i, i + CHUNK_SIZE);
        
        // Process chunk in parallel
        const chunkPromises = chunk.map(async (image, chunkIndex) => {
          const globalIndex = i + chunkIndex;
          try {
            const base64Data = await invoke<string>('read_image_as_base64', { path: image.path });
            
            // Update the specific image with its data
            setImageFiles(prevImages => 
              prevImages.map((img, index) => 
                index === globalIndex ? { ...img, data: base64Data } : img
              )
            );
            
            return true;
          } catch (err) {
            console.error(`Failed to load image ${image.name}:`, err);
            return false;
          }
        });
        
        // Wait for chunk to complete
        await Promise.all(chunkPromises);
        
        // Update loaded count
        setLoadedCount(Math.min(i + CHUNK_SIZE, images.length));
        
        // Allow UI to update before next chunk
        if (i + CHUNK_SIZE < images.length) {
          await new Promise(resolve => requestAnimationFrame(resolve));
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
        }
      }
      
      console.log('Loaded all image data');
    } catch (err) {
      console.error('Failed to load images:', err);
    } finally {
      setLoadingImages(false);
      setImagesLoading(false);
      
      // Automatically open the first image after loading is complete
      if (images.length > 0) {
        setSelectedImageIndex(0);
      }
    }
  };

  const handleFolderSelect = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedImageIndex(null);
      
      setFolderPath(path);
      console.log('Selected folder path:', path);
      
      // Automatically load images from the selected folder
      await loadImagesFromFolder(path);
    } catch (err) {
      console.error('Folder selection failed:', err);
      setError('Failed to select folder');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleClosePreview = () => {
    setSelectedImageIndex(null);
  };

  // If an image is selected, show the preview
  if (selectedImageIndex !== null && imageFiles.length > 0) {
    return (
      <ImagePreview
        images={imageFiles}
        currentImageIndex={selectedImageIndex}
        onClose={handleClosePreview}
        onImageChange={handleImageChange}
      />
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold -mt-24">Welcome to PicSort</h1>
      <p className="text-zinc-400 text-sm mt-1 mb-6">Select a folder with your images to get started</p>
      <UploadFolderButton onFolderSelect={handleFolderSelect} loading={loading}/>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {imageFiles.length > 0 && (
        <div className="mt-4 text-center">
          <h2 className="text-lg font-semibold">Found {imageFiles.length} Images</h2>
          <p className="text-zinc-400 text-sm mt-1">
            {loadingImages ? (
              <div className="flex items-center justify-center gap-2 mt-2">
                <span>Loading images... ({loadedCount}/{imageFiles.length})</span>
              </div>
            ) : loadedCount === imageFiles.length && imageFiles.length > 0 ? (
              <div className="flex items-center justify-center gap-2 mt-2">
                <CheckIcon className="w-4 h-4 text-green-400" />
                <span className="text-green-400">All images loaded!</span>
              </div>
            ) : (
              'Click on any image in the sidebar to preview it'
            )}
          </p>
        </div>
      )}
    </div>
  );
} 