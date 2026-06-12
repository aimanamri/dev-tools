import { useState, useMemo, useEffect, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import katex from 'katex'
import mermaid from 'mermaid'
import yaml from 'js-yaml'
import {
  Copy, Check, RotateCcw, ChevronDown, ChevronUp,
  Plus, X, Info, Download,
} from 'lucide-react'
import 'katex/dist/katex.min.css'

// ── Constants ──────────────────────────────────────────────────────────────────

const SHARING_OPTIONS = [
  'bluesky', 'email', 'facebook', 'line', 'linkedin',
  'mastodon', 'pinterest', 'reddit', 'telegram',
  'threads', 'twitter', 'whatsapp',
]

const HERO_STYLES = [
  { value: '', label: '— none —' },
  { value: 'basic', label: 'basic' },
  { value: 'big', label: 'big' },
  { value: 'background', label: 'background' },
  { value: 'thumbAndBackground', label: 'thumbAndBackground' },
]

const IMAGE_POSITIONS = [
  { value: '', label: '— none —' },
  { value: 'top', label: 'top' },
  { value: 'center', label: 'center' },
  { value: 'bottom', label: 'bottom' },
  { value: 'left', label: 'left' },
  { value: 'right', label: 'right' },
]

const DEFAULT_BODY = `## Introduction

Write your article content here. This editor supports full Markdown — headings, lists, code blocks, links, and more.

## Section One

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Add your content here.

- Item one
- Item two
- Item three

## Conclusion

Wrap up your article here.
`

// ── Markdown pipeline (mirrors MarkdownPreview) ───────────────────────────────

let _articleMarkedReady = false
function ensureMarked() {
  if (_articleMarkedReady) return
  _articleMarkedReady = true
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

let _articleMermaidReady = false
function ensureMermaid() {
  if (_articleMermaidReady) return
  _articleMermaidReady = true
  mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' })
}

let mermaidSeq = 0

function processMarkdown(src) {
  ensureMarked()
  const map = new Map()
  let n = 0
  let text = src

  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => {
    const k = `KATEXBLK${n++}END`
    map.set(k, { math: m, display: true })
    return k
  })
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
      const rendered = katex.renderToString(math, {
        displayMode: display, throwOnError: false, output: 'html',
      })
      html = html.replace(k, () => rendered)
    } catch {
      html = html.replace(k, () =>
        `<code>${display ? '$$' : '$'}${math}${display ? '$$' : '$'}</code>`
      )
    }
  }
  return html
}

function escapeHtml(str) {
  return str.replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  )
}

function triggerDownload(content, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={handleCopy} title="Copy to clipboard" style={btnStyle(copied)}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function btnStyle(active) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '4px 10px', borderRadius: '4px', border: '1px solid',
    backgroundColor: active ? 'var(--color-primary-subtle)' : 'var(--color-surface-raised)',
    borderColor: active ? 'var(--color-primary)' : 'var(--color-border-strong)',
    color: active ? 'var(--color-primary)' : 'var(--color-ink-muted)',
    fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', cursor: 'pointer',
    transition: 'all 120ms ease-out',
  }
}

function TagChips({ label, items, onChange, placeholder }) {
  const [input, setInput] = useState('')

  function add() {
    const v = input.trim()
    if (v && !items.includes(v)) onChange([...items, v])
    setInput('')
  }

  return (
    <div className="bag-field">
      <label className="bag-label">{label}</label>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
          {items.map(item => (
            <span key={item} className="bag-tag-chip">
              {item}
              <button
                className="bag-tag-remove"
                onClick={() => onChange(items.filter(i => i !== item))}
                title={`Remove ${item}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <input
          className="bag-input"
          style={{ flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); add() }
            if (e.key === ',' && input.trim()) { e.preventDefault(); add() }
          }}
          placeholder={placeholder}
        />
        <button
          onClick={add}
          disabled={!input.trim()}
          style={{
            padding: '4px 10px', border: '1px solid var(--color-border-strong)',
            borderRadius: '4px', backgroundColor: 'var(--color-surface-raised)',
            color: 'var(--color-ink-muted)', cursor: 'pointer',
            fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
            opacity: !input.trim() ? 0.45 : 1,
          }}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}

function PillToggle({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: '0.375rem' }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '3px 12px', border: '1px solid',
              borderRadius: '4px', cursor: 'pointer',
              fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
              backgroundColor: active ? 'var(--color-primary-subtle)' : 'var(--color-surface-raised)',
              borderColor: active ? 'var(--color-primary)' : 'var(--color-border-strong)',
              color: active ? 'var(--color-primary)' : 'var(--color-ink-muted)',
              transition: 'all 120ms ease-out',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BlowfishArticleGenerator() {
  // Core front matter
  const [title, setTitle] = useState('My New Article')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [draft, setDraft] = useState(true)
  const [lang, setLang] = useState('')

  // Taxonomies
  const [tags, setTags] = useState([])
  const [categories, setCategories] = useState([])

  // Body
  const [body, setBody] = useState(DEFAULT_BODY)

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [externalUrl, setExternalUrl] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [sharingLinks, setSharingLinks] = useState([])
  const [heroStyle, setHeroStyle] = useState('')
  const [imagePosition, setImagePosition] = useState('')
  const [defaultBackgroundImage, setDefaultBackgroundImage] = useState('')
  const [defaultFeaturedImage, setDefaultFeaturedImage] = useState('')
  const [defaultSocialImage, setDefaultSocialImage] = useState('')
  const [showViews, setShowViews] = useState(false)
  const [showLikes, setShowLikes] = useState(false)
  const [robots, setRobots] = useState('')

  const previewRef = useRef(null)

  // ── Computed values ──────────────────────────────────────────────────────────

  const filename = useMemo(() => {
    const slug =
      title.trim().toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-') || 'my-article'
    const langSuffix = lang.trim() ? `.${lang.trim()}` : ''
    return `${slug}${langSuffix}.md`
  }, [title, lang])

  const frontMatterYaml = useMemo(() => {
    const obj = {}
    if (title.trim()) obj.title = title.trim()
    if (description.trim()) obj.description = description.trim()
    obj.date = date
    obj.draft = draft
    if (lang.trim()) obj.language = lang.trim()
    if (tags.length > 0) obj.tags = tags
    if (categories.length > 0) obj.categories = categories
    if (externalUrl.trim()) obj.externalUrl = externalUrl.trim()
    if (editUrl.trim()) obj.editURL = editUrl.trim()
    if (sharingLinks.length > 0) obj.sharingLinks = sharingLinks
    if (heroStyle) obj.heroStyle = heroStyle
    if (imagePosition) obj.imagePosition = imagePosition
    if (defaultFeaturedImage.trim()) obj.defaultFeaturedImage = defaultFeaturedImage.trim()
    if (defaultBackgroundImage.trim()) obj.defaultBackgroundImage = defaultBackgroundImage.trim()
    if (defaultSocialImage.trim()) obj.defaultSocialImage = defaultSocialImage.trim()
    if (showViews) obj.showViews = true
    if (showLikes) obj.showLikes = true
    if (robots.trim()) obj.robots = robots.trim()
    try {
      return yaml.dump(obj, { lineWidth: -1, quotingType: '"' })
    } catch {
      return ''
    }
  }, [
    title, description, date, draft, lang, tags, categories,
    externalUrl, editUrl, sharingLinks, heroStyle, imagePosition,
    defaultBackgroundImage, defaultFeaturedImage, defaultSocialImage,
    showViews, showLikes, robots,
  ])

  const highlightedYaml = useMemo(() => {
    try {
      return hljs.highlight(frontMatterYaml, { language: 'yaml' }).value
    } catch {
      return escapeHtml(frontMatterYaml)
    }
  }, [frontMatterYaml])

  const fullOutput = useMemo(
    () => `---\n${frontMatterYaml}---\n\n${body}`,
    [frontMatterYaml, body]
  )

  const renderedHtml = useMemo(() => processMarkdown(body), [body])

  const wordCount = useMemo(
    () => body.trim().split(/\s+/).filter(Boolean).length,
    [body]
  )

  // ── Mermaid rendering ────────────────────────────────────────────────────────

  useEffect(() => {
    ensureMermaid()
    const container = previewRef.current
    if (!container) return
    const pending = container.querySelectorAll('.mermaid-pending')
    if (!pending.length) return
    pending.forEach(async (div) => {
      const code = decodeURIComponent(div.dataset.code)
      const id = `bag-mermaid-${++mermaidSeq}`
      try {
        const { svg } = await mermaid.render(id, code)
        const wrap = document.createElement('div')
        wrap.className = 'mermaid-rendered'
        wrap.innerHTML = svg
        div.parentNode?.replaceChild(wrap, div)
      } catch (err) {
        div.className = 'bag-mermaid-error'
        div.textContent = `Diagram error: ${err.message}`
      }
    })
  }, [renderedHtml])

  // ── Reset ────────────────────────────────────────────────────────────────────

  function handleReset() {
    setTitle('My New Article')
    setDescription('')
    setDate(new Date().toISOString().slice(0, 10))
    setDraft(true)
    setLang('')
    setTags([])
    setCategories([])
    setBody(DEFAULT_BODY)
    setShowAdvanced(false)
    setExternalUrl('')
    setEditUrl('')
    setSharingLinks([])
    setHeroStyle('')
    setImagePosition('')
    setDefaultBackgroundImage('')
    setDefaultFeaturedImage('')
    setDefaultSocialImage('')
    setShowViews(false)
    setShowLikes(false)
    setRobots('')
  }

  function toggleSharing(opt) {
    setSharingLinks(prev =>
      prev.includes(opt) ? prev.filter(s => s !== opt) : [...prev, opt]
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bag-workspace">
      <style>{SCOPED_CSS}</style>

      {/* ── Left: Form ──────────────────────────────────────────────────────── */}
      <div className="bag-form-pane">

        {/* Core Fields */}
        <div className="bag-section">
          <p className="bag-section-title">Front Matter</p>

          <div className="bag-field">
            <label className="bag-label">title</label>
            <input
              className="bag-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My New Article"
            />
          </div>

          <div className="bag-field">
            <label className="bag-label">description</label>
            <input
              className="bag-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A brief description shown in article cards and SEO"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
            <div className="bag-field" style={{ marginBottom: 0 }}>
              <label className="bag-label">date</label>
              <input
                className="bag-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="bag-field" style={{ marginBottom: 0 }}>
              <label className="bag-label">draft</label>
              <PillToggle
                value={draft}
                onChange={setDraft}
                options={[{ value: true, label: 'true' }, { value: false, label: 'false' }]}
              />
            </div>
          </div>
        </div>

        {/* Taxonomies & Language */}
        <div className="bag-section">
          <p className="bag-section-title">Taxonomies &amp; Language</p>
          <TagChips label="tags" items={tags} onChange={setTags} placeholder="Add tag, press Enter or comma" />
          <TagChips label="categories" items={categories} onChange={setCategories} placeholder="Add category, press Enter" />
          <div className="bag-field" style={{ marginBottom: 0 }}>
            <label className="bag-label">
              language suffix
              <span style={{ color: 'var(--color-ink-faint)', marginLeft: '0.375rem', fontWeight: 400 }}>
                (e.g. en, jp, fr — appended to filename)
              </span>
            </label>
            <input
              className="bag-input"
              value={lang}
              onChange={e => setLang(e.target.value)}
              placeholder="en"
              style={{ maxWidth: '8rem' }}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="bag-section">
          <p className="bag-section-title">Content Body</p>
          <textarea
            className="bag-textarea"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={14}
            placeholder="Write your article content in Markdown…"
            spellCheck={false}
          />
          <p style={{
            fontSize: '0.6875rem', fontFamily: 'var(--font-mono)',
            color: 'var(--color-ink-faint)', marginTop: '0.375rem',
          }}>
            {body.split('\n').length} lines · {wordCount} words · {body.length} chars
          </p>
        </div>

        {/* Advanced Settings (collapsible) */}
        <div className="bag-section">
          <button
            className="bag-advanced-btn"
            onClick={() => setShowAdvanced(s => !s)}
          >
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span>Advanced Settings</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--color-ink-faint)' }}>
              {showAdvanced ? 'collapse' : 'expand'}
            </span>
          </button>

          {showAdvanced && (
            <div style={{ marginTop: '1rem' }}>

              <div className="bag-field">
                <label className="bag-label">externalUrl</label>
                <input
                  className="bag-input"
                  value={externalUrl}
                  onChange={e => setExternalUrl(e.target.value)}
                  placeholder="https://external-article.com"
                />
              </div>

              <div className="bag-field">
                <label className="bag-label">editURL</label>
                <input
                  className="bag-input"
                  value={editUrl}
                  onChange={e => setEditUrl(e.target.value)}
                  placeholder="https://github.com/user/repo/edit/main/content/..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="bag-field">
                  <label className="bag-label">heroStyle</label>
                  <select
                    value={heroStyle}
                    onChange={e => setHeroStyle(e.target.value)}
                    className="bag-select"
                  >
                    {HERO_STYLES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="bag-field">
                  <label className="bag-label">imagePosition</label>
                  <select
                    value={imagePosition}
                    onChange={e => setImagePosition(e.target.value)}
                    className="bag-select"
                  >
                    {IMAGE_POSITIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bag-field">
                <label className="bag-label">defaultFeaturedImage</label>
                <input
                  className="bag-input"
                  value={defaultFeaturedImage}
                  onChange={e => setDefaultFeaturedImage(e.target.value)}
                  placeholder="img/featured.jpg"
                />
              </div>

              <div className="bag-field">
                <label className="bag-label">defaultBackgroundImage</label>
                <input
                  className="bag-input"
                  value={defaultBackgroundImage}
                  onChange={e => setDefaultBackgroundImage(e.target.value)}
                  placeholder="img/background.jpg"
                />
              </div>

              <div className="bag-field">
                <label className="bag-label">defaultSocialImage</label>
                <input
                  className="bag-input"
                  value={defaultSocialImage}
                  onChange={e => setDefaultSocialImage(e.target.value)}
                  placeholder="img/social.jpg"
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                {[
                  ['showViews', showViews, setShowViews],
                  ['showLikes', showLikes, setShowLikes],
                ].map(([key, val, setter]) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="bag-label">{key}</span>
                    <PillToggle
                      value={val}
                      onChange={setter}
                      options={[{ value: true, label: 'true' }, { value: false, label: 'false' }]}
                    />
                  </div>
                ))}
              </div>

              <div className="bag-field">
                <label className="bag-label">
                  robots
                  <span style={{ color: 'var(--color-ink-faint)', marginLeft: '0.375rem', fontWeight: 400 }}>
                    (e.g. index, follow)
                  </span>
                </label>
                <input
                  className="bag-input"
                  value={robots}
                  onChange={e => setRobots(e.target.value)}
                  placeholder="index, follow"
                />
              </div>

              <div className="bag-field" style={{ marginBottom: 0 }}>
                <label className="bag-label" style={{ marginBottom: '0.5rem' }}>sharingLinks</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {SHARING_OPTIONS.map(opt => {
                    const active = sharingLinks.includes(opt)
                    return (
                      <button
                        key={opt}
                        onClick={() => toggleSharing(opt)}
                        style={{
                          padding: '3px 10px', border: '1px solid',
                          borderRadius: '9999px', cursor: 'pointer',
                          fontSize: '0.6875rem', fontFamily: 'var(--font-mono)',
                          fontWeight: 500,
                          backgroundColor: active ? 'var(--color-primary-subtle)' : 'var(--color-surface-raised)',
                          borderColor: active ? 'var(--color-primary)' : 'var(--color-border-strong)',
                          color: active ? 'var(--color-primary)' : 'var(--color-ink-muted)',
                          transition: 'all 120ms ease-out',
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Reset button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleReset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '5px 12px', border: '1px solid var(--color-border-strong)',
              borderRadius: '4px', backgroundColor: 'transparent',
              color: 'var(--color-ink-muted)', cursor: 'pointer',
              fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
              transition: 'all 120ms ease-out',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
              e.currentTarget.style.color = 'var(--color-ink)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--color-ink-muted)'
            }}
          >
            <RotateCcw size={13} />
            Reset Form
          </button>
        </div>

      </div>

      {/* ── Right: Output ────────────────────────────────────────────────────── */}
      <div className="bag-output-pane">

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap',
        }}>
          <p style={{
            fontSize: '0.6875rem', fontFamily: 'var(--font-mono)',
            color: 'var(--color-ink-muted)', margin: 0,
          }}>
            Generated file:&nbsp;
            <strong style={{ color: 'var(--color-ink)' }}>{filename}</strong>
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <CopyBtn text={fullOutput} />
            <button
              onClick={() => triggerDownload(fullOutput, filename)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)'
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.color = 'var(--color-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
                e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                e.currentTarget.style.color = 'var(--color-ink-muted)'
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '4px 10px', borderRadius: '4px',
                border: '1px solid var(--color-border-strong)',
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-ink-muted)',
                fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                transition: 'all 120ms ease-out',
              }}
            >
              <Download size={13} />
              Download
            </button>
          </div>
        </div>

        {/* Generated File Block */}
        <div className="bag-file-block">
          <div className="bag-file-fm">
            <span className="bag-fm-sep">---</span>
            <pre className="bag-hljs-pre">
              <code dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(highlightedYaml),
              }} />
            </pre>
            <span className="bag-fm-sep">---</span>
          </div>
          <div className="bag-file-body">
            <pre className="bag-body-pre">{body}</pre>
          </div>
        </div>

        {/* Rendered Preview */}
        <div>
          <p className="bag-preview-label">Rendered Preview</p>
          <div
            className="bag-preview-scroll"
            ref={previewRef}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>

        {/* Guidance Alert */}
        <div className="bag-alert">
          <Info size={14} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '1px' }} />
          <div className="bag-alert-body">
            <p>
              Place generated <code>.md</code> files in your project&apos;s{' '}
              <code>content/</code> folder.
            </p>
            <p style={{ marginTop: '0.375rem' }}>
              Multilingual variants: <code>my-post.en.md</code>, <code>my-post.jp.md</code>,{' '}
              <code>my-post.fr.md</code> — Blowfish maps each language suffix to the
              corresponding locale defined in{' '}
              <code>config/_default/languages.*.toml</code>.
            </p>
          </div>
        </div>

        {/* Image Placement Docs */}
        <div className="bag-docs">
          <p className="bag-docs-heading">Image Placement</p>

          <p className="bag-docs-label">Option 1 — Page Bundle <span className="bag-docs-badge">recommended</span></p>
          <p className="bag-docs-body">
            Rename your article to <code>index.md</code> and place it inside a named folder under{' '}
            <code>content/</code>. Drop images in the same folder — Blowfish picks up{' '}
            <code>featured.*</code> and <code>background.*</code> automatically without any front matter entry.
          </p>
          <pre className="bag-tree">{`content/
└── posts/
    └── my-article/           ← article folder
        ├── index.md          ← your file (rename from my-article.md)
        ├── featured.jpg      ← auto-detected featured image
        ├── background.jpg    ← auto-detected background image
        └── gallery.png       ← any extra image`}</pre>
          <p className="bag-docs-body" style={{ marginTop: '0.5rem' }}>
            Reference extra images in your content body:{' '}
            <code>![caption](gallery.png)</code>
            <br />
            Or pin a specific image in front matter:{' '}
            <code>defaultFeaturedImage: &quot;featured.jpg&quot;</code>
          </p>

          <div className="bag-docs-divider" />

          <p className="bag-docs-label">Option 2 — Static Folder</p>
          <p className="bag-docs-body">
            For shared images used across multiple articles, place them in{' '}
            <code>static/img/</code> and use an absolute path starting with <code>/</code>.
          </p>
          <pre className="bag-tree">{`static/
└── img/
    ├── featured.jpg
    └── background.jpg`}</pre>
          <p className="bag-docs-body" style={{ marginTop: '0.5rem' }}>
            In front matter: <code>defaultFeaturedImage: &quot;/img/featured.jpg&quot;</code>
          </p>

          <div className="bag-docs-divider" />

          <p className="bag-docs-label">Auto-detected filenames (page bundle only)</p>
          <table className="bag-docs-table">
            <thead>
              <tr>
                <th>Filename pattern</th>
                <th>Used as</th>
                <th>Front matter field</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>featured.*</code></td>
                <td>Featured image &amp; thumbnail</td>
                <td><code>defaultFeaturedImage</code></td>
              </tr>
              <tr>
                <td><code>background.*</code></td>
                <td>Hero background image</td>
                <td><code>defaultBackgroundImage</code></td>
              </tr>
              <tr>
                <td><code>feature.*</code></td>
                <td>Social sharing preview</td>
                <td><code>defaultSocialImage</code></td>
              </tr>
            </tbody>
          </table>
          <p className="bag-docs-note">
            Supported formats: <code>.jpg</code>, <code>.jpeg</code>, <code>.png</code>,{' '}
            <code>.webp</code>, <code>.gif</code>. WebP is recommended for best performance.
          </p>
        </div>

      </div>
    </div>
  )
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────

const SCOPED_CSS = `
/* Layout */
.bag-workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: calc(100vh - 48px - 3.5rem);
  min-height: 560px;
  overflow: hidden;
}
.bag-form-pane {
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  border-right: 1px solid var(--color-border-strong);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.bag-output-pane {
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
@media (max-width: 900px) {
  .bag-workspace {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }
  .bag-form-pane {
    border-right: none;
    border-bottom: 1px solid var(--color-border-strong);
    overflow: visible;
  }
  .bag-output-pane { overflow: visible; }
}

/* Form sections */
.bag-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  padding: 1rem;
}
.bag-section-title {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--color-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 0.75rem;
}
.bag-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}
.bag-field:last-child { margin-bottom: 0; }
.bag-label {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--color-ink-muted);
  display: block;
}
.bag-input {
  background: var(--color-input-bg);
  border: 1px solid var(--color-border-strong);
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 0.8125rem;
  font-family: var(--font-mono);
  color: var(--color-ink);
  width: 100%;
  outline: none;
  box-sizing: border-box;
  transition: border-color 120ms ease-out;
}
.bag-input:focus { border-color: var(--color-primary); }
.bag-select {
  background: var(--color-input-bg);
  border: 1px solid var(--color-border-strong);
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 0.8125rem;
  font-family: var(--font-mono);
  color: var(--color-ink);
  width: 100%;
  outline: none;
  box-sizing: border-box;
  transition: border-color 120ms ease-out;
}
.bag-select:focus { border-color: var(--color-primary); }
.bag-textarea {
  background: var(--color-input-bg);
  border: 1px solid var(--color-border-strong);
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--color-ink);
  width: 100%;
  outline: none;
  resize: vertical;
  line-height: 1.6;
  box-sizing: border-box;
  transition: border-color 120ms ease-out;
}
.bag-textarea:focus { border-color: var(--color-primary); }
.bag-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 2px 8px 2px 10px;
  background: var(--color-primary-subtle);
  border: 1px solid var(--color-primary);
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--color-primary);
}
.bag-tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-primary);
  padding: 0;
  display: flex;
  align-items: center;
  opacity: 0.65;
}
.bag-tag-remove:hover { opacity: 1; }
.bag-advanced-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--color-ink-muted);
  width: 100%;
  text-align: left;
  transition: color 120ms ease-out;
}
.bag-advanced-btn:hover { color: var(--color-ink); }

/* Output: Generated file block */
.bag-file-block {
  background: var(--color-sidebar);
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  overflow: hidden;
}
.bag-file-fm { padding: 0.375rem 0; }
.bag-fm-sep {
  display: block;
  padding: 2px 1rem;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--color-ink-sidebar-muted);
  line-height: 1.4;
}
.bag-hljs-pre {
  margin: 0;
  padding: 0 1rem;
  overflow-x: auto;
}
.bag-hljs-pre code {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  line-height: 1.65;
}
.bag-file-body {
  border-top: 1px solid var(--color-border-sidebar);
}
.bag-body-pre {
  margin: 0;
  padding: 0.75rem 1rem;
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: oklch(0.500 0.015 45);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.65;
}

/* hljs tokens — always-on dark (sidebar bg) */
.bag-hljs-pre .hljs-attr     { color: oklch(0.660 0.125 215); }
.bag-hljs-pre .hljs-string   { color: oklch(0.640 0.120 145); }
.bag-hljs-pre .hljs-number   { color: oklch(0.680 0.155 65);  }
.bag-hljs-pre .hljs-literal  { color: oklch(0.640 0.170 28);  }
.bag-hljs-pre .hljs-comment  { color: oklch(0.440 0.015 28); font-style: italic; }
.bag-hljs-pre .hljs-keyword  { color: oklch(0.660 0.125 215); }
.bag-hljs-pre .hljs-bullet   { color: oklch(0.640 0.120 145); }
.bag-hljs-pre .hljs-variable { color: oklch(0.660 0.125 215); }
.bag-hljs-pre .hljs-meta     { color: oklch(0.680 0.155 65);  }
.bag-hljs-pre .hljs-tag      { color: oklch(0.640 0.170 28);  }

/* Output: Preview pane */
.bag-preview-label {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--color-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.5rem;
}
.bag-preview-scroll {
  border-radius: 6px;
  overflow-y: auto;
  max-height: 500px;
  background: radial-gradient(ellipse at 35% 20%, oklch(0.27 0.052 42) 0%, oklch(0.19 0.044 34) 50%, oklch(0.13 0.028 28) 100%);
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--color-border-strong);
  color: oklch(0.920 0.012 45);
}
.bag-preview-scroll p,
.bag-preview-scroll li,
.bag-preview-scroll td {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.7;
  color: oklch(0.920 0.012 45);
}
.bag-preview-scroll h1,
.bag-preview-scroll h2,
.bag-preview-scroll h3,
.bag-preview-scroll h4 {
  font-family: var(--font-sans);
  font-weight: 600;
  color: oklch(0.960 0.008 45);
  margin: 1.25em 0 0.5em;
  line-height: 1.3;
}
.bag-preview-scroll h1 { font-size: 1.375rem; }
.bag-preview-scroll h2 { font-size: 1.125rem; border-bottom: 1px solid oklch(0.32 0.018 28); padding-bottom: 0.3em; }
.bag-preview-scroll h3 { font-size: 0.9375rem; }
.bag-preview-scroll a  { color: oklch(0.700 0.120 215); text-decoration: underline; }
.bag-preview-scroll code:not(pre code) {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  background: oklch(0.30 0.028 28);
  padding: 1px 6px;
  border-radius: 3px;
  color: oklch(0.850 0.080 65);
}
.bag-preview-scroll pre {
  background: oklch(0.28 0.024 28);
  border: 1px solid oklch(0.38 0.022 28);
  border-radius: 5px;
  padding: 0.875rem 1rem;
  overflow-x: auto;
  margin: 1em 0;
}
.bag-preview-scroll pre code {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.6;
  color: oklch(0.870 0.028 45);
  background: none;
  padding: 0;
}
.bag-preview-scroll blockquote {
  border-left: 3px solid oklch(0.560 0.180 28.3);
  margin: 1em 0;
  padding: 0.5em 1em;
  background: oklch(0.22 0.038 28);
  border-radius: 0 4px 4px 0;
}
.bag-preview-scroll blockquote p { color: oklch(0.760 0.025 45); margin: 0; }
.bag-preview-scroll ul,
.bag-preview-scroll ol  { padding-left: 1.5em; margin: 0.5em 0; }
.bag-preview-scroll li  { margin: 0.2em 0; }
.bag-preview-scroll table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.8125rem; }
.bag-preview-scroll th,
.bag-preview-scroll td  { border: 1px solid oklch(0.35 0.020 28); padding: 6px 12px; text-align: left; }
.bag-preview-scroll th  { background: oklch(0.26 0.030 28); color: oklch(0.880 0.015 45); font-weight: 600; }
.bag-preview-scroll hr  { border: none; border-top: 1px solid oklch(0.32 0.018 28); margin: 1.5em 0; }
.bag-preview-scroll img { max-width: 100%; border-radius: 4px; }
.bag-preview-scroll .katex-display { text-align: center; margin: 1em 0; }
.bag-preview-scroll .mermaid-rendered svg { max-width: 100%; height: auto; }
.bag-preview-scroll .bag-mermaid-error {
  color: oklch(0.560 0.185 18);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  padding: 0.5em;
  border: 1px solid oklch(0.400 0.185 18);
  border-radius: 4px;
  background: oklch(0.20 0.040 18);
}
/* hljs tokens inside preview */
.bag-preview-scroll .hljs           { background: none; color: oklch(0.870 0.028 45); }
.bag-preview-scroll .hljs-keyword   { color: oklch(0.700 0.160 28.3); }
.bag-preview-scroll .hljs-string    { color: oklch(0.680 0.140 145); }
.bag-preview-scroll .hljs-comment   { color: oklch(0.500 0.015 45); font-style: italic; }
.bag-preview-scroll .hljs-number    { color: oklch(0.720 0.160 65); }
.bag-preview-scroll .hljs-function  { color: oklch(0.720 0.130 215); }
.bag-preview-scroll .hljs-variable  { color: oklch(0.860 0.028 45); }
.bag-preview-scroll .hljs-title     { color: oklch(0.720 0.130 215); }
.bag-preview-scroll .hljs-type      { color: oklch(0.720 0.130 215); font-style: italic; }
.bag-preview-scroll .hljs-attr      { color: oklch(0.720 0.130 215); }
.bag-preview-scroll .hljs-built_in  { color: oklch(0.700 0.160 28.3); }
.bag-preview-scroll .hljs-literal   { color: oklch(0.700 0.160 65); }

/* Output: Guidance alert */
.bag-alert {
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
}
.bag-alert-body {
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--color-ink-muted);
  line-height: 1.55;
}
.bag-alert-body p { margin: 0; }
.bag-alert-body code {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  background: oklch(0.460 0.115 215 / 0.12);
  padding: 1px 4px;
  border-radius: 3px;
  color: var(--color-accent);
}

/* Image Placement docs section */
.bag-docs {
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  padding: 1rem 1.125rem;
}
.bag-docs-heading {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--color-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 0.875rem;
}
.bag-docs-label {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--color-ink);
  margin: 0 0 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.bag-docs-badge {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 6px;
  border-radius: 9999px;
  background: var(--color-success);
  color: oklch(1.000 0.000 0);
  line-height: 1.6;
}
.bag-docs-body {
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--color-ink-muted);
  line-height: 1.6;
  margin: 0 0 0.5rem;
}
.bag-docs-body code,
.bag-docs-note code {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--color-ink);
}
.bag-tree {
  background: var(--color-sidebar);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.625rem 0.875rem;
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--color-ink-sidebar-muted);
  line-height: 1.7;
  margin: 0;
  overflow-x: auto;
  white-space: pre;
}
.bag-docs-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0.875rem 0;
}
.bag-docs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  margin: 0.375rem 0 0;
}
.bag-docs-table th {
  text-align: left;
  padding: 5px 10px;
  font-weight: 500;
  color: var(--color-ink-muted);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}
.bag-docs-table td {
  padding: 5px 10px;
  color: var(--color-ink);
  border: 1px solid var(--color-border);
  vertical-align: middle;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}
.bag-docs-table tr:nth-child(even) td {
  background: var(--color-surface-raised);
}
.bag-docs-table td code {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  border: 1px solid oklch(0.489 0.190 28.3 / 0.25);
  padding: 1px 5px;
  border-radius: 3px;
}
.bag-docs-note {
  font-size: 0.6875rem;
  font-family: var(--font-sans);
  color: var(--color-ink-faint);
  margin: 0.625rem 0 0;
  line-height: 1.5;
}
`
