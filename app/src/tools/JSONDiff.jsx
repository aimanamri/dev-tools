import { useState, useMemo } from 'react'
import { diffLines } from 'diff'
import { AlertCircle, GitCompare, Copy, Check } from 'lucide-react'

// ── Styles ────────────────────────────────────────────────────────────────────

const STYLES = `
.jsd-root { display: flex; flex-direction: column; gap: 0; }

.jsd-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  border-bottom: none;
}

.jsd-pane { display: flex; flex-direction: column; overflow: hidden; min-height: 220px; }
.jsd-pane + .jsd-pane { border-left: 1px solid var(--color-border); }

.jsd-pane-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.375rem 0.75rem; background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.6875rem; font-weight: 500; color: var(--color-ink-muted);
  font-family: var(--font-sans); letter-spacing: 0.04em; text-transform: uppercase;
  flex-shrink: 0;
}

.jsd-textarea {
  flex: 1; width: 100%; resize: none; border: none; outline: none;
  padding: 0.875rem 1rem; font-family: var(--font-mono); font-size: 0.8125rem;
  line-height: 1.6; color: var(--color-ink); background: var(--color-input-bg); overflow: auto;
}
.jsd-textarea.error { box-shadow: inset 3px 0 0 var(--color-error); }

.jsd-inline-error {
  display: flex; align-items: flex-start; gap: 0.4rem;
  padding: 0.5rem 1rem; border-top: 1px solid var(--color-border);
  font-size: 0.75rem; font-family: var(--font-mono); color: var(--color-error);
  flex-shrink: 0;
}

.jsd-action-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.625rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-top: none;
  gap: 0.5rem; flex-wrap: wrap;
}
.jsd-action-bar-left, .jsd-action-bar-right { display: flex; align-items: center; gap: 0.5rem; }

.jsd-compare-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 6px 14px; border-radius: 6px; font-size: 0.8125rem; font-weight: 500;
  border: none; cursor: pointer; font-family: var(--font-sans);
  background: var(--color-primary); color: var(--color-ink-on-primary);
  transition: background 120ms ease-out;
}
.jsd-compare-btn:hover { background: var(--color-primary-hover); }
.jsd-compare-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.jsd-badge {
  font-size: 0.75rem; font-weight: 500; padding: 2px 8px; border-radius: 9999px;
  font-family: var(--font-sans);
}
.jsd-badge-add { background: oklch(0.480 0.140 145 / 0.15); color: var(--color-success); }
.jsd-badge-del { background: oklch(0.490 0.195 18 / 0.12); color: var(--color-error); }
.jsd-badge-same { background: var(--color-surface); color: var(--color-ink-muted); }

.jsd-view-toggle {
  display: flex; border: 1px solid var(--color-border); border-radius: 6px; overflow: hidden;
}
.jsd-view-btn {
  padding: 4px 10px; font-size: 0.75rem; font-weight: 500; border: none; cursor: pointer;
  font-family: var(--font-sans); transition: background 120ms ease-out;
}
.jsd-view-btn + .jsd-view-btn { border-left: 1px solid var(--color-border); }
.jsd-view-btn[data-active="true"] { background: var(--color-primary-subtle); color: var(--color-primary); }
.jsd-view-btn[data-active="false"] { background: var(--color-surface); color: var(--color-ink-muted); }
.jsd-view-btn[data-active="false"]:hover { background: var(--color-surface-raised); }

/* Diff output */
.jsd-diff-wrap {
  border: 1px solid var(--color-border-strong);
  border-top: none;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  background: var(--color-input-bg);
}

.jsd-diff-hdr {
  display: grid; grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.6875rem; font-weight: 500; color: var(--color-ink-muted);
  font-family: var(--font-sans); letter-spacing: 0.04em; text-transform: uppercase;
}
.jsd-diff-hdr span { padding: 0.375rem 0.75rem; }
.jsd-diff-hdr span + span { border-left: 1px solid var(--color-border); }

.jsd-diff-body { display: flex; overflow: auto; max-height: 480px; }

/* Side-by-side */
.jsd-side { flex: 1; overflow-x: auto; min-width: 0; }
.jsd-side + .jsd-side { border-left: 1px solid var(--color-border); }

/* Unified */
.jsd-unified { flex: 1; overflow-x: auto; }

.jsd-line {
  display: flex; align-items: flex-start; min-height: 22px;
  font-family: var(--font-mono); font-size: 0.8125rem; line-height: 1.6;
}
.jsd-line-num {
  width: 40px; min-width: 40px; padding: 0 6px 0 0; text-align: right;
  color: var(--color-ink-faint); font-size: 0.6875rem; line-height: 22px;
  user-select: none; flex-shrink: 0; background: inherit;
}
.jsd-line-sig {
  width: 16px; min-width: 16px; text-align: center; flex-shrink: 0;
  font-weight: 600; line-height: 22px;
}
.jsd-line-txt { padding: 0 1rem 0 0.25rem; white-space: pre; }

.jsd-line-add  { background: oklch(0.480 0.140 145 / 0.10); color: var(--color-ink); }
.jsd-line-del  { background: oklch(0.490 0.195 18  / 0.08); color: var(--color-ink); }
.jsd-line-same { background: transparent; color: var(--color-ink); }
.jsd-line-empty { background: var(--color-surface); }

.jsd-line-add  .jsd-line-sig { color: var(--color-success); }
.jsd-line-del  .jsd-line-sig { color: var(--color-error); }
.jsd-line-same .jsd-line-sig { color: transparent; }

/* Empty / identical */
.jsd-notice {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2.5rem 1rem; gap: 0.5rem;
  color: var(--color-ink-faint); font-size: 0.875rem; font-family: var(--font-sans);
  text-align: center;
}

@media (max-width: 768px) {
  .jsd-inputs { grid-template-columns: 1fr; }
  .jsd-pane + .jsd-pane { border-left: none; border-top: 1px solid var(--color-border); }
  .jsd-diff-hdr { grid-template-columns: 1fr; }
  .jsd-diff-hdr span + span { border-left: none; border-top: 1px solid var(--color-border); }
  .jsd-diff-body { flex-direction: column; }
  .jsd-side + .jsd-side { border-left: none; border-top: 1px solid var(--color-border); }
  .jsd-view-toggle { display: none; }
}
`

// ── Diff helpers ──────────────────────────────────────────────────────────────

function sortKeys(data) {
  if (Array.isArray(data)) return data.map(sortKeys)
  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(Object.keys(data).sort().map(k => [k, sortKeys(data[k])]))
  }
  return data
}

function normalise(src) {
  const parsed = JSON.parse(src)
  return JSON.stringify(sortKeys(parsed), null, 2)
}

// Returns [{type, value}] line array for side-by-side rendering
function buildSideBySide(changes) {
  const left = []
  const right = []

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, '').split('\n')
    if (change.removed) {
      lines.forEach(l => left.push({ type: 'del', text: l }))
    } else if (change.added) {
      lines.forEach(l => right.push({ type: 'add', text: l }))
    } else {
      const max = Math.max(left.length, right.length)
      // Pad shorter side to align
      while (left.length < max) left.push({ type: 'empty', text: '' })
      while (right.length < max) right.push({ type: 'empty', text: '' })
      lines.forEach(l => {
        left.push({ type: 'same', text: l })
        right.push({ type: 'same', text: l })
      })
    }
  }

  const max = Math.max(left.length, right.length)
  while (left.length < max) left.push({ type: 'empty', text: '' })
  while (right.length < max) right.push({ type: 'empty', text: '' })

  return { left, right }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JSONDiff() {
  const [original, setOriginal] = useState(DEFAULT_ORIGINAL)
  const [modified, setModified] = useState(DEFAULT_MODIFIED)
  const [view, setView] = useState('split') // 'split' | 'unified'
  const [triggered, setTriggered] = useState(false)
  const [copied, setCopied] = useState(false)

  const origError = useMemo(() => {
    if (!original.trim()) return null
    try { JSON.parse(original); return null }
    catch (e) { return e.message }
  }, [original])

  const modError = useMemo(() => {
    if (!modified.trim()) return null
    try { JSON.parse(modified); return null }
    catch (e) { return e.message }
  }, [modified])

  const diff = useMemo(() => {
    if (!triggered) return null
    if (origError || modError || !original.trim() || !modified.trim()) return null
    const a = normalise(original)
    const b = normalise(modified)
    const changes = diffLines(a, b)
    const adds = changes.filter(c => c.added).reduce((s, c) => s + c.count, 0)
    const dels = changes.filter(c => c.removed).reduce((s, c) => s + c.count, 0)
    const same = changes.filter(c => !c.added && !c.removed).reduce((s, c) => s + c.count, 0)
    const { left, right } = buildSideBySide(changes)

    // Unified lines
    const unified = []
    for (const change of changes) {
      const lines = change.value.replace(/\n$/, '').split('\n')
      const type = change.added ? 'add' : change.removed ? 'del' : 'same'
      lines.forEach(l => unified.push({ type, text: l }))
    }

    return { changes, left, right, unified, adds, dels, same, identical: adds === 0 && dels === 0 }
  }, [triggered, original, modified, origError, modError])

  const handleCompare = () => setTriggered(true)

  const handleCopyDiff = async () => {
    if (!diff) return
    const text = diff.unified.map(l => {
      const prefix = l.type === 'add' ? '+ ' : l.type === 'del' ? '- ' : '  '
      return prefix + l.text
    }).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canCompare = !origError && !modError && original.trim() && modified.trim()

  return (
    <div className="jsd-root">
      <style>{STYLES}</style>

      <div style={{ marginBottom: '0.875rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ink)', margin: 0, lineHeight: 1.3 }}>
          JSON Diff
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', margin: '0.25rem 0 0', fontFamily: 'var(--font-sans)' }}>
          Paste two JSON objects — keys are auto-sorted before comparison so order differences are ignored.
        </p>
      </div>

      {/* ── Inputs ── */}
      <div className="jsd-inputs">
        {/* Original */}
        <div className="jsd-pane">
          <div className="jsd-pane-hdr">
            <span>Original</span>
            {origError && <AlertCircle size={12} style={{ color: 'var(--color-error)' }} />}
          </div>
          <textarea
            className={`jsd-textarea${origError ? ' error' : ''}`}
            value={original}
            onChange={e => { setOriginal(e.target.value); setTriggered(false) }}
            spellCheck={false}
            placeholder='{"key": "value"}'
          />
          {origError && (
            <div className="jsd-inline-error">
              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{origError}</span>
            </div>
          )}
        </div>

        {/* Modified */}
        <div className="jsd-pane">
          <div className="jsd-pane-hdr">
            <span>Modified</span>
            {modError && <AlertCircle size={12} style={{ color: 'var(--color-error)' }} />}
          </div>
          <textarea
            className={`jsd-textarea${modError ? ' error' : ''}`}
            value={modified}
            onChange={e => { setModified(e.target.value); setTriggered(false) }}
            spellCheck={false}
            placeholder='{"key": "value"}'
          />
          {modError && (
            <div className="jsd-inline-error">
              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{modError}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="jsd-action-bar">
        <div className="jsd-action-bar-left">
          <button className="jsd-compare-btn" onClick={handleCompare} disabled={!canCompare}>
            <GitCompare size={14} /> Compare
          </button>
          {diff && (
            <>
              <span className="jsd-badge jsd-badge-add">+{diff.adds} added</span>
              <span className="jsd-badge jsd-badge-del">−{diff.dels} removed</span>
              <span className="jsd-badge jsd-badge-same">{diff.same} unchanged</span>
            </>
          )}
        </div>
        <div className="jsd-action-bar-right">
          {diff && !diff.identical && (
            <>
              <div className="jsd-view-toggle">
                <button className="jsd-view-btn" data-active={String(view === 'split')} onClick={() => setView('split')}>Split</button>
                <button className="jsd-view-btn" data-active={String(view === 'unified')} onClick={() => setView('unified')}>Unified</button>
              </div>
              <button
                className="jsd-compare-btn"
                style={{ background: 'var(--color-surface)', color: copied ? 'var(--color-success)' : 'var(--color-ink)', border: '1px solid var(--color-border-strong)' }}
                onClick={handleCopyDiff}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy diff'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Diff output ── */}
      {diff && (
        <div className="jsd-diff-wrap">
          {diff.identical ? (
            <div className="jsd-notice">
              <span style={{ fontSize: '1.5rem' }}>✓</span>
              <span>The two JSON objects are identical after key-sorting.</span>
            </div>
          ) : view === 'split' ? (
            <>
              <div className="jsd-diff-hdr">
                <span>Original</span>
                <span>Modified</span>
              </div>
              <div className="jsd-diff-body">
                <div className="jsd-side">
                  {diff.left.map((line, i) => (
                    <div key={i} className={`jsd-line jsd-line-${line.type}`}>
                      <span className="jsd-line-num">{line.type !== 'empty' ? i + 1 : ''}</span>
                      <span className="jsd-line-sig">{line.type === 'del' ? '−' : ''}</span>
                      <span className="jsd-line-txt">{line.text}</span>
                    </div>
                  ))}
                </div>
                <div className="jsd-side">
                  {diff.right.map((line, i) => (
                    <div key={i} className={`jsd-line jsd-line-${line.type}`}>
                      <span className="jsd-line-num">{line.type !== 'empty' ? i + 1 : ''}</span>
                      <span className="jsd-line-sig">{line.type === 'add' ? '+' : ''}</span>
                      <span className="jsd-line-txt">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="jsd-diff-hdr" style={{ gridTemplateColumns: '1fr' }}>
                <span>Unified diff</span>
              </div>
              <div className="jsd-diff-body">
                <div className="jsd-unified">
                  {diff.unified.map((line, i) => (
                    <div key={i} className={`jsd-line jsd-line-${line.type}`}>
                      <span className="jsd-line-num">{i + 1}</span>
                      <span className="jsd-line-sig">
                        {line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}
                      </span>
                      <span className="jsd-line-txt">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!diff && (
        <div className="jsd-diff-wrap" style={{ borderTop: '1px solid var(--color-border)', borderRadius: '0 0 8px 8px' }}>
          <div className="jsd-notice">
            <GitCompare size={24} style={{ opacity: 0.3 }} />
            <span>Paste JSON in both panes, then click <strong>Compare</strong>.</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Default content ───────────────────────────────────────────────────────────

const DEFAULT_ORIGINAL = `{
  "id": 1,
  "name": "Alice",
  "role": "Engineer",
  "active": true,
  "settings": {
    "theme": "light",
    "notifications": true,
    "language": "en"
  },
  "tags": ["frontend", "react"]
}`

const DEFAULT_MODIFIED = `{
  "id": 1,
  "name": "Alice",
  "role": "Senior Engineer",
  "active": true,
  "settings": {
    "theme": "dark",
    "notifications": false,
    "language": "en",
    "timezone": "Europe/Oslo"
  },
  "tags": ["frontend", "react", "typescript"]
}`
