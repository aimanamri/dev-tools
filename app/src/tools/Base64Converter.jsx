import { useState, useCallback, useRef } from 'react'
import {
  Upload, FileText, X, ShieldCheck,
  AlertCircle, ArrowRight,
} from 'lucide-react'
import Button from '../components/ui/Button'
import CopyButton from '../components/ui/CopyButton'

// ── Encoding helpers ──────────────────────────────────────────────────────────
function encodeText(str, charset) {
  try {
    if (charset === 'latin1') {
      // Latin-1: only chars 0–255
      return btoa(str)
    }
    // UTF-8 (default) + ASCII subset
    const bytes = new TextEncoder().encode(str)
    const binary = Array.from(bytes, b => String.fromCharCode(b)).join('')
    return btoa(binary)
  } catch (e) {
    throw new Error(`Encoding failed: ${e.message}`)
  }
}

function decodeText(b64, charset) {
  try {
    const binary = atob(b64.replace(/\s/g, ''))
    if (charset === 'latin1') return binary
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    return new TextDecoder(charset === 'ascii' ? 'ascii' : 'utf-8').decode(bytes)
  } catch (e) {
    throw new Error(`Invalid Base64: ${e.message}`)
  }
}

function processText(input, mode, charset, eachLine) {
  if (!input) return { output: '', error: null }
  try {
    if (eachLine) {
      const lines = input.split('\n')
      const processed = lines.map(line => {
        if (!line) return ''
        return mode === 'encode' ? encodeText(line, charset) : decodeText(line, charset)
      })
      return { output: processed.join('\n'), error: null }
    }
    const output = mode === 'encode'
      ? encodeText(input, charset)
      : decodeText(input, charset)
    return { output, error: null }
  } catch (e) {
    return { output: '', error: e.message }
  }
}

// File → Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result.split(',')[1]) // strip data-URL prefix
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

// Base64 → download file
function downloadFile(b64, filename) {
  const binary = atob(b64.replace(/\s/g, ''))
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes])
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function fmtSize(bytes) {
  if (bytes < 1024)           return `${bytes} B`
  if (bytes < 1024 ** 2)     return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3)     return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

function ModeToggle({ mode, onChange }) {
  function btn(id, label) {
    const active = mode === id
    return (
      <button
        key={id}
        onClick={() => onChange(id)}
        className="px-4 py-1.5 text-sm font-mono rounded-sm transition-colors duration-fast"
        style={{
          backgroundColor: active ? 'var(--color-primary)' : 'transparent',
          color:           active ? 'var(--color-ink-on-primary)' : 'var(--color-ink-muted)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <div
      className="flex rounded-sm p-0.5"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {btn('encode', 'Encode')}
      {btn('decode', 'Decode')}
    </div>
  )
}

function PanelHeader({ label, stats }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-strong)',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
      }}
    >
      <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      {stats && <span className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>{stats}</span>}
    </div>
  )
}

// ── TEXT TAB ──────────────────────────────────────────────────────────────────
function TextTab({ mode }) {
  const [input,    setInput]    = useState('')
  const [charset,  setCharset]  = useState('utf8')
  const [eachLine, setEachLine] = useState(false)

  const { output, error } = processText(input, mode, charset, eachLine)

  const taStyle = {
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    fontSize: '0.8125rem',
    lineHeight: '1.6',
    padding: '12px',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-border-strong)',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    resize: 'none',
    outline: 'none',
    width: '100%',
    minHeight: '240px',
    caretColor: 'var(--color-primary)',
  }

  const inputLabel  = mode === 'encode' ? 'Plain text input' : 'Base64 input'
  const outputLabel = mode === 'encode' ? 'Base64 output'    : 'Decoded output'
  const inputStats  = input  ? `${input.length}c`  : null
  const outputStats = output ? `${output.length}c` : null

  return (
    <div className="flex flex-col gap-3">
      {/* Options row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>
            Charset
          </label>
          <select
            value={charset}
            onChange={e => setCharset(e.target.value)}
            className="text-xs font-mono rounded-xs border px-2 py-1 cursor-pointer"
            style={{
              outline: 'none',
            }}
          >
            <option value="utf8">UTF-8</option>
            <option value="ascii">ASCII</option>
            <option value="latin1">Latin-1 (ISO-8859-1)</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            className="relative flex items-center justify-center w-4 h-4 rounded-xs border transition-colors duration-fast flex-shrink-0"
            style={{
              backgroundColor: eachLine ? 'var(--color-primary)' : 'var(--color-input-bg)',
              borderColor:     eachLine ? 'var(--color-primary)' : 'var(--color-border-strong)',
            }}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={eachLine}
              onChange={() => setEachLine(v => !v)}
            />
            {eachLine && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>
            {mode === 'encode' ? 'Encode' : 'Decode'} each line separately
          </span>
        </label>
      </div>

      {/* Split panes */}
      <div
        className="b64-split"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gridTemplateAreas: '"input arrow output"',
          gap: '8px',
          alignItems: 'start',
        }}
      >
        {/* Input */}
        <div style={{ gridArea: 'input' }}>
          <PanelHeader label={inputLabel} stats={inputStats} />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === 'encode' ? 'Type or paste text to encode…' : 'Paste Base64 string to decode…'}
            spellCheck={false}
            style={{
              ...taStyle,
              borderColor: error ? 'var(--color-error)' : 'var(--color-border-strong)',
            }}
          />
          {error && (
            <div
              className="flex items-start gap-2 mt-1.5 px-3 py-2 rounded-xs text-xs font-mono"
              style={{
                backgroundColor: 'oklch(0.490 0.195 18 / 0.10)',
                color: 'var(--color-error)',
                border: '1px solid oklch(0.490 0.195 18 / 0.25)',
                lineHeight: 1.5,
              }}
            >
              <AlertCircle size={13} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <div
          style={{ gridArea: 'arrow', paddingTop: '38px' }}
          className="flex items-start justify-center"
        >
          <ArrowRight size={16} strokeWidth={1.5} style={{ color: 'var(--color-ink-faint)' }} />
        </div>

        {/* Output */}
        <div style={{ gridArea: 'output' }} className="flex flex-col gap-1.5">
          <PanelHeader label={outputLabel} stats={outputStats} />
          <textarea
            value={output}
            readOnly
            placeholder="Output appears here in real time."
            spellCheck={false}
            style={{
              ...taStyle,
              color: output ? 'var(--color-ink)' : 'var(--color-ink-faint)',
            }}
          />
          <div className="flex justify-end">
            <CopyButton text={output} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .b64-split {
            grid-template-columns: 1fr !important;
            grid-template-areas: "input" "output" !important;
          }
          .b64-split [style*="arrow"] { display: none; }
        }
      `}</style>
    </div>
  )
}

// ── FILE TAB ──────────────────────────────────────────────────────────────────
function FileTab({ mode }) {
  const [file,      setFile]     = useState(null)
  const [b64Result, setB64Result] = useState('')
  const [b64Input,  setB64Input]  = useState('')
  const [processing, setProc]    = useState(false)
  const [error,     setError]    = useState(null)
  const [dragging,  setDragging] = useState(false)
  const fileInput = useRef(null)

  function handleFile(f) {
    if (!f) return
    if (f.size > MAX_FILE_BYTES) {
      setError(`File too large: ${fmtSize(f.size)}. Maximum is 10 MB.`)
      return
    }
    setFile(f)
    setError(null)
    setB64Result('')
  }

  async function handleEncode() {
    if (!file) return
    setProc(true)
    setError(null)
    try {
      const result = await fileToBase64(file)
      setB64Result(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setProc(false)
    }
  }

  function handleDecode() {
    if (!b64Input.trim()) return
    setError(null)
    try {
      downloadFile(b64Input.trim(), 'decoded-file')
    } catch (e) {
      setError(`Invalid Base64: ${e.message}`)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const taStyle = {
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    fontSize: '0.75rem',
    lineHeight: '1.5',
    padding: '12px',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-border-strong)',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    resize: 'none',
    outline: 'none',
    width: '100%',
    minHeight: '180px',
    caretColor: 'var(--color-primary)',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Privacy notice */}
      <div
        className="flex items-start gap-2 px-3 py-2.5 rounded-xs text-xs font-sans"
        style={{
          backgroundColor: 'oklch(0.460 0.115 215 / 0.08)',
          color: 'var(--color-accent)',
          border: '1px solid oklch(0.460 0.115 215 / 0.25)',
          lineHeight: 1.6,
        }}
      >
        <ShieldCheck size={14} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
        <span>
          Files are processed entirely in your browser using the{' '}
          <span className="font-mono">FileReader</span> API.
          Nothing is uploaded to any server. The file is released from memory as soon as processing completes.
        </span>
      </div>

      {mode === 'encode' ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-md cursor-pointer transition-colors duration-fast"
            style={{
              border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
              backgroundColor: dragging ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
              padding: '32px 24px',
              minHeight: '140px',
            }}
          >
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              onChange={e => handleFile(e.target.files[0])}
            />
            <Upload size={24} strokeWidth={1.5} style={{ color: dragging ? 'var(--color-primary)' : 'var(--color-ink-faint)' }} />
            {file ? (
              <div className="text-center">
                <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-ink)' }}>
                  {file.name}
                </p>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                  {fmtSize(file.size)} · {file.type || 'unknown type'}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-sans" style={{ color: 'var(--color-ink-muted)' }}>
                  Drop a file here or click to browse
                </p>
                <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                  Any file type · up to 10 MB
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="primary"
              onClick={handleEncode}
              disabled={!file || processing}
              loading={processing}
              icon={<FileText size={13} strokeWidth={1.5} />}
            >
              Encode to Base64
            </Button>
            {file && (
              <Button
                size="sm" variant="ghost"
                onClick={() => { setFile(null); setB64Result(''); setError(null) }}
                icon={<X size={13} strokeWidth={1.5} />}
              >
                Remove
              </Button>
            )}
          </div>

          {/* Output */}
          {b64Result && (
            <div className="flex flex-col gap-1.5">
              <PanelHeader
                label="Base64 output"
                stats={`${b64Result.length} chars`}
              />
              <textarea value={b64Result} readOnly spellCheck={false} style={taStyle} />
              <div className="flex justify-end">
                <CopyButton text={b64Result} />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Decode: B64 input → download file */}
          <div>
            <PanelHeader label="Base64 input" stats={b64Input ? `${b64Input.length} chars` : null} />
            <textarea
              value={b64Input}
              onChange={e => { setB64Input(e.target.value); setError(null) }}
              placeholder="Paste Base64 encoded file content here…"
              spellCheck={false}
              style={{
                ...taStyle,
                borderColor: error ? 'var(--color-error)' : 'var(--color-border-strong)',
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="primary"
              onClick={handleDecode}
              disabled={!b64Input.trim()}
              icon={<FileText size={13} strokeWidth={1.5} />}
            >
              Decode &amp; Download
            </Button>
          </div>
        </>
      )}

      {error && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-xs text-xs font-mono"
          style={{
            backgroundColor: 'oklch(0.490 0.195 18 / 0.10)',
            color: 'var(--color-error)',
            border: '1px solid oklch(0.490 0.195 18 / 0.25)',
            lineHeight: 1.5,
          }}
        >
          <AlertCircle size={13} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────
export default function Base64Converter() {
  const [mode,      setMode]     = useState('encode') // 'encode' | 'decode'
  const [sourceTab, setSourceTab] = useState('text')  // 'text' | 'file'

  function tab(id, label) {
    const active = sourceTab === id
    return (
      <button
        onClick={() => setSourceTab(id)}
        className="font-mono"
        style={{
          padding: '5px 14px',
          fontSize: '0.875rem',
          fontWeight: active ? 500 : 400,
          borderRadius: '6px 6px 0 0',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 120ms',
          backgroundColor: active ? 'var(--color-surface)' : 'transparent',
          color: active ? 'var(--color-ink)' : 'var(--color-ink-muted)',
          borderBottom: `2px solid ${active ? 'var(--color-primary)' : 'transparent'}`,
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">

      {/* Top bar: mode toggle + source tabs */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <ModeToggle mode={mode} onChange={setMode} />
        <div className="flex border-b gap-0" style={{ borderColor: 'var(--color-border)' }}>
          {tab('text', 'Text')}
          {tab('file', 'File')}
        </div>
      </div>

      {/* Content */}
      {sourceTab === 'text'
        ? <TextTab key={mode} mode={mode} />
        : <FileTab key={mode} mode={mode} />
      }

    </div>
  )
}
