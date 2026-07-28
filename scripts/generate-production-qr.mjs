import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
const QRCode = require('qrcode-terminal/vendor/QRCode')
const errorLevels = require('qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel')

const productionUrl = 'https://scheronimus.github.io/WorkdayTracker/'
const outputPath = new URL('../docs/production-app-qr.svg', import.meta.url)
const quietZone = 4
const moduleSize = 10

const qrCode = new QRCode(-1, errorLevels.M)
qrCode.addData(productionUrl)
qrCode.make()

const moduleCount = qrCode.getModuleCount()
const imageSize = (moduleCount + quietZone * 2) * moduleSize
const modules = []

for (let row = 0; row < moduleCount; row += 1) {
  for (let column = 0; column < moduleCount; column += 1) {
    if (!qrCode.isDark(row, column)) continue
    modules.push(
      `<rect x="${(column + quietZone) * moduleSize}" `
      + `y="${(row + quietZone) * moduleSize}" `
      + `width="${moduleSize}" height="${moduleSize}"/>`,
    )
  }
}

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageSize} ${imageSize}"`,
  ' role="img" aria-labelledby="title description" shape-rendering="crispEdges">',
  '<title id="title">Workday Tracker production QR code</title>',
  `<desc id="description">Opens ${productionUrl}</desc>`,
  '<rect width="100%" height="100%" fill="#fff"/>',
  `<g fill="#102d26">${modules.join('')}</g>`,
  '</svg>',
].join('')

await writeFile(outputPath, svg)
console.log(`Generated ${outputPath.pathname} for ${productionUrl}`)
