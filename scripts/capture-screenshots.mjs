import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const debuggingPort = process.env.CHROME_DEBUG_PORT || '9223'
const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:5174'
const pages = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then(response => response.json())
const page = pages.find(item => item.type === 'page')
if (!page) throw new Error('No Chrome page target is available')
const sampleTokens = [
  { id: 'demo-1', issuer: 'GitHub', account: 'developer@example.com', secret: 'JBSWY3DPEHPK3PXP', category: 'dev', createdAt: 1 },
  { id: 'demo-2', issuer: 'Google', account: 'work@example.com', secret: 'GEZDGNBVGY3TQOJQ', category: 'work', createdAt: 2 },
  { id: 'demo-3', issuer: 'Cloudflare', account: 'security@example.com', secret: 'MZXW6YTBOI======', category: 'work', createdAt: 3 },
  { id: 'demo-4', issuer: 'Microsoft', account: 'personal@example.com', secret: 'ONSWG4TFOQ======', category: 'personal', createdAt: 4 }
]

const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
let nextId = 1

socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

function command(method, params = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function capture(name, width, height, mobile) {
  await command('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height
  })
  await command('Page.navigate', { url: baseUrl })
  await new Promise(resolve => setTimeout(resolve, 750))
  await command('Runtime.evaluate', {
    expression: `localStorage.setItem('totp-tokens', ${JSON.stringify(JSON.stringify(sampleTokens))})`
  })
  await command('Page.reload')
  await new Promise(resolve => setTimeout(resolve, 2500))
  const metrics = await command('Runtime.evaluate', {
    expression: '({width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth})',
    returnByValue: true
  })
  const viewport = metrics.result.value
  if (viewport.width !== width || viewport.scrollWidth > width) {
    throw new Error(`Invalid ${name} viewport: ${JSON.stringify(viewport)}`)
  }

  const screenshot = await command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  })
  await writeFile(
    path.resolve(`public/screenshot-${name}.png`),
    Buffer.from(screenshot.data, 'base64')
  )
}

await command('Page.enable')
await capture('desktop', 1280, 720, false)
await capture('mobile', 390, 844, true)
// Chrome may close the debugging socket before acknowledging Browser.close.
// Bound the wait so Node does not report an unsettled top-level await.
await Promise.race([
  command('Browser.close').catch(() => null),
  new Promise(resolve => setTimeout(resolve, 500))
])
socket.close()
