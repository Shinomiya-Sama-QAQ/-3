const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const root = process.cwd()
const publicDir = path.join(root, 'public')
const archiveDir = path.join(root, 'source-assets', 'public-originals')
const maskedDetailDir = path.join(
  root,
  'source-assets',
  'masked-originals',
  'projects',
  'detail',
)
const usedCovers = new Set([
  'cochlear-platform',
  'dental',
  'hepatobiliary-journal',
  'hydrogen-ride',
  'logistics',
  'medical-learning',
  'tumei',
])

function sourceFor(publicRelative) {
  const current = path.join(publicDir, publicRelative)
  if (fs.existsSync(current)) return current
  return path.join(archiveDir, publicRelative)
}

async function optimizeImage(input, output, width, options = {}) {
  const source = await sharp(input).metadata()
  await fs.promises.mkdir(path.dirname(output), { recursive: true })
  const pipeline = sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true, fit: 'inside' })

  await pipeline
    .clone()
    .webp({
      quality: options.quality ?? 78,
      effort: options.effort ?? 5,
      lossless: options.lossless ?? false,
      smartSubsample: true,
    })
    .toFile(output)

  const avifOutput = output.replace(/\.webp$/i, '.avif')
  await pipeline
    .clone()
    .avif({
      quality: options.avifQuality ?? 55,
      effort: options.avifEffort ?? 5,
      chromaSubsampling: '4:2:0',
    })
    .toFile(avifOutput)

  const before = fs.statSync(input).size
  const after = fs.statSync(output).size
  const avifAfter = fs.statSync(avifOutput).size
  return {
    input: path.relative(root, input),
    output: path.relative(root, output),
    sourceSize: `${source.width}x${source.height}`,
    beforeKB: Math.round(before / 1024),
    afterKB: Math.round(after / 1024),
    avifKB: Math.round(avifAfter / 1024),
  }
}

async function main() {
  const results = []
  const coversDir = path.join(publicDir, 'projects')
  const coverSources = [
    ...fs.readdirSync(coversDir).map((name) => path.join(coversDir, name)),
    ...fs.readdirSync(path.join(archiveDir, 'projects'))
      .map((name) => path.join(archiveDir, 'projects', name)),
  ]
    .filter((file) => fs.existsSync(file))
    .filter((name) => /\.(jpe?g|png)$/i.test(name))
    .filter((file) => usedCovers.has(path.parse(file).name))

  for (const input of coverSources) {
    const output = path.join(coversDir, `${path.parse(input).name}.webp`)
    results.push(await optimizeImage(input, output, 1400, { quality: 78 }))
  }

  const tumeiWebsiteSource = path.join(
    archiveDir,
    'projects',
    'detail',
    '131.png',
  )
  const tumeiWebsiteOutput = path.join(coversDir, 'tumei-website.webp')
  const tumeiWebsiteCrop = {
    left: 0,
    top: 0,
    width: 3840,
    height: 2160,
  }
  await sharp(tumeiWebsiteSource)
    .extract(tumeiWebsiteCrop)
    .resize({ width: 1400, height: 788, fit: 'cover' })
    .webp({ quality: 78, effort: 6, smartSubsample: true })
    .toFile(tumeiWebsiteOutput)
  await sharp(tumeiWebsiteSource)
    .extract(tumeiWebsiteCrop)
    .resize({ width: 1400, height: 788, fit: 'cover' })
    .avif({ quality: 55, effort: 5, chromaSubsampling: '4:2:0' })
    .toFile(tumeiWebsiteOutput.replace(/\.webp$/i, '.avif'))

  results.push({
    input: path.relative(root, tumeiWebsiteSource),
    output: path.relative(root, tumeiWebsiteOutput),
    sourceSize: '3840x2160 crop',
    beforeKB: Math.round(fs.statSync(tumeiWebsiteSource).size / 1024),
    afterKB: Math.round(fs.statSync(tumeiWebsiteOutput).size / 1024),
    avifKB: Math.round(
      fs.statSync(tumeiWebsiteOutput.replace(/\.webp$/i, '.avif')).size / 1024,
    ),
  })

  results.push(await optimizeImage(
    sourceFor('portrait-xiaofan.jpg'),
    path.join(publicDir, 'portrait-xiaofan.webp'),
    960,
    { quality: 80 },
  ))

  results.push(await optimizeImage(
    sourceFor('brand-cat.png'),
    path.join(publicDir, 'brand-cat.webp'),
    160,
    { quality: 80 },
  ))

  results.push(await optimizeImage(
    sourceFor('contact-xiaofan-wechat.jpg'),
    path.join(publicDir, 'contact-xiaofan-wechat.webp'),
    520,
    { quality: 90, effort: 6, avifQuality: 70 },
  ))

  results.push(await optimizeImage(
    path.join(archiveDir, 'media', 'hero-user-poster.jpg'),
    path.join(publicDir, 'media', 'hero-poster.webp'),
    1280,
    { quality: 80 },
  ))

  const detailDir = path.join(publicDir, 'projects', 'detail')
  const detailSources = [
    ...fs.readdirSync(detailDir).map((name) => path.join(detailDir, name)),
    ...fs.readdirSync(path.join(archiveDir, 'projects', 'detail'))
      .map((name) => path.join(archiveDir, 'projects', 'detail', name)),
  ]
    .filter((file) => fs.existsSync(file))
    .filter((file) => /\.(jpe?g|png)$/i.test(file))
    .map((file) => {
      const masked = path.join(maskedDetailDir, path.basename(file))
      return fs.existsSync(masked) ? masked : file
    })

  for (const input of detailSources) {
    const output = path.join(detailDir, `${path.parse(input).name}.webp`)
    results.push(await optimizeImage(input, output, 1600, { quality: 76 }))
  }

  console.table(results)
  const before = results.reduce((sum, item) => sum + item.beforeKB, 0)
  const after = results.reduce((sum, item) => sum + item.afterKB, 0)
  console.log(`Optimized ${results.length} images: ${before} KB -> ${after} KB`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
