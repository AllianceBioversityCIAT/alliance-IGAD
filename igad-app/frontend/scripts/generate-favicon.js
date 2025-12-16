import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const inputPath = join(__dirname, '../public/igad-logo.png')
const outputDir = join(__dirname, '../public')
const outputPath = join(outputDir, 'favicon.png')
const outputPathICO = join(outputDir, 'favicon.ico')

async function generateFavicon() {
  try {
    console.log('🎨 Generating optimized favicon from logo...')
    
    // Check if input file exists
    if (!existsSync(inputPath)) {
      console.error(`❌ Input file not found: ${inputPath}`)
      process.exit(1)
    }

    // Read the image and get its metadata
    const image = sharp(inputPath)
    const metadata = await image.metadata()
    
    console.log(`📐 Original image: ${metadata.width}x${metadata.height}`)
    
    // Create a square version (using the larger dimension)
    const size = Math.max(metadata.width || 512, metadata.height || 512)
    
    // Resize to 32x32 (good size for favicon, will be scaled by browser)
    // Use a high quality resize with padding to maintain aspect ratio
    const faviconSize = 32
    
    // Create favicon with transparent background, centered
    await image
      .resize(faviconSize, faviconSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(outputPath)
    
    console.log(`✅ Generated favicon.png (${faviconSize}x${faviconSize})`)
    
    // Also create a 16x16 version for better browser compatibility
    await image
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(join(outputDir, 'favicon-16x16.png'))
    
    console.log(`✅ Generated favicon-16x16.png`)
    
    // Create 32x32 version
    await image
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(join(outputDir, 'favicon-32x32.png'))
    
    console.log(`✅ Generated favicon-32x32.png`)
    
    // Create 192x192 for Android
    await image
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(join(outputDir, 'android-chrome-192x192.png'))
    
    console.log(`✅ Generated android-chrome-192x192.png`)
    
    // Create 512x512 for PWA
    await image
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(join(outputDir, 'android-chrome-512x512.png'))
    
    console.log(`✅ Generated android-chrome-512x512.png`)
    
    // Create apple-touch-icon (180x180)
    await image
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for iOS
      })
      .png()
      .toFile(join(outputDir, 'apple-touch-icon.png'))
    
    console.log(`✅ Generated apple-touch-icon.png`)
    
    console.log('✨ Favicon generation complete!')
    console.log('📝 Update your index.html to use the new favicon files.')
    
  } catch (error) {
    console.error('❌ Error generating favicon:', error)
    process.exit(1)
  }
}

generateFavicon()

