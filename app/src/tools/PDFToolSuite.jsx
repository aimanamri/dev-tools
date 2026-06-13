import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Upload, ZoomIn, ZoomOut, RotateCw, RotateCcw,
  ChevronLeft, ChevronRight, Search, X, Download,
  Trash2, FilePlus, Scissors, FileText,
  AlertCircle, CheckCircle, Shield, Undo2, GripVertical,
  Eye, Layers,
} from 'lucide-react'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(2)} MB`
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function hasReordered(order) {
  return order.some((p, i) => p.origIdx !== i)
}

// Parse expressions like "1,5-7,10,3-1" into a Set of page numbers (1-indexed, clamped to total)
function parsePageExpression(expr, total) {
  const pages = new Set()
  expr.split(',').forEach(part => {
    const s = part.trim()
    if (!s) return
    if (s.includes('-')) {
      const [a, b] = s.split('-').map(n => parseInt(n.trim(), 10))
      if (!isNaN(a) && !isNaN(b)) {
        const lo = Math.min(a, b), hi = Math.max(a, b)
        for (let p = lo; p <= hi; p++) if (p >= 1 && p <= total) pages.add(p)
      }
    } else {
      const n = parseInt(s, 10)
      if (!isNaN(n) && n >= 1 && n <= total) pages.add(n)
    }
  })
  return pages
}

// ─── style constants ──────────────────────────────────────────────────────────

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--color-ink-muted)', padding: 4, lineHeight: 0,
  borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

function primaryBtn(disabled) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '6px 14px', borderRadius: 6,
    backgroundColor: disabled ? 'var(--color-surface-raised)' : 'var(--color-primary)',
    color: disabled ? 'var(--color-ink-muted)' : 'var(--color-ink-on-primary)',
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500,
    opacity: disabled ? 0.65 : 1, transition: 'background-color 120ms ease-out',
  }
}

const ghostBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 14px', borderRadius: 6,
  backgroundColor: 'var(--color-surface)', color: 'var(--color-ink)',
  border: '1px solid var(--color-border-strong)', cursor: 'pointer',
  fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500,
}

const fieldInput = {
  fontFamily: 'var(--font-mono)', fontSize: '0.8125rem',
  padding: '6px 10px', borderRadius: 4,
  border: '1px solid var(--color-border-strong)',
  backgroundColor: 'var(--color-input-bg)', color: 'var(--color-ink)',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

const labelWrap = {
  fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
  color: 'var(--color-ink-muted)', display: 'flex', flexDirection: 'column', gap: 4,
}

// ─── ThumbnailCanvas ──────────────────────────────────────────────────────────

function ThumbnailCanvas({ pdfJs, pageIndex, scale = 0.2 }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!pdfJs || !ref.current) return
    let dead = false
    pdfJs.getPage(pageIndex + 1).then(page => {
      if (dead || !ref.current) return
      const vp = page.getViewport({ scale })
      ref.current.width = vp.width
      ref.current.height = vp.height
      page.render({ canvasContext: ref.current.getContext('2d'), viewport: vp }).promise.catch(() => {})
    })
    return () => { dead = true }
  }, [pdfJs, pageIndex, scale])

  return <canvas ref={ref} style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: '#fff' }} />
}

// ─── SortableThumbnail ────────────────────────────────────────────────────────

function SortableThumbnail({ id, pdfJs, origPageIdx, label, isActive, isDeleted, onSelect, onToggleDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const [hover, setHover] = useState(false)
  const borderColor = isActive
    ? 'var(--color-primary)'
    : isDeleted
      ? 'var(--color-error)'
      : hover
        ? 'var(--color-primary)'
        : 'var(--color-border-strong)'
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: `${CSS.Transform.toString(transform) || ''} scale(${isDragging ? 1.04 : 1})`,
        transition,
        opacity: isDragging ? 0.9 : 1,
        zIndex: isDragging ? 10 : 'auto',
        boxShadow: isDragging ? 'var(--shadow-md)' : 'none',
        borderRadius: 6,
      }}
      {...attributes}
    >
      <div
        onClick={() => onSelect()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative', borderRadius: 6, overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'pointer',
          border: `2px solid ${borderColor}`,
          opacity: isDeleted ? 0.45 : 1, userSelect: 'none',
          transition: 'border-color var(--dur-fast) var(--ease-out-quart)',
        }}
      >
        <div {...listeners} onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: 2, left: 2, zIndex: 2, cursor: 'grab', lineHeight: 0, color: 'var(--color-ink-faint)' }}>
          <GripVertical size={11} strokeWidth={1.5} />
        </div>
        <button onClick={e => { e.stopPropagation(); onToggleDelete() }}
          style={{
            position: 'absolute', top: 2, right: 2, zIndex: 2, width: 16, height: 16,
            borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: isDeleted ? 'var(--color-success)' : 'var(--color-error)',
            color: '#fff', border: 'none', cursor: 'pointer', padding: 0,
          }}>
          {isDeleted ? <CheckCircle size={9} /> : <X size={9} />}
        </button>
        <ThumbnailCanvas pdfJs={pdfJs} pageIndex={origPageIdx} />
        <div style={{
          textAlign: 'center', fontSize: '0.625rem', fontFamily: 'var(--font-mono)',
          color: 'var(--color-ink-muted)', padding: '2px 0',
          backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
        }}>
          {label}
        </div>
      </div>
    </div>
  )
}

// ─── ViewerThumb (sidebar click-nav) ─────────────────────────────────────────

function ViewerThumb({ pdfJs, pageIndex, isActive, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', border: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
      borderRadius: 4, overflow: 'hidden', cursor: 'pointer', backgroundColor: 'transparent', padding: 0, display: 'block',
    }}>
      <ThumbnailCanvas pdfJs={pdfJs} pageIndex={pageIndex} />
      <div style={{
        textAlign: 'center', fontSize: '0.625rem', fontFamily: 'var(--font-mono)',
        color: isActive ? 'var(--color-primary)' : 'var(--color-ink-muted)',
        padding: '2px 0', backgroundColor: 'var(--color-surface)',
      }}>
        {pageIndex + 1}
      </div>
    </button>
  )
}

// ─── StatusBanner ─────────────────────────────────────────────────────────────

function StatusBanner({ status, onClose }) {
  if (!status.type) return null
  const c = { success: 'var(--color-success)', error: 'var(--color-error)', info: 'var(--color-accent)' }[status.type]
  const Icon = { success: CheckCircle, error: AlertCircle, info: FileText }[status.type]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6,
      border: `1px solid ${c}`, backgroundColor: 'var(--color-surface)', color: c,
      fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', marginBottom: 12,
    }}>
      <Icon size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{status.msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c, padding: 0, lineHeight: 0 }}>
        <X size={13} />
      </button>
    </div>
  )
}

// ─── PDFToolSuite ─────────────────────────────────────────────────────────────

export default function PDFToolSuite() {
  // document state
  const [fileName, setFileName] = useState('')
  const [originalBytes, setOriginalBytes] = useState(null)
  const [workBytes, setWorkBytes] = useState(null)
  const [pdfJs, setPdfJs] = useState(null)
  const [numPages, setNumPages] = useState(0)

  // view state
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1.2)
  const [rotation, setRotation] = useState(0)
  const [tab, setTab] = useState('view')

  // search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchIdx, setSearchIdx] = useState(0)

  // pages tab
  const [pageOrder, setPageOrder] = useState([])
  const [deletedIds, setDeletedIds] = useState(new Set())
  const [mergeQueue, setMergeQueue] = useState([])
  const [splitFrom, setSplitFrom] = useState('')
  const [splitTo, setSplitTo] = useState('')

  // enhance tab
  const [wmText, setWmText] = useState('CONFIDENTIAL')
  const [wmOpacity, setWmOpacity] = useState(0.15)
  const [wmSize, setWmSize] = useState(48)
  const [wmPages, setWmPages] = useState('all')
  const [wmPagesCustom, setWmPagesCustom] = useState('')
  const [wmPosition, setWmPosition] = useState('diagonal')
  const [wmRotation, setWmRotation] = useState(45)
  const [formFields, setFormFields] = useState([])
  const [formValues, setFormValues] = useState({})
  const [meta, setMeta] = useState({ title: '', author: '', subject: '', keywords: '', creator: '' })

  // ui
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [processing, setProcessing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const fileInputRef = useRef(null)
  const mergeInputRef = useRef(null)
  const searchDebounceRef = useRef(null)
  const overlayRef = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => () => clearTimeout(searchDebounceRef.current), [])

  // ── load PDF ─────────────────────────────────────────────────────────────────

  const loadPdfBytes = useCallback(async (bytes, name) => {
    setProcessing(true)
    setStatus({ type: '', msg: '' })
    try {
      const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
      const doc = await pdfjsLib.getDocument({ data: arr.slice() }).promise
      const n = doc.numPages

      let fields = []
      let metaIn = { title: '', author: '', subject: '', keywords: '', creator: '' }
      try {
        const plDoc = await PDFDocument.load(arr, { ignoreEncryption: true })
        metaIn = {
          title: plDoc.getTitle() || '',
          author: plDoc.getAuthor() || '',
          subject: plDoc.getSubject() || '',
          keywords: plDoc.getKeywords() || '',
          creator: plDoc.getCreator() || '',
        }
        const form = plDoc.getForm()
        fields = form.getFields().map(f => {
          let val = ''
          try {
            const ctor = f.constructor.name
            if (ctor === 'PDFTextField') val = f.getText() || ''
            else if (ctor === 'PDFCheckBox') val = f.isChecked() ? 'true' : 'false'
            else if (ctor === 'PDFDropdown') val = f.getSelected().join(', ')
          } catch { /* field unreadable */ }
          return {
            name: f.getName(),
            type: f.constructor.name.replace('PDF', '').replace('Field', ''),
            value: val,
          }
        })
      } catch { /* no form or encrypted */ }

      setPdfJs(doc)
      setNumPages(n)
      setPageOrder(Array.from({ length: n }, (_, i) => ({ id: `p${i}`, origIdx: i })))
      setDeletedIds(new Set())
      setCurrentPage(1)
      setSearchResults([])
      setSearchQuery('')
      setFormFields(fields)
      setFormValues(Object.fromEntries(fields.map(f => [f.name, f.value])))
      setMeta(metaIn)
      setSplitFrom('1')
      setSplitTo(String(n))
      setOriginalBytes(arr)
      setWorkBytes(arr)
      setFileName(name || 'document.pdf')
      setMergeQueue([])
      setStatus({ type: 'success', msg: `Loaded "${name}" — ${n} page${n !== 1 ? 's' : ''}, ${fmtBytes(arr.length)}` })
    } catch (err) {
      setStatus({ type: 'error', msg: `Failed to load PDF: ${err.message}` })
    } finally {
      setProcessing(false)
    }
  }, [])

  // ── main canvas render ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!pdfJs || !canvasRef.current) return
    if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null }
    let dead = false
    pdfJs.getPage(currentPage).then(page => {
      if (dead || !canvasRef.current) return
      const vp = page.getViewport({ scale: zoom, rotation })
      const c = canvasRef.current
      c.width = vp.width
      c.height = vp.height
      const task = page.render({ canvasContext: c.getContext('2d'), viewport: vp })
      renderTaskRef.current = task
      task.promise.catch(err => { if (err?.name !== 'RenderingCancelledException') console.warn(err) })
    })
    return () => {
      dead = true
      if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null }
    }
  }, [pdfJs, currentPage, zoom, rotation])

  // ── search highlights overlay ─────────────────────────────────────────────────

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')

    const q = searchQuery.replace(/\s+/g, ' ').trim().toLowerCase()
    const singleWord = !!q && !q.includes(' ')
    // Only single-word queries get per-occurrence highlights (word-level matches carry itemIndex)
    const pageMatches = singleWord
      ? searchResults.filter(m => m.page === currentPage && m.itemIndex != null)
      : []

    if (!pdfJs || !pageMatches.length) {
      ctx.clearRect(0, 0, overlay.width, overlay.height)
      return
    }

    let dead = false
    ;(async () => {
      const page = await pdfJs.getPage(currentPage)
      if (dead) return
      const vp = page.getViewport({ scale: zoom, rotation })
      overlay.width = vp.width
      overlay.height = vp.height

      const tc = await page.getTextContent()
      if (dead) return
      ctx.clearRect(0, 0, overlay.width, overlay.height)

      pageMatches.forEach(m => {
        const item = tc.items[m.itemIndex]
        if (!item || typeof item.str !== 'string' || !item.str.length) return

        const [, b, , d, tx, ty] = item.transform
        const h = item.height || Math.sqrt(b * b + d * d)
        if (!h) return

        // Approximate the word's sub-rectangle by proportional character advance
        const charW = item.width / item.str.length
        const wx1 = tx + m.charIndex * charW
        const wx2 = tx + (m.charIndex + q.length) * charW
        const [x1, y1] = vp.convertToViewportPoint(wx1, ty + h)
        const [x2, y2] = vp.convertToViewportPoint(wx2, ty)
        const rx = Math.min(x1, x2)
        const ry = Math.min(y1, y2)
        const rw = Math.abs(x2 - x1)
        const rh = Math.abs(y2 - y1)

        const isActive = searchResults[searchIdx] === m
        ctx.fillStyle = isActive ? 'rgba(255, 140, 0, 0.50)' : 'rgba(255, 210, 0, 0.32)'
        ctx.fillRect(rx, ry, rw, rh)
        ctx.strokeStyle = isActive ? 'rgba(190, 85, 0, 0.85)' : 'rgba(200, 140, 0, 0.5)'
        ctx.lineWidth = isActive ? 1.5 : 1
        ctx.strokeRect(rx, ry, rw, rh)
      })
    })()

    return () => { dead = true }
  }, [pdfJs, currentPage, zoom, rotation, searchQuery, searchResults, searchIdx])

  // ── search ────────────────────────────────────────────────────────────────────

  const runSearch = useCallback(async (queryOverride) => {
    const q = (queryOverride ?? searchQuery).replace(/\s+/g, ' ').trim().toLowerCase()
    if (!pdfJs || !q) { setSearchResults([]); setSearchIdx(0); return }
    const singleWord = !q.includes(' ')
    const matches = []
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfJs.getPage(i)
      const tc = await page.getTextContent()
      if (singleWord) {
        // Record every occurrence within each text item → occurrence-level navigation
        tc.items.forEach((it, idx) => {
          if (typeof it.str !== 'string') return
          const s = it.str.toLowerCase()
          let from = 0
          while (true) {
            const at = s.indexOf(q, from)
            if (at === -1) break
            matches.push({ page: i, itemIndex: idx, charIndex: at })
            from = at + q.length
          }
        })
      } else {
        // Phrases span item boundaries — fall back to page-level, no per-word highlight
        const text = tc.items
          .filter(it => typeof it.str === 'string')
          .map(it => it.str)
          .join('')
          .replace(/\s+/g, ' ')
          .toLowerCase()
        if (text.includes(q)) matches.push({ page: i })
      }
    }
    setSearchResults(matches)
    setSearchIdx(0)
    if (matches.length) setCurrentPage(matches[0].page)
    setStatus(matches.length
      ? { type: 'success', msg: singleWord
          ? `${matches.length} match${matches.length !== 1 ? 'es' : ''} found`
          : `Found on ${matches.length} page${matches.length !== 1 ? 's' : ''}` }
      : { type: 'info', msg: 'No matches found' }
    )
  }, [pdfJs, numPages, searchQuery])

  const stepSearch = useCallback((dir) => {
    if (!searchResults.length) return
    const next = (searchIdx + dir + searchResults.length) % searchResults.length
    setSearchIdx(next)
    setCurrentPage(searchResults[next].page)
  }, [searchResults, searchIdx])

  // ── file drop / input ─────────────────────────────────────────────────────────

  const handleDrop = useCallback(async e => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer?.files[0]
    if (!file || file.type !== 'application/pdf') {
      setStatus({ type: 'error', msg: 'Please drop a PDF file.' }); return
    }
    loadPdfBytes(new Uint8Array(await file.arrayBuffer()), file.name)
  }, [loadPdfBytes])

  const handleFileInput = useCallback(async e => {
    const file = e.target.files[0]
    if (!file) return
    loadPdfBytes(new Uint8Array(await file.arrayBuffer()), file.name)
    e.target.value = ''
  }, [loadPdfBytes])

  // ── page reorder / delete ─────────────────────────────────────────────────────

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oi = pageOrder.findIndex(p => p.id === active.id)
    const ni = pageOrder.findIndex(p => p.id === over.id)
    setPageOrder(prev => arrayMove(prev, oi, ni))
  }

  const toggleDelete = id => {
    setDeletedIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const applyPageChanges = useCallback(async () => {
    const kept = pageOrder.filter(p => !deletedIds.has(p.id))
    if (!kept.length) { setStatus({ type: 'error', msg: 'Cannot delete all pages.' }); return }
    setProcessing(true)
    try {
      const src = await PDFDocument.load(workBytes, { ignoreEncryption: true })
      const newDoc = await PDFDocument.create()
      const pages = await newDoc.copyPages(src, kept.map(p => p.origIdx))
      pages.forEach(p => newDoc.addPage(p))
      const saved = new Uint8Array(await newDoc.save())
      const newPdfJs = await pdfjsLib.getDocument({ data: saved.slice() }).promise
      const n = newPdfJs.numPages
      setWorkBytes(saved)
      setPdfJs(newPdfJs)
      setNumPages(n)
      setPageOrder(Array.from({ length: n }, (_, i) => ({ id: `p${i}`, origIdx: i })))
      setDeletedIds(new Set())
      setCurrentPage(1)
      setStatus({ type: 'success', msg: `Applied — ${n} page${n !== 1 ? 's' : ''} remaining` })
    } catch (err) {
      setStatus({ type: 'error', msg: `Apply failed: ${err.message}` })
    } finally {
      setProcessing(false)
    }
  }, [pageOrder, deletedIds, workBytes])

  // ── merge ─────────────────────────────────────────────────────────────────────

  const addMergeFile = useCallback(async e => {
    const entries = await Promise.all(
      Array.from(e.target.files)
        .filter(f => f.type === 'application/pdf')
        .map(async f => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }))
    )
    setMergeQueue(prev => [...prev, ...entries])
    e.target.value = ''
  }, [])

  const mergeAll = useCallback(async () => {
    if (!workBytes || !mergeQueue.length) {
      setStatus({ type: 'error', msg: 'Add at least one PDF to merge.' }); return
    }
    setProcessing(true)
    try {
      const base = await PDFDocument.load(workBytes, { ignoreEncryption: true })
      for (const { bytes } of mergeQueue) {
        const other = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const copied = await base.copyPages(other, other.getPageIndices())
        copied.forEach(p => base.addPage(p))
      }
      const saved = new Uint8Array(await base.save())
      const newPdfJs = await pdfjsLib.getDocument({ data: saved.slice() }).promise
      const n = newPdfJs.numPages
      setWorkBytes(saved)
      setPdfJs(newPdfJs)
      setNumPages(n)
      setPageOrder(Array.from({ length: n }, (_, i) => ({ id: `p${i}`, origIdx: i })))
      setDeletedIds(new Set())
      setCurrentPage(1)
      setMergeQueue([])
      setStatus({ type: 'success', msg: `Merged — ${n} pages total` })
    } catch (err) {
      setStatus({ type: 'error', msg: `Merge failed: ${err.message}` })
    } finally {
      setProcessing(false)
    }
  }, [workBytes, mergeQueue])

  // ── split ─────────────────────────────────────────────────────────────────────

  const splitPdf = useCallback(async () => {
    const from = parseInt(splitFrom, 10)
    const to = parseInt(splitTo, 10)
    if (!from || !to || from < 1 || to > numPages || from > to) {
      setStatus({ type: 'error', msg: `Enter a valid range (1–${numPages}).` }); return
    }
    setProcessing(true)
    try {
      const src = await PDFDocument.load(workBytes, { ignoreEncryption: true })
      const newDoc = await PDFDocument.create()
      const indices = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i)
      const pages = await newDoc.copyPages(src, indices)
      pages.forEach(p => newDoc.addPage(p))
      const saved = await newDoc.save()
      const blob = new Blob([saved], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${fileName.replace(/\.pdf$/i, '')}_pages_${from}-${to}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 3000)
      setStatus({ type: 'success', msg: `Extracted pages ${from}–${to} and downloaded.` })
    } catch (err) {
      setStatus({ type: 'error', msg: `Split failed: ${err.message}` })
    } finally {
      setProcessing(false)
    }
  }, [workBytes, splitFrom, splitTo, numPages, fileName])

  // ── watermark ─────────────────────────────────────────────────────────────────

  const applyWatermark = useCallback(async () => {
    if (!workBytes || !wmText.trim()) { setStatus({ type: 'error', msg: 'Enter watermark text.' }); return }
    if (wmPages === 'custom' && !wmPagesCustom.trim()) {
      setStatus({ type: 'error', msg: 'Enter page numbers for custom target.' }); return
    }
    setProcessing(true)
    try {
      const doc = await PDFDocument.load(workBytes, { ignoreEncryption: true })
      const totalPages = doc.getPageCount()
      let customPageSet = null
      if (wmPages === 'custom') {
        customPageSet = parsePageExpression(wmPagesCustom, totalPages)
        if (!customPageSet.size) {
          setStatus({ type: 'error', msg: `No valid pages matched (document has ${totalPages} pages).` })
          return
        }
      }
      const font = await doc.embedFont(StandardFonts.HelveticaBold)
      doc.getPages().forEach((page, i) => {
        const pNum = i + 1
        let apply = wmPages === 'all' || (wmPages === 'odd' && pNum % 2 === 1) || (wmPages === 'even' && pNum % 2 === 0)
        if (wmPages === 'custom') apply = customPageSet.has(pNum)
        if (!apply) return
        const { width, height } = page.getSize()
        const textWidth = font.widthOfTextAtSize(wmText, wmSize)
        const margin = 30
        const posMap = {
          diagonal:       { x: width / 4,                    y: height / 2,               r: 45 },
          center:         { x: (width - textWidth) / 2,       y: (height - wmSize) / 2,    r: 0  },
          'top-left':     { x: margin,                        y: height - wmSize - margin,  r: 0  },
          'top-center':   { x: (width - textWidth) / 2,       y: height - wmSize - margin,  r: 0  },
          'top-right':    { x: width - textWidth - margin,    y: height - wmSize - margin,  r: 0  },
          'bottom-left':  { x: margin,                        y: margin,                    r: 0  },
          'bottom-center':{ x: (width - textWidth) / 2,       y: margin,                    r: 0  },
          'bottom-right': { x: width - textWidth - margin,    y: margin,                    r: 0  },
        }
        const pos = posMap[wmPosition] ?? posMap.diagonal
        page.drawText(wmText, {
          x: pos.x, y: pos.y, size: wmSize, font,
          color: rgb(0.7, 0.1, 0.1), opacity: wmOpacity, rotate: degrees(wmRotation),
        })
      })
      const saved = new Uint8Array(await doc.save())
      const newPdfJs = await pdfjsLib.getDocument({ data: saved.slice() }).promise
      setWorkBytes(saved)
      setPdfJs(newPdfJs)
      setStatus({ type: 'success', msg: 'Watermark applied.' })
    } catch (err) {
      setStatus({ type: 'error', msg: `Watermark failed: ${err.message}` })
    } finally {
      setProcessing(false)
    }
  }, [workBytes, wmText, wmOpacity, wmSize, wmPages, wmPagesCustom, wmPosition, wmRotation])

  // ── form fill ─────────────────────────────────────────────────────────────────

  const fillForm = useCallback(async () => {
    if (!workBytes || !formFields.length) return
    setProcessing(true)
    try {
      const doc = await PDFDocument.load(workBytes, { ignoreEncryption: true })
      const form = doc.getForm()
      formFields.forEach(({ name, type }) => {
        const val = formValues[name] || ''
        try {
          if (type === 'TextField') form.getTextField(name).setText(val)
          else if (type === 'CheckBox') {
            const cb = form.getCheckBox(name)
            val === 'true' ? cb.check() : cb.uncheck()
          } else if (type === 'Dropdown') {
            try { form.getDropdown(name).select(val) } catch { /* skip invalid option */ }
          }
        } catch { /* field may not exist */ }
      })
      form.flatten()
      const saved = new Uint8Array(await doc.save())
      const newPdfJs = await pdfjsLib.getDocument({ data: saved.slice() }).promise
      setWorkBytes(saved)
      setPdfJs(newPdfJs)
      setFormFields([])
      setStatus({ type: 'success', msg: 'Form filled and flattened.' })
    } catch (err) {
      setStatus({ type: 'error', msg: `Form fill failed: ${err.message}` })
    } finally {
      setProcessing(false)
    }
  }, [workBytes, formFields, formValues])

  // ── metadata ──────────────────────────────────────────────────────────────────

  const saveMeta = useCallback(async () => {
    if (!workBytes) return
    setProcessing(true)
    try {
      const doc = await PDFDocument.load(workBytes, { ignoreEncryption: true })
      if (meta.title) doc.setTitle(meta.title)
      if (meta.author) doc.setAuthor(meta.author)
      if (meta.subject) doc.setSubject(meta.subject)
      if (meta.keywords) doc.setKeywords([meta.keywords])
      if (meta.creator) doc.setCreator(meta.creator)
      const saved = new Uint8Array(await doc.save())
      setWorkBytes(saved)
      setStatus({ type: 'success', msg: 'Metadata saved.' })
    } catch (err) {
      setStatus({ type: 'error', msg: `Metadata save failed: ${err.message}` })
    } finally {
      setProcessing(false)
    }
  }, [workBytes, meta])

  // ── download / restore / clear ────────────────────────────────────────────────

  const download = useCallback(() => {
    if (!workBytes) return
    const blob = new Blob([workBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = fileName.replace(/\.pdf$/i, '_modified.pdf')
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
    setStatus({ type: 'success', msg: 'Download started.' })
  }, [workBytes, fileName])

  const restoreOriginal = useCallback(async () => {
    if (!originalBytes) return
    await loadPdfBytes(originalBytes, fileName)
  }, [originalBytes, fileName, loadPdfBytes])

  const clearAll = useCallback(() => {
    if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null }
    setPdfJs(null); setOriginalBytes(null); setWorkBytes(null); setNumPages(0)
    setPageOrder([]); setDeletedIds(new Set()); setCurrentPage(1); setFileName('')
    setSearchQuery(''); setSearchResults([]); setMergeQueue([])
    setFormFields([]); setFormValues({})
    setMeta({ title: '', author: '', subject: '', keywords: '', creator: '' })
    setStatus({ type: '', msg: '' }); setTab('view')
  }, [])

  // ─── drop zone (no file loaded) ───────────────────────────────────────────────

  if (!pdfJs) {
    const capabilities = [
      { Icon: Eye, label: 'View & search' },
      { Icon: Layers, label: 'Reorder & delete' },
      { Icon: FilePlus, label: 'Merge' },
      { Icon: Scissors, label: 'Split & extract' },
      { Icon: FileText, label: 'Watermark & forms' },
    ]
    return (
      <div style={{ padding: '8px 24px 24px', maxWidth: 620, margin: '0 auto' }}>
        <div className="rise-in" style={{ '--word-delay': '0ms', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            backgroundColor: 'var(--color-primary-subtle)',
            boxShadow: '0 0 0 6px var(--color-surface-wash)',
          }}>
            <FileText size={22} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
          </span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.375rem', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.025em' }}>
              PDF Tool Suite
            </h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-ink-muted)', margin: '2px 0 0' }}>
              View, reorder, merge, split, watermark and fill PDF forms.
            </p>
          </div>
        </div>

        <StatusBanner status={status} onClose={() => setStatus({ type: '', msg: '' })} />

        <div
          className="rise-in"
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            '--word-delay': '90ms',
            border: `2px dashed ${isDragOver ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
            borderRadius: 12, padding: '52px 32px', textAlign: 'center', cursor: 'pointer',
            backgroundColor: isDragOver ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
            boxShadow: isDragOver ? '0 0 0 4px var(--color-primary-glow)' : 'none',
            transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
            transition: 'border-color var(--dur-fast) var(--ease-out-quart), background-color var(--dur-fast) var(--ease-out-quart), box-shadow var(--dur-normal) var(--ease-out-quart), transform var(--dur-normal) var(--ease-out-quart)',
          }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16, marginBottom: 14,
            backgroundColor: isDragOver ? 'var(--color-primary)' : 'var(--color-surface-raised)',
            transition: 'background-color var(--dur-fast) var(--ease-out-quart)',
          }}>
            <Upload
              size={26} strokeWidth={1.5}
              style={{
                color: isDragOver ? 'var(--color-ink-on-primary)' : 'var(--color-ink-muted)',
                transform: isDragOver ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'color var(--dur-fast) var(--ease-out-quart), transform var(--dur-normal) var(--ease-out-quart)',
              }}
            />
          </span>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-ink)', marginBottom: 4 }}>
            {isDragOver ? 'Release to open' : 'Drop a PDF here or click to browse'}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-faint)', margin: 0 }}>
            .pdf · processed in-browser · never uploaded
          </p>
          <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileInput} style={{ display: 'none' }} />
        </div>

        <div className="rise-in" style={{ '--word-delay': '170ms', display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {capabilities.map(({ Icon, label }) => (
            <span key={label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 9999,
              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-strong)',
              fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--color-ink-muted)',
            }}>
              <Icon size={13} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
              {label}
            </span>
          ))}
        </div>

        <div className="rise-in" style={{
          '--word-delay': '250ms',
          marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 14px', borderRadius: 8,
          backgroundColor: 'var(--color-surface-wash)', border: '1px solid var(--color-border)',
        }}>
          <Shield size={14} strokeWidth={1.5} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.55 }}>
            All PDF operations use PDF.js and pdf-lib running locally. Your file is never sent to any server and is cleared from memory when you close the tab.
          </p>
        </div>
      </div>
    )
  }

  // ─── main UI ──────────────────────────────────────────────────────────────────

  const TABS = ['view', 'pages', 'enhance', 'export']
  const activeCount = pageOrder.filter(p => !deletedIds.has(p.id)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px - 3.5rem)', overflow: 'hidden' }}>
      {/* top toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px',
        borderBottom: '1px solid var(--color-border-strong)',
        backgroundColor: 'var(--color-surface)', flexShrink: 0, minHeight: 40,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-ink)', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', flexShrink: 0 }}>
          {numPages}p · {fmtBytes(workBytes?.length)}
        </span>
        <div style={{ width: 1, height: 18, backgroundColor: 'var(--color-border-strong)', marginInline: 4, flexShrink: 0 }} />
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '4px 10px', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)',
            fontWeight: tab === t ? 600 : 400,
            color: tab === t ? 'var(--color-primary)' : 'var(--color-ink-muted)',
            background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t ? 'var(--color-primary)' : 'transparent'}`,
            cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={clearAll} title="Close document" style={{ ...iconBtn }}>
          <X size={15} strokeWidth={1.5} />
        </button>
      </div>

      {/* status banner */}
      {status.type && (
        <div style={{ padding: '8px 16px 0', flexShrink: 0 }}>
          <StatusBanner status={status} onClose={() => setStatus({ type: '', msg: '' })} />
        </div>
      )}

      {/* tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ── VIEW ── */}
        <div style={{ flex: 1, display: tab === 'view' ? 'flex' : 'none', overflow: 'hidden' }}>
            {/* thumbnail sidebar */}
            <div style={{
              width: 96, flexShrink: 0, borderRight: '1px solid var(--color-border-strong)',
              overflowY: 'auto', backgroundColor: 'var(--color-surface)',
              padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {Array.from({ length: numPages }, (_, i) => (
                <ViewerThumb
                  key={i} pdfJs={pdfJs} pageIndex={i}
                  isActive={currentPage === i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                />
              ))}
            </div>

            {/* canvas area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* view controls */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
                flexShrink: 0, flexWrap: 'wrap',
              }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} style={iconBtn}><ChevronLeft size={15} strokeWidth={1.5} /></button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-ink)', minWidth: 56, textAlign: 'center' }}>{currentPage} / {numPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} style={iconBtn}><ChevronRight size={15} strokeWidth={1.5} /></button>

                <div style={{ width: 1, height: 16, backgroundColor: 'var(--color-border)', marginInline: 2 }} />

                <button onClick={() => setZoom(z => clamp(+(z - 0.2).toFixed(1), 0.4, 4))} style={iconBtn}><ZoomOut size={14} strokeWidth={1.5} /></button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-ink)', minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => clamp(+(z + 0.2).toFixed(1), 0.4, 4))} style={iconBtn}><ZoomIn size={14} strokeWidth={1.5} /></button>

                <div style={{ width: 1, height: 16, backgroundColor: 'var(--color-border)', marginInline: 2 }} />

                <button onClick={() => setRotation(r => (r - 90 + 360) % 360)} style={iconBtn} title="Rotate CCW"><RotateCcw size={14} strokeWidth={1.5} /></button>
                <button onClick={() => setRotation(r => (r + 90) % 360)} style={iconBtn} title="Rotate CW"><RotateCw size={14} strokeWidth={1.5} /></button>

                <div style={{ width: 1, height: 16, backgroundColor: 'var(--color-border)', marginInline: 2 }} />

                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <input
                    value={searchQuery}
                    onChange={e => {
                      const v = e.target.value
                      setSearchQuery(v)
                      clearTimeout(searchDebounceRef.current)
                      if (v.replace(/\s+/g, '').length >= 2) {
                        searchDebounceRef.current = setTimeout(() => runSearch(v), 450)
                      } else {
                        setSearchResults([])
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { clearTimeout(searchDebounceRef.current); runSearch() } }}
                    placeholder="Search text…"
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.8125rem',
                      padding: '3px 24px 3px 8px', borderRadius: 4,
                      border: '1px solid var(--color-border-strong)',
                      backgroundColor: 'var(--color-input-bg)', color: 'var(--color-ink)',
                      width: 140, outline: 'none',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { clearTimeout(searchDebounceRef.current); setSearchQuery(''); setSearchResults([]) }}
                      style={{ ...iconBtn, position: 'absolute', right: 2, padding: 2 }}
                      title="Clear"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <button onClick={() => { clearTimeout(searchDebounceRef.current); runSearch() }} style={iconBtn} title="Search"><Search size={13} strokeWidth={1.5} /></button>
                {searchResults.length > 0 && (
                  <>
                    <button onClick={() => stepSearch(-1)} style={iconBtn}><ChevronLeft size={12} /></button>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                      {searchIdx + 1}/{searchResults.length}
                    </span>
                    <button onClick={() => stepSearch(1)} style={iconBtn}><ChevronRight size={12} /></button>
                  </>
                )}
              </div>

              {/* canvas */}
              <div style={{
                flex: 1, overflowY: 'auto', overflowX: 'auto',
                backgroundColor: 'var(--color-bg)', display: 'flex',
                justifyContent: 'center', alignItems: 'flex-start', padding: 24,
              }}>
                <div style={{ position: 'relative', display: 'inline-block', boxShadow: 'var(--shadow-md)', borderRadius: 2 }}>
                  <canvas ref={canvasRef} style={{ backgroundColor: '#fff', display: 'block', borderRadius: 2 }} />
                  <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', borderRadius: 2 }} />
                </div>
              </div>
            </div>
        </div>

        {/* ── PAGES ── */}
        {tab === 'pages' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* reorder & delete */}
            <section style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 2px' }}>
                    Reorder & Delete Pages
                  </h2>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0 }}>
                    Drag to reorder · click × to mark for deletion · click again to restore · {activeCount} of {numPages} kept
                  </p>
                </div>
                <button
                  onClick={applyPageChanges}
                  disabled={processing || (deletedIds.size === 0 && !hasReordered(pageOrder))}
                  style={primaryBtn(processing || (deletedIds.size === 0 && !hasReordered(pageOrder)))}
                >
                  {processing ? 'Applying…' : 'Apply Changes'}
                </button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pageOrder.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8 }}>
                    {pageOrder.map((p, idx) => (
                      <SortableThumbnail
                        key={p.id} id={p.id} pdfJs={pdfJs}
                        origPageIdx={p.origIdx} label={idx + 1}
                        isActive={currentPage === idx + 1}
                        isDeleted={deletedIds.has(p.id)}
                        onSelect={() => { setCurrentPage(idx + 1); setTab('view') }}
                        onToggleDelete={() => toggleDelete(p.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: 24 }} />

            {/* merge */}
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>Merge PDFs</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginBottom: 10 }}>
                Append additional PDF files to the end of the current document.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <button onClick={() => mergeInputRef.current?.click()} style={ghostBtn}>
                  <FilePlus size={13} strokeWidth={1.5} />Add PDFs
                </button>
                <input ref={mergeInputRef} type="file" accept="application/pdf" multiple onChange={addMergeFile} style={{ display: 'none' }} />
                {mergeQueue.length > 0 && (
                  <button onClick={mergeAll} disabled={processing} style={primaryBtn(processing)}>
                    {processing ? 'Merging…' : `Merge ${mergeQueue.length} file${mergeQueue.length !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
              {mergeQueue.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 4,
                  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: 4,
                }}>
                  <FileText size={12} strokeWidth={1.5} style={{ color: 'var(--color-ink-muted)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', flexShrink: 0 }}>{fmtBytes(f.bytes.length)}</span>
                  <button onClick={() => setMergeQueue(q => q.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: 0, lineHeight: 0 }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: 24 }} />

            {/* split */}
            <section>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>Extract Page Range</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginBottom: 10 }}>
                Download a page range as a new PDF (does not modify the current document).
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-ink)' }}>Pages</span>
                <input type="number" min={1} max={numPages} value={splitFrom} onChange={e => setSplitFrom(e.target.value)}
                  style={{ ...fieldInput, width: 64 }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>to</span>
                <input type="number" min={1} max={numPages} value={splitTo} onChange={e => setSplitTo(e.target.value)}
                  style={{ ...fieldInput, width: 64 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>of {numPages}</span>
                <button onClick={splitPdf} disabled={processing} style={primaryBtn(processing)}>
                  <Scissors size={13} strokeWidth={1.5} />
                  {processing ? 'Extracting…' : 'Extract & Download'}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ── ENHANCE ── */}
        {tab === 'enhance' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* watermark */}
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 10 }}>Add Watermark</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                <label style={labelWrap}>
                  Watermark Text
                  <input value={wmText} onChange={e => setWmText(e.target.value)} style={fieldInput} placeholder="e.g. CONFIDENTIAL" />
                </label>
                <label style={labelWrap}>
                  Position
                  <select
                    value={wmPosition}
                    onChange={e => {
                      const p = e.target.value
                      setWmPosition(p)
                      setWmRotation(p === 'diagonal' ? 45 : 0)
                    }}
                    style={fieldInput}
                  >
                    <option value="diagonal">Diagonal (center)</option>
                    <option value="center">Center</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </label>
                <label style={labelWrap}>
                  Rotation: {wmRotation}°
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <input
                      type="range" min={0} max={360} step={5} value={wmRotation}
                      onChange={e => setWmRotation(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number" min={0} max={360} step={1} value={wmRotation}
                      onChange={e => setWmRotation(Math.min(360, Math.max(0, Number(e.target.value))))}
                      style={{ ...fieldInput, width: 56, padding: '4px 6px' }}
                    />
                  </div>
                </label>
                <label style={labelWrap}>
                  Apply to
                  <select value={wmPages} onChange={e => setWmPages(e.target.value)} style={fieldInput}>
                    <option value="all">All pages</option>
                    <option value="odd">Odd pages only</option>
                    <option value="even">Even pages only</option>
                    <option value="custom">Custom pages…</option>
                  </select>
                  {wmPages === 'custom' && (() => {
                    const preview = wmPagesCustom.trim()
                      ? parsePageExpression(wmPagesCustom, numPages)
                      : null
                    const invalid = preview !== null && preview.size === 0
                    return (
                      <div style={{ marginTop: 6 }}>
                        <input
                          value={wmPagesCustom}
                          onChange={e => setWmPagesCustom(e.target.value)}
                          placeholder="e.g. 1,5-7,32,70,3-1"
                          style={{
                            ...fieldInput,
                            borderColor: invalid ? 'var(--color-error)' : 'var(--color-border-strong)',
                          }}
                        />
                        <p style={{
                          fontFamily: 'var(--font-mono)', fontSize: '0.7rem', margin: '4px 0 0',
                          color: invalid ? 'var(--color-error)' : 'var(--color-ink-faint)',
                        }}>
                          {preview && !invalid
                            ? `${preview.size} page${preview.size !== 1 ? 's' : ''} targeted: ${[...preview].sort((a,b)=>a-b).join(', ')}`
                            : invalid
                              ? `No valid pages (doc has ${numPages} pages)`
                              : 'Comma-separated · ranges use dash · reverse OK'}
                        </p>
                      </div>
                    )
                  })()}
                </label>
                <label style={labelWrap}>
                  Font Size: {wmSize}pt
                  <input type="range" min={12} max={120} value={wmSize} onChange={e => setWmSize(Number(e.target.value))} style={{ display: 'block', width: '100%', marginTop: 6 }} />
                </label>
                <label style={labelWrap}>
                  Opacity: {Math.round(wmOpacity * 100)}%
                  <input type="range" min={5} max={80} value={Math.round(wmOpacity * 100)} onChange={e => setWmOpacity(Number(e.target.value) / 100)} style={{ display: 'block', width: '100%', marginTop: 6 }} />
                </label>
              </div>
              <button onClick={applyWatermark} disabled={processing || !wmText.trim()} style={primaryBtn(processing || !wmText.trim())}>
                {processing ? 'Applying…' : 'Apply Watermark'}
              </button>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: 24 }} />

            {/* form fill */}
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>Fill Form Fields</h2>
              {formFields.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
                  No editable AcroForm fields detected in this document.
                </p>
              ) : (
                <>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginBottom: 12 }}>
                    {formFields.length} field{formFields.length !== 1 ? 's' : ''} detected. Filling will flatten the form (makes fields non-editable).
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxWidth: 640 }}>
                    {formFields.map(({ name, type }) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-ink)', width: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={name}>{name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', width: 80, flexShrink: 0 }}>{type}</span>
                        {type === 'CheckBox' ? (
                          <select value={formValues[name] || 'false'} onChange={e => setFormValues(v => ({ ...v, [name]: e.target.value }))} style={{ ...fieldInput, width: 120 }}>
                            <option value="false">Unchecked</option>
                            <option value="true">Checked</option>
                          </select>
                        ) : (
                          <input value={formValues[name] || ''} onChange={e => setFormValues(v => ({ ...v, [name]: e.target.value }))} style={{ ...fieldInput, flex: 1 }} />
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={fillForm} disabled={processing} style={primaryBtn(processing)}>
                    {processing ? 'Filling…' : 'Fill & Flatten Form'}
                  </button>
                </>
              )}
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: 24 }} />

            {/* metadata */}
            <section>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 10 }}>Document Metadata</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12, maxWidth: 700 }}>
                {[['title', 'Title'], ['author', 'Author'], ['subject', 'Subject'], ['keywords', 'Keywords'], ['creator', 'Creator App']].map(([key, lbl]) => (
                  <label key={key} style={labelWrap}>
                    {lbl}
                    <input value={meta[key]} onChange={e => setMeta(m => ({ ...m, [key]: e.target.value }))} style={fieldInput} />
                  </label>
                ))}
              </div>
              <button onClick={saveMeta} disabled={processing} style={primaryBtn(processing)}>
                {processing ? 'Saving…' : 'Save Metadata'}
              </button>
            </section>
          </div>
        )}

        {/* ── EXPORT ── */}
        {tab === 'export' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* summary */}
            <div style={{
              padding: '12px 16px', borderRadius: 8, marginBottom: 20,
              border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-surface)',
            }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 10 }}>Document Summary</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                {[['File', fileName], ['Pages', String(numPages)], ['Current size', fmtBytes(workBytes?.length)], ['Original size', fmtBytes(originalBytes?.length)]].map(([lbl, val]) => (
                  <div key={lbl}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: '0 0 2px' }}>{lbl}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
              <button onClick={download} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 6,
                backgroundColor: 'var(--color-primary)', color: 'var(--color-ink-on-primary)',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 500,
              }}>
                <Download size={15} strokeWidth={1.5} /> Download Modified PDF
              </button>
              <button onClick={restoreOriginal} disabled={processing} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 6,
                backgroundColor: 'var(--color-surface)', color: 'var(--color-ink)',
                border: '1px solid var(--color-border-strong)', cursor: processing ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 500, opacity: processing ? 0.6 : 1,
              }}>
                <Undo2 size={15} strokeWidth={1.5} /> Restore Original
              </button>
              <button onClick={clearAll} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 6,
                backgroundColor: 'transparent', color: 'var(--color-error)',
                border: '1px solid var(--color-error)', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 500,
              }}>
                <Trash2 size={15} strokeWidth={1.5} /> Clear & Close Document
              </button>
            </div>

            {/* privacy note */}
            <div style={{
              marginTop: 24, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 6,
              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', maxWidth: 500,
            }}>
              <Shield size={14} strokeWidth={1.5} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0 }}>
                Your document is held in browser memory only. "Clear & Close" flushes all PDF data. No data is ever sent to a server.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
