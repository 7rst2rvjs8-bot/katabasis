// Screenshot harness - my eyes for the visual loop.
// Launches the INSTALLED Chrome on the real GPU (no swiftshader), loads the dev
// server, reads the GPU string, then captures every camera vantage the scene
// exposes via window.__kbx.shots. Reports the renderer so colour/bloom/tone
// critiques can be trusted (or flagged provisional if software).
import puppeteer from 'puppeteer-core'

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = process.env.URL || 'http://localhost:5173/'
const OUT = process.env.OUT || '.'
const TAG = process.env.TAG || 'shot'
const W = +(process.env.W || 1280)
const H = +(process.env.H || 800)
const SOFTWARE = process.env.SOFTWARE === '1'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

const args = ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb', '--ignore-gpu-blocklist']
if (SOFTWARE) args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader')
else args.push('--enable-gpu', '--use-angle=metal')

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args })
const page = await browser.newPage()
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
page.on('console', (m) => m.type() === 'error' && errors.push('CONSOLE: ' + m.text()))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(URL, { waitUntil: 'networkidle0' })

// wait for the scene bridge
let ready = false
for (let i = 0; i < 80; i++) {
  ready = await page.evaluate(() => !!(window.__kbx && window.__kbx.ready))
  if (ready) break
  await sleep(150)
}
if (!ready) {
  console.log('SCENE NEVER BECAME READY (window.__kbx.ready). Errors:')
  console.log(errors.length ? errors.join('\n') : '(none captured)')
  await browser.close()
  process.exit(1)
}

const env = await page.evaluate(() => ({ gpu: window.__kbx.gpu, gl2: window.__kbx.isWebGL2, shots: Object.keys(window.__kbx.shots || {}) }))
const software = /swiftshader|llvmpipe|software/i.test(env.gpu)
console.log(`GPU       : ${env.gpu}`)
console.log(`WebGL2    : ${env.gl2}`)
console.log(`MODE      : ${software ? 'SOFTWARE (colour/tone critiques PROVISIONAL)' : 'HARDWARE (critiques valid)'}`)
console.log(`vantages  : ${env.shots.join(', ')}`)

await sleep(500)
for (const name of env.shots) {
  await page.evaluate((n) => {
    const s = window.__kbx.shots[n]
    window.__kbx.setCam(...s)
  }, name)
  await sleep(450)
  const file = `${OUT}/${TAG}-${name}.png`
  await page.screenshot({ path: file })
  console.log(`shot      : ${file}`)
}

console.log('errors    :', errors.length ? '\n  ' + errors.join('\n  ') : 'none')
await browser.close()
