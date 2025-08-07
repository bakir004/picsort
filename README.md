# PicSort

A modern desktop application for sorting and organizing images using Tauri, React, and TypeScript. PicSort provides an intuitive interface for batch processing images into organized folder structures.

## Features

- 🖼️ **Image Management**: Load and preview images from any folder
- 📁 **Smart Organization**: Sort images into destination folders with keyboard shortcuts
- 🎯 **Batch Processing**: Copy multiple images to organized folder structures
- ⌨️ **Keyboard Navigation**: Use number sequences to quickly navigate folder hierarchies
- 📊 **Visual Feedback**: See current and pending image counts for each folder
- 🎨 **Modern UI**: Clean, dark-themed interface with responsive design

## Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (recommended) or npm
- **Rust** (for local development)
- **Docker** (for containerized builds)

## Development

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd picsort
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development server**
   ```bash
   pnpm dev
   ```

4. **Build the application**
   ```bash
   pnpm build
   ```

5. **Run the Tauri app**
   ```bash
   pnpm tauri dev
   ```

### System Dependencies (for local development)

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libssl-dev pkg-config
```

#### macOS
```bash
brew install node
```

#### Windows
- Install Visual Studio Build Tools
- Install WebView2

## Docker Usage

### Building with Docker

1. **Build the Docker image**
   ```bash
   docker build -t picsort .
   ```

2. **Run the container**
   ```bash
   docker run -it --rm \
     -e DISPLAY=$DISPLAY \
     -v /tmp/.X11-unix:/tmp/.X11-unix \
     -v $HOME:$HOME \
     picsort
   ```

### Multi-platform Docker Builds

For building on different architectures:

```bash
# Build for multiple platforms
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t picsort:latest .
```

## Building for Distribution

### Using Tauri CLI

1. **Build for current platform**
   ```bash
   pnpm tauri build
   ```

2. **Build for specific platform**
   ```bash
   # Windows
   pnpm tauri build --target x86_64-pc-windows-msvc
   
   # macOS
   pnpm tauri build --target x86_64-apple-darwin
   
   # Linux
   pnpm tauri build --target x86_64-unknown-linux-gnu
   ```

### Using Docker for Distribution Builds

```bash
# Build for Linux
docker build -t picsort-linux .

# Build for Windows (requires Windows container)
docker build -t picsort-windows --platform windows/amd64 .

# Build for macOS (requires macOS host)
docker build -t picsort-macos --platform darwin/amd64 .
```

## Publishing

### 1. Version Management

Update version numbers in:
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

### 2. Build Release

```bash
# Clean previous builds
pnpm tauri build --release

# The built application will be in:
# src-tauri/target/release/
```

### 3. Create Installers

```bash
# Create installer for current platform
pnpm tauri build --release

# The installer will be in:
# src-tauri/target/release/bundle/
```

### 4. Docker Publishing

```bash
# Tag the image
docker tag picsort:latest your-registry/picsort:latest

# Push to registry
docker push your-registry/picsort:latest
```

## Project Structure

```
picsort/
├── src/                    # React frontend source
│   ├── components/        # React components
│   ├── lib/              # Utility functions
│   └── pages/            # Page components
├── src-tauri/            # Rust backend
│   ├── src/              # Rust source code
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── public/               # Static assets
├── Dockerfile            # Docker configuration
└── README.md            # This file
```

## Configuration

### Tauri Configuration

Edit `src-tauri/tauri.conf.json` to customize:
- App metadata (name, version, identifier)
- Window settings
- Security policies
- Bundle settings

### Frontend Configuration

- `vite.config.ts`: Vite build configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration

## Troubleshooting

### Common Issues

1. **Build fails on Linux**
   - Ensure all system dependencies are installed
   - Check that WebKit2GTK is properly installed

2. **Docker build fails**
   - Ensure Docker has sufficient memory (at least 4GB)
   - Clear Docker cache: `docker system prune -a`

3. **App doesn't start**
   - Check console for error messages
   - Verify all dependencies are installed
   - Try running with `--debug` flag

### Debug Mode

```bash
# Run with debug logging
RUST_LOG=debug pnpm tauri dev

# Build with debug symbols
pnpm tauri build --debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license information here]

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the Tauri documentation: https://tauri.app/
