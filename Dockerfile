# Use the official Rust image as base
FROM rust:1.75-slim as rust-builder

# Install system dependencies for Tauri
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.0-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libssl-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install Node.js dependencies
RUN pnpm install --frozen-lockfile

# Copy Rust files
COPY src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/
COPY src-tauri/src/ src-tauri/src/
COPY src-tauri/build.rs src-tauri/
COPY src-tauri/tauri.conf.json src-tauri/

# Copy frontend source
COPY src/ src/
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json ./
COPY components.json ./

# Build the application
RUN pnpm tauri build

# Create a minimal runtime image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.0-37 \
    libgtk-3-0 \
    libayatana-appindicator3-1 \
    librsvg2-2 \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1000 appuser

# Copy the built application
COPY --from=rust-builder /app/src-tauri/target/release/picsort /usr/local/bin/picsort

# Set ownership
RUN chown appuser:appuser /usr/local/bin/picsort

# Switch to app user
USER appuser

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/picsort"]
