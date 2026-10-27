const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

async function main() {
  const previewUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:5173'
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate))
  const browser = await chromium.launch({ headless: true, executablePath })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const issues = []

  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))

  const output = path.join(process.cwd(), '.preview', 'motion')
  fs.mkdirSync(output, { recursive: true })

  await page.goto(previewUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-opening]')

  const moments = [
    ['opening-01', 180],
    ['opening-02', 720],
    ['opening-03', 1450],
    ['opening-04', 2100],
    ['hero-final', 3400],
  ]

  let elapsed = 0
  for (const [name, time] of moments) {
    await page.waitForTimeout(time - elapsed)
    elapsed = time
    await page.screenshot({ path: path.join(output, `${name}.png`) })
  }

  await page.evaluate(() => {
    window.scrollTo(0, document.getElementById('work').offsetTop)
  })
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(output, 'work-sequence-01.png') })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(output, 'work-sequence-02.png') })
  await page.waitForTimeout(1100)
  await page.screenshot({ path: path.join(output, 'work-sequence-03.png') })

  for (const [id, wait] of [
    ['profile', 1450],
    ['work', 1700],
    ['capabilities', 1450],
    ['contact', 1200],
  ]) {
    await page.evaluate((sectionId) => {
      const section = document.getElementById(sectionId)
      window.scrollTo(0, section.offsetTop)
    }, id)
    await page.waitForTimeout(wait)
    await page.screenshot({ path: path.join(output, `${id}.png`) })
  }

  const state = await page.evaluate(() => {
    const titleLines = Array.from(document.querySelectorAll('[data-title-line-inner]'))
    const visibleCards = Array.from(
      document.querySelectorAll('.project-card, .mini-project-card'),
    ).filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.bottom > 0 && rect.top < innerHeight
    })

    return {
      viewport: [innerWidth, innerHeight],
      pageHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      openingDisplay: getComputedStyle(document.querySelector('[data-opening]')).display,
      bodyOverflow: document.body.style.overflow,
      hiddenTitleLines: titleLines
        .filter((element) => getComputedStyle(element).opacity === '0')
        .length,
      visibleCards: visibleCards.length,
      hiddenVisibleCards: visibleCards
        .filter((element) => Number(getComputedStyle(element).opacity) < 0.95)
        .length,
      masksNotOpen: Array.from(document.querySelectorAll('[data-image-mask]'))
        .filter((element) => {
          const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
          return Math.abs(matrix.d) > 0.02
        })
        .length,
      brokenImages: Array.from(document.images)
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute('src')),
    }
  })

  const reducedPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  reducedPage.on('pageerror', (error) => issues.push(`reduced pageerror: ${error.message}`))
  await reducedPage.goto(previewUrl, { waitUntil: 'networkidle' })
  await reducedPage.waitForTimeout(450)
  const reducedState = await reducedPage.evaluate(() => ({
    openingDisplay: getComputedStyle(document.querySelector('[data-opening]')).display,
    bodyOverflow: document.body.style.overflow,
    titleTransforms: Array.from(document.querySelectorAll('[data-title-line-inner]'))
      .map((element) => getComputedStyle(element).transform),
    cardOpacities: Array.from(document.querySelectorAll('.project-card'))
      .map((element) => getComputedStyle(element).opacity),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  await reducedPage.close()

  console.log(JSON.stringify({ state, reducedState, issues, output }, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
