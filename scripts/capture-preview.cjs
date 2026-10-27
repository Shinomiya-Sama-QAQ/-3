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

  await page.goto(previewUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)

  const output = path.join(process.cwd(), '.preview')
  fs.mkdirSync(output, { recursive: true })
  await page.screenshot({ path: path.join(output, 'hero.png') })

  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < totalHeight; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y)
    await page.waitForTimeout(100)
  }
  await page.waitForTimeout(600)

  for (const id of ['profile', 'work', 'capabilities', 'contact']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(450)
    await page.locator(`#${id}`).screenshot({ path: path.join(output, `${id}.png`) })
  }

  await page.locator('#work').scrollIntoViewIfNeeded()
  await page.locator('.project-card').first().click()
  await page.waitForTimeout(350)
  await page.screenshot({ path: path.join(output, 'modal.png') })
  const modalGallery = page.locator('.modal-image')
  const galleryBefore = await modalGallery.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  }))
  await modalGallery.evaluate((element) => {
    element.scrollTop = element.scrollHeight * 0.48
  })
  await page.waitForTimeout(700)
  const galleryAfter = await modalGallery.evaluate((element) => ({
    scrollTop: element.scrollTop,
    visiblePages: Array.from(element.querySelectorAll('.modal-page'))
      .filter((page) => {
        const rect = page.getBoundingClientRect()
        return rect.bottom > 0 && rect.top < innerHeight
      })
      .length,
    brokenImages: Array.from(element.querySelectorAll('img'))
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  }))
  await page.screenshot({ path: path.join(output, 'modal-scrolled.png') })
  await page.keyboard.press('Escape')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(output, 'full.png'), fullPage: true })

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(350)
  const contactHeader = await page.evaluate(() => {
    const header = document.querySelector('.site-header')
    return {
      className: header.className,
      color: getComputedStyle(header).color,
    }
  })

  await page.evaluate(() => window.scrollTo(0, window.innerHeight + 160))
  await page.waitForTimeout(450)
  const pinnedHeader = await page.evaluate(() => {
    const header = document.querySelector('.site-header')
    const styles = getComputedStyle(header)
    return {
      className: header.className,
      top: styles.top,
      borderRadius: styles.borderRadius,
      background: styles.backgroundColor,
      backdropFilter: styles.backdropFilter,
    }
  })
  await page.screenshot({ path: path.join(output, 'pinned-header.png') })

  await page.locator('#profile').scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  const profileCard = page.locator('.border-glow-card').first()
  const profileBox = await profileCard.boundingBox()
  if (profileBox) {
    await page.mouse.move(
      profileBox.x + profileBox.width - 8,
      profileBox.y + Math.min(160, profileBox.height / 2),
    )
    await page.waitForTimeout(350)
  }
  await page.screenshot({ path: path.join(output, 'profile-border-glow.png') })

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(450)
  await page.locator('.header-contact').click()
  await page.waitForTimeout(750)
  await page.screenshot({ path: path.join(output, 'contact-qr.png') })
  const contactQrState = await page.evaluate(() => {
    const qr = document.querySelector('.contact-qr-frame img')
    return {
      visible: Boolean(document.querySelector('.contact-qr-modal')),
      title: document.querySelector('#contact-qr-title')?.textContent.trim(),
      qrSrc: qr?.getAttribute('src'),
      qrLoaded: Boolean(qr?.complete && qr?.naturalWidth),
    }
  })
  await page.locator('.contact-qr-close').click()

  const glowState = await page.evaluate(() => {
    const card = document.querySelector('.border-glow-card')
    return {
      edgeProximity: getComputedStyle(card).getPropertyValue('--edge-proximity').trim(),
      cursorAngle: getComputedStyle(card).getPropertyValue('--cursor-angle').trim(),
      borderRadius: getComputedStyle(card).borderRadius,
    }
  })

  const diagnostics = await page.evaluate(() => {
    const video = document.querySelector('.hero-video')
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      videoReadyState: video.readyState,
      brokenImages: Array.from(document.images)
        .filter(image => !image.complete || image.naturalWidth === 0)
        .map(image => image.getAttribute('src')),
    }
  })

  console.log(
    JSON.stringify(
      {
        pageHeight: totalHeight,
        heroTitle: await page.locator('.hero h1').innerText(),
        projectCards: await page.locator('.project-card').count(),
        miniProjectCards: await page.locator('.mini-project-card').count(),
        diagnostics,
        contactHeader,
        pinnedHeader,
        galleryBefore,
        galleryAfter,
        glowState,
        contactQrState,
        issues,
        output,
      },
      null,
      2,
    ),
  )

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
