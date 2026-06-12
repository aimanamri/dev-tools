import { useState, useMemo } from 'react'
import yaml from 'js-yaml'
import Papa from 'papaparse'
import { js2xml } from 'xml-js'
import { Copy, Check, AlertCircle, ChevronDown } from 'lucide-react'

// ── Conversion logic ──────────────────────────────────────────────────────────

function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const path = prefix ? `${prefix}.${key}` : key
    const val = obj[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flattenObject(val, path))
    } else {
      acc[path] = Array.isArray(val) ? JSON.stringify(val) : val
    }
    return acc
  }, {})
}

function toCSV(data) {
  const rows = Array.isArray(data) ? data : [data]
  const flat = rows.map(r =>
    typeof r === 'object' && r !== null ? flattenObject(r) : { value: r }
  )
  return Papa.unparse(flat)
}

function toYAML(data) {
  return yaml.dump(data, { indent: 2, lineWidth: -1 })
}

function jsonToXmlNode(data, tagName = 'root') {
  if (Array.isArray(data)) {
    return {
      type: 'element',
      name: tagName,
      elements: data.map((item, i) => jsonToXmlNode(item, 'item')),
    }
  }
  if (data !== null && typeof data === 'object') {
    return {
      type: 'element',
      name: tagName,
      elements: Object.entries(data).map(([k, v]) => jsonToXmlNode(v, k)),
    }
  }
  return {
    type: 'element',
    name: tagName,
    elements: [{ type: 'text', text: String(data ?? '') }],
  }
}

function toXML(data) {
  const doc = {
    declaration: { attributes: { version: '1.0', encoding: 'UTF-8' } },
    elements: [jsonToXmlNode(data, 'root')],
  }
  return js2xml(doc, { compact: false, spaces: 2 })
}

function toPythonDict(data, indent = 0) {
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
  if (typeof data === 'string') {
    const escaped = data.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    return `'${escaped}'`
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return '{}'
    const items = entries.map(([k, v]) => {
      const key = `'${k.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
      return `${inner}${key}: ${toPythonDict(v, indent + 1)}`
    })
    return `{\n${items.join(',\n')}\n${pad}}`
  }
  return String(data)
}

function toStringify(data) {
  return JSON.stringify(JSON.stringify(data))
}

function toMarkdownTable(data) {
  const rows = Array.isArray(data) ? data : [data]
  const flat = rows.map(r =>
    typeof r === 'object' && r !== null ? flattenObject(r) : { value: r }
  )
  if (flat.length === 0) return ''
  const keys = [...new Set(flat.flatMap(Object.keys))]
  const escape = v => String(v ?? '').replace(/\|/g, '\\|')
  const header = `| ${keys.map(escape).join(' | ')} |`
  const sep = `| ${keys.map(() => '---').join(' | ')} |`
  const body = flat.map(r => `| ${keys.map(k => escape(r[k] ?? '')).join(' | ')} |`)
  return [header, sep, ...body].join('\n')
}

const FORMATS = [
  { id: 'csv',      label: 'CSV',             fn: toCSV },
  { id: 'yaml',     label: 'YAML',            fn: toYAML },
  { id: 'xml',      label: 'XML',             fn: toXML },
  { id: 'python',   label: 'Python Dict',     fn: toPythonDict },
  { id: 'stringify',label: 'Stringify',       fn: toStringify },
  { id: 'markdown', label: 'Markdown Table',  fn: toMarkdownTable },
]

// ── Styles ────────────────────────────────────────────────────────────────────

const STYLES = `
.jsc-root { display: flex; flex-direction: column; gap: 0; }

.jsc-workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: "in-hdr out-hdr" "in-body out-body";
  gap: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  overflow: hidden;
  min-height: 480px;
}

.jsc-in-hdr  { grid-area: in-hdr;  }
.jsc-out-hdr { grid-area: out-hdr; }
.jsc-in-body { grid-area: in-body; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--color-border); }
.jsc-out-body { grid-area: out-body; display: flex; flex-direction: column; overflow: hidden; }

.jsc-pane-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.375rem 0.75rem; background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.6875rem; font-weight: 500; color: var(--color-ink-muted);
  font-family: var(--font-sans); letter-spacing: 0.04em; text-transform: uppercase;
}
.jsc-in-hdr  { border-right: 1px solid var(--color-border); }

.jsc-textarea {
  flex: 1; width: 100%; resize: none; border: none; outline: none;
  padding: 0.875rem 1rem; font-family: var(--font-mono); font-size: 0.8125rem;
  line-height: 1.6; color: var(--color-ink); background: var(--color-input-bg); overflow: auto;
}
.jsc-textarea.error { box-shadow: inset 3px 0 0 var(--color-error); }

.jsc-error {
  display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 0.625rem 1rem; background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  font-size: 0.75rem; font-family: var(--font-mono); color: var(--color-error);
  flex-shrink: 0;
}

.jsc-tabs {
  display: flex; gap: 0; overflow-x: auto; flex-shrink: 0;
  border-bottom: 1px solid var(--color-border); background: var(--color-surface);
  scrollbar-width: none;
}
.jsc-tabs::-webkit-scrollbar { display: none; }
.jsc-tab {
  padding: 0.375rem 0.75rem; font-size: 0.75rem; font-weight: 500;
  border: none; cursor: pointer; white-space: nowrap;
  font-family: var(--font-sans); border-bottom: 2px solid transparent;
  background: transparent; transition: background 120ms ease-out, color 120ms ease-out;
  color: var(--color-ink-muted);
}
.jsc-tab:hover { background: var(--color-surface-raised); color: var(--color-ink); }
.jsc-tab[data-active="true"] {
  color: var(--color-primary); border-bottom-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.jsc-copy-btn {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500;
  border: 1px solid var(--color-border-strong); background: var(--color-surface);
  color: var(--color-ink-muted); cursor: pointer; font-family: var(--font-sans);
  transition: background 120ms ease-out;
}
.jsc-copy-btn:hover { background: var(--color-surface); color: var(--color-ink); }
.jsc-copy-btn[data-ok="true"] { color: var(--color-success); border-color: var(--color-success); }

@media (max-width: 768px) {
  .jsc-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto 1fr;
    grid-template-areas: "in-hdr" "in-body" "out-hdr" "out-body";
  }
  .jsc-in-hdr  { border-right: none; border-bottom: 1px solid var(--color-border); }
  .jsc-in-body { border-right: none; border-bottom: 1px solid var(--color-border); min-height: 220px; }
}
`

// ── Component ─────────────────────────────────────────────────────────────────

export default function JSONConverters() {
  const [source, setSource] = useState(DEFAULT_JSON)
  const [format, setFormat] = useState('csv')
  const [copied, setCopied] = useState(false)

  const { output, error } = useMemo(() => {
    if (!source.trim()) return { output: '', error: null }
    let parsed
    try {
      parsed = JSON.parse(source)
    } catch (e) {
      return { output: '', error: e.message }
    }
    const fmt = FORMATS.find(f => f.id === format)
    try {
      return { output: fmt.fn(parsed), error: null }
    } catch (e) {
      return { output: '', error: `Conversion error: ${e.message}` }
    }
  }, [source, format])

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="jsc-root">
      <style>{STYLES}</style>

      {/* Page heading */}
      <div style={{ marginBottom: '0.875rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ink)', margin: 0, lineHeight: 1.3 }}>
          JSON Converters
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', margin: '0.25rem 0 0', fontFamily: 'var(--font-sans)' }}>
          Paste valid JSON on the left — select an output format on the right.
        </p>
      </div>

      <div className="jsc-workspace">
        {/* Input header */}
        <div className="jsc-pane-hdr jsc-in-hdr">
          <span>JSON Input</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: '0.6875rem', letterSpacing: 0, textTransform: 'none' }}>
            {source.length}C
          </span>
        </div>

        {/* Output header */}
        <div className="jsc-pane-hdr jsc-out-hdr">
          <span>{FORMATS.find(f => f.id === format)?.label ?? 'Output'}</span>
          <button className="jsc-copy-btn" data-ok={String(copied)} onClick={handleCopy} disabled={!output}>
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Input body */}
        <div className="jsc-in-body">
          <textarea
            className={`jsc-textarea${error ? ' error' : ''}`}
            value={source}
            onChange={e => setSource(e.target.value)}
            spellCheck={false}
            placeholder='{"key": "value"}'
          />
          {error && (
            <div className="jsc-error">
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Output body */}
        <div className="jsc-out-body">
          <div className="jsc-tabs">
            {FORMATS.map(f => (
              <button
                key={f.id}
                className="jsc-tab"
                data-active={String(format === f.id)}
                onClick={() => setFormat(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <textarea
            className="jsc-textarea"
            value={output}
            readOnly
            spellCheck={false}
            placeholder="Output appears here…"
          />
        </div>
      </div>
    </div>
  )
}

// ── Default content ───────────────────────────────────────────────────────────

const DEFAULT_JSON = `[
  {
    "id": 1,
    "name": "Alice",
    "role": "Engineer",
    "active": true,
    "scores": [95, 87, 92]
  },
  {
    "id": 2,
    "name": "Bob",
    "role": "Designer",
    "active": false,
    "scores": [78, 84, 90]
  },
  {
    "id": 3,
    "name": "Carol",
    "role": "Manager",
    "active": true,
    "scores": [88, 91, 95]
  }
]`
