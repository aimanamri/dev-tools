import { useState, useMemo, useRef, useEffect } from 'react'
import { DateTime } from 'luxon'
import { Globe, Plus, X, Clock, Sun } from 'lucide-react'

const LOCAL_IANA = Intl.DateTimeFormat().resolvedOptions().timeZone

const ZONES = [
  { id: 'UTC', label: 'UTC — Coordinated Universal Time', abbr: 'UTC', region: 'Universal' },
  { id: 'Pacific/Honolulu', label: 'Hawaii–Aleutian Time (HST)', abbr: 'HST', region: 'Americas' },
  { id: 'America/Anchorage', label: 'Alaska Time (AKST/AKDT)', abbr: 'AKT', region: 'Americas' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PT)', abbr: 'PT', region: 'Americas' },
  { id: 'America/Denver', label: 'Mountain Time (MT)', abbr: 'MT', region: 'Americas' },
  { id: 'America/Chicago', label: 'Central Time (CT)', abbr: 'CT', region: 'Americas' },
  { id: 'America/New_York', label: 'Eastern Time (ET)', abbr: 'ET', region: 'Americas' },
  { id: 'America/Sao_Paulo', label: 'Brasília Time (BRT/BRST)', abbr: 'BRT', region: 'Americas' },
  { id: 'Europe/London', label: 'London (GMT/BST)', abbr: 'GMT', region: 'Europe' },
  { id: 'Europe/Paris', label: 'Central European Time (CET/CEST)', abbr: 'CET', region: 'Europe' },
  { id: 'Europe/Helsinki', label: 'Eastern European Time (EET/EEST)', abbr: 'EET', region: 'Europe' },
  { id: 'Europe/Moscow', label: 'Moscow Standard Time (MSK)', abbr: 'MSK', region: 'Europe' },
  { id: 'Africa/Cairo', label: 'Egypt Standard Time (EET)', abbr: 'EET+', region: 'Africa' },
  { id: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', abbr: 'GST', region: 'Middle East' },
  { id: 'Asia/Karachi', label: 'Pakistan Standard Time (PKT)', abbr: 'PKT', region: 'Asia' },
  { id: 'Asia/Kolkata', label: 'India Standard Time (IST)', abbr: 'IST', region: 'Asia' },
  { id: 'Asia/Dhaka', label: 'Bangladesh Standard Time (BST)', abbr: 'BDT', region: 'Asia' },
  { id: 'Asia/Bangkok', label: 'Indochina Time (ICT)', abbr: 'ICT', region: 'Asia' },
  { id: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)', abbr: 'SGT', region: 'Asia' },
  { id: 'Asia/Kuala_Lumpur', label: 'Malaysia Time (MYT)', abbr: 'MYT', region: 'Asia' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)', abbr: 'HKT', region: 'Asia' },
  { id: 'Asia/Shanghai', label: 'China Standard Time (CST)', abbr: 'CST', region: 'Asia' },
  { id: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', abbr: 'JST', region: 'Asia' },
  { id: 'Asia/Seoul', label: 'Korea Standard Time (KST)', abbr: 'KST', region: 'Asia' },
  { id: 'Australia/Perth', label: 'Australian Western Time (AWST)', abbr: 'AWST', region: 'Pacific' },
  { id: 'Australia/Sydney', label: 'Australian Eastern Time (AEST/AEDT)', abbr: 'AEST', region: 'Pacific' },
  { id: 'Pacific/Auckland', label: 'New Zealand Time (NZST/NZDT)', abbr: 'NZST', region: 'Pacific' },
]

// Add local zone if not already in curated list
const ALL_ZONES = ZONES.find(z => z.id === LOCAL_IANA)
  ? ZONES
  : [{ id: LOCAL_IANA, label: `Local — ${LOCAL_IANA}`, abbr: 'Local', region: 'Local' }, ...ZONES]

function formatOffsetStr(mins) {
  const sign = mins >= 0 ? '+' : '-'
  const abs = Math.abs(mins)
  const h = Math.floor(abs / 60).toString().padStart(2, '0')
  const m = (abs % 60).toString().padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

function formatDiffStr(diffMins) {
  if (diffMins === 0) return 'same'
  const sign = diffMins > 0 ? '+' : '−'
  const abs = Math.abs(diffMins)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`
}

function toInputValue(dt) {
  return dt.toFormat("yyyy-MM-dd'T'HH:mm")
}

// ─────────────────────────────────────────────────────────────────────────────
// ZoneRow
// ─────────────────────────────────────────────────────────────────────────────

function ZoneRow({ dt, zone, offsetStr, diffStr, isBase, diffMins, onRemove }) {
  const timeStr = dt.toFormat('hh:mm a')
  const secStr  = dt.toFormat(':ss')
  const dateStr = dt.toFormat('EEE, dd MMM yyyy')

  const diffPositive = diffMins > 0

  return (
    <div
      className="tz-zone-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border-strong)',
        borderLeft: isBase ? '3px solid var(--color-primary)' : '3px solid transparent',
        backgroundColor: isBase ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
        gap: '12px',
        minWidth: 0,
      }}
    >
      {/* Left: zone name + time */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
        {/* Zone label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            fontWeight: 'var(--weight-semibold)',
            color: isBase ? 'var(--color-primary)' : 'var(--color-accent)',
            backgroundColor: isBase ? 'var(--color-primary-subtle)' : 'var(--color-accent-subtle)',
            padding: '1px 6px',
            borderRadius: '3px',
            border: `1px solid ${isBase ? 'var(--color-primary)' : 'var(--color-accent)'}`,
            flexShrink: 0,
          }}>
            {zone?.abbr ?? '?'}
          </span>
          <span style={{
            fontSize: '0.8125rem',
            color: 'var(--color-ink-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {zone?.label ?? zone?.id}
          </span>
        </div>
        {/* Time row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.375rem',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}>
            {timeStr}
            <span style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', fontWeight: 400 }}>
              {secStr}
            </span>
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
            {dateStr}
          </span>
        </div>
      </div>

      {/* Right: offset + diff + remove */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            color: 'var(--color-ink-faint)',
          }}>
            {offsetStr}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            fontWeight: 'var(--weight-medium)',
            padding: isBase ? '0' : '1px 6px',
            borderRadius: '3px',
            color: isBase
              ? 'var(--color-primary)'
              : diffMins === 0
                ? 'var(--color-ink-muted)'
                : diffPositive
                  ? 'var(--color-success)'
                  : 'var(--color-error)',
            backgroundColor: isBase || diffMins === 0
              ? 'transparent'
              : diffPositive
                ? 'oklch(0.480 0.140 145 / 0.12)'
                : 'oklch(0.490 0.195 18 / 0.10)',
          }}>
            {isBase ? 'base' : diffStr}
          </span>
        </div>

        {!isBase && onRemove ? (
          <button
            onClick={onRemove}
            className="tz-remove-btn"
            title="Remove timezone"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24,
              borderRadius: '3px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-ink-faint)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
              e.currentTarget.style.color = 'var(--color-ink-muted)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--color-ink-faint)'
            }}
          >
            <X size={13} strokeWidth={2} />
          </button>
        ) : (
          <div style={{ width: 24 }} />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EducationalPanel
// ─────────────────────────────────────────────────────────────────────────────

function EducationalPanel() {
  const panelStyle = {
    padding: '20px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: '8px',
  }
  const headingStyle = {
    display: 'flex', alignItems: 'center', gap: '8px',
    marginBottom: '12px',
  }
  const h3Style = {
    fontSize: '0.875rem',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--color-ink)',
    margin: 0,
  }
  const paraStyle = {
    fontSize: '0.8125rem',
    color: 'var(--color-ink-muted)',
    lineHeight: 'var(--leading-normal)',
    marginBottom: '10px',
  }
  const calloutStyle = (color) => ({
    padding: '10px 12px',
    backgroundColor: color,
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: 'var(--color-ink-muted)',
    lineHeight: 'var(--leading-normal)',
    margin: 0,
  })

  return (
    <div className="edu-grid">
      {/* DST */}
      <div style={panelStyle}>
        <div style={headingStyle}>
          <Sun size={15} strokeWidth={1.5} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <h3 style={h3Style}>Daylight Saving Time (DST)</h3>
        </div>
        <p style={paraStyle}>
          DST is the practice of advancing clocks by one hour during summer months to extend evening daylight. Clocks "spring forward" in spring and "fall back" in autumn.
        </p>
        <p style={paraStyle}>
          This means the offset difference between two timezones can shift twice a year. For example, New York (ET) is UTC−5 in winter but UTC−4 during summer. If you schedule a meeting at a fixed UTC time, the local time in DST-observing zones will appear different in summer vs. winter.
        </p>
        <p style={calloutStyle('oklch(0.560 0.175 65 / 0.08)')}>
          <strong style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>No DST:</strong>{' '}
          Japan, China, India, Singapore, Malaysia, and most of Africa do not observe DST — their UTC offset is constant year-round.
        </p>
      </div>

      {/* UTC/GMT */}
      <div style={panelStyle}>
        <div style={headingStyle}>
          <Globe size={15} strokeWidth={1.5} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <h3 style={h3Style}>Why UTC / GMT?</h3>
        </div>
        <p style={paraStyle}>
          <strong style={{ color: 'var(--color-ink)' }}>GMT</strong> (Greenwich Mean Time) is the mean solar time at the Royal Observatory in Greenwich, London. It was the world's primary time standard throughout the 20th century.
        </p>
        <p style={paraStyle}>
          <strong style={{ color: 'var(--color-ink)' }}>UTC</strong> (Coordinated Universal Time) is the modern successor. Rather than tracking the sun, it's maintained by a weighted average of atomic clocks worldwide. It never observes DST and does not drift.
        </p>
        <p style={paraStyle}>
          All other timezones are expressed as UTC offsets (e.g., MYT = UTC+8, ET = UTC−5). Servers and APIs store timestamps in UTC to avoid ambiguity across regions and DST transitions.
        </p>
        <p style={calloutStyle('var(--color-accent-subtle)')}>
          <strong style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>Best practice:</strong>{' '}
          Store and transmit all timestamps as UTC. Convert to the user's local timezone only at the display layer.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function TimezoneConverter() {
  const defaultBase = ALL_ZONES.find(z => z.id === LOCAL_IANA)?.id ?? 'UTC'
  const defaultTargets = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'].filter(id => id !== defaultBase)

  const [inputDate, setInputDate]   = useState(() => toInputValue(DateTime.now()))
  const [baseZone, setBaseZone]     = useState(defaultBase)
  const [targetZones, setTargetZones] = useState(defaultTargets)
  const [showAdd, setShowAdd]       = useState(false)
  const [addFilter, setAddFilter]   = useState('')
  const addRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showAdd) return
    function onDown(e) {
      if (addRef.current && !addRef.current.contains(e.target)) {
        setShowAdd(false)
        setAddFilter('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showAdd])

  const baseDT = useMemo(() => {
    try {
      const dt = DateTime.fromISO(inputDate, { zone: baseZone })
      return dt.isValid ? dt : DateTime.now().setZone(baseZone)
    } catch {
      return DateTime.now().setZone(baseZone)
    }
  }, [inputDate, baseZone])

  const baseInfo = useMemo(() => {
    const zone = ALL_ZONES.find(z => z.id === baseZone) ?? { id: baseZone, label: baseZone, abbr: '?', region: '' }
    return { zone, dt: baseDT, offsetStr: formatOffsetStr(baseDT.offset) }
  }, [baseDT, baseZone])

  const comparisons = useMemo(() =>
    targetZones.map(zoneId => {
      const zone = ALL_ZONES.find(z => z.id === zoneId) ?? { id: zoneId, label: zoneId, abbr: '?', region: '' }
      const dt = baseDT.setZone(zoneId)
      const diffMins = dt.offset - baseDT.offset
      return { zoneId, zone, dt, offsetStr: formatOffsetStr(dt.offset), diffStr: formatDiffStr(diffMins), diffMins }
    })
  , [baseDT, targetZones])

  const filteredGrouped = useMemo(() => {
    const q = addFilter.toLowerCase().trim()
    const excluded = new Set([...targetZones, baseZone])
    const filtered = ALL_ZONES.filter(z =>
      !excluded.has(z.id) &&
      (!q || z.label.toLowerCase().includes(q) || z.abbr.toLowerCase().includes(q) || z.id.toLowerCase().includes(q))
    )
    const groups = {}
    for (const z of filtered) {
      if (!groups[z.region]) groups[z.region] = []
      groups[z.region].push(z)
    }
    return groups
  }, [addFilter, targetZones, baseZone])

  function addZone(id) {
    setTargetZones(prev => [...prev, id])
    setShowAdd(false)
    setAddFilter('')
  }

  function removeZone(id) {
    setTargetZones(prev => prev.filter(z => z !== id))
  }

  function setToNow() {
    setInputDate(toInputValue(DateTime.now().setZone(baseZone)))
  }

  const inputStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem',
    padding: '7px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border-strong)',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-ink)',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: '0.6875rem',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-ink-muted)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-wide)',
    display: 'block',
    marginBottom: '4px',
  }

  return (
    <div>
      <style>{`
        .tz-input:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
        .tz-select:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
        .tz-zone-row:last-child { border-bottom: none; }
        .tz-add-btn:hover { background-color: var(--color-surface-raised); }
        .edu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 700px) {
          .edu-grid { grid-template-columns: 1fr; }
          .tz-picker-row { flex-direction: column; align-items: flex-start; }
          .tz-picker-row select { width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--weight-semibold)',
          color: 'var(--color-ink)',
          marginBottom: '4px',
          letterSpacing: '-0.02em',
        }}>
          Timezone Converter
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
          Compare a moment in time across multiple timezones. Select a date, set a base timezone, then add zones to compare.
        </p>
      </div>

      {/* Picker row */}
      <div
        className="tz-picker-row"
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          padding: '16px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: '8px',
          marginBottom: '24px',
        }}
      >
        <div>
          <label style={labelStyle}>Date &amp; Time</label>
          <input
            type="datetime-local"
            value={inputDate}
            onChange={e => setInputDate(e.target.value)}
            className="tz-input"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Base Timezone</label>
          <select
            value={baseZone}
            onChange={e => {
              const next = e.target.value
              // If next base is already a target, remove it from targets
              setTargetZones(prev => prev.filter(z => z !== next))
              setBaseZone(next)
            }}
            className="tz-select"
            style={{
              ...inputStyle,
              paddingRight: '28px',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'calc(100% - 8px) 50%',
            }}
          >
            {ALL_ZONES.map(z => (
              <option key={z.id} value={z.id}>{z.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={setToNow}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '7px 12px',
            borderRadius: '6px',
            border: '1px solid var(--color-border-strong)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-ink-muted)',
            fontSize: '0.8125rem',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            transition: 'background-color 120ms ease-out',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
        >
          <Clock size={13} strokeWidth={1.5} />
          Now
        </button>
      </div>

      {/* Comparison list */}
      <div style={{
        border: '1px solid var(--color-border-strong)',
        borderRadius: '8px',
        overflow: 'visible',
        marginBottom: '32px',
      }}>
        {/* Base row */}
        <ZoneRow
          dt={baseInfo.dt}
          zone={baseInfo.zone}
          offsetStr={baseInfo.offsetStr}
          isBase
        />

        {/* Target rows */}
        {comparisons.map(c => (
          <ZoneRow
            key={c.zoneId}
            dt={c.dt}
            zone={c.zone}
            offsetStr={c.offsetStr}
            diffStr={c.diffStr}
            diffMins={c.diffMins}
            onRemove={() => removeZone(c.zoneId)}
          />
        ))}

        {/* Add timezone */}
        <div style={{ position: 'relative' }} ref={addRef}>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="tz-add-btn"
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px',
              border: 'none',
              borderTop: '1px solid var(--color-border-strong)',
              borderBottomLeftRadius: '7px',
              borderBottomRightRadius: '7px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-ink-muted)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'background-color 120ms ease-out',
              textAlign: 'left',
            }}
          >
            <Plus size={13} strokeWidth={2} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            Add timezone to compare
          </button>

          {showAdd && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              zIndex: 100,
              width: '360px',
              maxHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--color-input-bg)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              marginBottom: '4px',
            }}>
              <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                <input
                  autoFocus
                  placeholder="Search timezone..."
                  value={addFilter}
                  onChange={e => setAddFilter(e.target.value)}
                  className="tz-input"
                  style={{
                    ...inputStyle,
                    width: '100%',
                    padding: '5px 10px',
                    borderRadius: '3px',
                    boxSizing: 'border-box',
                    backgroundColor: 'var(--color-surface)',
                  }}
                />
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {Object.keys(filteredGrouped).length === 0 ? (
                  <p style={{ padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--color-ink-faint)', margin: 0 }}>
                    No timezones found
                  </p>
                ) : (
                  Object.entries(filteredGrouped).map(([region, zones]) => (
                    <div key={region}>
                      <div style={{
                        padding: '4px 12px',
                        fontSize: '0.6875rem',
                        fontWeight: 'var(--weight-semibold)',
                        letterSpacing: 'var(--tracking-wide)',
                        textTransform: 'uppercase',
                        color: 'var(--color-ink-faint)',
                        backgroundColor: 'var(--color-surface)',
                        borderBottom: '1px solid var(--color-border)',
                      }}>
                        {region}
                      </div>
                      {zones.map(z => (
                        <button
                          key={z.id}
                          onClick={() => addZone(z.id)}
                          style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 12px',
                            border: 'none',
                            borderBottom: '1px solid var(--color-border)',
                            backgroundColor: 'transparent',
                            color: 'var(--color-ink)',
                            fontSize: '0.8125rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background-color 80ms ease-out',
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6875rem',
                            color: 'var(--color-primary)',
                            minWidth: '36px',
                            fontWeight: 'var(--weight-medium)',
                          }}>
                            {z.abbr}
                          </span>
                          <span style={{ color: 'var(--color-ink-muted)' }}>{z.label}</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Educational panel */}
      <EducationalPanel />
    </div>
  )
}
