import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { deployment, deploymentAsset } from '../deployment.config.mjs'

const projectFile = (path) => new URL(`../${path}`, import.meta.url)

test('deployment values form one consistent GitHub Pages identity', () => {
  assert.match(deployment.repositoryName, /^[A-Za-z0-9._-]+$/)
  assert.equal(new URL(deployment.productionOrigin).origin, deployment.productionOrigin)
  assert.equal(deployment.basePath, `/${deployment.repositoryName}/`)
  assert.equal(
    deployment.productionUrl,
    new URL(deployment.basePath, `${deployment.productionOrigin}/`).href,
  )
  assert.equal(
    deploymentAsset('/app-icon-192.png'),
    `${deployment.basePath}app-icon-192.png`,
  )
})

test('runtime deployment consumers do not duplicate the production identity', async () => {
  const runtimeConsumers = await Promise.all([
    readFile(projectFile('vite.config.js'), 'utf8'),
    readFile(projectFile('scripts/generate-production-qr.mjs'), 'utf8'),
    readFile(projectFile('scripts/mobile-server.mjs'), 'utf8'),
  ])

  for (const source of runtimeConsumers) {
    assert.equal(source.includes(deployment.basePath), false)
    assert.equal(source.includes(deployment.productionOrigin), false)
  }
})

test('deployment guidance matches the centralized configuration', async () => {
  const [readme, architecture, testing] = await Promise.all([
    readFile(projectFile('README.md'), 'utf8'),
    readFile(projectFile('docs/ARCHITECTURE.md'), 'utf8'),
    readFile(projectFile('docs/TESTING.md'), 'utf8'),
  ])

  assert.match(readme, new RegExp(escapeRegExp(deployment.productionUrl)))
  assert.match(readme, new RegExp(escapeRegExp(deployment.basePath)))
  assert.match(architecture, new RegExp(escapeRegExp(deployment.basePath)))
  assert.match(testing, new RegExp(escapeRegExp(deployment.productionUrl)))
  assert.match(testing, new RegExp(escapeRegExp(deployment.basePath)))
})

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
