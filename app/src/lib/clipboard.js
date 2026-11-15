// Copies text to the clipboard.
// The promise resolves when the copy is done. It rejects when the browser blocks the copy.
export async function copyText(text) {
  const value = String(text ?? '')
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Continue to the fallback below.
    }
  }
  const ta = document.createElement('textarea')
  ta.value = value
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    if (!document.execCommand('copy')) throw new Error('The browser blocked the copy.')
  } finally {
    ta.remove()
  }
}
