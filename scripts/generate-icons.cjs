const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_ICON = path.join(__dirname, '..', 'build', 'icon_1.png');
const BUILD_DIR = path.join(__dirname, '..', 'build');
const ICONS_DIR = path.join(BUILD_DIR, 'icons');

// Sizes for various platforms
const SIZES = {
    // Windows ICO sizes
    ico: [16, 24, 32, 48, 64, 128, 256],
    // macOS icns sizes
    icns: [16, 32, 64, 128, 256, 512, 1024],
    // Linux icon sizes
    linux: [16, 24, 32, 48, 64, 128, 256, 512]
};

async function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function generatePngIcons() {
    console.log('Generating PNG icons...');
    await ensureDir(ICONS_DIR);

    for (const size of SIZES.linux) {
        const outputPath = path.join(ICONS_DIR, `${size}x${size}.png`);
        await sharp(SOURCE_ICON)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(outputPath);
        console.log(`  Created ${size}x${size}.png`);
    }
}

async function generateIcon256() {
    console.log('Generating icon.png (256x256)...');
    await sharp(SOURCE_ICON)
        .resize(256, 256, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(BUILD_DIR, 'icon.png'));
    console.log('  Created icon.png');
}

async function generateIco() {
    console.log('Generating icon.ico...');

    // For ICO, we'll create the 256x256 version and let electron-builder handle ICO conversion
    // Or use png-to-ico if available
    const icoSizes = [];

    for (const size of SIZES.ico) {
        const buffer = await sharp(SOURCE_ICON)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer();
        icoSizes.push({ size, buffer });
    }

    // Save 256x256 as the main icon for electron-builder to convert
    await sharp(SOURCE_ICON)
        .resize(256, 256, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(BUILD_DIR, 'icon.ico.png'));

    console.log('  Created icon.ico.png (256x256 for ICO conversion)');

    // Try to use png-to-ico if available
    try {
        const pngToIco = require('png-to-ico');
        const pngBuffer = await sharp(SOURCE_ICON)
            .resize(256, 256, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer();

        const icoBuffer = await pngToIco(pngBuffer);
        fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), icoBuffer);
        console.log('  Created icon.ico');
    } catch (e) {
        console.log('  png-to-ico not available, using PNG fallback for ICO');
        // Copy PNG as fallback - electron-builder can handle PNG for Windows
        fs.copyFileSync(
            path.join(BUILD_DIR, 'icon.ico.png'),
            path.join(BUILD_DIR, 'icon.ico')
        );
    }
}

async function main() {
    console.log('=== ZhangNote Icon Generator ===');
    console.log(`Source: ${SOURCE_ICON}`);
    console.log(`Output: ${BUILD_DIR}`);
    console.log('');

    if (!fs.existsSync(SOURCE_ICON)) {
        console.error('ERROR: Source icon not found!');
        process.exit(1);
    }

    try {
        await generatePngIcons();
        await generateIcon256();
        await generateIco();

        console.log('');
        console.log('=== Icon generation complete! ===');
        console.log('Generated files:');
        console.log('  - build/icon.png (256x256)');
        console.log('  - build/icon.ico');
        console.log('  - build/icons/*.png (various sizes)');
    } catch (error) {
        console.error('Error generating icons:', error);
        process.exit(1);
    }
}

main();
