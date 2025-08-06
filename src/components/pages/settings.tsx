import { Button } from "../ui/button";

export default function Settings() {
  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-zinc-400 mt-2">Configure your application preferences</p>
      </div>
      
      <div className="space-y-6">
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