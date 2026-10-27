const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const groups = {
  g1: [3, 4, 5, 6, 7],
  g2: [10, 11, 12, 13, 14],
  g3: [15, 16, 17, 18, 19, 20],
  g4: [27, 28, 29, 30, 31, 32, 33, 34],
  g5: [131, 132, 133, 134, 135],
  g6: [8, 9],
  g7: [22, 23],
  g8: [24, 25],
}

async function main() {
  const outputDir = path.join(process.cwd(), '.preview', 'qr-sheets')
  fs.mkdirSync(outputDir, { recursive: true })

  for (const [name, pages] of Object.entries(groups)) {
    const panels = []
    for (const page of pages) {
      const pageName = String(page).padStart(2, '0')
      const original = path.join(
        process.cwd(),
        'source-assets',
        'public-originals',
        'projects',
        'detail',
        `${pageName}.png`,
      )
      const masked = path.join(
        process.cwd(),
        'source-assets',
        'masked-originals',
        'projects',
        'detail',
        `${pageName}.png`,
      )
      const input = fs.existsSync(masked)
        ? masked
        : fs.existsSync(original)
          ? original
          : path.join(process.cwd(), 'public', 'projects', 'detail', `${pageName}.webp`)
      const image = await sharp(input)
        .flatten({ background: '#ffffff' })
        .resize({ width: 520 })
        .png()
        .toBuffer({ resolveWithObject: true })
      const label = Buffer.from(
        `<svg width="520" height="54"><rect width="520" height="54" fill="#111"/>` +
        `<text x="16" y="36" fill="#fff" font-size="26" font-family="Arial">${pageName}</text></svg>`,
      )
      panels.push({ image, label })
    }

    const maxHeight = Math.max(...panels.map(({ image }) => image.info.height + 54))
    const composites = []
    panels.forEach((panel, index) => {
      composites.push(
        { input: panel.label, left: index * 520, top: 0 },
        { input: panel.image.data, left: index * 520, top: 54 },
      )
    })

    const output = path.join(outputDir, `${name}.png`)
    await sharp({
      create: {
        width: panels.length * 520,
        height: maxHeight,
        channels: 3,
        background: '#111111',
      },
    })
      .composite(composites)
      .png()
      .toFile(output)
    console.log(`${output}: ${panels.length * 520}x${maxHeight}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
