import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Copy, Check, Braces, Minimize2, Trash2,
  AlertCircle, CheckCircle2, ClipboardPaste,
} from 'lucide-react'
import Button from '../components/ui/Button'

// ── Parse helpers ─────────────────────────────────────────────────────────────
function tryParse(text) {
  if (!text.trim()) return { ok: null, error: null, value: null }
  try   { return { ok: true,  error: null,      value: JSON.parse(text) } }
  catch (e) { return { ok: false, error: e.message, value: null } }
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }) {
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
      size="sm"
      variant="secondary"
      onClick={handle}
      disabled={!text}
      icon={copied
        ? <Check size={13} strokeWidth={2} />
        : <Copy  size={13} strokeWidth={1.5} />
      }
      style={copied ? { color: 'var(--color-success)', borderColor: 'oklch(0.480 0.140 145 / 0.4)' } : {}}
    >
      {copied ? 'Copied' : label}
    </Button>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ ok }) {
  if (ok === null) return null
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-xs text-xs font-mono"
      style={{
        backgroundColor: ok
          ? 'oklch(0.480 0.140 145 / 0.12)'
          : 'oklch(0.490 0.195 18 / 0.12)',
        color: ok ? 'var(--color-success)' : 'var(--color-error)',
      }}
    >
      {ok
        ? <CheckCircle2 size={12} strokeWidth={2} />
        : <AlertCircle  size={12} strokeWidth={2} />
      }
      {ok ? 'Valid JSON' : 'Invalid JSON'}
    </div>
  )
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({ label, stats, children }) {
  return (
    <div className="flex flex-col min-h-0">
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-strong)',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-ink-muted)' }}>
          {label}
        </span>
        {stats && (
          <span className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
            {stats}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function JSONFormatter() {
  const [input,  setInput]  = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState(2)

  const { ok, error, value } = tryParse(input)

  // Derive output whenever input or indent changes
  const derive = useCallback((text, spaces) => {
    const { ok, value } = tryParse(text)
    setOutput(ok ? JSON.stringify(value, null, spaces) : '')
  }, [])

  function handleInputChange(text) {
    setInput(text)
    derive(text, indent)
  }

  function handleIndent(val) {
    setIndent(val)
    derive(input, val)
  }

  function handleMinify() {
    if (!ok) return
    setOutput(JSON.stringify(value))
  }

  function handleClear() {
    setInput('')
    setOutput('')
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      handleInputChange(text)
    } catch { /* permission denied — ignore */ }
  }

  const inputStats  = input  ? `${input.split('\n').length}L · ${input.length}c`  : null
  const outputStats = output ? `${output.split('\n').length}L · ${output.length}c` : null

  const textareaBase = {
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    fontSize: '0.8125rem',
    lineHeight: '1.6',
    padding: '12px',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-ink)',
    borderRadius: '0 0 8px 8px',
    resize: 'none',
    outline: 'none',
    width: '100%',
    minHeight: '360px',
    caretColor: 'var(--color-primary)',
    tabSize: 2,
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm" variant="primary"
          onClick={() => ok && setOutput(JSON.stringify(value, null, indent))}
          disabled={!ok}
          icon={<Braces size={13} strokeWidth={1.5} />}
        >
          Format
        </Button>
        <Button
          size="sm" variant="secondary"
          onClick={handleMinify}
          disabled={!ok}
          icon={<Minimize2 size={13} strokeWidth={1.5} />}
        >
          Minify
        </Button>

        <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* Indent selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>Indent</span>
          {[2, 4, '\t'].map(n => (
            <button
              key={n}
              onClick={() => handleIndent(n)}
              className="px-2 py-1 rounded-xs text-xs font-mono transition-colors duration-fast"
              style={{
                backgroundColor: indent === n ? 'var(--color-primary-subtle)' : 'transparent',
                color:           indent === n ? 'var(--color-primary)'         : 'var(--color-ink-muted)',
                border: `1px solid ${indent === n ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}
            >
              {n === '\t' ? 'Tab' : n}
            </button>
          ))}
        </div>

        <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />

        <Button
          size="sm" variant="ghost"
          onClick={handlePaste}
          icon={<ClipboardPaste size={13} strokeWidth={1.5} />}
        >
          Paste
        </Button>
        <Button
          size="sm" variant="ghost"
          onClick={handleClear}
          disabled={!input && !output}
          icon={<Trash2 size={13} strokeWidth={1.5} />}
        >
          Clear
        </Button>

        <div className="ml-auto">
          <StatusBadge ok={ok} />
        </div>
      </div>

      {/* ── Split workspace — CSS Grid named areas ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateAreas: '"input output"',
          gap: '12px',
        }}
        className="json-split"
      >
        {/* Input pane */}
        <div style={{ gridArea: 'input' }} className="flex flex-col gap-1.5">
          <Panel label="Input" stats={inputStats}>
            <textarea
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              placeholder={'Paste or type JSON here…\n\n{\n  "hello": "world"\n}'}
              spellCheck={false}
              style={{
                ...textareaBase,
                borderColor: error ? 'var(--color-error)' : 'var(--color-border-strong)',
                border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border-strong)'}`,
                borderTop: 'none',
              }}
            />
          </Panel>

          {/* Error message */}
          {error && (
            <div
              className="flex items-start gap-2 px-3 py-2 text-xs font-sans rounded-xs"
              style={{
                backgroundColor: 'oklch(0.490 0.195 18 / 0.10)',
                color: 'var(--color-error)',
                border: '1px solid oklch(0.490 0.195 18 / 0.25)',
                lineHeight: 1.5,
              }}
            >
              <AlertCircle size={13} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
              <span className="font-mono break-all">{error}</span>
            </div>
          )}
        </div>

        {/* Output pane */}
        <div style={{ gridArea: 'output' }} className="flex flex-col gap-1.5">
          <Panel label="Output" stats={outputStats}>
            <textarea
              value={output}
              readOnly
              placeholder="Formatted or minified output appears here."
              spellCheck={false}
              style={{
                ...textareaBase,
                border: '1px solid var(--color-border-strong)',
                borderTop: 'none',
                color: output ? 'var(--color-ink)' : 'var(--color-ink-faint)',
              }}
            />
          </Panel>
          <div className="flex justify-end">
            <CopyButton text={output} label="Copy output" />
          </div>
        </div>
      </div>

      {/* Responsive: stack below md */}
      <style>{`
        @media (max-width: 767px) {
          .json-split {
            grid-template-columns: 1fr !important;
            grid-template-areas: "input" "output" !important;
          }
        }
      `}</style>

    </div>
  )
}
