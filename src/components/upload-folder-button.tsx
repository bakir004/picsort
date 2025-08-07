import { open } from '@tauri-apps/plugin-dialog';
import { Button } from './ui/button';
import { Upload } from 'lucide-react';

export default function UploadFolderButton({ onFolderSelect, loading }: { onFolderSelect: (path: string) => void, loading: boolean }) {
  
  const handleSelectFolder = async () => {
    try {
      // Use the Tauri dialog plugin directly
      const selected = await open({
        multiple: false,
        directory: true,
      });
      
      if (selected) {
        const path = Array.isArray(selected) ? selected[0] : selected;
        onFolderSelect(path);
      }
    } catch (err) {
      console.error('Folder selection failed:', err);
    }
  };
  return <Button size="sm" onClick={handleSelectFolder} disabled={loading}><Upload className="w-3 h-3 mr-2" />Select Folder</Button>;
}

