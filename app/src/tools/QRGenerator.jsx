import { useState, useRef, useCallback } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { Download, ImageDown, Copy, Check, AlertCircle, ShieldCheck } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'

// ── QR type configs ───────────────────────────────────────────────────────────
const QR_TYPES = [
  { id: 'url',       label: 'URL' },
  { id: 'text',      label: 'Plain Text' },
  { id: 'email',     label: 'Email' },
  { id: 'sms',       label: 'SMS' },
  { id: 'phone',     label: 'Phone' },
  { id: 'vcard',     label: 'vCard' },
  { id: 'multiurl',  label: 'Multi-URL' },
  { id: 'appstore',  label: 'App Store' },
  { id: 'pdf',       label: 'PDF Link' },
]

const TYPE_CONFIG = {
  url: {
    fields: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com', hint: 'Include https://' },
    ],
    build: f => f.url?.trim() || '',
  },
  text: {
    fields: [
      { key: 'text', label: 'Text', type: 'textarea', placeholder: 'Enter any text…' },
    ],
    build: f => f.text?.trim() || '',
  },
  email: {
    fields: [
      { key: 'to',      label: 'To',      type: 'email',    placeholder: 'recipient@example.com' },
      { key: 'subject', label: 'Subject', type: 'text',     placeholder: 'Hello' },
      { key: 'body',    label: 'Body',    type: 'textarea', placeholder: 'Message body…' },
    ],
    build: f => {
      const params = new URLSearchParams()
      if (f.subject?.trim()) params.set('subject', f.subject.trim())
      if (f.body?.trim())    params.set('body',    f.body.trim())
      const qs = params.toString()
      return `mailto:${f.to?.trim() || ''}${qs ? '?' + qs : ''}`
    },
  },
  sms: {
    fields: [
      { key: 'phone',   label: 'Phone Number', type: 'tel',      placeholder: '+1 555 000 0000' },
      { key: 'message', label: 'Message',       type: 'textarea', placeholder: 'Your message…' },
    ],
    build: f => `SMSTO:${f.phone?.trim() || ''}:${f.message?.trim() || ''}`,
  },
  phone: {
    fields: [
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1 555 000 0000' },
    ],
    build: f => `tel:${f.phone?.trim() || ''}`,
  },
  vcard: {
    fields: [
      { key: 'name',    label: 'Full Name',    type: 'text',  placeholder: 'Jane Doe' },
      { key: 'phone',   label: 'Phone',        type: 'tel',   placeholder: '+1 555 000 0000' },
      { key: 'email',   label: 'Email',        type: 'email', placeholder: 'jane@example.com' },
      { key: 'org',     label: 'Organization', type: 'text',  placeholder: 'Acme Corp' },
      { key: 'title',   label: 'Job Title',    type: 'text',  placeholder: 'Engineer' },
      { key: 'website', label: 'Website',      type: 'text',  placeholder: 'https://example.com' },
      { key: 'address', label: 'Address',      type: 'text',  placeholder: '123 Main St, City' },
    ],
    build: f => [
      'BEGIN:VCARD',
      'VERSION:3.0',
      f.name?.trim()    ? `FN:${f.name.trim()}`         : '',
      f.phone?.trim()   ? `TEL:${f.phone.trim()}`        : '',
      f.email?.trim()   ? `EMAIL:${f.email.trim()}`      : '',
      f.org?.trim()     ? `ORG:${f.org.trim()}`          : '',
      f.title?.trim()   ? `TITLE:${f.title.trim()}`      : '',
      f.website?.trim() ? `URL:${f.website.trim()}`      : '',
      f.address?.trim() ? `ADR:${f.address.trim()}`      : '',
      'END:VCARD',
    ].filter(Boolean).join('\n'),
  },
  multiurl: {
    fields: [
      { key: 'urls', label: 'URLs (one per line)', type: 'textarea', placeholder: 'https://example.com\nhttps://another.com', hint: 'The QR code encodes all URLs as a newline-separated list.' },
    ],
    build: f => f.urls?.trim() || '',
  },
  appstore: {
    fields: [
      { key: 'ios',     label: 'iOS App Store URL',     type: 'text', placeholder: 'https://apps.apple.com/…' },
      { key: 'android', label: 'Google Play Store URL', type: 'text', placeholder: 'https://play.google.com/…' },
      { key: 'hint',    label: '', type: 'note', value: 'Tip: Use a universal link or smart-banner URL to detect the platform automatically.' },
    ],
    build: f => f.ios?.trim() || f.android?.trim() || '',
  },
  pdf: {
    fields: [
      { key: 'url',  label: 'Hosted PDF URL',  type: 'text', placeholder: 'https://example.com/document.pdf' },
      { key: 'note', label: '', type: 'note',  value: 'QR codes cannot embed binary files. Host the PDF publicly and paste its URL above.' },
    ],
    build: f => f.url?.trim() || '',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildQrValue(typeId, formData) {
  const cfg = TYPE_CONFIG[typeId]
  if (!cfg) return ''
  try { return cfg.build(formData) } catch { return '' }
}

function downloadSVG(svgEl, filename) {
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svgEl)
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPNG(canvasEl, filename) {
  const url = canvasEl.toDataURL('image/png')
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
}

// ── Form field renderer ───────────────────────────────────────────────────────
function FormField({ field, value, onChange }) {
  if (field.type === 'note') {
    return (
      <div
        className="px-3 py-2 rounded-xs text-xs font-sans"
        style={{
          backgroundColor: 'oklch(0.460 0.115 215 / 0.08)',
          color: 'var(--color-accent)',
          border: '1px solid oklch(0.460 0.115 215 / 0.25)',
          lineHeight: 1.6,
        }}
      >
        {field.value}
      </div>
    )
  }

  const inputStyle = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.8125rem',
    padding: '7px 12px',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: '3px',
    outline: 'none',
    width: '100%',
    caretColor: 'var(--color-primary)',
  }

  const focusStyle = e => (e.target.style.borderColor = 'var(--color-primary)')
  const blurStyle  = e => (e.target.style.borderColor = 'var(--color-border-strong)')

  return (
    <div className="flex flex-col gap-1">
      {field.label && (
        <label className="text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>
          {field.label}
        </label>
      )}
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      ) : (
        <input
          type={field.type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={inputStyle}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      )}
      {field.hint && (
        <p className="text-2xs font-sans" style={{ color: 'var(--color-ink-faint)' }}>{field.hint}</p>
      )}
    </div>
  )
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const t = useRef(null)
  function handle() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      clearTimeout(t.current)
      t.current = setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={handle}
      disabled={!text}
      className="flex items-center justify-center w-7 h-7 rounded-xs transition-colors duration-fast disabled:opacity-45"
      style={{ color: copied ? 'var(--color-success)' : 'var(--color-ink-faint)' }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
      title={copied ? 'Copied!' : 'Copy QR data'}
    >
      {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QRGenerator() {
  const [typeId,    setTypeId]    = useState('url')
  const [formData,  setFormData]  = useState({})
  const [fgColor,   setFgColor]   = useState('#000000')
  const [bgColor,   setBgColor]   = useState('#ffffff')
  const [qrSize,    setQrSize]    = useState(240)
  const [ecLevel,   setEcLevel]   = useState('M')

  const svgRef    = useRef(null)
  const canvasRef = useRef(null)

  const qrValue = buildQrValue(typeId, formData)
  const config  = TYPE_CONFIG[typeId]

  function handleTypeChange(id) {
    setTypeId(id)
    setFormData({})
  }

  function setField(key, val) {
    setFormData(prev => ({ ...prev, [key]: val }))
  }

  function handleDownloadSVG() {
    const el = svgRef.current?.querySelector('svg') ?? svgRef.current
    if (el) downloadSVG(el, 'qrcode.svg')
  }

  function handleDownloadPNG() {
    const el = canvasRef.current?.querySelector('canvas') ?? canvasRef.current
    if (el) downloadPNG(el, 'qrcode.png')
  }

  const isEmpty = !qrValue.trim()

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-4">
      <div
        className="qr-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gridTemplateAreas: '"form preview"',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* ── Form panel ── */}
        <div style={{ gridArea: 'form' }} className="flex flex-col gap-3">

          {/* Type selector */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <CardTitle>QR Type</CardTitle>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3">
              {QR_TYPES.map(t => {
                const active = typeId === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTypeChange(t.id)}
                    className="px-3 py-1.5 rounded-sm text-xs font-mono transition-colors duration-fast cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--color-primary)'        : 'var(--color-surface)',
                      color:           active ? 'var(--color-ink-on-primary)'  : 'var(--color-ink-muted)',
                      border:          `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                      fontWeight:      active ? 500 : 400,
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Dynamic form fields */}
          <Card>
            <CardHeader>
              <CardTitle>{QR_TYPES.find(t => t.id === typeId)?.label}</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-3">
              {config.fields.map(field => (
                <FormField
                  key={field.key}
                  field={field}
                  value={formData[field.key] ?? ''}
                  onChange={val => setField(field.key, val)}
                />
              ))}
            </div>
          </Card>

          {/* QR data preview */}
          {!isEmpty && (
            <Card>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                  Encoded data
                </span>
                <CopyButton text={qrValue} />
              </div>
              <pre
                className="text-xs font-mono whitespace-pre-wrap break-all rounded-xs p-2"
                style={{
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-ink-muted)',
                  border: '1px solid var(--color-border-strong)',
                  maxHeight: '80px',
                  overflow: 'auto',
                  lineHeight: 1.5,
                }}
              >
                {qrValue}
              </pre>
            </Card>
          )}
        </div>

        {/* ── Preview panel ── */}
        <div style={{ gridArea: 'preview' }} className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>

            {/* QR Code */}
            <div
              className="flex items-center justify-center rounded-md mb-4"
              style={{
                backgroundColor: bgColor,
                padding: '16px',
                border: '1px solid var(--color-border-strong)',
                minHeight: '272px',
              }}
            >
              {isEmpty ? (
                <div className="flex flex-col items-center gap-2 text-center py-4">
                  <AlertCircle size={24} strokeWidth={1.5} style={{ color: 'var(--color-ink-faint)' }} />
                  <p className="text-xs font-sans" style={{ color: 'var(--color-ink-faint)' }}>
                    Fill in the form to generate a QR code
                  </p>
                </div>
              ) : (
                <>
                  {/* SVG for display + SVG download */}
                  <div ref={svgRef}>
                    <QRCodeSVG
                      value={qrValue}
                      size={qrSize}
                      fgColor={fgColor}
                      bgColor={bgColor}
                      level={ecLevel}
                      includeMargin={false}
                    />
                  </div>
                  {/* Hidden canvas for PNG export */}
                  <div ref={canvasRef} style={{ display: 'none' }}>
                    <QRCodeCanvas
                      value={qrValue}
                      size={qrSize * 2}
                      fgColor={fgColor}
                      bgColor={bgColor}
                      level={ecLevel}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Export buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                size="sm" variant="primary"
                onClick={handleDownloadPNG}
                disabled={isEmpty}
                icon={<ImageDown size={13} strokeWidth={1.5} />}
                className="flex-1 justify-center"
              >
                PNG
              </Button>
              <Button
                size="sm" variant="secondary"
                onClick={handleDownloadSVG}
                disabled={isEmpty}
                icon={<Download size={13} strokeWidth={1.5} />}
                className="flex-1 justify-center"
              >
                SVG
              </Button>
            </div>

            {/* Customisation */}
            <div className="flex flex-col gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-mono font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                Customise
              </p>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>Foreground</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={e => setFgColor(e.target.value)}
                      className="w-7 h-7 rounded-xs border cursor-pointer p-0.5"
                      style={{ borderColor: 'var(--color-border-strong)', backgroundColor: 'var(--color-input-bg)' }}
                    />
                    <span className="text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>{fgColor}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>Background</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="w-7 h-7 rounded-xs border cursor-pointer p-0.5"
                      style={{ borderColor: 'var(--color-border-strong)', backgroundColor: 'var(--color-input-bg)' }}
                    />
                    <span className="text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>{bgColor}</span>
                  </div>
                </div>
              </div>

              {/* Size */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>Size</label>
                  <span className="text-2xs font-mono" style={{ color: 'var(--color-primary)' }}>{qrSize}px</span>
                </div>
                <input
                  type="range" min={128} max={512} step={16}
                  value={qrSize}
                  onChange={e => setQrSize(Number(e.target.value))}
                  style={{ accentColor: 'var(--color-primary)', width: '100%' }}
                />
              </div>

              {/* Error correction */}
              <div className="flex flex-col gap-1">
                <label className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
                  Error correction
                </label>
                <div className="flex gap-1">
                  {['L', 'M', 'Q', 'H'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setEcLevel(lvl)}
                      className="flex-1 py-1 rounded-xs text-xs font-mono transition-colors duration-fast"
                      style={{
                        backgroundColor: ecLevel === lvl ? 'var(--color-primary-subtle)' : 'transparent',
                        color:           ecLevel === lvl ? 'var(--color-primary)'         : 'var(--color-ink-muted)',
                        border:          `1px solid ${ecLevel === lvl ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-2xs font-sans" style={{ color: 'var(--color-ink-faint)' }}>
                  {ecLevel === 'L' && 'Low — 7% restoration'}
                  {ecLevel === 'M' && 'Medium — 15% restoration'}
                  {ecLevel === 'Q' && 'Quartile — 25% restoration'}
                  {ecLevel === 'H' && 'High — 30% restoration'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Privacy */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'color-mix(in oklch, var(--color-success) 10%, var(--color-surface))', border: '1px solid var(--color-success)', marginTop: 16 }}>
        <ShieldCheck size={16} strokeWidth={1.5} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.55 }}>
          QR codes are generated entirely in your browser. Your data never leaves your device or touches any server.
        </p>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 767px) {
          .qr-layout {
            grid-template-columns: 1fr !important;
            grid-template-areas: "form" "preview" !important;
          }
        }
      `}</style>
    </div>
  )
}
