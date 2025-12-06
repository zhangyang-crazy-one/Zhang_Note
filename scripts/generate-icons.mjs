import pngToIco from 'png-to-ico';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');
const iconsDir = path.join(buildDir, 'icons');
const sourcePng = path.join(iconsDir, 'icon.png');

// Icon sizes for different platforms
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
    console.log('Generating icons...');

    // Check if source PNG exists
    if (!fs.existsSync(sourcePng)) {
        console.error(`Source PNG not found: ${sourcePng}`);
        process.exit(1);
    }

    try {
        // First, create a square version of the icon (512x512)
        const squareIcon = path.join(buildDir, 'icon-square.png');

        // Get image metadata
        const metadata = await sharp(sourcePng).metadata();
        console.log(`Original image size: ${metadata.width}x${metadata.height}`);

        // Create square icon by resizing with contain and adding padding
        const maxDim = Math.max(metadata.width, metadata.height);
        await sharp(sourcePng)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent background
            })
            .toFile(squareIcon);
        console.log(`Created square icon: ${squareIcon}`);

        // Copy to main build icon
        const mainIcon = path.join(buildDir, 'icon.png');
        fs.copyFileSync(squareIcon, mainIcon);
        console.log(`Main icon created: ${mainIcon}`);

        // Generate ICO from square PNG
        // Keep transparency to preserve rounded corners on Windows desktop
        const outputIco = path.join(buildDir, 'icon.ico');

        // Generate multiple size PNGs for ICO (ICO supports multiple resolutions)
        const icoSizes = [256, 128, 64, 48, 32, 16];
        const icoPngs = [];

        for (const size of icoSizes) {
            const tempPath = path.join(buildDir, `icon-${size}.png`);
            await sharp(squareIcon)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 } // Keep transparent
                })
                .png({ compressionLevel: 9 })
                .toFile(tempPath);
            icoPngs.push(tempPath);
        }

        // Use the 256px version for ICO generation (best quality)
        const buf = await pngToIco(icoPngs);
        fs.writeFileSync(outputIco, buf);
        console.log(`Windows icon generated with transparency: ${outputIco}`);

        // Clean up temporary files
        for (const tempPath of icoPngs) {
            fs.unlinkSync(tempPath);
        }

        // Generate Linux icons in multiple sizes
        for (const size of sizes) {
            const sizeDir = path.join(iconsDir, `${size}x${size}`);
            if (!fs.existsSync(sizeDir)) {
                fs.mkdirSync(sizeDir, { recursive: true });
            }

            await sharp(squareIcon)
                .resize(size, size)
                .toFile(path.join(sizeDir, 'icon.png'));

            console.log(`Generated ${size}x${size} icon`);
        }

        console.log('Icon generation complete!');
    } catch (error) {
        console.error('Failed to generate icons:', error);
        process.exit(1);
    }
}

generateIcons();
