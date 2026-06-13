import { useState, useEffect, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import katex from 'katex'
import mermaid from 'mermaid'
import { Upload, Download, Copy, Check, Eye, FileText, Columns, ShieldCheck } from 'lucide-react'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

// ── Module-level setup ──────────────────────────────────────────────────────

let _markedReady = false
function ensureMarked() {
  if (_markedReady) return
  _markedReady = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('target')) {
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
  marked.use({
    gfm: true,
    breaks: false,
    renderer: {
      code({ text, lang }) {
        if (lang === 'mermaid') {
          return `<div class="mermaid-pending" data-code="${encodeURIComponent(text)}"></div>`
        }
        try {
          const result =
            lang && hljs.getLanguage(lang)
              ? hljs.highlight(text, { language: lang }).value
              : hljs.highlightAuto(text).value
          return `<pre><code class="hljs language-${lang || ''}">${result}</code></pre>`
        } catch {
          return `<pre><code>${text.replace(/[&<>"]/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
          )}</code></pre>`
        }
      },
    },
  })
}

let _mermaidReady = false
function ensureMermaid() {
  if (_mermaidReady) return
  _mermaidReady = true
  mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' })
}

let mermaidSeq = 0

// ── Markdown → HTML pipeline ─────────────────────────────────────────────────

function processMarkdown(src) {
  ensureMarked()
  const map = new Map()
  let n = 0
  let text = src

  // Block math first
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => {
    const k = `KATEXBLK${n++}END`
    map.set(k, { math: m, display: true })
    return k
  })
  // Inline math
  text = text.replace(/\$([^$\n]{1,500}?)\$/g, (_, m) => {
    const k = `KATEXINL${n++}END`
    map.set(k, { math: m, display: false })
    return k
  })

  let html = marked.parse(text)

  html = DOMPurify.sanitize(html, {
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['class', 'target'],
    FORCE_BODY: true,
  })

  for (const [k, { math, display }] of map) {
    try {
      const rendered = katex.renderToString(math, { displayMode: display, throwOnError: false, output: 'html' })
      html = html.replace(k, () => rendered)
    } catch {
      html = html.replace(k, () => `<code>${display ? '$$' : '$'}${math}${display ? '$$' : '$'}</code>`)
    }
  }

  return html
}

function triggerDownload(content, filename, mime) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Default content ───────────────────────────────────────────────────────────

const DEFAULT_MD = `# Markdown Live Preview

Start typing — the preview updates as you write.

## What's supported

- **GFM** tables, task lists, strikethrough
- \`code\` blocks with syntax highlighting
- LaTeX math via KaTeX
- Mermaid diagrams
- Import / export as \`.md\` or \`.html\`

---

## Code Highlighting

\`\`\`javascript
const greet = (name) => \`Hello, \${name}!\`
console.log(greet('World'))  // Hello, World!
\`\`\`

\`\`\`python
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
\`\`\`

---

## Math (KaTeX)

**Inline**: Newton's second law $F = ma$, kinetic energy $K = \\frac{1}{2}mv^2$, and the de Broglie wavelength $\\lambda = \\frac{h}{p}$.

**Kinematics:**

$$
x(t) = x_0 + v_0 t + \\frac{1}{2}at^2
$$

**Schrödinger Equation:**

$$
i\\hbar\\frac{\\partial}{\\partial t}\\Psi = -\\frac{\\hbar^2}{2m}\\nabla^2\\Psi + V\\Psi
$$

**Combustion of Hydrogen:**

$$
2\\text{H}_2 + \\text{O}_2 \\longrightarrow 2\\text{H}_2\\text{O}
$$

**Combustion of Methane:**

$$
\\text{CH}_4 + 2\\text{O}_2 \\longrightarrow \\text{CO}_2 + 2\\text{H}_2\\text{O}
$$

---

## Mermaid Diagram

\`\`\`mermaid
graph TD
    A[User Request] --> B{Validate Input}
    B -->|Valid| C[Process]
    B -->|Invalid| D[Return Error]
    C --> E[Return Result]
\`\`\`

---

## Table

| Feature       | Status | Notes          |
|---------------|--------|----------------|
| GFM Tables    | ✓      | Full support   |
| Task Lists    | ✓      | See below      |
| KaTeX Math    | ✓      | Inline & block |
| Mermaid       | ✓      | Live render    |
| Export        | ✓      | .md and .html  |

## Task List

- [x] GFM parsing
- [x] Syntax highlighting
- [x] Math rendering
- [x] Diagrams
- [ ] Real-time collaboration *(future)*

> **Tip:** Use the toolbar to import a local \`.md\` file or export your work.
`

// ── Scoped styles ─────────────────────────────────────────────────────────────

const STYLES = `
.mdt-root { display: flex; flex-direction: column; }
.mdt-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);
  margin-bottom: 0.75rem; flex-shrink: 0; gap: 0.5rem; flex-wrap: wrap;
}
.mdt-bar-left, .mdt-bar-right { display: flex; align-items: center; gap: 0.375rem; }

.mdt-btn {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 5px 10px; border-radius: 6px; font-size: 0.8125rem; font-weight: 500;
  border: 1px solid var(--color-border-strong); background: var(--color-surface);
  color: var(--color-ink); cursor: pointer; font-family: var(--font-sans);
  white-space: nowrap; transition: background 120ms ease-out, transform 150ms ease-out;
}
.mdt-btn:hover { background: var(--color-surface-raised); }
.mdt-btn:not(:disabled):active { transform: scale(0.97); }
.mdt-btn-primary { background: var(--color-primary); color: var(--color-ink-on-primary); border-color: var(--color-primary); }
.mdt-btn-primary:hover { background: var(--color-primary-hover); }

.mdt-toggle { display: flex; border: 1px solid var(--color-border); border-radius: 6px; overflow: hidden; }
.mdt-toggle-btn {
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 5px 10px; font-size: 0.75rem; font-weight: 500; border: none; cursor: pointer;
  font-family: var(--font-sans); white-space: nowrap;
  transition: background 120ms ease-out, transform 150ms ease-out;
}
.mdt-toggle-btn:not(:disabled):active { transform: scale(0.95); }
.mdt-toggle-btn + .mdt-toggle-btn { border-left: 1px solid var(--color-border); }
.mdt-toggle-btn[data-active="true"] { background: var(--color-primary-subtle); color: var(--color-primary); }
.mdt-toggle-btn[data-active="false"] { background: var(--color-bg); color: var(--color-ink-muted); }
.mdt-toggle-btn[data-active="false"]:hover { background: var(--color-surface); }

.mdt-workspace {
  display: grid; grid-template-columns: 1fr 1px 1fr;
  border: 1px solid var(--color-border-strong); border-radius: 8px; overflow: hidden;
  height: calc(100vh - 210px); min-height: 400px;
}
.mdt-workspace.editor-only { grid-template-columns: 1fr; }
.mdt-workspace.preview-only { grid-template-columns: 1fr; }
.mdt-divider { background: var(--color-border); }

.mdt-pane { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.mdt-pane-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.375rem 0.75rem; background: var(--color-surface);
  border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  font-size: 0.6875rem; font-weight: 500; color: var(--color-ink-muted);
  font-family: var(--font-sans); letter-spacing: 0.04em; text-transform: uppercase;
}
.mdt-pane-header span:last-child { font-weight: 400; letter-spacing: 0; text-transform: none; font-family: var(--font-mono); }

.mdt-editor {
  flex: 1; width: 100%; resize: none; border: none; outline: none;
  padding: 1rem; font-family: var(--font-mono); font-size: 0.8125rem;
  line-height: 1.65; color: var(--color-ink); background: var(--color-input-bg); overflow-y: auto;
}
.mdt-preview-scroll { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; background: radial-gradient(ellipse at 35% 20%, oklch(0.255 0.050 258) 0%, oklch(0.185 0.042 256) 50%, oklch(0.135 0.030 252) 100%); }

/* Prose */
.md-prose { max-width: 100%; }
.md-prose h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.75rem; color: var(--color-ink); line-height: 1.25; letter-spacing: -0.02em; }
.md-prose h2 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: var(--color-ink); border-bottom: 1px solid var(--color-border); padding-bottom: 0.25rem; }
.md-prose h3 { font-size: 1.125rem; font-weight: 600; margin: 1.25rem 0 0.375rem; color: var(--color-ink); }
.md-prose h4 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.25rem; color: var(--color-ink); }
.md-prose h5, .md-prose h6 { font-size: 0.875rem; font-weight: 600; margin: 0.75rem 0 0.25rem; color: var(--color-ink-muted); }
.md-prose p { margin: 0 0 0.75rem; color: var(--color-ink); line-height: 1.6; font-size: 0.9375rem; }
.md-prose p:last-child { margin-bottom: 0; }
.md-prose a { color: var(--color-accent); text-decoration: underline; }
.md-prose a:hover { color: var(--color-primary); }
.md-prose strong { font-weight: 600; }
.md-prose em { font-style: italic; }
.md-prose del { text-decoration: line-through; color: var(--color-ink-muted); }
.md-prose code:not(pre code) {
  font-family: var(--font-mono); font-size: 0.8125rem;
  background: var(--color-surface-raised); border: 1px solid var(--color-border-strong);
  padding: 1px 5px; border-radius: 3px; color: var(--color-ink);
}
.md-prose pre {
  background: var(--color-surface-raised); border: 1px solid var(--color-border-strong);
  border-radius: 6px; padding: 0.875rem 1rem; overflow-x: auto; margin: 0 0 0.875rem;
}
.md-prose pre code { font-family: var(--font-mono); font-size: 0.8125rem; line-height: 1.5; background: none; border: none; padding: 0; color: inherit; }
.md-prose blockquote { border-left: 3px solid var(--color-border-strong); margin: 0 0 0.875rem; padding: 0.375rem 0 0.375rem 1rem; }
.md-prose blockquote p { color: var(--color-ink-muted); margin-bottom: 0; }
.md-prose ul, .md-prose ol { padding-left: 1.5rem; margin: 0 0 0.875rem; }
.md-prose li { margin-bottom: 0.2rem; color: var(--color-ink); line-height: 1.6; font-size: 0.9375rem; }
.md-prose li input[type="checkbox"] { margin-right: 0.4rem; accent-color: var(--color-primary); }
.md-prose hr { border: none; border-top: 1px solid var(--color-border); margin: 1.25rem 0; }
.md-prose table { width: 100%; border-collapse: collapse; margin: 0 0 0.875rem; font-size: 0.875rem; }
.md-prose th { background: var(--color-surface); font-weight: 600; text-align: left; padding: 0.4rem 0.75rem; border: 1px solid var(--color-border); color: var(--color-ink); }
.md-prose td { padding: 0.375rem 0.75rem; border: 1px solid var(--color-border); color: var(--color-ink); }
.md-prose tr:nth-child(even) td { background: var(--color-surface); }
.md-prose img { max-width: 100%; border-radius: 4px; }

/* KaTeX */
.md-prose .katex-display { margin: 1rem 0; overflow-x: auto; text-align: center; }
.md-prose .katex { font-size: 1.05em; }

/* Mermaid */
.md-prose .mermaid-rendered { display: flex; justify-content: center; padding: 1rem; background: var(--color-surface-raised); border-radius: 6px; border: 1px solid var(--color-border-strong); margin: 0 0 0.875rem; }
.md-prose .mermaid-rendered svg { max-width: 100%; height: auto; }
.md-prose .mermaid-pending { background: var(--color-surface); border-radius: 6px; border: 1px solid var(--color-border); padding: 1rem; margin: 0 0 0.875rem; min-height: 64px; display: flex; align-items: center; justify-content: center; color: var(--color-ink-faint); font-size: 0.75rem; font-family: var(--font-mono); }
.md-prose .mermaid-pending::before { content: 'Rendering diagram…'; }
.md-prose .mermaid-error { background: var(--color-surface); border: 1px solid var(--color-border); border-left: 3px solid var(--color-error); border-radius: 6px; padding: 0.75rem 1rem; margin: 0 0 0.875rem; font-size: 0.75rem; font-family: var(--font-mono); color: var(--color-error); }

/* Coffee preview — always-on warm brown palette */
.mdt-preview-scroll .md-prose h1,
.mdt-preview-scroll .md-prose h2,
.mdt-preview-scroll .md-prose h3,
.mdt-preview-scroll .md-prose h4 { color: oklch(0.945 0.014 250); }
.mdt-preview-scroll .md-prose h2 { border-bottom-color: oklch(0.300 0.040 255); }
.mdt-preview-scroll .md-prose h5,
.mdt-preview-scroll .md-prose h6 { color: oklch(0.680 0.030 250); }
.mdt-preview-scroll .md-prose p { color: oklch(0.910 0.014 250); }
.mdt-preview-scroll .md-prose li { color: oklch(0.910 0.014 250); }
.mdt-preview-scroll .md-prose a { color: oklch(0.770 0.110 235); }
.mdt-preview-scroll .md-prose del { color: oklch(0.680 0.030 250); }
.mdt-preview-scroll .md-prose blockquote { border-left-color: oklch(0.440 0.070 255); }
.mdt-preview-scroll .md-prose blockquote p { color: oklch(0.680 0.030 250); }
.mdt-preview-scroll .md-prose hr { border-top-color: oklch(0.300 0.040 255); }
.mdt-preview-scroll .md-prose code:not(pre code) { background: oklch(0.235 0.045 255); border-color: oklch(0.300 0.040 255); color: oklch(0.910 0.014 250); }
.mdt-preview-scroll .md-prose pre { background: oklch(0.165 0.040 255); border-color: oklch(0.320 0.050 258); }
.mdt-preview-scroll .md-prose pre .hljs { background: transparent; }
.mdt-preview-scroll .md-prose th { background: oklch(0.165 0.040 255); border-color: oklch(0.300 0.040 255); color: oklch(0.910 0.014 250); }
.mdt-preview-scroll .md-prose td { border-color: oklch(0.300 0.040 255); color: oklch(0.910 0.014 250); }
.mdt-preview-scroll .md-prose tr:nth-child(even) td { background: oklch(0.175 0.036 252); }
.mdt-preview-scroll .md-prose .mermaid-rendered { background: oklch(0.165 0.040 255); border-color: oklch(0.320 0.050 258); }
.mdt-preview-scroll .md-prose .mermaid-rendered svg text,
.mdt-preview-scroll .md-prose .mermaid-rendered svg tspan { fill: oklch(0.910 0.014 250) !important; }
.mdt-preview-scroll .md-prose .mermaid-rendered .nodeLabel,
.mdt-preview-scroll .md-prose .mermaid-rendered foreignObject div,
.mdt-preview-scroll .md-prose .mermaid-rendered foreignObject span { color: oklch(0.910 0.014 250) !important; }
.mdt-preview-scroll .md-prose .mermaid-pending { background: oklch(0.165 0.040 255); border-color: oklch(0.300 0.040 255); color: oklch(0.460 0.028 250); }
.mdt-preview-scroll .md-prose .mermaid-error { background: oklch(0.165 0.040 255); border-color: oklch(0.300 0.040 255); }
/* hljs syntax — always dark in preview pane */
.mdt-preview-scroll .md-prose .hljs { color: oklch(0.910 0.014 250); }
.mdt-preview-scroll .md-prose .hljs-keyword,
.mdt-preview-scroll .md-prose .hljs-selector-tag { color: #c792ea; }
.mdt-preview-scroll .md-prose .hljs-string { color: #c3e88d; }
.mdt-preview-scroll .md-prose .hljs-comment { color: #546e7a; font-style: italic; }
.mdt-preview-scroll .md-prose .hljs-number { color: #f78c6c; }
.mdt-preview-scroll .md-prose .hljs-function,
.mdt-preview-scroll .md-prose .hljs-title { color: #82aaff; }
.mdt-preview-scroll .md-prose .hljs-built_in { color: #89ddff; }
.mdt-preview-scroll .md-prose .hljs-literal { color: #ff5370; }
.mdt-preview-scroll .md-prose .hljs-variable { color: #f07178; }
.mdt-preview-scroll .md-prose .hljs-type,
.mdt-preview-scroll .md-prose .hljs-class { color: #ffcb6b; }
.mdt-preview-scroll .md-prose .hljs-attr,
.mdt-preview-scroll .md-prose .hljs-attribute { color: #c3e88d; }
.mdt-preview-scroll .md-prose .hljs-meta { color: #89ddff; }
.mdt-preview-scroll .md-prose .hljs-tag { color: #f07178; }
.mdt-preview-scroll .md-prose .hljs-name { color: #82aaff; }

/* Responsive */
@media (max-width: 768px) {
  .mdt-workspace { grid-template-columns: 1fr !important; height: auto; min-height: 0; }
  .mdt-divider { display: none; }
  .mdt-pane { min-height: 320px; }
}
`

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarkdownPreview() {
  const [source, setSource] = useState(DEFAULT_MD)
  const [rendered, setRendered] = useState('')
  const [view, setView] = useState('split')
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({ words: 0, lines: 0, chars: 0 })
  const previewRef = useRef(null)
  const fileRef = useRef(null)

  // Debounced markdown processing
  useEffect(() => {
    const id = setTimeout(() => {
      setRendered(processMarkdown(source))
      const lines = source.split('\n').length
      const words = source.trim() ? source.trim().split(/\s+/).length : 0
      setStats({ words, lines, chars: source.length })
    }, 150)
    return () => clearTimeout(id)
  }, [source])

  // Mermaid post-render
  useEffect(() => {
    const root = previewRef.current
    if (!root) return
    const pending = root.querySelectorAll('.mermaid-pending')
    if (!pending.length) return

    ensureMermaid()
    pending.forEach(async (el) => {
      const code = decodeURIComponent(el.dataset.code || '')
      if (!code) return
      const id = `mermaid-${++mermaidSeq}`
      try {
        const { svg } = await mermaid.render(id, code)
        if (!root.contains(el)) return
        const wrap = document.createElement('div')
        wrap.className = 'mermaid-rendered'
        // mermaid securityLevel:'strict' already HTML-escapes all user labels;
        // DOMPurify strips xmlns on the <div> inside <foreignObject>, which
        // prevents the browser from rendering label text as HTML — so we skip it.
        wrap.innerHTML = svg
        el.replaceWith(wrap)
      } catch (err) {
        if (!root.contains(el)) return
        el.textContent = err.message
        el.classList.remove('mermaid-pending')
        el.classList.add('mermaid-error')
      }
    })
  }, [rendered])

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setSource(ev.target.result || '')
    reader.readAsText(file)
    e.target.value = ''
  }

  const exportMd = () => triggerDownload(source, 'document.md', 'text/markdown')

  const exportHtml = () => {
    const safeInner = DOMPurify.sanitize(previewRef.current?.innerHTML ?? rendered, {
      USE_PROFILES: { html: true, svg: true, svgFilters: true },
      FORBID_TAGS: ['script'],
      FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onbegin'],
      ADD_ATTR: ['class'],
    })
    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Exported Document</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css" integrity="sha384-vlBdW0r3AcZO/HboRPznQNowvexd3fY8qHOWkBi5q7KGgqJ+F48+DceybYmrVbmB" crossorigin="anonymous">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github.css" integrity="sha384-Uhn9VRzdRxBVYRT2aPFl8ECva7znqyZwWiqpE3v4GTBe8y2XrpwTWZtU1U5vujcN" crossorigin="anonymous">
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1.5rem;color:#1a1a1a;line-height:1.6}
  h1,h2,h3,h4,h5,h6{font-weight:600;margin-top:1.5rem;margin-bottom:.5rem}
  h1{font-size:1.75rem;margin-top:0}h2{font-size:1.375rem;border-bottom:1px solid #e5e5e5;padding-bottom:.25rem}
  p{margin:0 0 .875rem}a{color:#3b6fa8}
  code{font-family:'JetBrains Mono',monospace;font-size:.8125rem;background:#f5f5f5;padding:1px 5px;border-radius:3px}
  pre{background:#f5f5f5;padding:1rem;border-radius:6px;overflow-x:auto;margin:0 0 .875rem}
  pre code{background:none;padding:0}
  blockquote{border-left:3px solid #ccc;margin:0 0 .875rem;padding-left:1rem;color:#666}
  table{border-collapse:collapse;width:100%;margin:0 0 .875rem}
  th,td{border:1px solid #ddd;padding:.375rem .75rem;text-align:left}
  th{background:#f5f5f5;font-weight:600}
  tr:nth-child(even) td{background:#fafafa}
  hr{border:none;border-top:1px solid #e5e5e5;margin:1.5rem 0}
  img{max-width:100%;border-radius:4px}
</style>
</head>
<body>
${safeInner}
</body>
</html>`
    triggerDownload(doc, 'document.html', 'text/html')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(source)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const VIEWS = [
    { id: 'editor',  icon: <FileText size={13} />, label: 'Editor' },
    { id: 'split',   icon: <Columns size={13} />,  label: 'Split' },
    { id: 'preview', icon: <Eye size={13} />,       label: 'Preview' },
  ]

  const gridClass = view === 'editor' ? 'editor-only' : view === 'preview' ? 'preview-only' : ''

  return (
    <div className="mdt-root">
      <style>{STYLES}</style>

      {/* ── Toolbar ── */}
      <div className="mdt-bar">
        <div className="mdt-bar-left">
          <button className="mdt-btn" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> Import .md
          </button>
          <button className="mdt-btn" onClick={exportMd}>
            <Download size={13} /> Save .md
          </button>
          <button className="mdt-btn" onClick={exportHtml}>
            <Download size={13} /> Save .html
          </button>
        </div>

        <div className="mdt-bar-right">
          <button className="mdt-btn" onClick={handleCopy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Source'}
          </button>
          <div className="mdt-toggle">
            {VIEWS.map(({ id, icon, label }) => (
              <button
                key={id}
                className="mdt-toggle-btn"
                data-active={String(view === id)}
                onClick={() => setView(id)}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Workspace ── */}
      <div className={`mdt-workspace ${gridClass}`}>
        {/* Editor pane */}
        {view !== 'preview' && (
          <div className="mdt-pane">
            <div className="mdt-pane-header">
              <span>Markdown</span>
              <span>{stats.lines}L · {stats.words}W · {stats.chars}C</span>
            </div>
            <textarea
              className="mdt-editor"
              value={source}
              onChange={e => setSource(e.target.value)}
              spellCheck={false}
              placeholder="Type markdown here…"
            />
          </div>
        )}

        {view === 'split' && <div className="mdt-divider" />}

        {/* Preview pane */}
        {view !== 'editor' && (
          <div className="mdt-pane">
            <div className="mdt-pane-header">
              <span>Preview</span>
            </div>
            <div className="mdt-preview-scroll">
              <div
                ref={previewRef}
                className="md-prose"
                dangerouslySetInnerHTML={{ __html: rendered }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Privacy */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'color-mix(in oklch, var(--color-success) 10%, var(--color-surface))', border: '1px solid var(--color-success)', marginTop: 16 }}>
        <ShieldCheck size={16} strokeWidth={1.5} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.55 }}>
          Markdown is rendered entirely in your browser. Your content never leaves your device or touches any server.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".md,.markdown,.txt"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
    </div>
  )
}
