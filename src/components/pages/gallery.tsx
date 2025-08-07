import { formatFileSize } from '../../lib/image-utils';

interface ImageFile {
  name: string;
  path: string;
  size: number;
  data?: string;
  created: string;
}

interface GalleryProps {
  imageFiles?: ImageFile[];
  onDeleteImages?: (paths: string[]) => void;
}

export default function Gallery({ imageFiles = [], onDeleteImages }: GalleryProps) {

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <p className="text-zinc-400 mt-2">Browse and organize your photos</p>
      </div>

      {imageFiles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-xl font-medium mb-2">No Images Found</h3>
          <p className="text-zinc-400 mb-4">
            Upload some images to get started with your gallery
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {imageFiles.map((image) => (
            <div key={image.path} className="group relative">
              <div className="aspect-square bg-zinc-800 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-zinc-400 text-sm font-medium">{image.name}</div>
                    <div className="text-zinc-500 text-xs">
                      {formatFileSize(image.size)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="text-white opacity-0 group-hover:opacity-100 text-center p-4">
                  <div className="font-medium mb-1">{image.name}</div>
                  <div className="text-sm text-gray-300">
                    {formatFileSize(image.size)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 