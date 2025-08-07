import { useState, useEffect } from "react";
import { Button } from "../ui/button";

export default function Settings() {
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);

  // Load saved preference on component mount
  useEffect(() => {
    const saved = localStorage.getItem('autoAdvance');
    if (saved !== null) {
      setAutoAdvance(JSON.parse(saved));
    }
  }, []);

  // Save preference when it changes
  const handleAutoAdvanceChange = (checked: boolean) => {
    setAutoAdvance(checked);
    localStorage.setItem('autoAdvance', JSON.stringify(checked));
  };

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-zinc-400 mt-2">Configure your application preferences</p>
      </div>
      
      <div className="space-y-6">
        <div className="bg-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Workflow</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-zinc-200">Auto-advance to next image</div>
                <div className="text-sm text-zinc-400 mt-1">
                  Automatically select the next image after copying the current one
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => handleAutoAdvanceChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Dark Mode</span>
              <Button variant="outline" size="sm">Toggle</Button>
            </div>
            <div className="flex items-center justify-between">
              <span>Theme</span>
              <Button variant="outline" size="sm">Zinc</Button>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Storage</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Photo Storage Location</span>
              <Button variant="outline" size="sm">Browse</Button>
            </div>
            <div className="flex items-center justify-between">
              <span>Auto Backup</span>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 