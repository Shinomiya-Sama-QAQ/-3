const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const root = process.cwd()
const sourceDir = path.join(root, 'source-assets', 'public-originals', 'projects', 'detail')
const outputDir = path.join(root, 'source-assets', 'masked-originals', 'projects', 'detail')

const footerMasks = [2410, 2648, 2885, 3130].map((left) => ({
  left,
  bottom: 685,
  width: 185,
  height: 190,
}))

const invoiceMasks = [
  { left: 1958, top: 8928, width: 48, height: 48 },
  { left: 2388, top: 8928, width: 48, height: 48 },
  { left: 2820, top: 8928, width: 48, height: 48 },
  { left: 1958, top: 9303, width: 48, height: 48 },
  { left: 2388, top: 9303, width: 48, height: 48 },
  { left: 3135, top: 9404, width: 52, height: 52 },
]

async function makeMosaic(input, region) {
  const blockWidth = Math.max(2, Math.round(region.width / 24))
  const blockHeight = Math.max(2, Math.round(region.height / 24))
  const tiny = await sharp(input)
    .extract(region)
    .resize({
      width: blockWidth,
      height: blockHeight,
      kernel: 'nearest',
    })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const mosaicked = await sharp(tiny.data, {
    raw: {
      width: tiny.info.width,
      height: tiny.info.height,
      channels: tiny.info.channels,
    },
  })
    .resize({
      width: region.width,
      height: region.height,
      kernel: 'nearest',
    })
    .blur(0.6)
    .png()
    .toBuffer()
  const tint = Buffer.from(
    `<svg width="${region.width}" height="${region.height}">` +
    `<rect width="100%" height="100%" fill="#dce8f2" fill-opacity="0.32"/></svg>`,
  )
  return sharp(mosaicked)
    .composite([{ input: tint }])
    .png()
    .toBuffer()
}

async function maskPage(page) {
  const input = path.join(sourceDir, `${page}.png`)
  if (!fs.existsSync(input)) return []
  const metadata = await sharp(input).metadata()
  const regions = footerMasks.map((mask) => ({
    left: mask.left,
    top: metadata.height - mask.bottom,
    width: mask.width,
    height: mask.height,
  }))
  if (page === '132') regions.push(...invoiceMasks)

  const overlays = []
  for (const region of regions) {
    overlays.push({
      input: await makeMosaic(input, region),
      left: region.left,
      top: region.top,
    })
  }

  const output = path.join(outputDir, `${page}.png`)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  await sharp(input).composite(overlays).png().toFile(output)
  return regions
}

async function main() {
  const results = []
  for (const page of ['131', '132', '133', '134', '135']) {
    const regions = await maskPage(page)
    results.push({
      page,
      regions,
      output: path.relative(root, path.join(outputDir, `${page}.png`)),
    })
  }
  console.log(JSON.stringify(results, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
