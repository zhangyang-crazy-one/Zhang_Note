#!/bin/bash

# ZhangNote - Post-installation script
# Compatible with: Ubuntu, Debian, Kylin OS (银河麒麟/中标麒麟)

# Create symbolic link in /usr/bin for command line access
ln -sf '/opt/${productFilename}/${executable}' '/usr/bin/${executable}' || true

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi

# Set correct permissions
chmod 4755 '/opt/${productFilename}/chrome-sandbox' 2>/dev/null || true

echo "ZhangNote installed successfully!"
