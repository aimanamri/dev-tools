import { useState, useMemo } from 'react'
import cronstrue from 'cronstrue'
import { Copy, Check, AlertCircle, Zap, RotateCcw } from 'lucide-react'
import { useRef } from 'react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'

// ── Cron explanation ──────────────────────────────────────────────────────────
function explain(expr) {
  try {
    return { text: cronstrue.toString(expr, { throwExceptionOnParseError: true }), error: null }
  } catch (e) {
    return { text: null, error: String(e).replace(/^Error:\s*/i, '') }
  }
}

// ── Per-field validation ──────────────────────────────────────────────────────
const FIELD_META = {
  minute: { label: 'Minute',        min: 0, max: 59 },
  hour:   { label: 'Hour',          min: 0, max: 23 },
  dom:    { label: 'Day of Month',  min: 1, max: 31 },
  month:  { label: 'Month',         min: 1, max: 12 },
  dow:    { label: 'Day of Week',   min: 0, max: 6  },
}

function validateRange(from, to, min, max) {
  if (isNaN(from)) return `"${from}" is not a valid number`
  if (isNaN(to))   return `"${to}" is not a valid number`
  if (from < min || from > max) return `${from} is out of range — must be ${min}–${max}`
  if (to   < min || to   > max) return `${to} is out of range — must be ${min}–${max}`
  if (from > to) return `Start value (${from}) must not exceed end value (${to})`
  return null
}

function validateToken(token, min, max) {
  // step: */n  or  n-m/n
  if (token.includes('/')) {
    const [rangePart, stepStr, ...extra] = token.split('/')
    if (extra.length) return `Too many "/" in "${token}"`
    const step = Number(stepStr)
    if (!Number.isInteger(step) || step < 1)
      return `Step "${stepStr}" must be a positive whole number`
    if (rangePart !== '*') {
      const [a, b, ...rest] = rangePart.split('-')
      if (rest.length) return `Invalid range in "${token}"`
      const err = validateRange(Number(a), Number(b), min, max)
      if (err) return err
    }
    return null
  }
  // range: n-m
  if (token.includes('-')) {
    const [a, b, ...rest] = token.split('-')
    if (rest.length) return `Too many "-" in "${token}" — use n-m format`
    return validateRange(Number(a), Number(b), min, max)
  }
  // single value
  const num = Number(token)
  if (!Number.isInteger(num) || String(num) !== token)
    return `"${token}" is not a valid whole number`
  if (num < min || num > max)
    return `${num} is out of range — enter a value between ${min} and ${max}`
  return null
}

function validateField(value, key) {
  const { min, max } = FIELD_META[key]
  if (!value || value === '*') return null
  const tokens = value.split(',')
  for (const raw of tokens) {
    const t = raw.trim()
    if (!t) return 'Empty value in list — check your commas'
    const err = validateToken(t, min, max)
    if (err) return err
  }
  return null
}

function validateFields(fields) {
  const errors = {}
  for (const key of Object.keys(FIELD_META)) {
    const err = validateField(fields[key], key)
    if (err) errors[key] = err
  }
  return errors
}

// ── Field definitions ─────────────────────────────────────────────────────────
const FIELDS = [
  {
    key: 'minute',
    label: 'Minute',
    range: '0–59',
    guidance: 'Use a number (0–59), a range like 5-30, a step like */5, or a list like 0,15,30',
    chips: [
      { label: '*',     value: '*',    hint: 'every' },
      { label: '*/5',   value: '*/5',  hint: 'every 5' },
      { label: '*/10',  value: '*/10', hint: 'every 10' },
      { label: '*/15',  value: '*/15', hint: 'every 15' },
      { label: '*/30',  value: '*/30', hint: 'every 30' },
      { label: '0',     value: '0',    hint: 'at :00' },
    ],
  },
  {
    key: 'hour',
    label: 'Hour',
    range: '0–23',
    guidance: 'Use a number (0–23), a range like 9-17, a step like */6, or a list like 0,12',
    chips: [
      { label: '*',     value: '*',     hint: 'every hour' },
      { label: '*/2',   value: '*/2',   hint: 'every 2h' },
      { label: '*/6',   value: '*/6',   hint: 'every 6h' },
      { label: '*/12',  value: '*/12',  hint: 'every 12h' },
      { label: '0',     value: '0',     hint: 'midnight' },
      { label: '12',    value: '12',    hint: 'noon' },
      { label: '9-17',  value: '9-17',  hint: '9am–5pm' },
    ],
  },
  {
    key: 'dom',
    label: 'Day of Month',
    range: '1–31',
    guidance: 'Use a number (1–31), a range like 1-15, a step like */2, or a list like 1,15',
    chips: [
      { label: '*',   value: '*',  hint: 'every day' },
      { label: '1',   value: '1',  hint: '1st' },
      { label: '15',  value: '15', hint: '15th' },
      { label: '1,15',value: '1,15',hint: '1st & 15th' },
    ],
  },
  {
    key: 'month',
    label: 'Month',
    range: '1–12',
    guidance: 'Use a number (1–12), a range like 3-9, a step like */3, or a list like 1,6,12',
    chips: [
      { label: '*',   value: '*',    hint: 'every' },
      { label: '1',   value: '1',    hint: 'Jan' },
      { label: '3',   value: '3',    hint: 'Mar' },
      { label: '6',   value: '6',    hint: 'Jun' },
      { label: '9',   value: '9',    hint: 'Sep' },
      { label: '12',  value: '12',   hint: 'Dec' },
      { label: '1-6', value: '1-6',  hint: 'H1' },
    ],
  },
  {
    key: 'dow',
    label: 'Day of Week',
    range: '0–6 (Sun=0)',
    guidance: 'Use a number (0=Sun, 1=Mon … 6=Sat), a range like 1-5, or a list like 0,6',
    chips: [
      { label: '*',    value: '*',    hint: 'every day' },
      { label: '1-5',  value: '1-5',  hint: 'weekdays' },
      { label: '0,6',  value: '0,6',  hint: 'weekends' },
      { label: '1',    value: '1',    hint: 'Mon' },
      { label: '5',    value: '5',    hint: 'Fri' },
      { label: '0',    value: '0',    hint: 'Sun' },
    ],
  },
]

// ── Presets library ───────────────────────────────────────────────────────────
const PRESETS = [
  { label: 'Every Minute',     expr: '* * * * *',       desc: 'Runs once a minute' },
  { label: 'Every 5 Minutes',  expr: '*/5 * * * *',     desc: 'Runs every 5 minutes' },
  { label: 'Every 15 Minutes', expr: '*/15 * * * *',    desc: 'Runs every 15 minutes' },
  { label: 'Every 30 Minutes', expr: '*/30 * * * *',    desc: 'Runs every 30 minutes' },
  { label: 'Every Hour',       expr: '0 * * * *',       desc: 'On the hour, every hour' },
  { label: 'Every 6 Hours',    expr: '0 */6 * * *',     desc: 'At 00:00, 06:00, 12:00, 18:00' },
  { label: 'Daily at Midnight',expr: '0 0 * * *',       desc: 'Once a day at 00:00 UTC' },
  { label: 'Daily at Noon',    expr: '0 12 * * *',      desc: 'Once a day at 12:00 UTC' },
  { label: 'Business Hours',   expr: '0 9-17 * * 1-5',  desc: 'Hourly, Mon–Fri, 9 AM–5 PM' },
  { label: 'Weekly (Monday)',  expr: '0 0 * * 1',       desc: 'Every Monday at midnight' },
  { label: 'Weekends',         expr: '0 0 * * 0,6',     desc: 'Saturday & Sunday at midnight' },
  { label: 'Monthly (1st)',    expr: '0 0 1 * *',       desc: 'First day of every month' },
  { label: 'Monthly (15th)',   expr: '0 0 15 * *',      desc: '15th of every month at midnight' },
  { label: 'Nightly Backup',   expr: '0 2 * * *',       desc: 'Every night at 2 AM' },
  { label: 'Twice Daily',      expr: '0 0,12 * * *',    desc: 'At midnight and noon' },
]

function exprToFields(expr) {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [minute, hour, dom, month, dow] = parts
  return { minute, hour, dom, month, dow }
}

// ── Chip button ───────────────────────────────────────────────────────────────
function Chip({ label, hint, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      className="px-2 py-1 rounded-xs text-xs font-mono transition-colors duration-fast"
      style={{
        backgroundColor: active ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
        color:           active ? 'var(--color-primary)'         : 'var(--color-ink-muted)',
        border:          `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
        fontWeight:      active ? 500 : 400,
        cursor:          'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ── Field row ─────────────────────────────────────────────────────────────────
function FieldRow({ field, value, onChange, error }) {
  const isChipMatch = field.chips.some(c => c.value === value)
  const hasError = Boolean(error)

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-md border"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        borderColor: hasError ? 'var(--color-error)' : 'var(--color-border-strong)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-semibold" style={{ color: hasError ? 'var(--color-error)' : 'var(--color-ink)' }}>
          {field.label}
        </span>
        <span className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
          {field.range}
        </span>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1">
        {field.chips.map(chip => (
          <Chip
            key={chip.value}
            label={chip.label}
            hint={chip.hint}
            active={value === chip.value}
            onClick={() => onChange(chip.value)}
          />
        ))}
      </div>

      {/* Custom input */}
      <div className="flex items-center gap-1.5">
        <span className="text-2xs font-mono flex-shrink-0" style={{ color: 'var(--color-ink-faint)' }}>
          Custom:
        </span>
        <input
          type="text"
          value={isChipMatch ? '' : value}
          onChange={e => onChange(e.target.value || '*')}
          placeholder={field.range}
          className="flex-1 font-mono text-xs rounded-xs border px-2 py-1"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-ink)',
            borderColor: hasError
              ? 'var(--color-error)'
              : (!isChipMatch && value ? 'var(--color-primary)' : 'var(--color-border)'),
            outline: 'none',
            minWidth: 0,
          }}
          onFocus={e => (e.target.style.borderColor = hasError ? 'var(--color-error)' : 'var(--color-primary)')}
          onBlur={e => (e.target.style.borderColor = hasError
            ? 'var(--color-error)'
            : (!isChipMatch && value ? 'var(--color-primary)' : 'var(--color-border)'))}
        />
      </div>

      {/* Per-field error message */}
      {hasError && (
        <div className="flex items-start gap-1.5">
          <AlertCircle size={11} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 1 }} />
          <span
            className="text-2xs font-sans"
            style={{ color: 'var(--color-error)', lineHeight: 1.4 }}
          >
            {error}. {field.guidance}
          </span>
        </div>
      )}
    </div>
  )
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }) {
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
    <Button
      size="sm" variant="secondary"
      onClick={handle}
      icon={copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
      style={copied ? { color: 'var(--color-success)', borderColor: 'oklch(0.480 0.140 145 / 0.4)' } : {}}
    >
      {copied ? 'Copied' : label}
    </Button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CronGenerator() {
  const [fields, setFields] = useState({ minute: '*', hour: '*', dom: '*', month: '*', dow: '*' })
  const [rawExpr, setRawExpr] = useState('')
  const [useRaw, setUseRaw] = useState(false)

  const builtExpr = `${fields.minute} ${fields.hour} ${fields.dom} ${fields.month} ${fields.dow}`
  const expr = useRaw ? rawExpr : builtExpr

  const fieldErrors = useMemo(() => validateFields(fields), [fields])
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const { text: explanation, error: explainError } = useMemo(() => {
    if (hasFieldErrors) return { text: null, error: null }
    return explain(expr)
  }, [expr, hasFieldErrors])

  function setField(key, value) {
    setUseRaw(false)
    setFields(prev => ({ ...prev, [key]: value || '*' }))
  }

  function applyPreset(presetExpr) {
    const parsed = exprToFields(presetExpr)
    if (parsed) {
      setFields(parsed)
      setUseRaw(false)
    }
  }

  function resetAll() {
    setFields({ minute: '*', hour: '*', dom: '*', month: '*', dow: '*' })
    setRawExpr('')
    setUseRaw(false)
  }

  function handleRawChange(val) {
    setRawExpr(val)
    setUseRaw(true)
    // Try to sync builder if valid 5-part expr
    const parsed = exprToFields(val)
    if (parsed) setFields(parsed)
  }

  const exprParts = expr.trim().split(/\s+/)

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-4">

      {/* ── Expression display + explanation ── */}
      <Card>
        <div className="flex flex-col gap-3">
          {/* Expression row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="flex-1 min-w-0 rounded-sm border font-mono font-semibold"
              style={{
                backgroundColor: 'var(--color-sidebar)',
                borderColor: 'var(--color-border-sidebar)',
                overflow: 'hidden',
              }}
            >
              {/* Values */}
              <div
                className="px-4 pt-3 pb-1.5"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr auto 1fr',
                  letterSpacing: '0.08em',
                }}
              >
                {exprParts.slice(0, 5).flatMap((part, i, arr) => {
                  const nodes = [
                    <div key={`v${i}`} className="text-base text-center" style={{ color: part === '*' ? 'var(--color-ink-sidebar-muted)' : 'var(--color-primary)' }}>
                      {part}
                    </div>,
                  ]
                  if (i < arr.length - 1) {
                    nodes.push(
                      <div key={`d${i}`} className="flex items-center justify-center px-1" style={{ color: 'var(--color-ink-sidebar-muted)', fontSize: '0.65rem' }}>·</div>
                    )
                  }
                  return nodes
                })}
              </div>
              {/* Field labels */}
              <div
                className="px-4 pb-2.5"
                style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr auto 1fr' }}
              >
                {['Minute', 'Hour', 'Day/Mo', 'Month', 'Day/Wk'].flatMap((l, i, arr) => {
                  const nodes = [
                    <p key={`l${i}`} className="m-0 text-2xs font-mono text-center" style={{ color: 'var(--color-ink-sidebar-muted)' }}>{l}</p>,
                  ]
                  if (i < arr.length - 1) nodes.push(<div key={`s${i}`} />)
                  return nodes
                })}
              </div>
            </div>
            <CopyButton text={expr} label="Copy expression" />
            <Button
              size="sm" variant="ghost"
              onClick={resetAll}
              icon={<RotateCcw size={13} strokeWidth={1.5} />}
              title="Reset all fields to *"
            >
              Reset
            </Button>
          </div>

          {/* Raw input toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
              or type directly:
            </span>
            <input
              type="text"
              value={useRaw ? rawExpr : builtExpr}
              onChange={e => handleRawChange(e.target.value)}
              onFocus={() => { setRawExpr(builtExpr); setUseRaw(true) }}
              placeholder="* * * * *"
              className="font-mono text-sm rounded-xs border px-3 py-1.5 flex-1 max-w-xs"
              style={{
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-ink)',
                borderColor: useRaw ? 'var(--color-primary)' : 'var(--color-border-strong)',
                outline: 'none',
              }}
            />
          </div>

          {/* Explanation / field errors */}
          {hasFieldErrors ? (
            <div
              className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xs"
              style={{
                backgroundColor: 'oklch(0.490 0.195 18 / 0.07)',
                border: '1px solid oklch(0.490 0.195 18 / 0.25)',
              }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={14} strokeWidth={2} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
                <span className="text-sm font-sans font-medium" style={{ color: 'var(--color-error)' }}>
                  Fix the following fields before the expression is valid:
                </span>
              </div>
              <ul style={{ margin: '0 0 0 1.5rem', padding: 0, listStyle: 'disc' }}>
                {FIELDS.filter(f => fieldErrors[f.key]).map(f => (
                  <li key={f.key} style={{ marginBottom: '0.125rem' }}>
                    <span className="text-xs font-sans" style={{ color: 'var(--color-error)', lineHeight: 1.5 }}>
                      <strong>{f.label}:</strong> {fieldErrors[f.key]}.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-xs"
              style={{
                backgroundColor: explainError
                  ? 'oklch(0.490 0.195 18 / 0.08)'
                  : 'var(--color-primary-subtle)',
                border: `1px solid ${explainError
                  ? 'oklch(0.490 0.195 18 / 0.25)'
                  : 'oklch(0.489 0.190 28.3 / 0.2)'}`,
              }}
            >
              {explainError
                ? <AlertCircle size={14} strokeWidth={2} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 1 }} />
                : <Zap size={14} strokeWidth={1.5} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 1 }} />
              }
              <span
                className="text-sm font-sans"
                style={{
                  color: explainError ? 'var(--color-error)' : 'var(--color-ink)',
                  lineHeight: 1.5,
                }}
              >
                {explainError ?? explanation}
              </span>
            </div>
          )}

        </div>
      </Card>

      {/* ── Builder + Presets side-by-side ── */}
      <div
        className="cron-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gridTemplateAreas: '"builder presets"',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* Builder */}
        <div style={{ gridArea: 'builder' }}>
          <Card>
            <CardHeader>
              <CardTitle>Expression Builder</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FIELDS.map(field => (
                <FieldRow
                  key={field.key}
                  field={field}
                  value={fields[field.key]}
                  onChange={val => setField(field.key, val)}
                  error={fieldErrors[field.key] ?? null}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Presets */}
        <div style={{ gridArea: 'presets' }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <CardTitle>Presets</CardTitle>
            </div>
            <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {PRESETS.map(preset => (
                <button
                  key={preset.expr}
                  onClick={() => applyPreset(preset.expr)}
                  className="flex flex-col gap-0.5 px-4 py-2.5 text-left transition-colors duration-fast cursor-pointer"
                  style={{
                    backgroundColor: expr === preset.expr ? 'var(--color-primary-subtle)' : 'transparent',
                    border: 'none',
                    borderLeft: `3px solid ${expr === preset.expr ? 'var(--color-primary)' : 'transparent'}`,
                  }}
                  onMouseEnter={e => {
                    if (expr !== preset.expr) e.currentTarget.style.backgroundColor = 'var(--color-surface)'
                  }}
                  onMouseLeave={e => {
                    if (expr !== preset.expr) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-mono font-medium"
                      style={{ color: expr === preset.expr ? 'var(--color-primary)' : 'var(--color-ink)' }}
                    >
                      {preset.label}
                    </span>
                    <span
                      className="text-2xs font-mono flex-shrink-0"
                      style={{ color: 'var(--color-ink-faint)' }}
                    >
                      {preset.expr}
                    </span>
                  </div>
                  <span className="text-2xs font-sans" style={{ color: 'var(--color-ink-muted)' }}>
                    {preset.desc}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Responsive stack */}
      <style>{`
        @media (max-width: 767px) {
          .cron-layout {
            grid-template-columns: 1fr !important;
            grid-template-areas: "builder" "presets" !important;
          }
        }
      `}</style>

    </div>
  )
}
