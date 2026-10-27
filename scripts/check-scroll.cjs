const fs = require('node:fs')
const { chromium } = require('playwright')

async function main() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate))
  const browser = await chromium.launch({ headless: true, executablePath })
  const page = await browser.newPage({ viewport: { width: 1213, height: 892 } })

  const readState = () => page.evaluate(() => ({
    scrollY,
    bodyOverflow: document.body.style.overflow,
    htmlOverflow: document.documentElement.style.overflow,
    bodyHeight: document.body.getBoundingClientRect().height,
    pageHeight: document.documentElement.scrollHeight,
    contactModal: Boolean(document.querySelector('.contact-qr-modal')),
    projectModal: Boolean(document.querySelector('.project-modal')),
  }))

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3800)
  const initial = await readState()

  await page.evaluate(() => window.scrollTo(0, 2200))
  await page.waitForTimeout(500)
  const afterInitialScroll = await readState()

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  await page.locator('.header-contact').click()
  await page.waitForTimeout(300)
  const contactOpen = await readState()
  await page.locator('.contact-qr-close').click()
  await page.waitForTimeout(400)
  const contactClosed = await readState()
  await page.evaluate(() => window.scrollTo(0, 2200))
  await page.waitForTimeout(500)
  const afterContactScroll = await readState()

  await page.locator('#work').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await page.locator('.project-card').first().click()
  await page.waitForTimeout(300)
  const projectOpen = await readState()
  await page.locator('.modal-close').click()
  await page.waitForTimeout(400)
  await page.evaluate(() => window.scrollTo(0, 5000))
  await page.waitForTimeout(500)
  const afterProjectScroll = await readState()

  const racePage = await browser.newPage({ viewport: { width: 1213, height: 892 } })
  await racePage.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' })
  await racePage.waitForTimeout(1850)
  await racePage.locator('.header-contact').click()
  await racePage.waitForTimeout(1900)
  await racePage.locator('.contact-qr-close').click()
  await racePage.waitForTimeout(400)
  await racePage.evaluate(() => window.scrollTo(0, 1800))
  await racePage.waitForTimeout(450)
  const afterOpeningRace = await racePage.evaluate(() => ({
    scrollY,
    bodyOverflow: document.body.style.overflow,
    htmlOverflow: document.documentElement.style.overflow,
    contactModal: Boolean(document.querySelector('.contact-qr-modal')),
  }))
  await racePage.close()

  console.log(JSON.stringify({
    initial,
    afterInitialScroll,
    contactOpen,
    contactClosed,
    afterContactScroll,
    projectOpen,
    afterProjectScroll,
    afterOpeningRace,
  }, null, 2))

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
