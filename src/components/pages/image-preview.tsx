import { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import { Button } from "../ui/button";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

interface ImageFile {
  name: string;
  path: string;
  size: number;
  data?: string; // Base64 image data
  created?: string; // Creation date
}

interface ImagePreviewProps {
  images: ImageFile[];
  currentImageIndex: number;
  onClose: () => void;
  onImageChange: (index: number) => void;
}

export default function ImagePreview({ images, currentImageIndex, onClose, onImageChange }: ImagePreviewProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<{
    width: number;
    height: number;
    fileSize: string;
    format: string;
    created: string;
  } | null>(null);

  const currentImage = images[currentImageIndex];

  useEffect(() => {
    if (currentImage) {
      loadImageData(currentImage);
    }
  }, [currentImage]);

  const loadImageData = async (image: ImageFile) => {
    try {
      setLoading(true);
      setError(null);
      setImageMetadata(null);
      
      // If image data is already preloaded, use it
      if (image.data) {
        setImageData(`data:image/jpeg;base64,${image.data}`);
        extractImageMetadata(image.data, image);
        setLoading(false);
        return;
      }
      
      // Otherwise, load it on demand (fallback)
      const base64Data = await invoke<string>('read_image_as_base64', { path: image.path });
      setImageData(`data:image/jpeg;base64,${base64Data}`);
      extractImageMetadata(base64Data, image);
    } catch (err) {
      console.error('Failed to load image:', err);
      setError('Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const extractImageMetadata = (base64Data: string, image: ImageFile) => {
    const img = new Image();
    img.onload = () => {
      const format = getImageFormat(base64Data);
      const fileSize = formatFileSize(image.size);
      const created = formatDate(image.created || new Date().toISOString());
      
      setImageMetadata({
        width: img.width,
        height: img.height,
        fileSize,
        format,
        created
      });
    };
    img.src = `data:image/jpeg;base64,${base64Data}`;
  };

  const getImageFormat = (base64Data: string): string => {
    // Try to detect format from base64 header
    if (base64Data.startsWith('/9j/')) return 'JPEG';
    if (base64Data.startsWith('iVBORw0KGgo')) return 'PNG';
    if (base64Data.startsWith('R0lGODlh')) return 'GIF';
    if (base64Data.startsWith('UklGR')) return 'WebP';
    if (base64Data.startsWith('AAABAA')) return 'ICO';
    return 'Unknown';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const handlePrevious = () => {
    if (currentImageIndex > 0) {
      onImageChange(currentImageIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentImageIndex < images.length - 1) {
      onImageChange(currentImageIndex + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentImageIndex]);

  if (!currentImage) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-400">No image selected</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button variant="outline" size="icon" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold break-words leading-tight max-w-full">
              {currentImage.name.length > 50 ? currentImage.name.slice(0, 50) + '\n' + currentImage.name.slice(50) : currentImage.name}
            </h1>
            <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400">
              <span>{currentImageIndex + 1} of {images.length}</span>
              {imageMetadata && (
                <>
                  <span>•</span>
                  <span>{imageMetadata.width}×{imageMetadata.height}</span>
                  <span>•</span>
                  <span>{imageMetadata.format}</span>
                  <span>•</span>
                  <span>{imageMetadata.fileSize}</span>
                  <span>•</span>
                  <span>{imageMetadata.created}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handlePrevious}
            disabled={currentImageIndex === 0}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleNext}
            disabled={currentImageIndex === images.length - 1}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image Display */}
      <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950 overflow-hidden">
        {loading ? (
          <div className="text-zinc-400">Loading image...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : imageData ? (
          <img 
            src={imageData} 
            alt={currentImage.name}
            className="max-w-full max-h-full object-contain -mt-12"
            style={{ maxWidth: 'calc(100% - 50px)', maxHeight: 'calc(100% - 50px)' }}
          />
        ) : (
          <div className="text-zinc-400">Failed to load image</div>
        )}
      </div>
    </div>
  );
} 