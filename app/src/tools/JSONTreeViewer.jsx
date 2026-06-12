import { useState, useMemo, useCallback } from 'react'
import { ChevronRight, ChevronDown, AlertCircle, Copy, Check, Minus, Plus } from 'lucide-react'

// ── Styles ────────────────────────────────────────────────────────────────────

const STYLES = `
.jtv-root { display: flex; flex-direction: column; gap: 0; }

.jtv-workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: "in-hdr tree-hdr" "in-body tree-body";
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  overflow: hidden;
  min-height: 520px;
}

.jtv-in-hdr   { grid-area: in-hdr;   border-right: 1px solid var(--color-border); }
.jtv-tree-hdr { grid-area: tree-hdr; }
.jtv-in-body  { grid-area: in-body;  display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--color-border); }
.jtv-tree-body { grid-area: tree-body; overflow: auto; background: var(--color-input-bg); }

.jtv-pane-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.375rem 0.75rem; background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.6875rem; font-weight: 500; color: var(--color-ink-muted);
  font-family: var(--font-sans); letter-spacing: 0.04em; text-transform: uppercase;
}

.jtv-textarea {
  flex: 1; width: 100%; resize: none; border: none; outline: none;
  padding: 0.875rem 1rem; font-family: var(--font-mono); font-size: 0.8125rem;
  line-height: 1.6; color: var(--color-ink); background: var(--color-input-bg); overflow: auto;
}
.jtv-textarea.error { box-shadow: inset 3px 0 0 var(--color-error); }

.jtv-error {
  display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 0.625rem 1rem; border-top: 1px solid var(--color-border);
  font-size: 0.75rem; font-family: var(--font-mono); color: var(--color-error);
  flex-shrink: 0; background: var(--color-surface);
}

.jtv-tree-inner { padding: 0.75rem 0.5rem; }

/* Node rows */
.jtv-row { display: flex; align-items: flex-start; min-height: 22px; }
.jtv-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 22px; flex-shrink: 0; cursor: pointer;
  color: var(--color-ink-muted); border: none; background: none; padding: 0;
  border-radius: 3px; transition: background 120ms ease-out;
}
.jtv-toggle:hover { background: var(--color-surface); color: var(--color-ink); }
.jtv-indent { display: inline-block; width: 18px; flex-shrink: 0; }

.jtv-key {
  font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 500;
  color: var(--color-ink); flex-shrink: 0;
}
.jtv-colon { color: var(--color-ink-muted); margin: 0 0.3rem; font-family: var(--font-mono); font-size: 0.8125rem; }
.jtv-bracket { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--color-ink-muted); }
.jtv-meta { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-ink-faint); margin-left: 0.3rem; }

/* Value colours */
.jtv-val-string  { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--color-accent); }
.jtv-val-number  { font-family: var(--font-mono); font-size: 0.8125rem; color: oklch(0.540 0.160 65); }
.jtv-val-bool    { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--color-success); }
.jtv-val-null    { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--color-ink-faint); }

html.dark .jtv-val-number { color: oklch(0.700 0.160 65); }

/* Toolbar buttons */
.jtv-btn-sm {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500;
  border: 1px solid var(--color-border-strong); background: var(--color-surface);
  color: var(--color-ink-muted); cursor: pointer; font-family: var(--font-sans);
  transition: background 120ms ease-out;
}
.jtv-btn-sm:hover { background: var(--color-surface); color: var(--color-ink); }
.jtv-btn-sm[data-ok="true"] { color: var(--color-success); border-color: var(--color-success); }

.jtv-hdr-actions { display: flex; align-items: center; gap: 0.375rem; }

/* Empty state */
.jtv-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; min-height: 200px; gap: 0.5rem;
  color: var(--color-ink-faint); font-size: 0.8125rem; font-family: var(--font-sans);
}

@media (max-width: 768px) {
  .jtv-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto 1fr;
    grid-template-areas: "in-hdr" "in-body" "tree-hdr" "tree-body";
  }
  .jtv-in-hdr  { border-right: none; }
  .jtv-in-body { border-right: none; border-bottom: 1px solid var(--color-border); min-height: 200px; }
}
`

// ── Tree node ─────────────────────────────────────────────────────────────────

function TreeNode({ nodeKey, value, depth, expandedPaths, togglePath, path }) {
  const isExpanded = expandedPaths.has(path)
  const type = value === null ? 'null' : typeof value
  const isObject = type === 'object' && value !== null && !Array.isArray(value)
  const isArray = Array.isArray(value)
  const isCollapsible = isObject || isArray

  const indent = depth * 18

  if (isCollapsible) {
    const entries = isArray
      ? value.map((v, i) => [String(i), v])
      : Object.entries(value)
    const count = entries.length
    const bracket = isArray ? ['[', ']'] : ['{', '}']

    return (
      <div>
        <div className="jtv-row" style={{ paddingLeft: indent }}>
          <button className="jtv-toggle" onClick={() => togglePath(path)}>
            {isExpanded
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />}
          </button>
          {nodeKey !== null && (
            <>
              <span className="jtv-key">{JSON.stringify(nodeKey)}</span>
              <span className="jtv-colon">:</span>
            </>
          )}
          <span className="jtv-bracket">{bracket[0]}</span>
          {!isExpanded && (
            <>
              <span className="jtv-meta">{count} {count === 1 ? 'item' : 'items'}</span>
              <span className="jtv-bracket">{bracket[1]}</span>
            </>
          )}
        </div>

        {isExpanded && (
          <>
            {entries.map(([k, v]) => (
              <TreeNode
                key={k}
                nodeKey={isArray ? null : k}
                value={v}
                depth={depth + 1}
                expandedPaths={expandedPaths}
                togglePath={togglePath}
                path={`${path}.${k}`}
              />
            ))}
            <div className="jtv-row" style={{ paddingLeft: indent + 18 }}>
              <span className="jtv-bracket">{bracket[1]}</span>
            </div>
          </>
        )}
      </div>
    )
  }

  // Primitive
  let valueEl
  if (type === 'string') {
    valueEl = <span className="jtv-val-string">{JSON.stringify(value)}</span>
  } else if (type === 'number') {
    valueEl = <span className="jtv-val-number">{value}</span>
  } else if (type === 'boolean') {
    valueEl = <span className="jtv-val-bool">{String(value)}</span>
  } else {
    valueEl = <span className="jtv-val-null">null</span>
  }

  return (
    <div className="jtv-row" style={{ paddingLeft: indent + 18 }}>
      <span className="jtv-indent" />
      {nodeKey !== null && (
        <>
          <span className="jtv-key">{JSON.stringify(nodeKey)}</span>
          <span className="jtv-colon">:</span>
        </>
      )}
      {valueEl}
    </div>
  )
}

// Collect all expandable paths in a parsed value
function collectPaths(value, path = 'root', acc = new Set()) {
  if (Array.isArray(value)) {
    acc.add(path)
    value.forEach((v, i) => collectPaths(v, `${path}.${i}`, acc))
  } else if (value !== null && typeof value === 'object') {
    acc.add(path)
    Object.entries(value).forEach(([k, v]) => collectPaths(v, `${path}.${k}`, acc))
  }
  return acc
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JSONTreeViewer() {
  const [source, setSource] = useState(DEFAULT_JSON)
  const [expandedPaths, setExpandedPaths] = useState(null) // null = uninitialized
  const [copied, setCopied] = useState(false)

  const { parsed, error } = useMemo(() => {
    if (!source.trim()) return { parsed: undefined, error: null }
    try {
      return { parsed: JSON.parse(source), error: null }
    } catch (e) {
      return { parsed: undefined, error: e.message }
    }
  }, [source])

  // Auto-expand 2 levels on first valid parse
  const effectivePaths = useMemo(() => {
    if (parsed === undefined) return new Set()
    if (expandedPaths !== null) return expandedPaths
    // Default: expand depth 0 and 1
    const all = collectPaths(parsed)
    const shallow = new Set()
    for (const p of all) {
      const depth = p.split('.').length - 1
      if (depth <= 1) shallow.add(p)
    }
    return shallow
  }, [parsed, expandedPaths])

  const togglePath = useCallback((path) => {
    setExpandedPaths(prev => {
      const base = prev ?? effectivePaths
      const next = new Set(base)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [effectivePaths])

  const expandAll = () => {
    if (parsed !== undefined) setExpandedPaths(collectPaths(parsed))
  }

  const collapseAll = () => setExpandedPaths(new Set())

  const handleCopy = async () => {
    if (!source.trim() || error) return
    await navigator.clipboard.writeText(JSON.stringify(parsed, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="jtv-root">
      <style>{STYLES}</style>

      <div style={{ marginBottom: '0.875rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ink)', margin: 0, lineHeight: 1.3 }}>
          JSON Tree Viewer
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', margin: '0.25rem 0 0', fontFamily: 'var(--font-sans)' }}>
          Paste JSON to explore its structure interactively.
        </p>
      </div>

      <div className="jtv-workspace">
        {/* Input header */}
        <div className="jtv-pane-hdr jtv-in-hdr">
          <span>JSON Input</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: '0.6875rem', letterSpacing: 0, textTransform: 'none' }}>
            {source.length}C
          </span>
        </div>

        {/* Tree header */}
        <div className="jtv-pane-hdr jtv-tree-hdr">
          <span>Tree View</span>
          <div className="jtv-hdr-actions">
            <button className="jtv-btn-sm" onClick={expandAll} disabled={!parsed}>
              <Plus size={11} /> Expand all
            </button>
            <button className="jtv-btn-sm" onClick={collapseAll} disabled={!parsed}>
              <Minus size={11} /> Collapse all
            </button>
            <button className="jtv-btn-sm" data-ok={String(copied)} onClick={handleCopy} disabled={!parsed || !!error}>
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Input body */}
        <div className="jtv-in-body">
          <textarea
            className={`jtv-textarea${error ? ' error' : ''}`}
            value={source}
            onChange={e => { setSource(e.target.value); setExpandedPaths(null) }}
            spellCheck={false}
            placeholder='{"key": "value"}'
          />
          {error && (
            <div className="jtv-error">
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Tree body */}
        <div className="jtv-tree-body">
          {parsed !== undefined ? (
            <div className="jtv-tree-inner">
              <TreeNode
                nodeKey={null}
                value={parsed}
                depth={0}
                expandedPaths={effectivePaths}
                togglePath={togglePath}
                path="root"
              />
            </div>
          ) : (
            <div className="jtv-empty">
              {error
                ? <><AlertCircle size={20} style={{ color: 'var(--color-error)' }} /> Invalid JSON</>
                : 'Enter JSON to see the tree'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Default content ───────────────────────────────────────────────────────────

const DEFAULT_JSON = `{
  "user": {
    "id": 42,
    "name": "Alice",
    "active": true,
    "roles": ["admin", "editor"],
    "address": {
      "city": "Oslo",
      "country": "Norway",
      "zip": "0150"
    }
  },
  "meta": {
    "version": 3,
    "generated": "2026-06-12T08:00:00Z",
    "tags": ["production", "v3"],
    "debug": null
  }
}`
