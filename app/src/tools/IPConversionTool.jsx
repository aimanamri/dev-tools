import { useState, useCallback } from 'react'
import { Copy, Check, RotateCcw, ArrowLeftRight } from 'lucide-react'

// ─── Pure-JS helpers ───────────────────────────────────────────────────────

function ipToOctets(ip) {
  return ip.trim().split('.').map(Number)
}

function validateIPv4(ip) {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return false
  return parts.every(p => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255)
}

function ipToBinary(ip) {
  return ipToOctets(ip)
    .map(o => o.toString(2).padStart(8, '0'))
    .join('.')
}

function binaryToIP(bin) {
  // Accept with or without dot separators
  const clean = bin.replace(/\./g, '').trim()
  if (!/^[01]{32}$/.test(clean)) return null
  const octets = [
    clean.slice(0, 8),
    clean.slice(8, 16),
    clean.slice(16, 24),
    clean.slice(24, 32),
  ]
  return octets.map(b => parseInt(b, 2)).join('.')
}

function validateBinary(bin) {
  const clean = bin.replace(/\./g, '').trim()
  return /^[01]{32}$/.test(clean)
}

function normaliseBinaryInput(raw) {
  // Strip anything that isn't 0, 1, or dot; collapse multiple dots
  return raw.replace(/[^01.]/g, '')
}

// ─── Copy button ───────────────────────────────────────────────────────────

function CopyBtn({ value, disabled }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!value || disabled) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      disabled={disabled}
      title="Copy"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono transition-colors"
      style={{
        backgroundColor: 'transparent',
        border: '1px solid var(--color-border)',
        color: copied ? 'var(--color-success)' : disabled ? 'var(--color-ink-faint)' : 'var(--color-ink-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ─── Output row ────────────────────────────────────────────────────────────

function OutputRow({ label, value, highlight }) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-md"
      style={{
        backgroundColor: highlight ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
        border: `1px solid ${highlight ? 'var(--color-primary)' : 'var(--color-border)'}`,
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-2xs mb-0.5" style={{ color: 'var(--color-ink-muted)' }}>{label}</p>
        <p
          className="text-sm font-mono break-all leading-snug"
          style={{ color: 'var(--color-ink)' }}
        >
          {value || <span style={{ color: 'var(--color-ink-faint)' }}>—</span>}
        </p>
      </div>
      <CopyBtn value={value} disabled={!value} />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function IPConversionTool() {
  // IP → Binary state
  const [ipInput, setIpInput] = useState('')
  const [ipError, setIpError] = useState('')
  const [ipResult, setIpResult] = useState(null)

  // Binary → IP state
  const [binInput, setBinInput] = useState('')
  const [binError, setBinError] = useState('')
  const [binResult, setBinResult] = useState(null)

  // Live: IP → Binary
  const handleIpChange = useCallback((val) => {
    setIpInput(val)
    if (!val.trim()) {
      setIpError('')
      setIpResult(null)
      return
    }
    if (!validateIPv4(val)) {
      setIpError('Invalid IPv4 address — expected four octets (0–255) separated by dots.')
      setIpResult(null)
      return
    }
    setIpError('')
    const octets = ipToOctets(val)
    setIpResult({
      dotted: ipToBinary(val),
      plain: ipToBinary(val).replace(/\./g, ''),
      hex: '0x' + octets.map(o => o.toString(16).padStart(2, '0').toUpperCase()).join(''),
      integer: String(((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0),
    })
  }, [])

  // Live: Binary → IP
  const handleBinChange = useCallback((raw) => {
    const val = normaliseBinaryInput(raw)
    setBinInput(val)
    const clean = val.replace(/\./g, '').trim()
    if (!clean) {
      setBinError('')
      setBinResult(null)
      return
    }
    if (clean.length < 32) {
      setBinError(`Need exactly 32 bits — ${clean.length} entered so far.`)
      setBinResult(null)
      return
    }
    if (!validateBinary(val)) {
      setBinError('Binary string must be exactly 32 bits (0s and 1s only, dots optional).')
      setBinResult(null)
      return
    }
    const ip = binaryToIP(val)
    setBinError('')
    setBinResult({
      ip,
      octets: clean.match(/.{8}/g).map(b => `${b} = ${parseInt(b, 2)}`),
    })
  }, [])

  const resetAll = () => {
    setIpInput('')
    setIpError('')
    setIpResult(null)
    setBinInput('')
    setBinError('')
    setBinResult(null)
  }

  const inputBase = {
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem',
    padding: '8px 12px',
    borderRadius: 'var(--radius-xs)',
    outline: 'none',
    width: '100%',
    transition: 'border-color 120ms',
  }

  const labelStyle = {
    fontSize: '0.75rem',
    color: 'var(--color-ink-muted)',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={18} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
              IP Address Converter
            </h1>
          </div>
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono transition-colors"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-ink-muted)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <RotateCcw size={12} strokeWidth={1.5} />
            Reset all
          </button>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--color-ink-muted)' }}>
          Convert IPv4 addresses to 32-bit binary and back. All processing is client-side.
        </p>
      </div>

      {/* ── IP → Binary ── */}
      <section
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--color-border-strong)' }}
      >
        {/* Section header */}
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="text-2xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-pill font-mono"
            style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}
          >
            MODE A
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            IPv4 Address → Binary
          </span>
        </div>

        <div className="p-4 space-y-4" style={{ backgroundColor: 'var(--color-bg)' }}>
          {/* Input */}
          <div>
            <label style={labelStyle}>IPv4 Address</label>
            <input
              type="text"
              value={ipInput}
              onChange={e => handleIpChange(e.target.value)}
              placeholder="e.g. 192.168.1.1"
              spellCheck={false}
              style={{
                ...inputBase,
                border: `1px solid ${ipError ? 'var(--color-error)' : 'var(--color-border-strong)'}`,
              }}
              onFocus={e => { if (!ipError) e.target.style.borderColor = 'var(--color-primary)' }}
              onBlur={e => { e.target.style.borderColor = ipError ? 'var(--color-error)' : 'var(--color-border-strong)' }}
            />
            {ipError && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--color-error)' }}>{ipError}</p>
            )}
          </div>

          {/* Outputs */}
          <div className="space-y-2">
            <OutputRow
              label="32-bit Binary (dotted octets)"
              value={ipResult?.dotted}
              highlight
            />
            <OutputRow
              label="32-bit Binary (plain)"
              value={ipResult?.plain}
            />
            <OutputRow
              label="Hexadecimal"
              value={ipResult?.hex}
            />
            <OutputRow
              label="32-bit Integer"
              value={ipResult?.integer}
            />
          </div>

          {/* Octet breakdown */}
          {ipResult && (
            <div
              className="rounded-md p-3"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-2xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-ink-faint)' }}>
                Octet Breakdown
              </p>
              <div className="grid grid-cols-4 gap-2">
                {ipToOctets(ipInput).map((oct, i) => {
                  const bits = oct.toString(2).padStart(8, '0')
                  return (
                    <div
                      key={i}
                      className="rounded p-2 text-center"
                      style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)' }}
                    >
                      <p className="text-xs font-mono font-medium" style={{ color: 'var(--color-ink)' }}>{oct}</p>
                      <p className="text-2xs font-mono mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                        {bits.slice(0, 4)}&thinsp;{bits.slice(4)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Binary → IP ── */}
      <section
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--color-border-strong)' }}
      >
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="text-2xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-pill font-mono"
            style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
          >
            MODE B
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            Binary → IPv4 Address
          </span>
        </div>

        <div className="p-4 space-y-4" style={{ backgroundColor: 'var(--color-bg)' }}>
          {/* Input */}
          <div>
            <label style={labelStyle}>32-bit Binary String (dots optional)</label>
            <input
              type="text"
              value={binInput}
              onChange={e => handleBinChange(e.target.value)}
              placeholder="e.g. 11000000.10101000.00000001.00000001"
              spellCheck={false}
              maxLength={35}
              style={{
                ...inputBase,
                border: `1px solid ${binError ? 'var(--color-error)' : 'var(--color-border-strong)'}`,
                letterSpacing: '0.03em',
              }}
              onFocus={e => { if (!binError) e.target.style.borderColor = 'var(--color-primary)' }}
              onBlur={e => { e.target.style.borderColor = binError ? 'var(--color-error)' : 'var(--color-border-strong)' }}
            />
            {/* Bit counter */}
            <div className="flex items-center justify-between mt-1.5">
              {binError
                ? <p className="text-xs" style={{ color: 'var(--color-error)' }}>{binError}</p>
                : <span />
              }
              <span className="text-2xs font-mono ml-auto" style={{ color: 'var(--color-ink-faint)' }}>
                {binInput.replace(/\./g, '').length} / 32 bits
              </span>
            </div>
          </div>

          {/* Output */}
          <div className="space-y-2">
            <OutputRow
              label="IPv4 Address (decimal dotted)"
              value={binResult?.ip}
              highlight
            />
          </div>

          {/* Octet decode breakdown */}
          {binResult && (
            <div
              className="rounded-md p-3"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-2xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-ink-faint)' }}>
                Octet Breakdown
              </p>
              <div className="grid grid-cols-4 gap-2">
                {binResult.octets.map((o, i) => {
                  const [bits, dec] = o.split(' = ')
                  return (
                    <div
                      key={i}
                      className="rounded p-2 text-center"
                      style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)' }}
                    >
                      <p className="text-2xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>
                        {bits.slice(0, 4)}&thinsp;{bits.slice(4)}
                      </p>
                      <p className="text-xs font-mono font-medium mt-0.5" style={{ color: 'var(--color-ink)' }}>{dec}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Quick reference ── */}
      <section
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--color-border-strong)' }}
      >
        <div
          className="px-4 py-2.5 text-xs font-semibold"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-ink-muted)', borderBottom: '1px solid var(--color-border)' }}
        >
          Quick Reference — Common Addresses
        </div>
        <div className="overflow-x-auto" style={{ backgroundColor: 'var(--color-input-bg)' }}>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                {['IPv4 Address', '32-bit Binary (dotted)', 'Integer', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: 'var(--color-ink-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { ip: '0.0.0.0',         bin: '00000000.00000000.00000000.00000000', int: '0',          note: 'Unspecified / Any' },
                { ip: '127.0.0.1',       bin: '01111111.00000000.00000000.00000001', int: '2130706433', note: 'Loopback' },
                { ip: '192.168.0.1',     bin: '11000000.10101000.00000000.00000001', int: '3232235521', note: 'Private (Class C)' },
                { ip: '10.0.0.1',        bin: '00001010.00000000.00000000.00000001', int: '167772161',  note: 'Private (Class A)' },
                { ip: '172.16.0.1',      bin: '10101100.00010000.00000000.00000001', int: '2886729729', note: 'Private (Class B)' },
                { ip: '255.255.255.255', bin: '11111111.11111111.11111111.11111111', int: '4294967295', note: 'Broadcast / Max' },
                { ip: '255.255.255.0',   bin: '11111111.11111111.11111111.00000000', int: '4294967040', note: '/24 Subnet mask' },
                { ip: '255.255.0.0',     bin: '11111111.11111111.00000000.00000000', int: '4294901760', note: '/16 Subnet mask' },
              ].map(row => (
                <tr key={row.ip} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-1.5" style={{ color: 'var(--color-primary)' }}>{row.ip}</td>
                  <td className="px-4 py-1.5" style={{ color: 'var(--color-ink)' }}>{row.bin}</td>
                  <td className="px-4 py-1.5" style={{ color: 'var(--color-ink-muted)' }}>{row.int}</td>
                  <td className="px-4 py-1.5" style={{ color: 'var(--color-ink-faint)', fontFamily: 'var(--font-sans)' }}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
