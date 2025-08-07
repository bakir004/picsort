import { Link, useLocation, useNavigate } from "react-router-dom";
import { HomeIcon, ImageIcon, SettingsIcon, FolderIcon, Loader2Icon } from "lucide-react";

interface ImageFile {
  name: string;
  path: string;
  size: number;
  data?: string; // Base64 image data
  created: string; // Creation date
}

interface SidebarProps {
  images?: ImageFile[];
  onImageSelect?: (index: number) => void;
  selectedImageIndex?: number | null;
  folderPath?: string | null;
  imagesLoading?: boolean;
}

export default function Sidebar({ images = [], 
  onImageSelect, selectedImageIndex, folderPath, imagesLoading }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/", label: "Home", icon: HomeIcon },
    { path: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const truncateFilename = (filename: string, maxLength: number = 25) => {
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const maxNameLength = maxLength - (extension ? extension.length + 1 : 0) - 3; // 3 for "..."
    
    if (nameWithoutExt.length <= maxNameLength) return filename;
    
    return `${nameWithoutExt.substring(0, maxNameLength)}...${extension ? `.${extension}` : ''}`;
  };

  const getFolderName = (path: string) => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  };

  const handleImageClick = (index: number) => {
    // Navigate to home if not already there
    if (location.pathname !== '/') {
      navigate('/');
    }
    
    // Select the image
    onImageSelect?.(index);
  };

  return (
    <div className="w-full h-full px-3 py-2 flex flex-col gap-2">
      <nav className="flex flex-col gap-1 mb-6 mt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* File Explorer */}
      {images.length > 0 && folderPath && (
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-3 px-1">
            <FolderIcon className="w-4 h-4 text-zinc-400" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-400 truncate" title={folderPath}>
                {getFolderName(folderPath)}
              </div>
              <div className="text-xs text-zinc-500">({images.length} images)</div>
            </div>
          </div>
          
          {!imagesLoading ? (
            <div className="space-y-1 overflow-y-auto max-h-[calc(100%-100px)]">
              {images.map((image, index) => (
                <button
                  key={image.path}
                  onClick={() => handleImageClick(index)}
                  className={`w-full text-left px-1 py-0.5 rounded-md text-sm transition-colors ${
                    selectedImageIndex === index
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  }`}
                  title={image.name}
                >
                  <div className="flex items-center gap-2">
                    {/* Image Thumbnail */}
                    <div className="w-4 h-4 rounded border border-zinc-600 overflow-hidden flex-shrink-0">
                      {image.data ? (
                        <img
                          src={`data:image/jpeg;base64,${image.data}`}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                          <ImageIcon className="w-2 h-2 text-zinc-500" />
                        </div>
                      )}
                    </div>
                    <span className="truncate">{truncateFilename(image.name)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2Icon className="w-3 h-3 animate-spin" />
                <span className="text-xs">Loading images...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}