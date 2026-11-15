// Base64 text helpers. All work is done in the browser.

function bytesToBinary(bytes) {
  // Work in blocks. One large String.fromCharCode call can exceed the stack.
  let out = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  }
  return out
}

// Accepts standard and URL-safe Base64, with or without padding, and a data URL prefix.
export function normaliseBase64(input) {
  let s = String(input).trim()
  const comma = s.indexOf(',')
  if (/^data:[^,]*;base64,/i.test(s)) s = s.slice(comma + 1)
  s = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
  if (!/^[A-Za-z0-9+/]*$/.test(s)) {
    const bad = s.match(/[^A-Za-z0-9+/]/)[0]
    throw new Error(`The input is not Base64. The character "${bad}" is not permitted.`)
  }
  if (s.length % 4 === 1) {
    throw new Error('The input is not Base64. The length is incorrect. Some characters are missing.')
  }
  return s + '='.repeat((4 - (s.length % 4)) % 4)
}

export function base64ToBytes(b64) {
  const binary = atob(normaliseBase64(b64))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function encodeText(str, charset) {
  if (charset === 'latin1' || charset === 'ascii') {
    const max = charset === 'ascii' ? 0x7f : 0xff
    for (const ch of str) {
      if (ch.codePointAt(0) > max) {
        const name = charset === 'ascii' ? 'ASCII' : 'Latin-1'
        throw new Error(`The character "${ch}" is not in ${name}. Use UTF-8.`)
      }
    }
    return btoa(str)
  }
  return btoa(bytesToBinary(new TextEncoder().encode(str)))
}

export function decodeText(b64, charset) {
  const bytes = base64ToBytes(b64)
  if (charset === 'latin1') return bytesToBinary(bytes)
  if (charset === 'ascii') {
    if (bytes.some(b => b > 0x7f)) {
      throw new Error('The decoded data is not ASCII text. Use UTF-8 or Latin-1, or decode it as a file.')
    }
    return bytesToBinary(bytes)
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('The decoded data is not UTF-8 text. Use Latin-1, or decode it as a file.')
  }
}

export function processText(input, mode, charset, eachLine) {
  if (!input) return { output: '', error: null }
  const run = text => (mode === 'encode' ? encodeText(text, charset) : decodeText(text, charset))
  try {
    if (eachLine) {
      const lines = input.split(/\r?\n/)
      const out = lines.map((line, i) => {
        if (!line.trim()) return ''
        try {
          return run(line)
        } catch (e) {
          throw new Error(`Line ${i + 1}: ${e.message}`)
        }
      })
      return { output: out.join('\n'), error: null }
    }
    return { output: run(input), error: null }
  } catch (e) {
    return { output: '', error: e.message }
  }
}
