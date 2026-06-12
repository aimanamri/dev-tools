import { useState, useMemo, useRef } from 'react'
import {
  Copy, Check, ShieldCheck, AlertCircle, CheckCircle2,
  Trash2, ClipboardPaste,
} from 'lucide-react'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import Button from '../components/ui/Button'

const STYLES = `
/* shared base — each element provides its own background */
.pdc-pre { margin: 0; tab-size: 4; }
.pdc-pre code.hljs { background: transparent; color: var(--color-ink); padding: 0; }

/* light-mode token colours (github palette) */
.pdc-pre .hljs-keyword,
.pdc-pre .hljs-selector-tag  { color: #d73a49; }
.pdc-pre .hljs-string,
.pdc-pre .hljs-attr          { color: #032f62; }
.pdc-pre .hljs-comment       { color: #6a737d; font-style: italic; }
.pdc-pre .hljs-number        { color: #005cc5; }
.pdc-pre .hljs-function,
.pdc-pre .hljs-title         { color: #6f42c1; }
.pdc-pre .hljs-built_in      { color: #953800; }
.pdc-pre .hljs-literal       { color: #005cc5; }
.pdc-pre .hljs-variable      { color: #e36209; }
.pdc-pre .hljs-meta          { color: #6a737d; }

/* dark-mode token colours — html.dark class (app toggle, not OS preference) */
html.dark .pdc-pre .hljs-keyword,
html.dark .pdc-pre .hljs-selector-tag { color: #c792ea; }
html.dark .pdc-pre .hljs-string,
html.dark .pdc-pre .hljs-attr         { color: #c3e88d; }
html.dark .pdc-pre .hljs-comment      { color: #546e7a; font-style: italic; }
html.dark .pdc-pre .hljs-number       { color: #f78c6c; }
html.dark .pdc-pre .hljs-function,
html.dark .pdc-pre .hljs-title        { color: #82aaff; }
html.dark .pdc-pre .hljs-built_in     { color: #89ddff; }
html.dark .pdc-pre .hljs-literal      { color: #ff5370; }
html.dark .pdc-pre .hljs-variable     { color: #f07178; }
html.dark .pdc-pre .hljs-meta         { color: #89ddff; }

/* Overlay input editor */
.pdc-overlay-wrap { position: relative; }
.pdc-overlay-pre {
  position: absolute; inset: 0;
  overflow: hidden; pointer-events: none;
  white-space: pre-wrap; word-break: break-all;
}
.pdc-overlay-ta {
  position: relative; z-index: 1;
  color: transparent !important;
  caret-color: var(--color-primary);
  background: transparent !important;
  white-space: pre-wrap;
  resize: none;
}
`

// ── Parser ────────────────────────────────────────────────────────────────────
// Walks char-by-char to handle strings separately from code, so keyword
// replacements never fire inside string values.
function parsePythonDict(src) {
  let out = ''
  let i = 0
  const n = src.length

  while (i < n) {
    const ch = src[i]

    // Triple-quoted strings: '''...''' or """..."""
    const tripleQ =
      (ch === "'" && src.slice(i, i + 3) === "'''") ||
      (ch === '"' && src.slice(i, i + 3) === '"""')
      ? src.slice(i, i + 3) : null

    if (tripleQ) {
      out += '"'
      i += 3
      while (i < n && src.slice(i, i + 3) !== tripleQ) {
        if (src[i] === '\\' && i + 1 < n) {
          out += src[i]; out += src[i + 1]; i += 2
        } else if (src[i] === '"') {
          out += '\\"'; i++
        } else if (src[i] === '\n') {
          out += '\\n'; i++
        } else if (src[i] === '\r') {
          i++
        } else {
          out += src[i++]
        }
      }
      out += '"'
      i += 3
      continue
    }

    // Single-quoted string: '...'
    if (ch === "'") {
      out += '"'
      i++
      while (i < n && src[i] !== "'") {
        if (src[i] === '\\' && i + 1 < n) {
          const nx = src[i + 1]
          if (nx === "'") { out += "'"; i += 2 }             // \' → ' (no escape needed in JSON)
          else if (nx === '"') { out += '\\"'; i += 2 }      // \" → keep escaped
          else { out += src[i]; out += src[i + 1]; i += 2 }
        } else if (src[i] === '"') {
          out += '\\"'; i++    // bare " inside single-quoted → escape it
        } else if (src[i] === '\n') {
          out += '\\n'; i++
        } else {
          out += src[i++]
        }
      }
      out += '"'
      i++ // closing '
      continue
    }

    // Double-quoted string: "..."
    if (ch === '"') {
      out += '"'
      i++
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < n) {
          out += src[i]; out += src[i + 1]; i += 2
        } else {
          out += src[i++]
        }
      }
      out += '"'
      i++ // closing "
      continue
    }

    // Python comment: strip to end of line
    if (ch === '#') {
      while (i < n && src[i] !== '\n') i++
      continue
    }

    // All other characters — collect a run, then apply substitutions
    const start = i
    while (i < n && src[i] !== "'" && src[i] !== '"' && src[i] !== '#') i++
    let chunk = src.slice(start, i)

    // Boolean / None literals at word boundaries
    chunk = chunk.replace(/\bTrue\b/g, 'true')
    chunk = chunk.replace(/\bFalse\b/g, 'false')
    chunk = chunk.replace(/\bNone\b/g, 'null')

    // Tuples → JSON arrays (safe in a pure dict literal context)
    chunk = chunk.replace(/\(/g, '[').replace(/\)/g, ']')

    // Remove trailing commas before } or ]
    chunk = chunk.replace(/,(\s*[}\]])/g, '$1')

    out += chunk
  }

  const parsed = JSON.parse(out)
  return JSON.stringify(parsed, null, 2)
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const t = useRef(null)
  function handle() {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      clearTimeout(t.current)
      t.current = setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <Button
      size="sm" variant="secondary" onClick={handle} disabled={!text}
      icon={copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
      style={copied ? { color: 'var(--color-success)', borderColor: 'oklch(0.480 0.140 145 / 0.4)' } : {}}
    >
      {copied ? 'Copied' : 'Copy JSON'}
    </Button>
  )
}

// ── Panel header ──────────────────────────────────────────────────────────────
function PanelHeader({ label, badge, actions }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 gap-2 flex-shrink-0"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-strong)',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono font-medium truncate" style={{ color: 'var(--color-ink-muted)' }}>
          {label}
        </span>
        {badge}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {actions}
      </div>
    </div>
  )
}

const TA_BASE = {
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  fontSize: '0.8125rem',
  lineHeight: '1.6',
  padding: '12px',
  backgroundColor: 'var(--color-input-bg)',
  color: 'var(--color-ink)',
  resize: 'none',
  outline: 'none',
  width: '100%',
  minHeight: '380px',
  caretColor: 'var(--color-primary)',
  tabSize: 4,
  border: '1px solid var(--color-border-strong)',
}

const SAMPLE = `{
    'name': 'Alice',
    'active': True,
    'score': None,
    'tags': ['python', 'dev'],
    'coords': (48.8566, 2.3522),  # tuple → array
    'meta': {
        'version': 2,
        'debug': False
    }
}`

// ── Educational panel ─────────────────────────────────────────────────────────
function hljsPython(code) {
  try {
    return hljs.highlight(code, { language: 'python' }).value
  } catch {
    return code.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  }
}

function hljsJson(code) {
  try {
    return hljs.highlight(code, { language: 'json' }).value
  } catch {
    return code.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  }
}

const EDU_BLOCKS = [
  {
    title: 'json.dumps() — dict to JSON string',
    code: `import json

data = {
    "name": "Alice",
    "active": True,
    "score": None
}

json_str = json.dumps(data, indent=2)
print(json_str)
# {
#   "name": "Alice",
#   "active": true,
#   "score": null
# }`,
  },
  {
    title: 'json.dump() / json.load() — file I/O',
    code: `import json

# Write dict to a file
with open('output.json', 'w') as f:
    json.dump(data, f, indent=2)

# Read JSON from a file
with open('data.json', 'r') as f:
    loaded = json.load(f)

# Parse a JSON string
parsed = json.loads('{"key": "value"}')`,
  },
  {
    title: 'Custom serializer — non-standard types',
    code: `import json

data = {
    "coords": (48.8566, 2.3522),  # tuple
    "values": {1, 2, 3},          # set
}

def default(obj):
    if isinstance(obj, (tuple, set)):
        return list(obj)
    raise TypeError(type(obj))

json.dumps(data, default=default, indent=2)`,
  },
  {
    title: 'sort_keys & separators — compact output',
    code: `import json

data = {"z": 1, "a": 2, "m": 3}

# Alphabetical keys
json.dumps(data, sort_keys=True)
# {"a": 2, "m": 3, "z": 1}

# Compact (no extra whitespace)
json.dumps(data, separators=(',', ':'))
# {"z":1,"a":2,"m":3}`,
  },
]

const TYPE_MAP = [
  ['True', 'true', 'Boolean'],
  ['False', 'false', 'Boolean'],
  ['None', 'null', 'Null'],
  ["'string'", '"string"', 'String'],
  ['(1, 2)', '[1, 2]', 'Tuple → Array'],
]

function EducationalPanel() {
  return (
    <div className="flex flex-col gap-5 mt-2">
      <style>{STYLES}</style>
      <div>
        <h2
          className="text-base font-sans font-semibold mb-1"
          style={{ color: 'var(--color-ink)', letterSpacing: '-0.02em' }}
        >
          Python's json module
        </h2>
        <p className="text-sm font-sans" style={{ color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
          Built into the standard library — no pip install needed. The{' '}
          <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', color: 'var(--color-primary)' }}>json</code>{' '}
          module converts Python dicts to JSON-compliant strings and handles all type coercions.
        </p>
      </div>

      {/* Type mapping table */}
      <div
        className="rounded-md border overflow-hidden"
        style={{ borderColor: 'var(--color-border-strong)' }}
      >
        <div
          className="px-3 py-2 border-b"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-ink-muted)' }}>
            Type conversions
          </span>
        </div>
        <div style={{ backgroundColor: 'var(--color-input-bg)' }}>
          {TYPE_MAP.map(([py, js, kind]) => (
            <div
              key={py}
              className="flex items-center gap-3 px-3 py-2 border-b last:border-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <code
                className="text-xs font-mono px-1.5 py-0.5 rounded-xs flex-shrink-0 w-24 text-center"
                style={{
                  backgroundColor: 'oklch(0.489 0.190 28.3 / 0.10)',
                  color: 'var(--color-primary)',
                }}
              >
                {py}
              </code>
              <span className="text-xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>→</span>
              <code
                className="text-xs font-mono px-1.5 py-0.5 rounded-xs flex-shrink-0 w-24 text-center"
                style={{
                  backgroundColor: 'oklch(0.480 0.140 145 / 0.10)',
                  color: 'var(--color-success)',
                }}
              >
                {js}
              </code>
              <span className="text-xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
                {kind}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Code blocks */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
      >
        {EDU_BLOCKS.map(({ title, code }) => (
          <div
            key={title}
            className="rounded-md border overflow-hidden"
            style={{ borderColor: 'var(--color-border-strong)' }}
          >
            <div
              className="px-3 py-2 border-b"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                {title}
              </span>
            </div>
            <pre
              className="pdc-pre p-3"
              style={{ fontFamily: 'JetBrains Mono, Fira Code, monospace', fontSize: '0.75rem', lineHeight: 1.65, backgroundColor: 'var(--color-surface)', overflow: 'auto' }}
              dangerouslySetInnerHTML={{ __html: `<code class="hljs">${hljsPython(code)}</code>` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PythonDictConverter() {
  const [input, setInput] = useState(SAMPLE)
  const inputHighlightRef = useRef(null)

  function handleInputScroll(e) {
    if (inputHighlightRef.current) {
      inputHighlightRef.current.scrollTop = e.target.scrollTop
      inputHighlightRef.current.scrollLeft = e.target.scrollLeft
    }
  }

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: null }
    try {
      return { output: parsePythonDict(input), error: null }
    } catch (e) {
      return { output: '', error: e.message }
    }
  }, [input])

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      setInput(text)
    } catch { /* permission denied */ }
  }

  const inputStats  = input  ? `${input.split('\n').length}L` : null
  const outputStats = output ? `${output.split('\n').length}L` : null

  const hasError = Boolean(error)

  return (
    <div className="flex flex-col gap-4">

      {/* Privacy banner */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono flex-shrink-0"
        style={{
          backgroundColor: 'oklch(0.480 0.140 145 / 0.09)',
          border: '1px solid oklch(0.480 0.140 145 / 0.25)',
          color: 'var(--color-success)',
        }}
      >
        <ShieldCheck size={13} strokeWidth={1.5} style={{ flexShrink: 0 }} />
        All conversions run 100% in-browser — your data never leaves this page.
      </div>

      {/* Split editors */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
      >
        {/* Python input */}
        <div className="flex flex-col">
          <PanelHeader
            label={`Python Dictionary${inputStats ? `  ·  ${inputStats}` : ''}`}
            actions={<>
              <Button
                size="sm" variant="ghost" onClick={handlePaste}
                icon={<ClipboardPaste size={13} strokeWidth={1.5} />}
              >
                Paste
              </Button>
              <Button
                size="sm" variant="ghost" onClick={() => setInput('')} disabled={!input}
                icon={<Trash2 size={13} strokeWidth={1.5} />}
              >
                Clear
              </Button>
            </>}
          />
          <div
            className="pdc-overlay-wrap"
            style={{
              border: '1px solid var(--color-border-strong)',
              borderRadius: hasError ? '0' : '0 0 8px 8px',
              backgroundColor: 'var(--color-input-bg)',
              overflow: 'hidden',
            }}
          >
            <pre
              ref={inputHighlightRef}
              aria-hidden
              className="pdc-pre pdc-overlay-pre"
              style={{ ...TA_BASE, border: 'none', borderRadius: 0, minHeight: TA_BASE.minHeight }}
              dangerouslySetInnerHTML={{ __html: `<code class="hljs">${hljsPython(input)}</code>` }}
            />
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onScroll={handleInputScroll}
              placeholder={"{\n    'key': 'value',\n    'active': True\n}"}
              spellCheck={false}
              className="pdc-overlay-ta"
              style={{ ...TA_BASE, border: 'none', borderRadius: 0 }}
            />
          </div>
          {hasError && (
            <div
              className="flex items-start gap-2 px-3 py-2 text-xs font-mono"
              style={{
                backgroundColor: 'oklch(0.490 0.195 18 / 0.08)',
                border: '1px solid oklch(0.490 0.195 18 / 0.30)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                color: 'var(--color-error)',
              }}
            >
              <AlertCircle size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ lineHeight: 1.5 }}>{error}</span>
            </div>
          )}
        </div>

        {/* JSON output */}
        <div className="flex flex-col">
          <PanelHeader
            label={`JSON Output${outputStats ? `  ·  ${outputStats}` : ''}`}
            badge={
              output
                ? <div
                    className="flex items-center gap-1 text-2xs font-mono"
                    style={{ color: 'var(--color-success)' }}
                  >
                    <CheckCircle2 size={11} strokeWidth={2} />
                    Valid
                  </div>
                : null
            }
            actions={<CopyButton text={output} />}
          />
          <pre
            className="pdc-pre"
            style={{
              ...TA_BASE,
              borderRadius: '0 0 8px 8px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              cursor: 'default',
            }}
            dangerouslySetInnerHTML={{
              __html: output
                ? `<code class="hljs">${hljsJson(output)}</code>`
                : `<span style="color:var(--color-ink-faint)">JSON output will appear here…</span>`
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />

      <EducationalPanel />
    </div>
  )
}
