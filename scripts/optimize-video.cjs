const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path

const root = process.cwd()
const inputCandidates = [
  path.join(root, 'source-assets', 'public-originals', 'media', 'hero-user-original.mp4'),
  path.join(root, 'public', 'media', 'hero-bg.webm'),
  path.join(root, 'source-assets', 'public-originals', 'media', 'hero-bg.webm'),
]
const input = inputCandidates.find((candidate) => fs.existsSync(candidate))
if (!input) throw new Error('Original hero video was not found')
const outputs = [
  {
    file: path.join(root, 'public', 'media', 'hero-user-1280.webm'),
    args: [
      '-c:v', 'libvpx-vp9',
      '-b:v', '0',
      '-crf', '34',
      '-row-mt', '1',
      '-deadline', 'good',
      '-cpu-used', '3',
      '-pix_fmt', 'yuv420p',
    ],
  },
  {
    file: path.join(root, 'public', 'media', 'hero-user-1280.mp4'),
    args: [
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '29',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
    ],
  },
]

for (const output of outputs) {
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel', 'warning',
    '-i', input,
    '-an',
    '-vf', 'scale=1280:-2',
    ...output.args,
    output.file,
  ]
  const result = spawnSync(ffmpeg, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${output.file}`)
  }
  const originalKB = Math.round(fs.statSync(input).size / 1024)
  const outputKB = Math.round(fs.statSync(output.file).size / 1024)
  console.log(`${path.basename(output.file)}: ${originalKB} KB -> ${outputKB} KB`)
}
