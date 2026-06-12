import { useState, useCallback, useEffect, useRef } from 'react'
import { Copy, Check, RefreshCw, Shield } from 'lucide-react'
import Button from '../components/ui/Button'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'

// ── Character pools ─────────────────────────────────────────────────────────
const POOL_UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const POOL_LOWER   = 'abcdefghijklmnopqrstuvwxyz'
const POOL_DIGITS  = '0123456789'
const POOL_SYMBOLS = '!@#$%^&*_+-={}|;<>?'

const SIMILAR_CHARS   = new Set(['i', 'l', '1', 'L', 'o', '0', 'O'])
const AMBIGUOUS_CHARS = new Set(['[', ']', '(', ')', '/', '\\', "'", '"', '~', ',', ';', ':', '.', '<', '>'])

function buildPool(opts) {
  let pool = ''
  if (opts.upper)   pool += POOL_UPPER
  if (opts.lower)   pool += POOL_LOWER
  if (opts.digits)  pool += POOL_DIGITS
  if (opts.symbols) pool += POOL_SYMBOLS
  if (opts.excludeSimilar)   pool = [...pool].filter(c => !SIMILAR_CHARS.has(c)).join('')
  if (opts.excludeAmbiguous) pool = [...pool].filter(c => !AMBIGUOUS_CHARS.has(c)).join('')
  return pool
}

function generatePassword(length, pool) {
  if (!pool.length) return ''
  const poolSize = pool.length
  const limit = Math.floor(0x100000000 / poolSize) * poolSize
  const result = []
  while (result.length < length) {
    const batch = new Uint32Array((length - result.length) * 2)
    crypto.getRandomValues(batch)
    for (const n of batch) {
      if (n < limit) {
        result.push(pool[n % poolSize])
        if (result.length === length) break
      }
    }
  }
  return result.join('')
}

// ── Strength ─────────────────────────────────────────────────────────────────
function calcEntropy(length, poolSize) {
  if (!poolSize || !length) return 0
  return length * Math.log2(poolSize)
}

function strengthLabel(entropy) {
  if (entropy < 28)  return { label: 'Very Weak',  level: 0 }
  if (entropy < 36)  return { label: 'Weak',        level: 1 }
  if (entropy < 60)  return { label: 'Fair',        level: 2 }
  if (entropy < 80)  return { label: 'Strong',      level: 3 }
  return                    { label: 'Very Strong', level: 4 }
}

// Assumes 10^10 guesses/sec (modern GPU cluster)
function crackTime(entropy) {
  const guessesPerSec = 1e10
  const seconds = Math.pow(2, entropy) / guessesPerSec / 2 // avg half keyspace

  if (seconds < 1)           return 'instantly'
  if (seconds < 60)          return `${Math.round(seconds)} seconds`
  if (seconds < 3600)        return `${Math.round(seconds / 60)} minutes`
  if (seconds < 86400)       return `${Math.round(seconds / 3600)} hours`
  if (seconds < 2592000)     return `${Math.round(seconds / 86400)} days`
  if (seconds < 31536000)    return `${Math.round(seconds / 2592000)} months`
  if (seconds < 3153600000)  return `${Math.round(seconds / 31536000)} years`
  return 'centuries'
}

const STRENGTH_COLORS = [
  'var(--color-error)',
  'var(--color-error)',
  'var(--color-warning)',
  'var(--color-success)',
  'var(--color-success)',
]
const STRENGTH_BG = [
  'oklch(0.490 0.195 18 / 0.15)',
  'oklch(0.490 0.195 18 / 0.15)',
  'oklch(0.560 0.175 65 / 0.15)',
  'oklch(0.480 0.140 145 / 0.15)',
  'oklch(0.480 0.140 145 / 0.15)',
]

// ── Toggle / Checkbox primitives ──────────────────────────────────────────────
function Checkbox({ id, label, checked, onChange, disabled }) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer select-none group"
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <div
        className="relative flex items-center justify-center w-4 h-4 rounded-xs border transition-colors duration-fast"
        style={{
          backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-input-bg)',
          borderColor: checked ? 'var(--color-primary)' : 'var(--color-border-strong)',
        }}
      >
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm font-mono" style={{ color: 'var(--color-ink)' }}>
        {label}
      </span>
    </label>
  )
}

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

// ── Main component ────────────────────────────────────────────────────────────
export default function PasswordGenerator() {
  const [length, setLength] = useState(20)
  const [opts, setOpts] = useState({
    upper: true,
    lower: true,
    digits: true,
    symbols: false,
    excludeSimilar: false,
    excludeAmbiguous: false,
  })
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(null)

  const pool = buildPool(opts)
  const entropy = calcEntropy(length, pool.length)
  const strength = strengthLabel(entropy)
  const crack = crackTime(entropy)

  const regenerate = useCallback(() => {
    setPassword(generatePassword(length, buildPool(opts)))
  }, [length, opts])

  useEffect(() => {
    regenerate()
  }, [regenerate])

  function handleCopy() {
    if (!password) return
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  function toggle(key) {
    setOpts(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // Always keep at least one character class active
      const anyActive = next.upper || next.lower || next.digits || next.symbols
      if (!anyActive) return prev
      return next
    })
  }

  const noPool = pool.length === 0

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-4">

      {/* Password display */}
      <Card>
        <div
          className="flex items-center gap-2 rounded-sm px-4 py-3 mb-3 border min-h-[3.25rem]"
          style={{
            backgroundColor: 'var(--color-input-bg)',
            borderColor: 'var(--color-border-strong)',
          }}
        >
          {noPool ? (
            <span
              className="flex-1 text-sm font-sans italic"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              Select at least one character type
            </span>
          ) : (
            <span
              className="flex-1 font-mono text-base break-all leading-snug select-all"
              style={{ color: 'var(--color-ink)', wordBreak: 'break-all' }}
            >
              {password}
            </span>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={regenerate}
              className="flex items-center justify-center w-8 h-8 rounded-sm transition-colors duration-fast"
              style={{ color: 'var(--color-ink-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              title="Regenerate"
              aria-label="Regenerate password"
            >
              <RefreshCw size={15} strokeWidth={1.5} />
            </button>
            <button
              onClick={handleCopy}
              disabled={noPool}
              className="flex items-center justify-center w-8 h-8 rounded-sm transition-colors duration-fast disabled:opacity-45 disabled:cursor-not-allowed"
              style={{
                color: copied ? 'var(--color-success)' : 'var(--color-ink-muted)',
                backgroundColor: copied ? 'oklch(0.480 0.140 145 / 0.12)' : 'transparent',
              }}
              onMouseEnter={e => { if (!copied && !noPool) e.currentTarget.style.backgroundColor = 'var(--color-surface)' }}
              onMouseLeave={e => { if (!copied) e.currentTarget.style.backgroundColor = 'transparent' }}
              title={copied ? 'Copied!' : 'Copy to clipboard'}
              aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
            >
              {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Strength meter */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield size={13} strokeWidth={1.5} style={{ color: noPool ? 'var(--color-ink-faint)' : STRENGTH_COLORS[strength.level] }} />
              <span
                className="text-xs font-mono font-medium"
                style={{ color: noPool ? 'var(--color-ink-faint)' : STRENGTH_COLORS[strength.level] }}
              >
                {noPool ? 'N/A' : strength.label}
              </span>
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>
              {noPool ? '—' : `~${crack} to crack`}
            </span>
          </div>

          {/* Bar */}
          <div
            className="h-1.5 rounded-pill overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-pill transition-all duration-normal ease-out"
              style={{
                width: noPool ? '0%' : `${((strength.level + 1) / 5) * 100}%`,
                backgroundColor: noPool ? 'var(--color-border)' : STRENGTH_COLORS[strength.level],
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
              Pool size: {pool.length} chars
            </span>
            <span className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>
              {noPool ? '—' : `${Math.round(entropy)} bits of entropy`}
            </span>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
        </CardHeader>

        {/* Length slider */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Length</SectionLabel>
            <span
              className="text-sm font-mono font-semibold tabular-nums"
              style={{ color: 'var(--color-primary)' }}
            >
              {length}
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={64}
            value={length}
            onChange={e => setLength(Number(e.target.value))}
            className="w-full accent-primary h-1.5 rounded-pill cursor-pointer"
            style={{ accentColor: 'var(--color-primary)' }}
            aria-label="Password length"
          />
          <div className="flex justify-between mt-1">
            <span className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>4</span>
            <span className="text-2xs font-mono" style={{ color: 'var(--color-ink-faint)' }}>64</span>
          </div>
        </div>

        {/* Character types */}
        <div className="mb-4">
          <SectionLabel>Character types</SectionLabel>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <Checkbox id="upper"   label="Uppercase (A–Z)" checked={opts.upper}   onChange={() => toggle('upper')} />
            <Checkbox id="lower"   label="Lowercase (a–z)" checked={opts.lower}   onChange={() => toggle('lower')} />
            <Checkbox id="digits"  label="Numbers (0–9)"   checked={opts.digits}  onChange={() => toggle('digits')} />
            <Checkbox id="symbols" label="Symbols (!@#…)"  checked={opts.symbols} onChange={() => toggle('symbols')} />
          </div>
        </div>

        {/* Exclusions */}
        <div>
          <SectionLabel>Exclude</SectionLabel>
          <div className="flex flex-col gap-2">
            <Checkbox
              id="excludeSimilar"
              label="Similar characters  (i, l, 1, L, o, 0, O)"
              checked={opts.excludeSimilar}
              onChange={() => toggle('excludeSimilar')}
            />
            <Checkbox
              id="excludeAmbiguous"
              label={'Ambiguous  ([ ] ( ) / \\ \' " ~ , ; :)'}
              checked={opts.excludeAmbiguous}
              onChange={() => toggle('excludeAmbiguous')}
            />
          </div>
        </div>
      </Card>

      {/* Generate button */}
      <Button
        variant="primary"
        size="md"
        onClick={regenerate}
        disabled={noPool}
        icon={<RefreshCw size={14} strokeWidth={2} />}
        className="w-full justify-center"
      >
        Generate New Password
      </Button>

    </div>
  )
}
