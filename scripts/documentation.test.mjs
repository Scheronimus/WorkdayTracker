import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, access } from 'node:fs/promises'
import { dirname, resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = file => readFile(resolve(root, file), 'utf8')

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? markdownFiles(resolve(directory, entry.name))
    : entry.name.endsWith('.md') ? [resolve(directory, entry.name)] : []))
  return nested.flat()
}

test('maintained and archived Markdown links resolve, except generated evidence', async () => {
  const files = [resolve(root, 'README.md'), resolve(root, 'CHANGELOG.md'), ...await markdownFiles(resolve(root, 'docs'))]
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const targets = [...source.matchAll(/\[[^\]]*\]\(([^)]+)\)|<img\b[^>]*\bsrc="([^"]+)"/g)]
    for (const match of targets) {
      const target = (match[1] ?? match[2]).split('#')[0]
      if (!target || /^[a-z][a-z\d+.-]*:/i.test(target)) continue
      const path = resolve(dirname(file), decodeURIComponent(target))
      if (relative(root, path).startsWith(`artifacts${sep}`)) continue
      await assert.doesNotReject(access(path), `${relative(root, file)} links to missing ${target}`)
    }
  }
})

test('candidate version, lockfile, changelog, release guide and README agree', async () => {
  const pkg = JSON.parse(await read('package.json'))
  const lock = JSON.parse(await read('package-lock.json'))
  assert.equal(lock.version, pkg.version)
  assert.equal(lock.packages[''].version, pkg.version)
  assert.ok((await read('CHANGELOG.md')).includes(`## ${pkg.version}`))
  assert.ok((await read(`docs/RELEASE-${pkg.version}.md`)).includes(`# Workday Tracker ${pkg.version}`))
  assert.ok((await read('README.md')).includes(`docs/RELEASE-${pkg.version}.md`))
})
