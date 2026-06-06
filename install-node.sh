#!/bin/bash
# install-node.sh
# Downloads and extracts a local Node.js environment for macOS in the workspace.

set -e

NODE_VERSION="v20.11.0"
TARGET_DIR="node-env"

echo "=== Voice-O-Extractor Local Node.js Installer ==="

# Check OS
OS=$(uname -s)
if [ "$OS" != "Darwin" ]; then
  echo "Error: This installer is only configured for macOS."
  exit 1
fi

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  NODE_ARCH="darwin-arm64"
  echo "Detected architecture: Apple Silicon (arm64)"
elif [ "$ARCH" = "x86_64" ]; then
  NODE_ARCH="darwin-x64"
  echo "Detected architecture: Intel (x64)"
else
  echo "Warning: Unknown architecture $ARCH. Defaulting to Intel (x64)."
  NODE_ARCH="darwin-x64"
fi

DOWNLOAD_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${NODE_ARCH}.tar.gz"
TEMP_TAR="node-temp.tar.gz"

echo "Target directory: ./$TARGET_DIR"

if [ -d "$TARGET_DIR" ]; then
  echo "Local node directory already exists. Skipping download."
  echo "Verifying local binaries..."
  if [ -f "./$TARGET_DIR/bin/node" ] && [ -f "./$TARGET_DIR/bin/npm" ]; then
    echo "Node.js version: $(./$TARGET_DIR/bin/node -v)"
    echo "npm version: $(./$TARGET_DIR/bin/npm -v)"
    echo "Local Node.js environment is ready!"
    exit 0
  else
    echo "Binaries missing. Cleaning up and reinstalling..."
    rm -rf "$TARGET_DIR"
  fi
fi

echo "Downloading Node.js ${NODE_VERSION} from Node.js distribution server..."
curl -L --progress-bar -o "$TEMP_TAR" "$DOWNLOAD_URL"

echo "Extracting archive..."
mkdir -p "$TARGET_DIR"
tar -xzf "$TEMP_TAR" -C "$TARGET_DIR" --strip-components=1
rm "$TEMP_TAR"

echo "Verifying installation..."
echo "Node.js version: $(./$TARGET_DIR/bin/node -v)"
echo "npm version: $(./$TARGET_DIR/bin/npm -v)"

echo "=== Local Node.js Environment Setup Successfully ==="
echo "To use this local node environment, prepend it to your path:"
echo "  export PATH=\"\$(pwd)/node-env/bin:\$PATH\""
