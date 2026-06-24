// Whole-slice real-path verification: walk the hall down into the descent,
// inspect the descent chapter, win both minigames, and confirm persistence.
import puppeteer from 'puppeteer-core'

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = process.env.OUT || '.'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function boot(url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(url, { waitUntil: 'networkidle0' })
  for (let i = 0; i < 80; i++) {
    if (await page.evaluate(() => !!(window.__kbx && window.__kbx.ready))) break
    await sleep(150)
  }
  return { browser, page, errors }
}

// === A. walk hall -> descent, then inspect the descent chapter ===
{
  const { browser, page, errors } = await boot('http://localhost:5173/')
  await sleep(3600) // past intro lock
  await page.keyboard.down('KeyW')
  await sleep(24000) // long walk: through the hall, through the arch, down the grand stair, to the balustrade
  await page.keyboard.up('KeyW')
  await sleep(1200)
  const p1 = await page.evaluate(() => window.__kbx.getCam())
  console.log('A1 descended to y =', p1[1].toFixed(2), 'z =', p1[2].toFixed(2), '(expect y < -8: on the landing)')
  await page.screenshot({ path: `${OUT}/slice-descended.png` })

  // strafe to the descent lectern and read it
  await page.keyboard.down('KeyA')
  await sleep(1700)
  await page.keyboard.up('KeyA')
  await sleep(500)
  const prompt = await page.evaluate(() => document.querySelector('.kb-prompt')?.innerText?.trim())
  console.log('A2 descent prompt =', JSON.stringify(prompt))
  await page.keyboard.press('KeyE')
  await sleep(900)
  const title = await page.evaluate(() => document.querySelector('.kb-read__title')?.innerText)
  console.log('A3 descent inscription =', JSON.stringify(title), '(expect "The Descent")')
  console.log('   pageerrors:', errors.length ? errors.join(' | ') : 'none')
  await browser.close()
}

// === B. both minigame wins + persistence across reload ===
{
  const { browser, page } = await boot('http://localhost:5173/?solve=1')
  await sleep(3200) // veil gone

  await page.evaluate(() => window.__kbx.launch('astrolabe'))
  await sleep(700)
  await page.evaluate(() => document.querySelectorAll('.kb-astro__ring')[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await sleep(800)
  const winA = await page.evaluate(() => document.querySelector('.kb-game__win')?.innerText)
  console.log('B1 astrolabe win =', JSON.stringify(winA))
  await page.evaluate(() => window.__kbx.clearUI())
  await sleep(300)

  await page.evaluate(() => window.__kbx.launch('braziers'))
  await sleep(700)
  await page.evaluate(() => document.querySelectorAll('.kb-braz__node')[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await sleep(800)
  const winB = await page.evaluate(() => document.querySelector('.kb-game__win')?.innerText)
  console.log('B2 braziers win =', JSON.stringify(winB))
  await page.screenshot({ path: `${OUT}/slice-braziers-win.png` })

  const before = await page.evaluate(() => localStorage.getItem('katabasis-progress'))
  console.log('B3 progress saved =', before)

  // reload and confirm persistence survived
  await page.reload({ waitUntil: 'networkidle0' })
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => !!window.__kbx?.ready)) break
    await sleep(150)
  }
  const after = await page.evaluate(() => localStorage.getItem('katabasis-progress'))
  const parsed = JSON.parse(after || '{}')
  const solved = parsed?.state?.solved || {}
  console.log('B4 after reload, solved =', JSON.stringify(solved), '(expect astrolabe + braziers true)')
  await browser.close()
}
