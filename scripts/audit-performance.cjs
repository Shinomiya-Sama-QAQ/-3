const fs = require('node:fs')
const { chromium } = require('playwright')

async function main() {
  const previewUrl = process.env.PERF_URL || 'http://127.0.0.1:4173'
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate))
  const browser = await chromium.launch({ headless: true, executablePath })
  const page = await browser.newPage({ viewport: { width: 1575, height: 892 } })
  const cdp = await page.context().newCDPSession(page)
  const issues = []

  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  page.on('requestfailed', (request) => {
    issues.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ''}`)
  })

  await page.addInitScript(() => {
    window.__audit = {
      lcp: 0,
      cls: 0,
      longTasks: [],
      listeners: {},
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__audit.lcp = Math.max(window.__audit.lcp, entry.startTime + entry.duration)
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {}

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__audit.cls += entry.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {}

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__audit.longTasks.push({
            start: Math.round(entry.startTime),
            duration: Math.round(entry.duration),
          })
        }
      }).observe({ type: 'longtask', buffered: true })
    } catch {}

    const addEventListener = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function patchedAddEventListener(type, listener, options) {
      if (this === window) {
        window.__audit.listeners[type] = (window.__audit.listeners[type] || 0) + 1
      }
      return addEventListener.call(this, type, listener, options)
    }
  })

  await page.goto(previewUrl, {
    waitUntil: 'load',
  })
  await page.waitForTimeout(3800)

  const initial = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const images = resources.filter((entry) => entry.initiatorType === 'img')
    const scripts = resources.filter((entry) => entry.initiatorType === 'script')
    const media = resources.filter((entry) => entry.initiatorType === 'video')
    const summarize = (items) => ({
      count: items.length,
      transferKB: Math.round(items.reduce((sum, item) => sum + (item.transferSize || 0), 0) / 1024),
      decodedKB: Math.round(items.reduce((sum, item) => sum + (item.decodedBodySize || 0), 0) / 1024),
    })

    return {
      lcpMs: Math.round(window.__audit.lcp),
      cls: Number(window.__audit.cls.toFixed(4)),
      longTasks: window.__audit.longTasks,
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
      loadMs: Math.round(nav.loadEventEnd),
      resources: {
        total: summarize(resources),
        images: summarize(images),
        scripts: summarize(scripts),
        media: summarize(media),
      },
      listenerCounts: window.__audit.listeners,
      video: (() => {
        const video = document.querySelector('.hero-video')
        return {
          currentSrc: video?.currentSrc,
          duration: Number(video?.duration.toFixed(2)),
          readyState: video?.readyState,
          paused: video?.paused,
        }
      })(),
      lazyImages: Array.from(document.images).map((image) => ({
        src: image.getAttribute('src'),
        loading: image.getAttribute('loading') || 'eager',
        complete: image.complete,
      })),
    }
  })

  await page.evaluate(() => {
    const profile = document.getElementById('profile')
    window.scrollTo(0, profile.offsetTop + 450)
  })
  await page.waitForTimeout(1600)

  const scrolled = await page.evaluate(async () => {
    const canvas = document.querySelector('.liquid-ether__canvas')
    const frames = await new Promise((resolve) => {
      let count = 0
      const start = performance.now()
      const tick = (now) => {
        count += 1
        if (now - start >= 1500) {
          resolve({
            frames: count,
            fps: Math.round((count * 1000) / (now - start)),
          })
        } else {
          requestAnimationFrame(tick)
        }
      }
      requestAnimationFrame(tick)
    })

    return {
      frames,
      canvas: canvas
        ? {
          width: canvas.width,
          height: canvas.height,
          displayWidth: canvas.clientWidth,
          displayHeight: canvas.clientHeight,
        }
        : null,
      runningAnimations: document.getAnimations()
        .filter((animation) => animation.playState === 'running').length,
      motionScopes: Array.from(document.querySelectorAll('[data-motion-scope]')).map((scope) => ({
        className: scope.className,
        visible: scope.classList.contains('is-motion-visible'),
      })),
      heroVideo: (() => {
        const video = document.querySelector('.hero-video')
        return video
          ? {
            paused: video.paused,
            currentSrc: video.currentSrc,
          }
          : null
      })(),
      runningAnimationNames: Array.from(document.getAnimations())
        .filter((animation) => animation.playState === 'running')
        .map((animation) => animation.animationName || 'unnamed'),
      listenerCounts: window.__audit.listeners,
      visibleImages: Array.from(document.images)
        .filter((image) => {
          const rect = image.getBoundingClientRect()
          return rect.bottom > 0 && rect.top < innerHeight
        })
        .map((image) => ({
          src: image.currentSrc,
          displayedWidth: Math.round(image.getBoundingClientRect().width),
          naturalWidth: image.naturalWidth,
          decoded: image.complete && image.naturalWidth > 0,
        })),
    }
  })

  await page.evaluate(() => {
    const work = document.getElementById('work')
    window.scrollTo(0, work.offsetTop + 180)
  })
  await page.waitForTimeout(1400)
  const imageFormats = await page.evaluate(() => ({
    cover: document.querySelector('.project-card img')?.currentSrc,
    coverSource: document.querySelector('.project-card source')?.srcset,
    webglLoaded: performance.getEntriesByType('resource')
      .some((entry) => /LiquidEther-.*\.js/.test(entry.name)),
  }))

  await page.locator('.project-card').first().click()
  await page.waitForTimeout(1200)
  const modal = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('.modal-page img'))
    return {
      firstImage: images[0]?.currentSrc,
      firstSource: document.querySelector('.modal-page source')?.srcset,
      firstSize: [images[0]?.naturalWidth, images[0]?.naturalHeight],
      loadingModes: images.map((image) => image.loading),
    }
  })
  await page.locator('.modal-close').click()

  const lowPowerPage = await browser.newPage({ viewport: { width: 1575, height: 892 } })
  await lowPowerPage.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 1 })
  })
  await lowPowerPage.goto(previewUrl, { waitUntil: 'load' })
  await lowPowerPage.waitForTimeout(3800)
  await lowPowerPage.evaluate(() => {
    window.scrollTo(0, document.getElementById('profile').offsetTop + 450)
  })
  await lowPowerPage.waitForTimeout(800)
  const lowPower = await lowPowerPage.evaluate(() => ({
    backdropStatic: document.querySelector('.liquid-backdrop')?.classList.contains('is-static'),
    canvas: Boolean(document.querySelector('.liquid-ether__canvas')),
    webglLoaded: performance.getEntriesByType('resource')
      .some((entry) => /LiquidEther-.*\.js/.test(entry.name)),
  }))
  await lowPowerPage.close()

  await cdp.send('Performance.enable')
  const metrics = await cdp.send('Performance.getMetrics')
  const metricMap = Object.fromEntries(metrics.metrics.map((item) => [item.name, item.value]))
  const getListenerCounts = async (expression) => {
    const evaluated = await cdp.send('Runtime.evaluate', { expression })
    const listeners = await cdp.send('DOMDebugger.getEventListeners', {
      objectId: evaluated.result.objectId,
    })
    return listeners.listeners.reduce((counts, listener) => {
      counts[listener.type] = (counts[listener.type] || 0) + 1
      return counts
    }, {})
  }
  const actualListeners = {
    window: await getListenerCounts('window'),
    document: await getListenerCounts('document'),
  }

  console.log(JSON.stringify({
    initial,
    scrolled,
    imageFormats,
    modal,
    lowPower,
    actualListeners,
    runtime: {
      jsHeapMB: Math.round((metricMap.JSHeapUsedSize || 0) / 1024 / 1024 * 10) / 10,
      layoutCount: metricMap.LayoutCount,
      recalcStyleCount: metricMap.RecalcStyleCount,
      nodes: metricMap.Nodes,
    },
    issues,
  }, null, 2))

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
