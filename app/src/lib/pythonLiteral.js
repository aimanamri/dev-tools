// Parses a Python literal (dict, list, tuple, set, string, number, True, False, None)
// and returns the equivalent JavaScript value. No code is executed.

const SIMPLE_ESCAPES = {
  '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\n': '',
}
const MAX_DEPTH = 500

class PyError extends Error {}

export function parsePythonLiteral(src) {
  let i = 0
  const n = src.length

  function where(pos = i) {
    const before = src.slice(0, pos)
    const line = before.split('\n').length
    const col = pos - before.lastIndexOf('\n')
    return `line ${line}, column ${col}`
  }
  function fail(msg, pos = i) {
    throw new PyError(`${msg} (${where(pos)})`)
  }

  function skip() {
    while (i < n) {
      const ch = src[i]
      if (ch === '#') {
        while (i < n && src[i] !== '\n') i++
      } else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\uFEFF') {
        i++
      } else if (ch === '\\' && (src[i + 1] === '\n' || (src[i + 1] === '\r' && src[i + 2] === '\n'))) {
        i += src[i + 1] === '\n' ? 2 : 3
      } else {
        break
      }
    }
  }

  function readString() {
    const start = i
    let prefix = ''
    while (/[rRbBuUfF]/.test(src[i])) prefix += src[i++].toLowerCase()
    if (prefix.includes('f')) fail('f-strings are not literals and cannot be converted', start)
    const raw = prefix.includes('r')
    const quote = src[i]
    const triple = src.startsWith(quote.repeat(3), i)
    const end = triple ? quote.repeat(3) : quote
    i += end.length
    let out = ''
    for (;;) {
      if (i >= n) fail('A string is not closed', start)
      if (src.startsWith(end, i)) { i += end.length; break }
      const ch = src[i]
      if (ch === '\n' && !triple) fail('A string is not closed', start)
      if (ch !== '\\') { out += ch; i++; continue }
      const nx = src[i + 1]
      if (nx === undefined) fail('A string is not closed', start)
      if (raw) { out += ch + nx; i += 2; continue }
      if (nx in SIMPLE_ESCAPES) { out += SIMPLE_ESCAPES[nx]; i += 2; continue }
      if (nx === '\r' && src[i + 2] === '\n') { i += 3; continue }
      if (nx === 'x' || nx === 'u' || nx === 'U') {
        const len = nx === 'x' ? 2 : nx === 'u' ? 4 : 8
        const hex = src.slice(i + 2, i + 2 + len)
        if (hex.length !== len || !/^[0-9a-fA-F]+$/.test(hex)) fail(`The \\${nx} escape is not complete`)
        const cp = parseInt(hex, 16)
        if (cp > 0x10ffff) fail(`The \\${nx} escape is out of range`)
        out += String.fromCodePoint(cp)
        i += 2 + len
        continue
      }
      if (/[0-7]/.test(nx)) {
        const oct = src.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)[0]
        out += String.fromCharCode(parseInt(oct, 8))
        i += 1 + oct.length
        continue
      }
      if (nx === 'N') fail('The \\N{name} escape is not supported')
      // Python keeps an unknown escape as it is.
      out += ch + nx
      i += 2
    }
    return out
  }

  function isStringStart() {
    return /^[rRbBuUfF]{0,2}['"]/.test(src.slice(i, i + 3))
  }

  function readNumberOrName() {
    const start = i
    const m = /^[+-]?[A-Za-z0-9_.]+(?:[eE][+-]?\d+)?/.exec(src.slice(i))
    if (!m) fail(`Unexpected character "${src[i]}"`)
    let tok = m[0]
    // "1e+5" is one token, but "1+2" is not a literal.
    i += tok.length
    if (tok === 'True') return true
    if (tok === 'False') return false
    if (tok === 'None') return null
    if (tok === 'null' || tok === 'true' || tok === 'false') return JSON.parse(tok)
    const sign = tok[0] === '-' ? -1 : 1
    const body = tok.replace(/^[+-]/, '')
    if (/^(nan|inf|infinity)$/i.test(body)) fail(`${tok} has no JSON equivalent`, start)
    if (!/^[0-9.]/.test(body)) fail(`"${tok}" is a name, not a literal. Put text in quotation marks`, start)
    if (/__|_$|^_/.test(body) || /[jJ]$/.test(body)) fail(`"${tok}" is not a number that JSON can hold`, start)
    const clean = body.replace(/_/g, '')
    let value
    if (/^0[xX][0-9a-fA-F]+$/.test(clean)) value = parseInt(clean.slice(2), 16)
    else if (/^0[oO][0-7]+$/.test(clean)) value = parseInt(clean.slice(2), 8)
    else if (/^0[bB][01]+$/.test(clean)) value = parseInt(clean.slice(2), 2)
    else if (/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(clean)) value = Number(clean)
    else fail(`"${tok}" is not a valid number`, start)
    if (!Number.isFinite(value)) fail(`"${tok}" is too large for JSON`, start)
    return sign * value
  }

  function readSequence(close, depth) {
    const items = []
    let sawComma = false
    for (;;) {
      skip()
      if (i >= n) fail(`"${close}" is missing`)
      if (src[i] === close) { i++; break }
      items.push(readValue(depth))
      skip()
      if (src[i] === ',') { i++; sawComma = true; continue }
      if (src[i] === close) { i++; break }
      fail(i >= n ? `"${close}" is missing` : `A comma or "${close}" is necessary here`)
    }
    return { items, sawComma }
  }

  function keyToString(key, pos) {
    if (typeof key === 'string') return key
    if (key === null) return 'None'
    if (key === true) return 'True'
    if (key === false) return 'False'
    if (typeof key === 'number') return String(key)
    if (Array.isArray(key)) return `(${key.map(k => keyToString(k, pos)).join(', ')})`
    return fail('A dict cannot be a key', pos)
  }

  function readBrace(depth) {
    i++ // {
    skip()
    if (src[i] === '}') { i++; return {} }
    const obj = {}
    let isSet = null
    const setItems = []
    for (;;) {
      skip()
      if (i >= n) fail('"}" is missing')
      if (src[i] === '}') { i++; break }
      const keyPos = i
      const key = readValue(depth)
      skip()
      if (isSet === null) isSet = src[i] !== ':'
      if (isSet) {
        setItems.push(key)
      } else {
        if (src[i] !== ':') fail('A colon is necessary after the key')
        i++
        skip()
        if (i >= n) fail('A value is missing after the colon')
        // Object.defineProperty keeps a "__proto__" key as a normal key.
        Object.defineProperty(obj, keyToString(key, keyPos), {
          value: readValue(depth), enumerable: true, writable: true, configurable: true,
        })
        skip()
      }
      if (src[i] === ',') { i++; continue }
      if (src[i] === '}') { i++; break }
      fail(i >= n ? '"}" is missing' : 'A comma or "}" is necessary here')
    }
    return isSet ? setItems : obj
  }

  function readValue(depth) {
    if (depth > MAX_DEPTH) fail('The data is nested too deeply')
    skip()
    if (i >= n) fail('A value is missing')
    const ch = src[i]
    if (ch === '{') return readBrace(depth + 1)
    if (ch === '[') { i++; return readSequence(']', depth + 1).items }
    if (ch === '(') {
      i++
      const { items, sawComma } = readSequence(')', depth + 1)
      // "(1)" is the value 1. "(1,)" and "()" are tuples.
      return items.length === 1 && !sawComma ? items[0] : items
    }
    if (isStringStart()) {
      // Adjacent strings join: 'a' 'b' is 'ab'.
      let s = readString()
      for (;;) {
        skip()
        if (i < n && isStringStart()) s += readString()
        else break
      }
      return s
    }
    return readNumberOrName()
  }

  // Permit an assignment such as "data = {...}".
  skip()
  const assign = /^[A-Za-z_][A-Za-z0-9_]*\s*=(?!=)/.exec(src.slice(i))
  if (assign) i += assign[0].length

  const value = readValue(0)
  skip()
  if (i < n) fail(`Unexpected text after the value: "${src.slice(i, i + 12)}"`)
  return value
}

// Converts Python literal text to formatted JSON text.
export function pythonToJson(src, indent = 2) {
  return JSON.stringify(parsePythonLiteral(src), null, indent)
}
