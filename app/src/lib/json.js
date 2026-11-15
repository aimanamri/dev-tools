// Shared JSON helpers.

const BOM = '\uFEFF'

// Removes a byte order mark. Some editors add it to the start of a file.
export function stripBom(text) {
  return text.startsWith(BOM) ? text.slice(1) : text
}

// Parses JSON text. Returns { ok, value, error }.
// ok is null when the text is empty.
export function parseJson(text) {
  const src = stripBom(String(text ?? ''))
  if (!src.trim()) return { ok: null, value: null, error: null }
  try {
    return { ok: true, value: JSON.parse(src), error: null }
  } catch (e) {
    return { ok: false, value: null, error: e.message }
  }
}

// Finds integers that JavaScript cannot hold exactly (more than 2^53 - 1).
// JSON.parse rounds these numbers, thus the output can be different from the input.
// Returns the first few literals found. Numbers in strings are ignored.
export function findUnsafeIntegers(text, limit = 3) {
  const found = []
  const re = /"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g
  let m
  while ((m = re.exec(text)) && found.length < limit) {
    const tok = m[0]
    if (tok[0] === '"') continue
    if (/[.eE]/.test(tok)) continue
    if (tok.replace('-', '').length < 16) continue
    if (!Number.isSafeInteger(Number(tok))) found.push(tok)
  }
  return found
}
