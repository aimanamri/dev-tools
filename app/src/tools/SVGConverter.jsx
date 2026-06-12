import { useState, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { Upload, Copy, Check, Download, Trash2, AlertCircle, FileImage } from 'lucide-react'
import Button from '../components/ui/Button'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'

// ── SVG cleanup (native — no SVGO) ────────────────────────────────────────────
function cleanSVG(raw) {
  let s = raw
  s = s.replace(/<\?xml[^?]*\?>/gi, '')
  s = s.replace(/<!DOCTYPE[^>]*>/gi, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<(title|desc|metadata)[^>]*>[\s\S]*?<\/\1>/gi, '')
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/>\s+</g, '><')
  s = s.replace(/\s+\/>/g, '/>')
  s = s.replace(/\s+>/g, '>')
  s = s.trim()
  return s
}

function minifySVG(raw) {
  return cleanSVG(raw)
    .replace(/\s{2,}/g, ' ')
    .replace(/;\s*/g, ';')
    .replace(/:\s*/g, ':')
}

function toCSSBackground(raw) {
  const minified = minifySVG(raw)
  const encoded  = encodeURIComponent(minified)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `background-image: url("data:image/svg+xml,${encoded}");`
}

function toBase64(raw) {
  const minified = minifySVG(raw)
  try {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(minified)))}`
  } catch {
    return `data:image/svg+xml;base64,${btoa(minified)}`
  }
}

// SVG attribute kebab-case → camelCase map
const SVG_ATTR_MAP = {
  'class': 'className',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'fill-opacity': 'fillOpacity',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'text-anchor': 'textAnchor',
  'dominant-baseline': 'dominantBaseline',
  'color-interpolation': 'colorInterpolation',
  'vector-effect': 'vectorEffect',
  'xmlns:xlink': 'xmlnsXlink',
  'xlink:href': 'xlinkHref',
  'marker-end': 'markerEnd',
  'marker-start': 'markerStart',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
}

function toJSX(raw) {
  const cleaned = cleanSVG(raw)

  // Replace SVG tag to spread props
  let jsx = cleaned.replace(
    /^<svg([^>]*)>/,
    (_, attrs) => {
      const converted = convertAttrs(attrs)
      return `<svg${converted} {...props}>`
    }
  )

  // Convert all attribute names in all tags
  jsx = jsx.replace(/<(\w[\w.-]*)([^>]*)>/g, (match, tag, attrs) => {
    if (tag === 'svg') return match // already handled
    return `<${tag}${convertAttrs(attrs)}>`
  })

  // Self-closing tags
  jsx = jsx.replace(/<(\w[\w.-]*)([^>]*)\/>/g, (_, tag, attrs) => {
    return `<${tag}${convertAttrs(attrs)} />`
  })

  return `import React from 'react';\n\nconst Icon = (props) => (\n  ${jsx}\n);\n\nexport default Icon;\n`
}

function convertAttrs(attrString) {
  return attrString.replace(
    /\s([\w:.-]+)(?:="([^"]*)")?/g,
    (match, name, value) => {
      const mapped = SVG_ATTR_MAP[name] ?? name
      if (value === undefined) return ` ${mapped}`
      return ` ${mapped}="${value}"`
    }
  )
}

// ── Preview-only dimension injection ─────────────────────────────────────────
function injectPreviewDimensions(svgString) {
  // Strip any explicit width/height so CSS can control sizing via width:100%/height:auto
  let s = svgString.replace(/(<svg\b[^>]*?)\s+width="[^"]*"/i, '$1')
  s = s.replace(/(<svg\b[^>]*?)\s+height="[^"]*"/i, '$1')
  // width="100%" + viewBox gives proportional scaling; no viewBox → set height too
  const hasViewBox = /\bviewBox\s*=/i.test(s)
  return s.replace(/(<svg\b)/, `$1 width="100%"${hasViewBox ? '' : ' height="100%"'}`)
}

const MAX_SVG_BYTES = 5 * 1024 * 1024 // 5 MB

// ── SVG sanitization (preview only) ──────────────────────────────────────────
function sanitizeSVGForPreview(svgString) {
  return DOMPurify.sanitize(svgString, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script'],
    FORBID_ATTR: [
      'onload', 'onclick', 'onerror', 'onbegin', 'onactivate',
      'onmouseover', 'onmouseenter', 'onfocus', 'onblur', 'onend',
    ],
  })
}

// ── Color extraction ──────────────────────────────────────────────────────────
const COLOR_REGEX = /(?:fill|stroke)="((?!none|currentColor|url)[^"]+)"/gi

function extractColors(svgString) {
  const colors = new Set()
  let m
  const re = new RegExp(COLOR_REGEX.source, 'gi')
  while ((m = re.exec(svgString)) !== null) {
    const c = m[1].toLowerCase().trim()
    if (c && c !== 'inherit' && c !== 'transparent') colors.add(c)
  }
  return [...colors]
}

function applyColorReplacements(svgString, replacements) {
  let result = svgString
  for (const [from, to] of Object.entries(replacements)) {
    if (from === to) continue
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`(?<=(fill|stroke)=")${escaped}(?=")`, 'gi'), to)
  }
  return result
}

// ── Output formats ────────────────────────────────────────────────────────────
const OUTPUT_TABS = [
  { id: 'minified', label: 'Minified SVG' },
  { id: 'css',      label: 'CSS Background' },
  { id: 'base64',   label: 'Base64' },
  { id: 'jsx',      label: 'React JSX' },
]

function buildOutput(svgString, tabId) {
  switch (tabId) {
    case 'minified': return minifySVG(svgString)
    case 'css':      return toCSSBackground(svgString)
    case 'base64':   return toBase64(svgString)
    case 'jsx':      return toJSX(svgString)
    default:         return ''
  }
}

function downloadOutput(content, tabId) {
  const ext  = { minified: 'svg', css: 'css', base64: 'txt', jsx: 'jsx' }[tabId] ?? 'txt'
  const mime = { minified: 'image/svg+xml', css: 'text/css', base64: 'text/plain', jsx: 'text/jsx' }[tabId] ?? 'text/plain'
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `output.${ext}` })
  a.click()
  URL.revokeObjectURL(url)
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
      size="sm" variant="secondary"
      onClick={handle} disabled={!text}
      icon={copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
      style={copied ? { color: 'var(--color-success)', borderColor: 'oklch(0.480 0.140 145 / 0.4)' } : {}}
    >
      {copied ? 'Copied' : label}
    </Button>
  )
}

// ── Parse/validate SVG ────────────────────────────────────────────────────────
function validateSVG(str) {
  const trimmed = str.trim()
  if (!trimmed) return { valid: false, error: null }
  if (!trimmed.includes('<svg') && !trimmed.includes('<SVG')) {
    return { valid: false, error: 'Input does not appear to contain an SVG element.' }
  }
  return { valid: true, error: null }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SVGConverter() {
  const [rawSVG,      setRawSVG]       = useState('')
  const [inputTab,    setInputTab]     = useState('paste')   // 'paste' | 'upload'
  const [outputTab,   setOutputTab]    = useState('minified')
  const [colorMap,    setColorMap]     = useState({})        // { original: replacement }
  const [dragging,    setDragging]     = useState(false)
  const [parseError,  setParseError]   = useState(null)
  const fileRef = useRef(null)

  const { valid, error: validationError } = validateSVG(rawSVG)
  const displayError = parseError ?? validationError

  // Apply color replacements to get the working SVG
  const workingSVG = valid ? applyColorReplacements(rawSVG, colorMap) : ''
  const previewSVG = valid ? sanitizeSVGForPreview(injectPreviewDimensions(workingSVG)) : ''
  const output     = valid ? buildOutput(workingSVG, outputTab) : ''
  const colors     = valid ? extractColors(rawSVG) : []

  function loadSVGText(text) {
    setParseError(null)
    setColorMap({})
    setRawSVG(text)
  }

  function handleFile(file) {
    if (!file) return
    if (file.size > MAX_SVG_BYTES) {
      setParseError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum is 5 MB.`)
      return
    }
    const hasValidExtension = file.name.toLowerCase().endsWith('.svg')
    const hasValidMime = !file.type || file.type === 'image/svg+xml' || file.type === 'image/svg'
    if (!hasValidExtension || !hasValidMime) {
      setParseError('Please upload a valid SVG file (.svg).')
      return
    }
    const reader = new FileReader()
    reader.onload = e => loadSVGText(e.target.result)
    reader.onerror = () => setParseError('Failed to read file.')
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleClear() {
    setRawSVG('')
    setColorMap({})
    setParseError(null)
  }

  function setColor(original, replacement) {
    setColorMap(prev => ({ ...prev, [original]: replacement }))
  }

  const inputTabStyle = id => ({
    padding: '5px 14px',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    fontWeight: inputTab === id ? 500 : 400,
    borderRadius: '6px 6px 0 0',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 120ms',
    backgroundColor: inputTab === id ? 'var(--color-surface)' : 'transparent',
    color: inputTab === id ? 'var(--color-ink)' : 'var(--color-ink-muted)',
    borderBottom: `2px solid ${inputTab === id ? 'var(--color-primary)' : 'transparent'}`,
  })

  const outputTabStyle = id => ({
    padding: '5px 14px',
    fontSize: '0.8125rem',
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: outputTab === id ? 500 : 400,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 120ms',
    backgroundColor: outputTab === id ? 'var(--color-primary-subtle)' : 'transparent',
    color: outputTab === id ? 'var(--color-primary)' : 'var(--color-ink-muted)',
    borderBottom: `2px solid ${outputTab === id ? 'var(--color-primary)' : 'transparent'}`,
  })

  const taBase = {
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    fontSize: '0.75rem',
    lineHeight: '1.6',
    padding: '12px',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-border)',
    borderRadius: '0 0 8px 8px',
    resize: 'none',
    outline: 'none',
    width: '100%',
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-4">
      <div
        className="svg-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gridTemplateAreas: '"left right"',
          gap: '16px',
          alignItems: 'start',
        }}
      >

        {/* ── Left: Input + Output ── */}
        <div style={{ gridArea: 'left' }} className="flex flex-col gap-4">

          {/* Input card */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {/* Tabs */}
            <div className="flex items-end border-b px-2 pt-1" style={{ borderColor: 'var(--color-border)' }}>
              <button className="font-mono" style={inputTabStyle('paste')} onClick={() => setInputTab('paste')}>Paste SVG</button>
              <button className="font-mono" style={inputTabStyle('upload')} onClick={() => setInputTab('upload')}>Upload File</button>
              {rawSVG && (
                <button
                  onClick={handleClear}
                  className="ml-auto mb-1 flex items-center gap-1 px-2 py-1 rounded-xs text-xs font-mono transition-colors duration-fast"
                  style={{ color: 'var(--color-ink-faint)', cursor: 'pointer', border: 'none', background: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-error)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-faint)')}
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                  Clear
                </button>
              )}
            </div>

            {inputTab === 'paste' ? (
              <textarea
                value={rawSVG}
                onChange={e => loadSVGText(e.target.value)}
                placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  <!-- Paste your SVG here -->\n</svg>'}
                spellCheck={false}
                style={{
                  ...taBase,
                  minHeight: '200px',
                  borderRadius: 0,
                  border: 'none',
                  borderTop: `1px solid ${displayError ? 'var(--color-error)' : 'transparent'}`,
                }}
              />
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors duration-fast"
                style={{
                  minHeight: '200px',
                  padding: '32px 24px',
                  backgroundColor: dragging ? 'var(--color-primary-subtle)' : 'var(--color-bg)',
                  border: 'none',
                  borderTop: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                }}
              >
                <input ref={fileRef} type="file" accept=".svg,image/svg+xml" className="sr-only" onChange={e => handleFile(e.target.files[0])} />
                <FileImage size={28} strokeWidth={1.5} style={{ color: dragging ? 'var(--color-primary)' : 'var(--color-ink-faint)' }} />
                <div className="text-center">
                  <p className="text-sm font-sans" style={{ color: 'var(--color-ink-muted)' }}>Drop an SVG file or click to browse</p>
                  <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>.svg files only</p>
                </div>
              </div>
            )}

            {displayError && (
              <div
                className="flex items-start gap-2 mx-3 mb-3 px-3 py-2 rounded-xs text-xs font-sans"
                style={{
                  backgroundColor: 'oklch(0.490 0.195 18 / 0.10)',
                  color: 'var(--color-error)',
                  border: '1px solid oklch(0.490 0.195 18 / 0.25)',
                  lineHeight: 1.5,
                }}
              >
                <AlertCircle size={13} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}
          </Card>

          {/* Output card */}
          {valid && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {/* Output tabs */}
              <div className="flex items-end border-b px-2 pt-1" style={{ borderColor: 'var(--color-border)' }}>
                {OUTPUT_TABS.map(t => (
                  <button key={t.id} style={outputTabStyle(t.id)} onClick={() => setOutputTab(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>

              <textarea
                value={output}
                readOnly
                spellCheck={false}
                style={{ ...taBase, minHeight: '180px', borderRadius: 0, border: 'none' }}
              />

              <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
                  {output.length.toLocaleString()} chars
                </span>
                <div className="flex gap-2">
                  <CopyButton text={output} label="Copy" />
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => downloadOutput(output, outputTab)}
                    icon={<Download size={13} strokeWidth={1.5} />}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ── Right: Preview + Colors ── */}
        <div style={{ gridArea: 'right' }} className="flex flex-col gap-3">

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              {valid && (
                <span className="text-2xs font-mono" style={{ color: 'var(--color-success)' }}>Valid SVG</span>
              )}
            </CardHeader>

            <div
              className="flex items-center justify-center rounded-md"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                minHeight: '200px',
                padding: '24px',
                boxShadow: '0 1px 3px oklch(0 0 0 / 0.09), 0 1px 2px oklch(0 0 0 / 0.06)',
              }}
            >
              {valid ? (
                <div style={{ width: '100%', lineHeight: 0 }}>
                  <style>{`.svg-preview svg { width: 100%; height: auto; max-height: 220px; display: block; }`}</style>
                  <div className="svg-preview" dangerouslySetInnerHTML={{ __html: previewSVG }} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <FileImage size={32} strokeWidth={1.5} style={{ color: 'var(--color-ink-faint)' }} />
                  <p className="text-xs font-sans" style={{ color: 'var(--color-ink-faint)' }}>
                    SVG preview appears here
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Color editor */}
          {valid && colors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Color Editor</CardTitle>
              </CardHeader>
              <div className="flex flex-col gap-2">
                {colors.map(color => {
                  const current = colorMap[color] ?? color
                  const isHex = /^#[0-9a-f]{3,6}$/i.test(current)
                  return (
                    <div key={color} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={isHex ? current : '#000000'}
                        onChange={e => setColor(color, e.target.value)}
                        className="w-7 h-7 rounded-xs border cursor-pointer p-0.5 flex-shrink-0"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
                        title={`Replace ${color}`}
                      />
                      <span
                        className="text-xs font-mono flex-1 truncate"
                        style={{ color: 'var(--color-ink-muted)' }}
                        title={color}
                      >
                        {color}
                      </span>
                      {colorMap[color] && colorMap[color] !== color && (
                        <span className="text-xs font-mono" style={{ color: 'var(--color-primary)' }}>
                          → {colorMap[color]}
                        </span>
                      )}
                    </div>
                  )
                })}
                {Object.keys(colorMap).some(k => colorMap[k] !== k) && (
                  <button
                    onClick={() => setColorMap({})}
                    className="mt-1 text-2xs font-mono transition-colors duration-fast"
                    style={{ color: 'var(--color-ink-faint)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-error)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-faint)')}
                  >
                    Reset colors
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .svg-layout {
            grid-template-columns: 1fr !important;
            grid-template-areas: "right" "left" !important;
          }
        }
      `}</style>
    </div>
  )
}
