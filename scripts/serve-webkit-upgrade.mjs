import { execFileSync } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, join, sep, extname } from 'node:path'
import { deployment } from '../deployment.config.mjs'

const directory = resolve('artifacts/webkit-baseline', new Date().toISOString().replaceAll(':', '-'))
const source = join(directory, 'source')
const baseline = join(directory, 'dist')
await mkdir(source, { recursive: true })
const sha = execFileSync('git', ['rev-parse', 'v1.5.0^{commit}'], { encoding: 'utf8' }).trim()
execFileSync('git', ['archive', '--format=tar', '--output', join(directory, 'baseline.tar'), sha])
execFileSync('tar', ['-xf', join(directory, 'baseline.tar'), '-C', source])
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', source, '--config', join(source, 'vite.config.js'), '--outDir', baseline], { stdio: 'inherit' })
let root = baseline
let unavailable = false
const candidate = resolve('dist')
createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname
  if (request.method === 'POST' && path === '/__upgrade/baseline') {
    root = baseline; unavailable = false; response.writeHead(200).end(sha); return
  }
  if (request.method === 'POST' && path === '/__upgrade/candidate') {
    root = candidate; unavailable = false; response.writeHead(200).end(); return
  }
  if (request.method === 'POST' && path === '/__upgrade/unavailable') {
    unavailable = true; response.writeHead(200).end(); return
  }
  if (path === '/__upgrade/ready') { response.writeHead(200).end(sha); return }
  if (unavailable) { response.writeHead(503).end('Simulated server outage'); return }
  if (!path.startsWith(deployment.basePath)) { response.writeHead(404).end(); return }
  const file = resolve(root, decodeURIComponent(path.slice(deployment.basePath.length)) || 'index.html')
  if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return }
  try {
    const data = await readFile(file)
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
    response.writeHead(200, { 'Cache-Control': 'no-cache', 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(data)
  } catch { response.writeHead(404).end() }
}).listen(5190, '127.0.0.1', () => console.log(`Upgrade server ready; baseline ${sha}`))
