#!/bin/bash
echo "========================================"
echo " Building Polar Command Center (Linux)"
echo "========================================"

if ! command -v pyinstaller &> /dev/null; then
    echo "Installing PyInstaller..."
    pip install pyinstaller
fi

rm -rf dist build PolarCommandCenter.spec

# Build (colon for Linux path separator)
pyinstaller --noconsole --name "PolarCommandCenter" \
    --add-data "test folder/frontend:test folder/frontend" \
    --add-data "config.json:." \
    --hidden-import=pymysql \
    --hidden-import=uvicorn.logging \
    --hidden-import=uvicorn.loops \
    --hidden-import=uvicorn.loops.auto \
    --hidden-import=uvicorn.protocols \
    --hidden-import=uvicorn.protocols.http.auto \
    --hidden-import=uvicorn.protocols.websockets.auto \
    --hidden-import=uvicorn.lifespan \
    --hidden-import=uvicorn.lifespan.on \
    --hidden-import=backend.router \
    --hidden-import=backend03.router \
    --hidden-import=drift_mapping.router \
    app.py

if [ $? -ne 0 ]; then
    echo "[ERROR] Build failed."
    exit 1
fi

# Copy config.json next to the binary
cp config.json dist/PolarCommandCenter/

chmod +x dist/PolarCommandCenter/PolarCommandCenter

echo ""
echo "========================================"
echo " Build successful!"
echo " Output: dist/PolarCommandCenter/PolarCommandCenter"
echo "========================================"
