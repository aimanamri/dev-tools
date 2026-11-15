// Validation for the five fields of a cron expression.

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const FIELD_META = {
  minute: { label: 'Minute',       min: 0, max: 59 },
  hour:   { label: 'Hour',         min: 0, max: 23 },
  dom:    { label: 'Day of Month', min: 1, max: 31 },
  month:  { label: 'Month',        min: 1, max: 12, names: MONTH_NAMES, nameBase: 1 },
  // Cron accepts 0 and 7 for Sunday.
  dow:    { label: 'Day of Week',  min: 0, max: 7,  names: DAY_NAMES,   nameBase: 0 },
}

// Reads one number or name. Returns NaN when the text is not valid.
function readValue(text, meta) {
  if (/^\d+$/.test(text)) return Number(text)
  if (meta.names) {
    const idx = meta.names.indexOf(text.toUpperCase())
    if (idx !== -1) return idx + meta.nameBase
  }
  return NaN
}

function checkValue(text, meta) {
  const num = readValue(text, meta)
  if (Number.isNaN(num)) {
    return text === ''
      ? 'A value is missing'
      : `"${text}" is not a valid value`
  }
  if (num < meta.min || num > meta.max) {
    return `${text} is out of range. Use a value from ${meta.min} to ${meta.max}`
  }
  return null
}

function checkRange(rangeText, meta) {
  const parts = rangeText.split('-')
  if (parts.length !== 2) return `"${rangeText}" is not a valid range. Use the format n-m`
  const err = checkValue(parts[0], meta) || checkValue(parts[1], meta)
  if (err) return err
  if (readValue(parts[0], meta) > readValue(parts[1], meta)) {
    return `The start of the range (${parts[0]}) must not be larger than the end (${parts[1]})`
  }
  return null
}

export function validateToken(token, meta) {
  if (token.includes('/')) {
    const [base, stepText, ...extra] = token.split('/')
    if (extra.length) return `"${token}" has too many "/" characters`
    if (!/^\d+$/.test(stepText) || Number(stepText) < 1) {
      return `The step "${stepText}" must be a whole number larger than 0`
    }
    if (base === '*') return null
    return base.includes('-') ? checkRange(base, meta) : checkValue(base, meta)
  }
  if (token.includes('-')) return checkRange(token, meta)
  return checkValue(token, meta)
}

export function validateField(value, key) {
  const meta = FIELD_META[key]
  if (!value || value === '*') return null
  for (const raw of value.split(',')) {
    const t = raw.trim()
    if (!t) return 'The list has an empty value. Examine the commas'
    const err = validateToken(t, meta)
    if (err) return err
  }
  return null
}

export function validateFields(fields) {
  const errors = {}
  for (const key of Object.keys(FIELD_META)) {
    const err = validateField(fields[key], key)
    if (err) errors[key] = err
  }
  return errors
}
