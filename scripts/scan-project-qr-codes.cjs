const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const sharp = require('sharp')

const TILE_SIZE = 1400
const TILE_STEP = 1050
const PADDING = 32
const SCAN_WIDTH = 6000

async function loadZxing() {
  return import('@zxing/library')
}

function findImageSource(project, page) {
  const pageName = String(page).padStart(2, '0')
  const masked = path.join(
    process.cwd(),
    'source-assets',
    'masked-originals',
    'projects',
    'detail',
    `${pageName}.png`,
  )
  if (fs.existsSync(masked)) return masked
  const original = path.join(
    process.cwd(),
    'source-assets',
    'public-originals',
    'projects',
    'detail',
    `${pageName}.png`,
  )
  if (fs.existsSync(original)) return original
  return path.join(process.cwd(), 'public', 'projects', 'detail', `${pageName}.webp`)
}

function scanTile(zxing, raw, width, height, offsetX, offsetY, originalScale) {
  const source = new zxing.RGBLuminanceSource(raw, width, height)
  const bitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(source))
  const hints = new Map([[zxing.DecodeHintType.TRY_HARDER, true]])

  try {
    const result = new zxing.QRCodeReader().decode(bitmap, hints)
    const points = result.getResultPoints()
    if (!points?.length) return null
    const xs = points.map((point) => point.getX())
    const ys = points.map((point) => point.getY())
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const span = Math.max(maxX - minX, maxY - minY, 24)
    const margin = span * 0.28

    return {
      text: result.getText(),
      x: (offsetX + minX - margin) / originalScale,
      y: (offsetY + minY - margin) / originalScale,
      width: (maxX - minX + margin * 2) / originalScale,
      height: (maxY - minY + margin * 2) / originalScale,
    }
  } catch {
    return null
  }
}

async function scanImage(zxing, input, label) {
  const metadata = await sharp(input).metadata()
  const scanWidth = Math.min(metadata.width, SCAN_WIDTH)
  const scanHeight = Math.round(metadata.height * scanWidth / metadata.width)
  const originalScale = scanWidth / metadata.width
  const image = await sharp(input)
    .flatten({ background: '#ffffff' })
    .resize({ width: scanWidth })
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const detections = []
  const xPositions = []
  const yPositions = []
  for (let x = 0; x < scanWidth; x += TILE_STEP) {
    xPositions.push(Math.min(x, Math.max(0, scanWidth - TILE_SIZE)))
    if (x + TILE_SIZE >= scanWidth) break
  }
  for (let y = 0; y < scanHeight; y += TILE_STEP) {
    yPositions.push(Math.min(y, Math.max(0, scanHeight - TILE_SIZE)))
    if (y + TILE_SIZE >= scanHeight) break
  }

  for (const top of yPositions) {
    for (const left of xPositions) {
      const width = Math.min(TILE_SIZE, scanWidth - left)
      const height = Math.min(TILE_SIZE, scanHeight - top)
      const tile = await sharp(image.data, {
        raw: {
          width: image.info.width,
          height: image.info.height,
          channels: image.info.channels,
        },
      })
        .extract({ left, top, width, height })
        .extend({
          top: PADDING,
          bottom: PADDING,
          left: PADDING,
          right: PADDING,
          background: '#ffffff',
        })
        .raw()
        .toBuffer({ resolveWithObject: true })
      const padded = new Uint8ClampedArray(tile.data.length)
      for (let index = 0; index < tile.data.length; index++) {
        padded[index] = tile.data[index]
      }

      const detection = scanTile(
        zxing,
        padded,
        tile.info.width,
        tile.info.height,
        left - PADDING,
        top - PADDING,
        originalScale,
      )

      if (!detection) continue
      const duplicate = detections.some((existing) =>
        existing.text === detection.text &&
        Math.hypot(
          existing.x + existing.width / 2 - detection.x - detection.width / 2,
          existing.y + existing.height / 2 - detection.y - detection.height / 2,
        ) < 180,
      )
      if (!duplicate) detections.push(detection)
    }
  }

  return {
    label,
    input: path.relative(process.cwd(), input),
    width: metadata.width,
    height: metadata.height,
    detections,
  }
}

async function main() {
  const zxing = await loadZxing()
  const dataUrl = pathToFileURL(path.join(process.cwd(), 'src', 'data.js')).href
  const { projects, miniProjects } = await import(dataUrl)
  const allProjects = [...projects, ...miniProjects]
  const results = []

  for (const project of allProjects) {
    const cover = path.join(
      process.cwd(),
      'public',
      project.image.replace(/^\//, '').replace(/\.webp$/i, '.webp'),
    )
    if (fs.existsSync(cover)) {
      results.push(await scanImage(zxing, cover, `${project.id}:cover`))
    }
    for (const page of project.detailPages || []) {
      const input = findImageSource(project, page)
      results.push(await scanImage(zxing, input, `${project.id}:${page}`))
    }
  }

  const output = path.join(process.cwd(), '.preview', 'project-qr-scan.json')
  fs.writeFileSync(output, JSON.stringify(results, null, 2))
  console.log(JSON.stringify({
    output,
    scanned: results.length,
    matches: results.reduce((total, item) => total + item.detections.length, 0),
    files: results
      .filter((item) => item.detections.length)
      .map((item) => ({
        label: item.label,
        detections: item.detections.map(({ x, y, width, height }) => ({
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        })),
      })),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
