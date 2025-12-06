#!/bin/bash

# ZhangNote - Post-removal script
# Compatible with: Ubuntu, Debian, Kylin OS (银河麒麟/中标麒麟)

# Remove symbolic link
rm -f '/usr/bin/${executable}' 2>/dev/null || true

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi

echo "ZhangNote removed successfully!"
