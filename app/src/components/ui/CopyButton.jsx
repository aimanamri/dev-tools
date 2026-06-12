import { useState, useRef, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import Button from './Button'

export default function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const t = useRef(null)
  useEffect(() => () => clearTimeout(t.current), [])
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
      size="sm"
      variant="secondary"
      onClick={handle}
      disabled={!text}
      icon={copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
      style={copied ? { color: 'var(--color-success)', borderColor: 'oklch(0.480 0.140 145 / 0.4)' } : {}}
    >
      {copied ? 'Copied' : label}
    </Button>
  )
}
