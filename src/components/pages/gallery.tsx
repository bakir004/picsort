export default function Gallery() {
  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <p className="text-zinc-400 mt-2">Browse and organize your photos</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Placeholder for photo grid */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-zinc-800 rounded-lg aspect-square flex items-center justify-center">
            <span className="text-zinc-400">Photo {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 