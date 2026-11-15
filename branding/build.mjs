// Renders the Pixelbolt recipes in branding/recipes and copies the results into the app.
//
//   node branding/make-recipes.mjs   writes the recipes and out/logo.svg
//   node branding/build.mjs          renders them (needs Pixelbolt)
//
// Set PIXELBOLT to the bin/pixelbolt.js file of a local Pixelbolt checkout.
// If it is not set, the script runs the pinned version from npm with npx.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PIXELBOLT_VERSION = '0.17.0'
const here = fileURLToPath(new URL('.', import.meta.url))
const root = join(here, '..')
const pub = join(root, 'app', 'public')
const recipes = join(here, 'recipes')
const tmp = mkdtempSync(join(tmpdir(), 'devtools-brand-'))
const localBin = process.env.PIXELBOLT

function pixelbolt(...args) {
  const [cmd, pre] = localBin
    ? ['node', [localBin]]
    : ['npx', ['-y', `pixelbolt@${PIXELBOLT_VERSION}`]]
  const out = execFileSync(cmd, [...pre, ...args], { encoding: 'utf8' })
  const res = JSON.parse(out)
  if (!res.ok) throw new Error(`pixelbolt ${args.join(' ')}: ${res.error}`)
  return res
}

// Renders one frame of a recipe at a scale and returns the PNG path.
function still(recipe, frame, scale) {
  const dir = join(tmp, `${recipe}-${frame}-${scale}`)
  pixelbolt('render', join(recipes, recipe), '--scale', String(scale), '--out', dir)
  return join(dir, 'frames', `${frame}.png`)
}

// favicon.ico with PNG images inside (all current browsers read this format).
function writeIco(file, pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const dir = Buffer.alloc(16 * pngs.length)
  let offset = 6 + dir.length
  const datas = pngs.map(({ size, path }, i) => {
    const data = readFileSync(path)
    const e = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, e)
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1)
    dir.writeUInt8(0, e + 2)
    dir.writeUInt8(0, e + 3)
    dir.writeUInt16LE(1, e + 4)
    dir.writeUInt16LE(32, e + 6)
    dir.writeUInt32LE(data.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += data.length
    return data
  })
  writeFileSync(file, Buffer.concat([header, dir, ...datas]))
}

try {
  writeIco(join(pub, 'favicon.ico'), [
    { size: 16, path: still('logo-16.json', 'on', 1) },
    { size: 32, path: still('logo-32.json', 'on', 1) },
    { size: 48, path: still('logo-16.json', 'on', 3) },
  ])
  copyFileSync(still('apple-touch-36.json', 'on', 5), join(pub, 'apple-touch-icon.png'))
  copyFileSync(still('logo-32.json', 'on', 6), join(pub, 'icon-192.png'))
  copyFileSync(still('logo-32.json', 'on', 16), join(pub, 'icon-512.png'))
  copyFileSync(still('maskable-64.json', 'on', 8), join(pub, 'icon-maskable-512.png'))
  copyFileSync(still('og-240x126.json', 'og', 5), join(pub, 'og-image.png'))
  copyFileSync(join(here, 'out', 'logo.svg'), join(pub, 'logo.svg'))

  // README banner and animated logo
  const assets = join(root, '.github', 'assets')
  mkdirSync(assets, { recursive: true })
  pixelbolt('gif', join(recipes, 'banner-160x40.json'), '--scale', '4', '--out', join(assets, 'banner.gif'), '--force')
  pixelbolt('gif', join(recipes, 'logo-32.json'), '--scale', '4', '--out', join(assets, 'logo.gif'), '--force')
  console.log('Branding assets written to app/public and .github/assets')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
