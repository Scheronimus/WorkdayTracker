import { networkInterfaces } from 'node:os'
import qrcode from 'qrcode-terminal'
import { createServer } from 'vite'

const preferredAdapter = /wi-?fi|wlan|ethernet/i
const addresses = Object.entries(networkInterfaces())
  .flatMap(([adapter, entries]) =>
    (entries ?? []).map((entry) => ({ adapter, ...entry })),
  )
  .filter((entry) =>
    entry.family === 'IPv4'
    && !entry.internal
    && !entry.address.startsWith('169.254.'),
  )
  .sort((left, right) =>
    Number(preferredAdapter.test(right.adapter)) - Number(preferredAdapter.test(left.adapter)),
  )

if (!addresses.length) {
  console.error('No local network connection was found. Connect this computer to Wi-Fi and try again.')
  process.exit(1)
}

const server = await createServer({
  server: {
    host: '0.0.0.0',
  },
})

await server.listen()

const serverAddress = server.httpServer?.address()
if (!serverAddress || typeof serverAddress === 'string') {
  console.error('The mobile test server started, but its network port could not be determined.')
  await server.close()
  process.exit(1)
}

const port = serverAddress.port
const base = server.config.base
const mobileUrl = `http://${addresses[0].address}:${port}${base}`

console.log('\nWorkday Tracker is ready for mobile testing.\n')
console.log(`Network: ${addresses[0].adapter}`)
console.log(`Address: ${mobileUrl}\n`)
console.log('Scan this QR code with your phone camera:\n')
qrcode.generate(mobileUrl, { small: true })
console.log('\nKeep this window open while testing.')
console.log('Your phone and computer must be connected to the same Wi-Fi.')
console.log('Press Ctrl+C when you are finished.\n')

async function stopServer() {
  await server.close()
  process.exit()
}

process.on('SIGINT', stopServer)
process.on('SIGTERM', stopServer)
