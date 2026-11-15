#!/usr/bin/env node
// Packs app/dist into release/devtools-v<version>.zip for upload to a web host.
// Pure Node.js (no zip program is necessary). Run "npm run build:zip".
import { deflateRawSync } from 'node:zlib'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'app', 'dist')
const { version } = JSON.parse(readFileSync(join(root, 'app', 'package.json'), 'utf8'))
const outDir = join(root, 'release')
const outFile = join(outDir, `devtools-v${version}.zip`)

if (!existsSync(join(dist, 'index.html'))) {
  console.error('app/dist/index.html does not exist. Run "npm run build" first.')
  process.exit(1)
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function dosTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

function walk(dir) {
  return readdirSync(dir).sort().flatMap(name => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const files = walk(dist)
const locals = []
const centrals = []
let offset = 0
for (const file of files) {
  const name = Buffer.from(relative(dist, file).split(sep).join('/'), 'utf8')
  const data = readFileSync(file)
  const packed = deflateRawSync(data, { level: 9 })
  const useDeflate = packed.length < data.length
  const body = useDeflate ? packed : data
  const crc = crc32(data)
  const { time, date } = dosTime(statSync(file).mtime)

  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(0x0800, 6) // UTF-8 names
  local.writeUInt16LE(useDeflate ? 8 : 0, 8)
  local.writeUInt16LE(time, 10)
  local.writeUInt16LE(date, 12)
  local.writeUInt32LE(crc, 14)
  local.writeUInt32LE(body.length, 18)
  local.writeUInt32LE(data.length, 22)
  local.writeUInt16LE(name.length, 26)
  local.writeUInt16LE(0, 28)
  locals.push(local, name, body)

  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt16LE(0x0800, 8)
  central.writeUInt16LE(useDeflate ? 8 : 0, 10)
  central.writeUInt16LE(time, 12)
  central.writeUInt16LE(date, 14)
  central.writeUInt32LE(crc, 16)
  central.writeUInt32LE(body.length, 20)
  central.writeUInt32LE(data.length, 24)
  central.writeUInt16LE(name.length, 28)
  central.writeUInt32LE((0o100644 << 16) >>> 0, 38) // file mode rw-r--r--
  central.writeUInt32LE(offset, 42)
  centrals.push(central, name)

  offset += local.length + name.length + body.length
}

const centralSize = centrals.reduce((n, b) => n + b.length, 0)
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0)
end.writeUInt16LE(files.length, 8)
end.writeUInt16LE(files.length, 10)
end.writeUInt32LE(centralSize, 12)
end.writeUInt32LE(offset, 16)

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, Buffer.concat([...locals, ...centrals, end]))
const kb = (statSync(outFile).size / 1024).toFixed(0)
console.log(`Packed ${files.length} files into ${relative(root, outFile)} (${kb} KB).`)
console.log('Upload the contents of the ZIP file to the web root. Keep .htaccess for Apache hosts.')
