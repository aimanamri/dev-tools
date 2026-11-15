// Unix timestamp helpers.

// The largest time that a JavaScript Date can hold, in milliseconds.
export const MAX_EPOCH_MS = 8.64e15

const UNIT_DIVISOR = { sec: 0.001, ms: 1, 'µs': 1000, ns: 1_000_000 }

// Converts a timestamp string to milliseconds. Returns null when the value is not usable.
export function toEpochMs(value, unit) {
  const text = String(value ?? '').trim()
  // Digits only, with an optional sign and decimal part. No hex, no exponent, no Infinity.
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) return null
  const div = UNIT_DIVISOR[unit]
  if (!div) return null
  const ms = Math.floor(Number(text) / div)
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_EPOCH_MS) return null
  return ms
}

export function fromEpochMs(ms, unit) {
  switch (unit) {
    case 'sec': return Math.floor(ms / 1000)
    case 'µs':  return ms * 1000
    case 'ns':  return ms * 1_000_000
    default:    return ms
  }
}

// Builds a time from calendar fields. Returns null when a field is not a number
// or the result is out of range. Years 0 to 99 stay as written (not 1900 + year).
export function fieldsToEpochMs({ year, month, day, hour, min, sec }, utc) {
  const parts = [year, month, day, hour, min, sec]
  if (parts.some(p => !Number.isFinite(p))) return null
  const d = new Date(0)
  if (utc) {
    d.setUTCFullYear(year, month - 1, day)
    d.setUTCHours(hour, min, sec, 0)
  } else {
    d.setFullYear(year, month - 1, day)
    d.setHours(hour, min, sec, 0)
  }
  const ms = d.getTime()
  return Number.isNaN(ms) ? null : ms
}
