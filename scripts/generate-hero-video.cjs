const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

async function main() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    chromium.executablePath(),
  ]
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate))
  const browser = await chromium.launch({
    headless: true,
    executablePath,
  })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })

  await page.setContent(`
    <!doctype html>
    <html>
      <body style="margin:0;background:#080b09">
        <canvas id="backdrop" width="1280" height="720"></canvas>
      </body>
    </html>
  `)

  const result = await page.evaluate(async () => {
    const canvas = document.getElementById('backdrop')
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const duration = 10000
    let poster = ''

    const hash = (value) => {
      const x = Math.sin(value * 91.733) * 43758.5453
      return x - Math.floor(x)
    }

    const draw = (time) => {
      const phase = ((time % duration) / duration) * Math.PI * 2
      ctx.clearRect(0, 0, width, height)

      const base = ctx.createLinearGradient(0, 0, width, height)
      base.addColorStop(0, '#050806')
      base.addColorStop(0.45, '#0a110c')
      base.addColorStop(1, '#050706')
      ctx.fillStyle = base
      ctx.fillRect(0, 0, width, height)

      const auraX = width * 0.7 + Math.sin(phase) * 35
      const auraY = height * 0.45 + Math.cos(phase) * 18
      const aura = ctx.createRadialGradient(auraX, auraY, 8, auraX, auraY, 390)
      aura.addColorStop(0, 'rgba(134, 219, 96, 0.22)')
      aura.addColorStop(0.35, 'rgba(91, 152, 72, 0.1)')
      aura.addColorStop(1, 'rgba(4, 8, 5, 0)')
      ctx.fillStyle = aura
      ctx.fillRect(0, 0, width, height)

      const cold = ctx.createRadialGradient(
        width * 0.2,
        height * 0.18,
        0,
        width * 0.2,
        height * 0.18,
        360,
      )
      cold.addColorStop(0, 'rgba(87, 139, 125, 0.1)')
      cold.addColorStop(1, 'rgba(4, 8, 5, 0)')
      ctx.fillStyle = cold
      ctx.fillRect(0, 0, width, height)

      const horizon = height * 0.58
      const vanishX = width * 0.566

      ctx.save()
      ctx.globalAlpha = 0.18
      ctx.strokeStyle = '#a7c496'
      ctx.lineWidth = 0.55

      for (let i = -22; i <= 22; i += 1) {
        const bottomX = vanishX + i * 64
        ctx.beginPath()
        ctx.moveTo(vanishX, horizon)
        ctx.lineTo(bottomX, height + 40)
        ctx.stroke()
      }

      const travel = (phase / (Math.PI * 2)) % 1
      for (let i = 0; i < 18; i += 1) {
        const depth = ((i / 18 + travel) % 1) ** 2
        const y = horizon + depth * (height - horizon) * 1.1
        const spread = 110 + depth * (width * 0.95)
        ctx.beginPath()
        ctx.moveTo(vanishX - spread, y)
        ctx.quadraticCurveTo(vanishX, y - 22 * depth, vanishX + spread, y)
        ctx.stroke()
      }
      ctx.restore()

      ctx.save()
      ctx.translate(auraX, auraY)
      ctx.rotate(Math.sin(phase * 0.75) * 0.08)
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath()
        ctx.ellipse(
          0,
          0,
          235 + i * 91,
          76 + i * 38,
          -0.18 + i * 0.09,
          0,
          Math.PI * 2,
        )
        ctx.strokeStyle = `rgba(168, 255, 118, ${0.095 - i * 0.014})`
        ctx.lineWidth = 0.9
        ctx.stroke()
      }
      ctx.restore()

      for (let ribbon = 0; ribbon < 4; ribbon += 1) {
        ctx.beginPath()
        for (let i = 0; i <= 120; i += 1) {
          const x = (i / 120) * width
          const y =
            height * (0.44 + ribbon * 0.032) +
            Math.sin(i * 0.055 + phase + ribbon * 0.7) * (34 + ribbon * 7) +
            Math.cos(i * 0.021 - phase * 0.7) * 21
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgba(181, 242, 139, ${0.07 - ribbon * 0.011})`
        ctx.lineWidth = ribbon === 0 ? 1.1 : 0.65
        ctx.stroke()
      }

      for (let i = 0; i < 70; i += 1) {
        const local = (hash(i * 3.17) * duration + time) % duration
        const life = local / duration
        const x = hash(i * 8.13) * width + Math.sin(phase + i) * 9
        const y = height * (1 - life) + hash(i * 4.77) * 30
        const radius = 0.35 + hash(i * 2.21) * 1.25
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(190, 246, 153, ${0.08 + hash(i) * 0.2})`
        ctx.fill()
      }

      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.1,
        width / 2,
        height / 2,
        width * 0.72,
      )
      vignette.addColorStop(0.25, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(0,0,0,0.74)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)
    }

    const stream = canvas.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
    })
    const chunks = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    const stopped = new Promise((resolve) => {
      recorder.onstop = resolve
    })

    const start = performance.now()
    recorder.start(250)

    await new Promise((resolve) => {
      let capturedPoster = false
      const frame = (now) => {
        const elapsed = now - start
        draw(elapsed)
        if (!capturedPoster && elapsed > 2600) {
          poster = canvas.toDataURL('image/jpeg', 0.9)
          capturedPoster = true
        }
        if (elapsed < duration) requestAnimationFrame(frame)
        else resolve()
      }
      requestAnimationFrame(frame)
    })

    recorder.stop()
    await stopped
    const blob = new Blob(chunks, { type: mimeType })
    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const step = 0x8000
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, i + step))
    }

    return { video: btoa(binary), poster, mimeType, size: blob.size }
  })

  const mediaDir = path.join(process.cwd(), 'public', 'media')
  fs.mkdirSync(mediaDir, { recursive: true })
  fs.writeFileSync(path.join(mediaDir, 'hero-bg.webm'), Buffer.from(result.video, 'base64'))
  fs.writeFileSync(
    path.join(mediaDir, 'hero-poster.jpg'),
    Buffer.from(result.poster.split(',')[1], 'base64'),
  )
  console.log(`Generated hero video: ${(result.size / 1024 / 1024).toFixed(2)} MB (${result.mimeType})`)
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
