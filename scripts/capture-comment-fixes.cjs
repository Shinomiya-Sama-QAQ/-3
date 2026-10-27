const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

async function main() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate))
  const browser = await chromium.launch({ headless: true, executablePath })
  const page = await browser.newPage({ viewport: { width: 1575, height: 892 } })
  const issues = []

  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))

  const output = path.join(process.cwd(), '.preview')
  fs.mkdirSync(output, { recursive: true })

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3400)
  await page.screenshot({ path: path.join(output, 'hero-1575.png') })
  await page.locator('.brand-mark').screenshot({
    path: path.join(output, 'africa-heart-brand.png'),
  })

  await page.evaluate(() => {
    const section = document.getElementById('profile')
    window.scrollTo(0, section.offsetTop + 500)
  })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: path.join(output, 'profile-highlights-1575.png') })

  await page.evaluate(() => {
    const list = document.getElementById('experience')
    const top = list.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, top - 110)
  })
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(output, 'experience-no-icons-1575.png') })

  await page.evaluate(() => {
    const grid = document.querySelector('.strength-grid')
    const top = grid.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, top - 100)
  })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: path.join(output, 'capabilities-1213.png') })

  const strengthState = await page.evaluate(() => ({
    visuals: document.querySelectorAll('.strength-visual').length,
    cards: document.querySelectorAll('.strength-card').length,
    cardState: Array.from(document.querySelectorAll('.strength-card')).map((card) => ({
      className: card.className,
      opacity: getComputedStyle(card).opacity,
      visualOpacity: getComputedStyle(card.querySelector('.strength-visual, .signal-map')).opacity,
    })),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))

  await page.evaluate(() => {
    const section = document.getElementById('contact')
    window.scrollTo(0, section.offsetTop)
  })
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(output, 'contact-copy-1575.png') })

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(450)
  await page.locator('.header-contact').click()
  await page.waitForTimeout(750)
  await page.screenshot({ path: path.join(output, 'contact-qr-1213.png') })

  const qrState = await page.evaluate(() => {
    const card = document.querySelector('.contact-qr-card')
    const rect = card.getBoundingClientRect()
    return {
      card: { top: rect.top, bottom: rect.bottom, width: rect.width },
      viewport: { width: innerWidth, height: innerHeight },
      title: document.querySelector('#contact-qr-title')?.textContent.trim(),
      qrLoaded: Boolean(document.querySelector('.contact-qr-frame img')?.naturalWidth),
    }
  })

  console.log(JSON.stringify({ strengthState, qrState, issues, output }, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
