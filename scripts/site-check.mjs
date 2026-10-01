// Site check: node scripts/site-check.mjs [paths…]   env: BASE (default www.madvet.in), WIDTH (390 | 1366)
// Loads each page in headless Chrome and reports JS exceptions, console errors, HTTP 4xx/5xx,
// broken images, sideways scroll and error-page text. Run it after every push that touches pages.
// With no paths: the main pages plus every product page (ids from /products/<id> links on /products).
import { spawn } from 'node:child_process'
const CH = process.env.CHROME || '/Users/gauranggarg/Documents/madvet video/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const base = process.env.BASE || 'https://www.madvet.in'
const W = Number(process.env.WIDTH || 390)
let paths = process.argv.slice(2)
if (!paths.length) {
  const html = await (await fetch(base + '/products')).text()
  const ids = [...new Set([...html.matchAll(/\/products\/(\d+)/g)].map(m => m[1]))]
  paths = ['/', '/products', '/videos', '/folder', '/schemes', '/ask', '/about', '/contact', '/careers', ...ids.map(i => '/products/' + i)]
}
const port = 9400 + Math.floor(Math.random() * 400)
const p = spawn(CH, ['--headless', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break } catch { await sleep(200) } }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0; const pend = new Map(); let issues = []
ws.onmessage = e => { const m = JSON.parse(e.data)
  if (pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') issues.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200))
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') issues.push('console.error ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200))
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) issues.push(`HTTP ${m.params.response.status} ${m.params.response.url.slice(0, 140)}`)
  if (m.method === 'Network.loadingFailed' && !m.params.canceled && m.params.errorText !== 'net::ERR_ABORTED') issues.push(`FAILED ${m.params.errorText} ${m.params.requestId}`)
}
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async x => (await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.value
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: W < 768 ? 2 : 1, mobile: W < 768 })
let bad = 0
for (const path of paths) {
  issues = []
  await send('Page.navigate', { url: base + path })
  await sleep(5000)
  await ev('window.scrollTo(0, document.body.scrollHeight)'); await sleep(1500)
  const info = await ev(`(()=>{const imgs=[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src&&!i.src.startsWith('data:')).map(i=>i.src.slice(0,120));
    const over=document.documentElement.scrollWidth>window.innerWidth+2; return {title:document.title, imgs, over, w:document.documentElement.scrollWidth, err:/Application error|Internal Server Error|This page could not be found/.test(document.body.innerText.slice(0,400))}})()`)
  const probs = [...new Set(issues)]
  if (info?.imgs?.length) probs.push('BROKEN IMG ' + info.imgs.join(' , '))
  if (info?.over) probs.push(`HORIZONTAL SCROLL width ${info.w}`)
  if (info?.err) probs.push('ERROR PAGE TEXT')
  if (probs.length) bad++
  console.log(`${probs.length ? '✗' : '✓'} ${path}  — ${info?.title?.slice(0, 50)}${probs.length ? '\n    ' + probs.join('\n    ') : ''}`)
}
console.log(`\n${paths.length} pages, ${bad} with problems`)
p.kill(); process.exit(0)
