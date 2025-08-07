import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import FolderManager from "./components/folder-manager";
import Home from "./components/pages/home";
import Settings from "./components/pages/settings";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";

interface ImageFile {
  name: string;
  path: string;
  size: number;
  data?: string; // Base64 image data
  created: string; // Creation date
}

function App() {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);

  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index);
  };

  const selectedImagePath = selectedImageIndex !== null 
    ? imageFiles[selectedImageIndex]?.path 
    : undefined;

  return (
    <Router>
      <main className="h-screen w-screen bg-zinc-900 text-white dark">
        <Header />
        <section className="content flex h-full">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={15} minSize={15} maxSize={25}>
              <Sidebar 
                images={imageFiles}
                onImageSelect={handleImageSelect}
                selectedImageIndex={selectedImageIndex}
                folderPath={folderPath}
                imagesLoading={imagesLoading}
                onFolderSelect={setFolderPath}
                folderLoading={imagesLoading}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={70}>
              <div className="routes flex-1 h-full w-full">
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <Home 
                        imageFiles={imageFiles}
                        setImageFiles={setImageFiles}
                        selectedImageIndex={selectedImageIndex}
                        setSelectedImageIndex={setSelectedImageIndex}
                        folderPath={folderPath}
                        setFolderPath={setFolderPath}
                        setImagesLoading={setImagesLoading}
                      />
                    } 
                  />

                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <FolderManager
                onFolderSelect={setFolderPath}
                selectedImagePath={selectedImagePath}
                imageFiles={imageFiles}
                onImageSelect={handleImageSelect}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </section>
      </main>
    </Router>
  );
}

export default App;
