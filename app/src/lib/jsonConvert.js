// Converts parsed JSON data to other text formats.
import yaml from 'js-yaml'
import Papa from 'papaparse'

export function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const path = prefix ? `${prefix}.${key}` : key
    const val = obj[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const nested = flattenObject(val, path)
      // Keep an empty object as a value. If not, the column disappears.
      if (Object.keys(nested).length === 0) acc[path] = '{}'
      else Object.assign(acc, nested)
    } else {
      acc[path] = Array.isArray(val) ? JSON.stringify(val) : val
    }
    return acc
  }, {})
}

function toRows(data) {
  const rows = Array.isArray(data) ? data : [data]
  return rows.map(r =>
    typeof r === 'object' && r !== null && !Array.isArray(r)
      ? flattenObject(r)
      : { value: Array.isArray(r) ? JSON.stringify(r) : r }
  )
}

// All column names, in the sequence in which they first occur.
function columnsOf(rows) {
  return [...new Set(rows.flatMap(Object.keys))]
}

export function toCSV(data) {
  const rows = toRows(data)
  if (rows.length === 0) return ''
  // escapeFormulae prevents formula injection when a spreadsheet opens the file.
  return Papa.unparse(rows, { columns: columnsOf(rows), escapeFormulae: true })
}

export function toYAML(data) {
  return yaml.dump(data, { indent: 2, lineWidth: -1 })
}

// XML names cannot start with a digit and cannot contain spaces or most symbols.
export function xmlName(key) {
  let name = String(key).replace(/[^A-Za-z0-9_.-]/g, '_')
  if (!name || !/^[A-Za-z_]/.test(name)) name = `_${name}`
  if (/^xml/i.test(name)) name = `_${name}`
  return name
}

function xmlEscape(text, isAttr) {
  // Remove characters that XML 1.0 does not permit.
  // eslint-disable-next-line no-control-regex
  let s = String(text).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return isAttr ? s.replace(/"/g, '&quot;') : s
}

function xmlNode(data, tag, depth, originalKey) {
  const pad = '  '.repeat(depth)
  const name = xmlName(tag)
  const attr = originalKey !== undefined && name !== String(originalKey)
    ? ` key="${xmlEscape(originalKey, true)}"`
    : ''
  if (Array.isArray(data)) {
    if (data.length === 0) return `${pad}<${name}${attr}/>`
    const kids = data.map(item => xmlNode(item, 'item', depth + 1))
    return `${pad}<${name}${attr}>\n${kids.join('\n')}\n${pad}</${name}>`
  }
  if (data !== null && typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return `${pad}<${name}${attr}/>`
    const kids = entries.map(([k, v]) => xmlNode(v, k, depth + 1, k))
    return `${pad}<${name}${attr}>\n${kids.join('\n')}\n${pad}</${name}>`
  }
  if (data === null || data === '') return `${pad}<${name}${attr}/>`
  return `${pad}<${name}${attr}>${xmlEscape(data, false)}</${name}>`
}

export function toXML(data) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlNode(data, 'root', 0)}`
}

function pyString(s) {
  const body = s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    // Other control characters and line separators.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
  return `'${body}'`
}

export function toPythonDict(data, indent = 0) {
  const pad = '    '.repeat(indent)
  const inner = '    '.repeat(indent + 1)
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]'
    const items = data.map(v => `${inner}${toPythonDict(v, indent + 1)}`)
    return `[\n${items.join(',\n')}\n${pad}]`
  }
  if (data === null) return 'None'
  if (typeof data === 'boolean') return data ? 'True' : 'False'
  if (typeof data === 'number') return String(data)
  if (typeof data === 'string') return pyString(data)
  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return '{}'
    const items = entries.map(([k, v]) => `${inner}${pyString(k)}: ${toPythonDict(v, indent + 1)}`)
    return `{\n${items.join(',\n')}\n${pad}}`
  }
  return String(data)
}

export function toStringify(data) {
  return JSON.stringify(JSON.stringify(data))
}

export function toMarkdownTable(data) {
  const rows = toRows(data)
  if (rows.length === 0) return ''
  const keys = columnsOf(rows)
  if (keys.length === 0) return ''
  // A line break or a pipe in a cell breaks the table.
  const cell = v => String(v ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
  const header = `| ${keys.map(cell).join(' | ')} |`
  const sep = `| ${keys.map(() => '---').join(' | ')} |`
  const body = rows.map(r => `| ${keys.map(k => cell(r[k])).join(' | ')} |`)
  return [header, sep, ...body].join('\n')
}
