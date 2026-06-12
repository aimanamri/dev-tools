import { useState, useCallback, useRef, useEffect } from 'react'
import { Copy, Check, Clock, Info, BookOpen } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'

// ── Date helpers ──────────────────────────────────────────────────────────────
const PAD = (n, w = 2) => String(n).padStart(w, '0')
const DAYS_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL  = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function toEpochMs(value, unit) {
  const n = Number(value)
  if (isNaN(n)) return null
  switch (unit) {
    case 'sec':  return n * 1000
    case 'ms':   return n
    case 'µs':   return Math.floor(n / 1000)
    case 'ns':   return Math.floor(n / 1_000_000)
    default:     return null
  }
}

function fromEpochMs(ms, unit) {
  switch (unit) {
    case 'sec':  return Math.floor(ms / 1000)
    case 'ms':   return ms
    case 'µs':   return ms * 1000
    case 'ns':   return ms * 1_000_000
    default:     return ms
  }
}

function rfc2822(d) {
  return `${DAYS_SHORT[d.getUTCDay()]}, ${PAD(d.getUTCDate())} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()} ${PAD(d.getUTCHours())}:${PAD(d.getUTCMinutes())}:${PAD(d.getUTCSeconds())} +0000`
}

function formatOutputs(epochMs) {
  if (epochMs === null) return null
  const d = new Date(epochMs)
  const Y  = d.getUTCFullYear()
  const Mo = d.getUTCMonth()
  const D  = d.getUTCDate()
  const H  = d.getUTCHours()
  const Mi = d.getUTCMinutes()
  const S  = d.getUTCSeconds()

  const iso  = d.toISOString()                     // 2024-01-01T00:00:00.000Z
  const iso_s = iso.replace(/\.\d{3}Z$/, 'Z')     // without ms
  const rfc   = rfc2822(d)

  return [
    { label: 'Unix (seconds)',    value: String(Math.floor(epochMs / 1000)) },
    { label: 'Unix (ms)',         value: String(epochMs) },
    { label: 'UTC',               value: `${DAYS_SHORT[d.getUTCDay()]}, ${MONTHS_SHORT[Mo]} ${PAD(D)} ${Y} ${PAD(H)}:${PAD(Mi)}:${PAD(S)} UTC` },
    { label: 'ISO 8601',          value: iso_s },
    { label: 'ISO 8601 (with ms)',value: iso },
    { label: 'RFC 822 / 2822',    value: rfc },
    { label: 'RFC 1036',          value: `${DAYS_SHORT[d.getUTCDay()]}, ${PAD(D)}-${MONTHS_SHORT[Mo]}-${String(Y).slice(-2)} ${PAD(H)}:${PAD(Mi)}:${PAD(S)} UTC` },
    { label: 'RFC 1123',          value: `${DAYS_SHORT[d.getUTCDay()]}, ${PAD(D)} ${MONTHS_SHORT[Mo]} ${Y} ${PAD(H)}:${PAD(Mi)}:${PAD(S)} GMT` },
    { label: 'RFC 3339',          value: `${Y}-${PAD(Mo + 1)}-${PAD(D)}T${PAD(H)}:${PAD(Mi)}:${PAD(S)}Z` },
    {
      label: 'Human-readable',
      value: `${DAYS_SHORT[d.getUTCDay()]}, ${MONTHS_FULL[Mo]} ${D}, ${Y} at ${PAD(H)}:${PAD(Mi)}:${PAD(S)} UTC`,
    },
  ]
}

// ── Local timezone helpers ────────────────────────────────────────────────────
function getLocalTzAbbr(d) {
  const parts = Intl.DateTimeFormat('en', { timeZoneName: 'short' }).formatToParts(d)
  return parts.find(p => p.type === 'timeZoneName')?.value ?? 'Local'
}

function getUtcOffsetStr(d) {
  const off = -d.getTimezoneOffset() // minutes ahead of UTC; negative = behind
  const sign = off >= 0 ? '+' : '-'
  const h = Math.floor(Math.abs(off) / 60)
  const m = Math.abs(off) % 60
  return `${sign}${PAD(h)}${PAD(m)}` // e.g. +0800
}

function formatLocalOutputs(epochMs) {
  if (epochMs === null) return null
  const d = new Date(epochMs)
  const Y  = d.getFullYear()
  const Mo = d.getMonth()
  const D  = d.getDate()
  const H  = d.getHours()
  const Mi = d.getMinutes()
  const S  = d.getSeconds()
  const tzAbbr  = getLocalTzAbbr(d)
  const tzOff   = getUtcOffsetStr(d)                    // +0800
  const tzColon = `${tzOff.slice(0, 3)}:${tzOff.slice(3)}` // +08:00

  return [
    { label: 'Local time',     value: `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[Mo]} ${PAD(D)} ${Y} ${PAD(H)}:${PAD(Mi)}:${PAD(S)} ${tzAbbr}` },
    { label: 'ISO 8601',       value: `${Y}-${PAD(Mo + 1)}-${PAD(D)}T${PAD(H)}:${PAD(Mi)}:${PAD(S)}${tzColon}` },
    { label: 'RFC 2822',       value: `${DAYS_SHORT[d.getDay()]}, ${PAD(D)} ${MONTHS_SHORT[Mo]} ${Y} ${PAD(H)}:${PAD(Mi)}:${PAD(S)} ${tzOff}` },
    { label: 'RFC 3339',       value: `${Y}-${PAD(Mo + 1)}-${PAD(D)}T${PAD(H)}:${PAD(Mi)}:${PAD(S)}${tzColon}` },
    { label: 'Human-readable', value: `${DAYS_SHORT[d.getDay()]}, ${MONTHS_FULL[Mo]} ${D}, ${Y} at ${PAD(H)}:${PAD(Mi)}:${PAD(S)} ${tzAbbr}` },
  ]
}

// Discord timestamp formats
function discordFormats(epochSec) {
  return [
    { style: 't', name: 'Short Time',      example: '9:30 PM' },
    { style: 'T', name: 'Long Time',       example: '9:30:00 PM' },
    { style: 'd', name: 'Short Date',      example: '07/20/2023' },
    { style: 'D', name: 'Long Date',       example: 'July 20, 2023' },
    { style: 'f', name: 'Short Date/Time', example: 'July 20, 2023 9:30 PM' },
    { style: 'F', name: 'Long Date/Time',  example: 'Thursday, July 20, 2023 9:30 PM' },
    { style: 'R', name: 'Relative',        example: '2 hours ago' },
  ].map(f => ({
    ...f,
    tag: `<t:${epochSec}:${f.style}>`,
  }))
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const t = useRef(null)
  useEffect(() => () => clearTimeout(t.current), [])

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
      className="flex items-center justify-center w-7 h-7 rounded-xs flex-shrink-0 transition-colors duration-fast"
      style={{
        color: copied ? 'var(--color-success)' : 'var(--color-ink-faint)',
        backgroundColor: copied ? 'oklch(0.480 0.140 145 / 0.12)' : 'transparent',
      }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)' }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.backgroundColor = 'transparent' }}
      title={copied ? 'Copied!' : 'Copy'}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
    </button>
  )
}

// ── Output row ────────────────────────────────────────────────────────────────
function OutputRow({ label, value }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2 rounded-xs"
    >
      <span
        className="text-xs font-mono w-36 flex-shrink-0"
        style={{ color: 'var(--color-ink-muted)' }}
      >
        {label}
      </span>
      <span
        className="flex-1 text-sm font-mono truncate"
        style={{ color: 'var(--color-ink)' }}
        title={value}
      >
        {value}
      </span>
      <CopyButton text={value} />
    </div>
  )
}

// ── Section header label ──────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p
      className="text-xs font-mono font-medium uppercase mb-2"
      style={{ color: 'var(--color-ink-faint)', letterSpacing: '0.06em' }}
    >
      {children}
    </p>
  )
}

// ── Reference table data ──────────────────────────────────────────────────────
const REF_UNITS = [
  { unit: 'Second',      seconds: 1,              abbr: 's' },
  { unit: 'Minute',      seconds: 60,             abbr: 'min' },
  { unit: 'Hour',        seconds: 3_600,           abbr: 'hr' },
  { unit: 'Day',         seconds: 86_400,          abbr: 'd' },
  { unit: 'Week',        seconds: 604_800,         abbr: 'wk' },
  { unit: 'Month (avg)', seconds: 2_629_800,       abbr: 'mo' },
  { unit: 'Year (avg)',  seconds: 31_557_600,      abbr: 'yr' },
  { unit: '10 Years',    seconds: 315_576_000,     abbr: '' },
  { unit: '100 Years',   seconds: 3_155_760_000,   abbr: '' },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function TimestampConverter() {
  // Source of truth: epoch in ms (or null if invalid)
  const [epochMs, setEpochMs] = useState(() => Date.now())

  // Timestamp input fields
  const [tsInput, setTsInput] = useState(() => String(Math.floor(Date.now() / 1000)))
  const [tsUnit,  setTsUnit]  = useState('sec')

  // DateTime input fields (UTC)
  const [dt, setDt] = useState(() => {
    const d = new Date()
    return {
      year:  d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day:   d.getUTCDate(),
      hour:  d.getUTCHours(),
      min:   d.getUTCMinutes(),
      sec:   d.getUTCSeconds(),
    }
  })

  const [activeTab, setActiveTab] = useState('ts') // 'ts' | 'dt'
  const [dtTzMode, setDtTzMode] = useState('utc') // 'utc' | 'local'

  // ── Sync helpers ────────────────────────────────────────────────────────────
  function syncFromTs(value, unit) {
    const ms = toEpochMs(value, unit)
    setEpochMs(ms)
    if (ms !== null) {
      const d = new Date(ms)
      setDt(dtTzMode === 'utc' ? {
        year:  d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day:   d.getUTCDate(),
        hour:  d.getUTCHours(),
        min:   d.getUTCMinutes(),
        sec:   d.getUTCSeconds(),
      } : {
        year:  d.getFullYear(),
        month: d.getMonth() + 1,
        day:   d.getDate(),
        hour:  d.getHours(),
        min:   d.getMinutes(),
        sec:   d.getSeconds(),
      })
    }
  }

  function syncFromDt(next) {
    const d = dtTzMode === 'utc'
      ? new Date(Date.UTC(next.year, next.month - 1, next.day, next.hour, next.min, next.sec))
      : new Date(next.year, next.month - 1, next.day, next.hour, next.min, next.sec)
    const ms = d.getTime()
    setEpochMs(isNaN(ms) ? null : ms)
    if (!isNaN(ms)) {
      setTsInput(String(fromEpochMs(ms, tsUnit)))
    }
  }

  function handleTsChange(value) {
    setTsInput(value)
    syncFromTs(value, tsUnit)
  }

  function handleUnitChange(unit) {
    setTsUnit(unit)
    // Convert existing epochMs to new unit
    if (epochMs !== null) {
      setTsInput(String(fromEpochMs(epochMs, unit)))
    }
    syncFromTs(tsInput, unit)
  }

  function handleDtChange(field, value) {
    const next = { ...dt, [field]: Number(value) }
    setDt(next)
    syncFromDt(next)
  }

  function setNowUtc() {
    const ms = Date.now()
    const d = new Date(ms)
    setEpochMs(ms)
    setDt({
      year:  d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day:   d.getUTCDate(),
      hour:  d.getUTCHours(),
      min:   d.getUTCMinutes(),
      sec:   d.getUTCSeconds(),
    })
    setDtTzMode('utc')
    setTsInput(String(fromEpochMs(ms, tsUnit)))
  }

  function setNowLocal() {
    const ms = Date.now()
    const d = new Date(ms)
    setEpochMs(ms)
    setDt({
      year:  d.getFullYear(),
      month: d.getMonth() + 1,
      day:   d.getDate(),
      hour:  d.getHours(),
      min:   d.getMinutes(),
      sec:   d.getSeconds(),
    })
    setDtTzMode('local')
    setTsInput(String(fromEpochMs(ms, tsUnit)))
  }

  function handleTzModeChange(mode) {
    setDtTzMode(mode)
    if (epochMs !== null) {
      const d = new Date(epochMs)
      setDt(mode === 'utc' ? {
        year:  d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day:   d.getUTCDate(),
        hour:  d.getUTCHours(),
        min:   d.getUTCMinutes(),
        sec:   d.getUTCSeconds(),
      } : {
        year:  d.getFullYear(),
        month: d.getMonth() + 1,
        day:   d.getDate(),
        hour:  d.getHours(),
        min:   d.getMinutes(),
        sec:   d.getSeconds(),
      })
    }
  }

  const outputs      = formatOutputs(epochMs)
  const localOutputs = formatLocalOutputs(epochMs)
  const localTzName  = Intl.DateTimeFormat().resolvedOptions().timeZone
  const localTzAbbr  = getLocalTzAbbr(new Date())
  const epochSec = epochMs !== null ? Math.floor(epochMs / 1000) : 0
  const discord = discordFormats(epochSec)
  const invalid = epochMs === null

  // ── Tab styles ──────────────────────────────────────────────────────────────
  function tabStyle(id) {
    const active = activeTab === id
    return {
      padding: '5px 14px',
      fontSize: '0.875rem',
      fontFamily: 'inherit',
      fontWeight: active ? 500 : 400,
      borderRadius: '6px 6px 0 0',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 120ms',
      backgroundColor: active ? 'var(--color-surface)' : 'transparent',
      color: active ? 'var(--color-ink)' : 'var(--color-ink-muted)',
      borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
    }
  }

  // ── Number field ─────────────────────────────────────────────────────────────
  function NumField({ label, field, min, max }) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>
          {label}
        </label>
        <input
          type="number"
          value={dt[field]}
          min={min}
          max={max}
          onChange={e => handleDtChange(field, e.target.value)}
          className="font-mono text-sm rounded-xs border px-2 py-1.5 w-full"
          style={{
            backgroundColor: 'var(--color-input-bg)',
            color: 'var(--color-ink)',
            borderColor: 'var(--color-border-strong)',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--color-border-strong)')}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">

      {/* ── Input card ── */}
      <Card>
        <CardHeader>
          <CardTitle>Convert</CardTitle>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={setNowUtc} icon={<Clock size={13} strokeWidth={1.5} />}>
              UTC now
            </Button>
            <Button size="sm" variant="ghost" onClick={setNowLocal} icon={<Clock size={13} strokeWidth={1.5} />}>
              Local now · {localTzAbbr}
            </Button>
          </div>
        </CardHeader>

        {/* Tabs */}
        <div className="flex gap-0 border-b mb-4" style={{ borderColor: 'var(--color-border)' }}>
          <button className="font-mono" style={tabStyle('ts')} onClick={() => setActiveTab('ts')}>
            From timestamp
          </button>
          <button className="font-mono" style={tabStyle('dt')} onClick={() => setActiveTab('dt')}>
            From date &amp; time
          </button>
        </div>

        {/* Timestamp input */}
        {activeTab === 'ts' && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-mono mb-1" style={{ color: 'var(--color-ink-muted)' }}>
                Timestamp value
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={tsInput}
                onChange={e => handleTsChange(e.target.value)}
                placeholder="e.g. 1700000000"
                className="w-full font-mono text-sm rounded-xs border px-3 py-2"
                style={{
                  backgroundColor: 'var(--color-input-bg)',
                  color: invalid && tsInput !== '' ? 'var(--color-error)' : 'var(--color-ink)',
                  borderColor: invalid && tsInput !== '' ? 'var(--color-error)' : 'var(--color-border-strong)',
                  outline: 'none',
                }}
                onFocus={e => { if (!invalid) e.target.style.borderColor = 'var(--color-primary)' }}
                onBlur={e => { e.target.style.borderColor = (invalid && tsInput !== '') ? 'var(--color-error)' : 'var(--color-border-strong)' }}
              />
              {invalid && tsInput !== '' && (
                <p className="text-xs font-sans mt-1" style={{ color: 'var(--color-error)' }}>
                  Invalid number
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: 'var(--color-ink-muted)' }}>
                Unit
              </label>
              <select
                value={tsUnit}
                onChange={e => handleUnitChange(e.target.value)}
                className="font-mono text-sm rounded-xs border px-2 py-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-input-bg)',
                  color: 'var(--color-ink)',
                  borderColor: 'var(--color-border-strong)',
                  outline: 'none',
                  minWidth: '90px',
                }}
              >
                <option value="sec">Seconds</option>
                <option value="ms">Milliseconds</option>
                <option value="µs">Microseconds</option>
                <option value="ns">Nanoseconds</option>
              </select>
            </div>
          </div>
        )}

        {/* Date/time input */}
        {activeTab === 'dt' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className="flex items-center gap-0.5 rounded p-0.5"
                style={{ backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
              >
                {['utc', 'local'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => handleTzModeChange(mode)}
                    className="text-xs font-mono px-2.5 py-0.5 rounded-sm"
                    style={{
                      backgroundColor: dtTzMode === mode ? 'var(--color-surface)' : 'transparent',
                      color: dtTzMode === mode ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                      border: `1px solid ${dtTzMode === mode ? 'var(--color-border-strong)' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'background-color 120ms, color 120ms, border-color 120ms',
                    }}
                  >
                    {mode === 'utc' ? 'UTC' : 'Local'}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
                {dtTzMode === 'local' ? `${localTzName} (${localTzAbbr})` : 'UTC ±00:00'}
              </span>
            </div>
            <p className="text-xs font-sans mb-3" style={{ color: 'var(--color-ink-muted)' }}>
              {dtTzMode === 'utc'
                ? 'All fields interpreted as UTC.'
                : `All fields interpreted as ${localTzName}.`}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <NumField label="Year"   field="year"  min={1970} max={9999} />
              <NumField label="Month"  field="month" min={1}    max={12} />
              <NumField label="Day"    field="day"   min={1}    max={31} />
              <NumField label="Hour"   field="hour"  min={0}    max={23} />
              <NumField label="Minute" field="min"   min={0}    max={59} />
              <NumField label="Second" field="sec"   min={0}    max={59} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Outputs card ── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <CardTitle>Formatted Outputs</CardTitle>
        </div>
        {invalid ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-sans" style={{ color: 'var(--color-ink-muted)' }}>
              Enter a valid timestamp to see outputs.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {outputs.map(row => (
              <div key={row.label} style={{ borderColor: 'var(--color-border)' }}>
                <OutputRow label={row.label} value={row.value} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Local time card ── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <CardTitle>Local Time</CardTitle>
          <span className="text-xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
            {localTzName}
          </span>
        </div>
        {invalid ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-sans" style={{ color: 'var(--color-ink-muted)' }}>
              Enter a valid timestamp to see outputs.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {localOutputs.map(row => (
              <div key={row.label} style={{ borderColor: 'var(--color-border)' }}>
                <OutputRow label={row.label} value={row.value} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Discord section ── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <CardTitle>Discord Timestamp Tags</CardTitle>
        </div>
        {invalid ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-sans" style={{ color: 'var(--color-ink-muted)' }}>
              Enter a valid timestamp above.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {discord.map(f => (
              <div
                key={f.style}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="w-32 flex-shrink-0 text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>
                  {f.name}
                </span>
                <span className="flex-1 text-sm font-mono" style={{ color: 'var(--color-ink)' }}>
                  {f.tag}
                </span>
                <span className="text-xs font-sans italic hidden sm:block" style={{ color: 'var(--color-ink-faint)' }}>
                  → {f.example}
                </span>
                <CopyButton text={f.tag} />
              </div>
            ))}
          </div>
        )}
        <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <p className="text-xs font-sans" style={{ color: 'var(--color-ink-faint)' }}>
            Paste these tags directly into Discord messages. Discord renders them in the reader's local timezone.
          </p>
        </div>
      </Card>

      {/* ── Info + Reference row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Educational info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info size={14} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
              <CardTitle>About Unix Timestamps</CardTitle>
            </div>
          </CardHeader>
          <div className="flex flex-col gap-3 text-sm font-sans" style={{ color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
            <p>
              A Unix timestamp counts the number of <strong style={{ color: 'var(--color-ink)' }}>seconds</strong> elapsed
              since <strong style={{ color: 'var(--color-ink)' }}>January 1, 1970 at 00:00:00 UTC</strong> (the Unix epoch),
              not counting leap seconds.
            </p>
            <p>
              Timestamps are timezone-agnostic — the same integer represents the same instant everywhere
              on Earth. Local time is a presentation concern, not a storage concern.
            </p>
            <div
              className="rounded-xs p-3 border-l-2"
              style={{
                backgroundColor: 'var(--color-primary-subtle)',
                borderLeftColor: 'var(--color-primary)',
              }}
            >
              <p className="text-xs font-mono font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
                Year 2038 Problem
              </p>
              <p className="text-xs font-sans" style={{ color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
                32-bit signed integers overflow at <span className="font-mono" style={{ color: 'var(--color-ink)' }}>2,147,483,647</span> —
                which corresponds to <span className="font-mono" style={{ color: 'var(--color-ink)' }}>2038-01-19 03:14:07 UTC</span>.
                Systems still using 32-bit <code style={{ color: 'var(--color-ink)' }}>time_t</code> will wrap to a
                negative value, interpreting the date as 1901. 64-bit systems are not affected.
              </p>
            </div>
          </div>
        </Card>

        {/* Reference table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <BookOpen size={14} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
              <CardTitle>Time Unit Reference</CardTitle>
            </div>
          </div>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface)' }}>
                <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>Unit</th>
                <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>Seconds</th>
              </tr>
            </thead>
            <tbody>
              {REF_UNITS.map(({ unit, seconds }) => (
                <tr
                  key={unit}
                  className="border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <td className="px-4 py-1.5 text-xs" style={{ color: 'var(--color-ink)' }}>{unit}</td>
                  <td className="px-4 py-1.5 text-xs text-right tabular-nums" style={{ color: 'var(--color-ink)' }}>
                    {seconds.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

    </div>
  )
}
