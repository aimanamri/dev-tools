// Writes the Pixelbolt recipes for the Dev Tools logo, favicon, banner and social image.
// Run: node branding/make-recipes.mjs   (then branding/build.sh renders them)
import { writeFileSync, mkdirSync } from 'node:fs'
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
mkdirSync(new URL('./recipes/', import.meta.url), { recursive: true })

// OKLCH to sRGB hex, so the art uses the same colours as src/styles/tokens.css.
function oklch(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3]
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return '#' + lin.map(c => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  }).join('')
}

export const PALETTE = {
  k: oklch(0.140, 0.028, 254), // screen (darkest navy)
  n: oklch(0.210, 0.042, 256), // page background
  d: oklch(0.360, 0.060, 233), // tile edge
  p: oklch(0.470, 0.055, 233), // primary (light theme)
  b: oklch(0.640, 0.090, 228), // primary (dark theme)
  l: oklch(0.800, 0.060, 228), // highlight
  w: oklch(0.945, 0.012, 250), // text
  m: oklch(0.670, 0.022, 250), // muted text
  y: oklch(0.830, 0.150, 80),  // cursor amber
}

const blank = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'))
const rows = g => g.map(r => r.join(''))
function rect(g, x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < g[j].length) g[j][i] = c
}
function roundRect(g, x, y, w, h, c, r) {
  // Keep the pixels under each cut corner, so the shape below shows through.
  const under = {}
  for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${cx + dx},${cy + dy}`
      under[k] = g[cy + dy]?.[cx + dx]
    }
  }
  rect(g, x, y, w, h, c)
  const cut = (cx, cy) => { const v = under[`${cx},${cy}`]; if (v !== undefined) g[cy][cx] = v }
  // r = 1 removes one pixel at each corner, r = 2 removes an L of three.
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) {
    cut(cx, cy)
    if (r >= 2) { cut(cx + sx, cy); cut(cx, cy + sy) }
  }
}

// The mark: a terminal window with a ">" prompt and a cursor. size is 16 or 32.
// full = true fills the whole canvas (for apple-touch and maskable icons).
function mark(size, { cursor = true, full = false, pad = 0 } = {}) {
  const S = size + pad * 2
  const g = blank(S, S)
  const o = pad
  if (full) rect(g, 0, 0, S, S, 'p')
  if (size === 32) {
    if (!full) roundRect(g, o + 0, o + 0, 32, 32, 'd', 2)
    roundRect(g, o + 1, o + 1, 30, 30, 'p', 2)
    // Title bar dots
    for (const x of [5, 8, 11]) rect(g, o + x, o + 4, 2, 2, 'l')
    roundRect(g, o + 3, o + 8, 26, 21, 'k', 1)
    // ">" prompt, 2 px thick
    for (let i = 0; i < 5; i++) {
      rect(g, o + 7 + i, o + 12 + i, 2, 1, 'w')
      rect(g, o + 7 + i, o + 20 - i, 2, 1, 'w')
    }
    if (cursor) rect(g, o + 16, o + 19, 8, 2, 'y')
  } else {
    if (!full) roundRect(g, o + 0, o + 0, 16, 16, 'd', 1)
    roundRect(g, o + 1, o + 1, 14, 14, 'p', 1)
    rect(g, o + 3, o + 2, 1, 1, 'l'); rect(g, o + 5, o + 2, 1, 1, 'l')
    roundRect(g, o + 2, o + 4, 12, 10, 'k', 1)
    for (let i = 0; i < 3; i++) {
      rect(g, o + 4 + i, o + 6 + i, 1, 1, 'w')
      rect(g, o + 4 + i, o + 10 - i, 1, 1, 'w')
    }
    if (cursor) rect(g, o + 8, o + 10, 4, 1, 'y')
  }
  return g
}

function recipe(name, w, h, frames, extra = {}) {
  return { version: 1, name, width: w, height: h, palette: PALETTE, frames, ...extra }
}
const save = (file, r) => writeFileSync(new URL(`./recipes/${file}`, import.meta.url), JSON.stringify(r, null, 2) + '\n')

// 1. Logo, 32 x 32, cursor blinks (for the site and the favicon 32 / 192 / 512)
save('logo-32.json', recipe('logo32', 32, 32, [
  { name: 'on', duration: 530, ops: [{ op: 'grid', x: 0, y: 0, rows: rows(mark(32)) }] },
  { name: 'off', duration: 530, ops: [{ op: 'grid', x: 0, y: 0, rows: rows(mark(32, { cursor: false })) }] },
]))

// 2. Logo, 16 x 16 (favicon 16 and 48)
save('logo-16.json', recipe('logo16', 16, 16, [
  { name: 'on', ops: [{ op: 'grid', x: 0, y: 0, rows: rows(mark(16)) }] },
]))

// 3. Apple touch icon: 36 x 36 full bleed, exported x5 = 180 x 180
save('apple-touch-36.json', recipe('appletouch', 36, 36, [
  { name: 'on', ops: [{ op: 'grid', x: 0, y: 0, rows: rows(mark(32, { full: true, pad: 2 })) }] },
]))

// 4. Maskable icon: 64 x 64 full bleed, the mark x1 inside the safe zone, exported x8 = 512
{
  const g = blank(64, 64)
  rect(g, 0, 0, 64, 64, 'p')
  const m = mark(32)
  // Place the 32 px mark at the centre, scaled x1. 32/64 = 50 % of the width: inside the 80 % safe circle.
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (m[y][x] !== '.') g[16 + y][16 + x] = m[y][x] === 'd' ? 'p' : m[y][x]
  save('maskable-64.json', recipe('maskable', 64, 64, [{ name: 'on', ops: [{ op: 'grid', x: 0, y: 0, rows: rows(g) }] }]))
}

// 5. README banner, 160 x 40, types tool tasks after the prompt
{
  const W = 160, H = 40
  const base = [
    { op: 'rect', x: 0, y: 0, w: W, h: H, color: 'n', filled: true },
    { op: 'grid', x: 4, y: 4, rows: rows(mark(32, { cursor: false })) },
    { op: 'text', x: 44, y: 6, text: 'DEV TOOLS', color: 'w', scale: 2 },
  ]
  const phrases = ['format json', 'merge pdf', 'make qr codes', 'build cron', 'calc subnets', 'encode base64']
  const frames = []
  let idx = 0
  const frame = (typed, cursorOn, duration) => {
    const ops = [...base, { op: 'text', x: 44, y: 25, text: '>', color: 'b' }]
    if (typed) ops.push({ op: 'text', x: 52, y: 25, text: typed, color: 'm' })
    const cx = 52 + (typed ? typed.length * 6 : 0)
    if (cursorOn) ops.push({ op: 'rect', x: cx, y: 31, w: 5, h: 2, color: 'y', filled: true })
    // Logo cursor blinks with the line cursor
    if (cursorOn) ops.push({ op: 'rect', x: 4 + 16, y: 4 + 19, w: 8, h: 2, color: 'y', filled: true })
    frames.push({ name: `f${idx++}`, duration, ops })
  }
  for (const p of phrases) {
    for (let i = 1; i <= p.length; i++) frame(p.slice(0, i), true, 70)
    frame(p, false, 300); frame(p, true, 300); frame(p, false, 300)
    frame('', true, 200)
  }
  save('banner-160x40.json', recipe('banner', W, H, frames))
}

// 6. Open Graph image, 240 x 126, exported x5 = 1200 x 630
{
  const W = 240, H = 126
  const m = mark(32)
  const ops = [
    { op: 'rect', x: 0, y: 0, w: W, h: H, color: 'n', filled: true },
    { op: 'rect', x: 0, y: H - 4, w: W, h: 4, color: 'p', filled: true },
    { op: 'grid', x: 12, y: 18, rows: rows(m), scale: 2 },
    { op: 'text', x: 86, y: 24, text: 'Dev Tools', color: 'w', scale: 3 },
    { op: 'text', x: 86, y: 54, text: '19 developer tools', color: 'l' },
    { op: 'text', x: 86, y: 66, text: 'that run in your browser.', color: 'l' },
    { op: 'text', x: 86, y: 82, text: 'No server. No sign-up.', color: 'm' },
    { op: 'text', x: 16, y: 104, text: 'devtools.aimanuddin.com', color: 'b' },
  ]
  save('og-240x126.json', recipe('ogimage', W, H, [{ name: 'og', ops }]))
}
// 7. SVG logo for the favicon and the UI. Each pixel is a rect, so it stays sharp at all sizes.
//    The cursor blinks with CSS. It stops when the user prefers reduced motion.
function gridToSvg(g, skip) {
  const W = g[0].length, H = g.length
  const parts = []
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W) {
      const c = g[y][x]
      if (c === '.' || c === skip) { x++; continue }
      let run = 1
      while (x + run < W && g[y][x + run] === c) run++
      parts.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${PALETTE[c]}"/>`)
      x += run
    }
  }
  return { W, H, body: parts.join('') }
}
{
  const { W, H, body } = gridToSvg(mark(32), 'y')
  const cursor = `<rect class="cursor" x="16" y="19" width="8" height="2" fill="${PALETTE.y}"/>`
  const style = '<style>.cursor{animation:blink 1.06s steps(1) infinite}@keyframes blink{50%{opacity:0}}@media (prefers-reduced-motion:reduce){.cursor{animation:none}}</style>'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">${style}<title>Dev Tools</title>${body}${cursor}</svg>\n`
  writeFileSync(new URL('./out/logo.svg', import.meta.url), svg)
}
console.log('recipes written')
