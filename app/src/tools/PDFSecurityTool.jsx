import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib-plus-encrypt'
import {
  Upload, X, Lock, LockOpen, ShieldCheck, Download,
  CheckCircle, AlertCircle, Info, RotateCcw, FileText,
  Eye, EyeOff, Settings2,
} from 'lucide-react'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(2)} MB`
}

function triggerDownload(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatusBanner({ type, message, onClose }) {
  const cfg = {
    success: { v: '--color-success', Icon: CheckCircle },
    error:   { v: '--color-error',   Icon: AlertCircle },
    info:    { v: '--color-info',    Icon: Info },
  }
  const { v, Icon } = cfg[type] ?? cfg.info
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '10px 12px', borderRadius: 6,
      border: `1px solid var(${v})`,
      background: `color-mix(in oklch, var(${v}) 12%, var(--color-surface))`,
    }}>
      <Icon size={14} strokeWidth={1.5} style={{ color: `var(${v})`, flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-ink)', flex: 1, lineHeight: 1.5 }}>
        {message}
      </span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}>
          <X size={13} style={{ color: 'var(--color-ink-faint)' }} />
        </button>
      )}
    </div>
  )
}

function PasswordInput({ label, hint, value, onChange, onEnter, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-ink)', marginBottom: 4 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--color-ink-faint)', marginLeft: 6, fontSize: '0.75rem' }}>{hint}</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '7px 36px 7px 12px',
            fontFamily: 'var(--font-mono)', fontSize: '0.875rem',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 6, color: 'var(--color-ink)', outline: 'none',
          }}
        />
        <button
          type="button" onClick={() => setVisible(v => !v)} tabIndex={-1}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: 'var(--color-ink-faint)' }}>
          {visible ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 18, borderRadius: 9, flexShrink: 0,
          background: checked ? 'var(--color-primary)' : 'var(--color-border-strong)',
          position: 'relative', transition: 'background 150ms ease-out', cursor: 'pointer',
        }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 14 : 2,
          width: 14, height: 14, borderRadius: '50%', background: 'white',
          transition: 'left 150ms ease-out', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-ink)' }}>{label}</span>
    </label>
  )
}

function ProgressBar({ current, total, label }) {
  const pct = total > 0 ? (current / total) * 100 : 0
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: '0 0 6px' }}>
        {label}
      </p>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border-strong)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2, background: 'var(--color-primary)',
          width: `${pct}%`, transition: 'width 200ms ease-out',
        }} />
      </div>
    </div>
  )
}

function ActionButton({ onClick, disabled, loading, label, loadingLabel }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '9px 18px', borderRadius: 6, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 500,
        background: disabled ? 'var(--color-surface-raised)' : 'var(--color-primary)',
        color: disabled ? 'var(--color-ink-faint)' : 'var(--color-ink-on-primary)',
        opacity: disabled ? 0.7 : 1, transition: 'background 120ms ease-out',
        alignSelf: 'flex-start',
      }}>
      {loading
        ? <div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'pdf-sec-spin 0.75s linear infinite' }} />
        : <Download size={15} strokeWidth={1.5} />}
      {loading ? loadingLabel : label}
    </button>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

const DEFAULT_PERMS = {
  printing: true,
  copying: false,
  modifying: false,
  annotating: true,
  fillingForms: true,
}

export default function PDFSecurityTool() {
  const [mode, setMode]             = useState('encrypt')
  const [file, setFile]             = useState(null)
  const [status, setStatus]         = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]     = useState({ current: 0, total: 0 })
  const [dragging, setDragging]     = useState(false)
  const [showPerms, setShowPerms]   = useState(false)

  // 'checking' | 'encrypted' | 'unencrypted' | null
  const [pdfEncStatus, setPdfEncStatus] = useState(null)

  // unlock state
  const [unlockPass, setUnlockPass] = useState('')

  // encrypt state
  const [userPass, setUserPass]   = useState('')
  const [ownerPass, setOwnerPass] = useState('')
  const [perms, setPerms]         = useState(DEFAULT_PERMS)

  function clearAll() {
    setFile(null); setStatus(null); setProcessing(false)
    setProgress({ current: 0, total: 0 })
    setUnlockPass(''); setUserPass(''); setOwnerPass('')
    setPerms(DEFAULT_PERMS); setShowPerms(false)
    setPdfEncStatus(null)
  }

  async function checkEncryption(bytes) {
    setPdfEncStatus('checking')
    try {
      const doc = await pdfjsLib.getDocument({ data: bytes.slice(), password: '' }).promise
      doc.destroy()
      setPdfEncStatus('unencrypted')
    } catch (e) {
      if (e.name === 'PasswordException') {
        setPdfEncStatus('encrypted')
      } else {
        setPdfEncStatus(null)
      }
    }
  }

  function loadFile(f) {
    const nameOk = f.name.toLowerCase().endsWith('.pdf')
    const typeOk = !f.type || f.type === 'application/pdf'
    if (!nameOk || !typeOk) {
      setStatus({ type: 'error', message: `"${f.name}" is not a PDF. Only .pdf files are accepted.` })
      return
    }
    if (f.size > 200 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'File exceeds the 200 MB limit.' }); return
    }
    setStatus(null); setPdfEncStatus(null)
    const reader = new FileReader()
    reader.onload = e => {
      const bytes = new Uint8Array(e.target.result)
      setFile({ name: f.name, size: f.size, bytes })
      checkEncryption(bytes)
    }
    reader.readAsArrayBuffer(f)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) loadFile(f)
  }

  // ── ENCRYPT ──────────────────────────────────────────────────────────────

  async function handleEncrypt() {
    if (!file || !userPass.trim() || processing) return
    setProcessing(true); setStatus(null)

    try {
      let doc
      try {
        doc = await PDFDocument.load(file.bytes.slice())
      } catch (e) {
        if (e.message?.toLowerCase().includes('encrypt')) {
          throw new Error('This PDF is already encrypted. Use the Unlock tab first to remove the existing password, then encrypt again.')
        }
        throw new Error('Could not read this PDF. The file may be corrupted.')
      }

      if (doc.isEncrypted) {
        throw new Error('This PDF is already encrypted. Use the Unlock tab first, then encrypt again.')
      }

      await doc.encrypt({
        userPassword: userPass,
        ownerPassword: ownerPass.trim() || userPass,
        permissions: {
          printing: perms.printing ? 'highResolution' : false,
          copying: perms.copying,
          modifying: perms.modifying,
          annotating: perms.annotating,
          fillingForms: perms.fillingForms,
        },
      })

      const encBytes = await doc.save()
      const outName  = file.name.replace(/\.pdf$/i, '') + '_encrypted.pdf'
      triggerDownload(encBytes, outName)
      setStatus({
        type: 'success',
        message: `Encrypted! Downloading "${outName}". The PDF is protected with AES-128 and requires the password you set to open.`,
      })

    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to encrypt PDF.' })
    } finally {
      setProcessing(false)
    }
  }

  // ── UNLOCK ───────────────────────────────────────────────────────────────

  async function handleUnlock() {
    if (!file || processing) return
    setProcessing(true); setStatus(null); setProgress({ current: 0, total: 0 })

    try {
      let pdfJsDoc
      try {
        pdfJsDoc = await pdfjsLib.getDocument({
          data: file.bytes.slice(),
          password: unlockPass || '',
        }).promise
      } catch (e) {
        if (e.name === 'PasswordException') {
          if (e.code === 1) throw new Error('This PDF requires a password. Enter it above.')
          throw new Error('Incorrect password. Please check and try again.')
        }
        throw new Error('Could not read this PDF. The file may be corrupted.')
      }

      const numPages = pdfJsDoc.numPages
      setProgress({ current: 0, total: numPages })

      const outDoc = await PDFDocument.create()

      for (let pg = 1; pg <= numPages; pg++) {
        setProgress({ current: pg, total: numPages })
        const page     = await pdfJsDoc.getPage(pg)
        const viewport = page.getViewport({ scale: 2.0 })
        const canvas   = document.createElement('canvas')
        canvas.width   = Math.round(viewport.width)
        canvas.height  = Math.round(viewport.height)

        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise

        const dataUrl  = canvas.toDataURL('image/jpeg', 0.92)
        const b64      = dataUrl.slice(dataUrl.indexOf(',') + 1)
        const jpgBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const img      = await outDoc.embedJpg(jpgBytes)
        const ptW      = canvas.width / 2
        const ptH      = canvas.height / 2
        const outPage  = outDoc.addPage([ptW, ptH])
        outPage.drawImage(img, { x: 0, y: 0, width: ptW, height: ptH })

        canvas.width = 0; canvas.height = 0
      }

      const outBytes = await outDoc.save()
      const outName  = file.name.replace(/\.pdf$/i, '') + '_unlocked.pdf'
      triggerDownload(outBytes, outName)
      setStatus({
        type: 'success',
        message: `Unlocked! Downloading "${outName}". Output is a flattened PDF (144 dpi images) — text is readable but not selectable.`,
      })

    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to unlock PDF.' })
    } finally {
      setProcessing(false); setProgress({ current: 0, total: 0 })
    }
  }

  const canUnlock  = Boolean(file && !processing)
  const canEncrypt = Boolean(file && userPass.trim() && !processing)

  // ─── shared render helpers ─────────────────────────────────────────────────

  const DropZone = () => (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('pdf-sec-input')?.click()}
      style={{
        border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
        borderRadius: 8, padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
        background: dragging
          ? 'color-mix(in oklch, var(--color-primary) 8%, var(--color-surface))'
          : 'var(--color-surface)',
        transition: 'border-color 120ms ease-out, background 120ms ease-out',
        marginBottom: 20,
      }}>
      <input id="pdf-sec-input" type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) loadFile(e.target.files[0]) }} />
      <Upload size={28} strokeWidth={1.5} style={{ color: 'var(--color-ink-faint)', display: 'block', margin: '0 auto 12px' }} />
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-ink-muted)', margin: '0 0 4px' }}>
        Drop a PDF here or <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>click to browse</span>
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-faint)', margin: 0 }}>
        .pdf · max 200 MB · never uploaded
      </p>
    </div>
  )

  const FileCard = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', marginBottom: 20 }}>
      <FileText size={20} strokeWidth={1.5} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-ink)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-faint)', margin: 0 }}>{fmtSize(file.size)} · PDF</p>
      </div>
      <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, lineHeight: 0 }}>
        <X size={15} strokeWidth={1.5} style={{ color: 'var(--color-ink-faint)' }} />
      </button>
    </div>
  )

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
          PDF Security
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--color-ink-muted)', margin: 0 }}>
          Encrypt PDFs with AES-128 password protection, or remove encryption from protected PDFs — fully in-browser.
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', marginBottom: 20 }}>
        {[
          { key: 'encrypt', label: 'Encrypt PDF', Icon: Lock },
          { key: 'unlock',  label: 'Unlock PDF',  Icon: LockOpen },
        ].map(({ key, label, Icon }) => (
          <button key={key} onClick={() => { setMode(key); setStatus(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 5, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
              fontWeight: mode === key ? 500 : 400,
              background: mode === key ? 'var(--color-primary)' : 'transparent',
              color: mode === key ? 'var(--color-ink-on-primary)' : 'var(--color-ink-muted)',
              transition: 'background 120ms ease-out, color 120ms ease-out',
            }}>
            <Icon size={14} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* ── ENCRYPT panel ──────────────────────────────────────────────────── */}
      {mode === 'encrypt' && (
        <>
          {!file ? <DropZone /> : <FileCard />}

          {file && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

              <PasswordInput
                label="Open Password"
                hint="required — anyone opening the PDF must enter this"
                value={userPass}
                onChange={v => { setUserPass(v); setStatus(null) }}
                onEnter={() => canEncrypt && handleEncrypt()}
                placeholder="Password to open the PDF"
              />

              <PasswordInput
                label="Owner Password"
                hint="optional — full-access override (defaults to open password if blank)"
                value={ownerPass}
                onChange={v => { setOwnerPass(v); setStatus(null) }}
                placeholder="Leave blank to use the same password"
              />

              {/* Permissions */}
              <div>
                <button
                  onClick={() => setShowPerms(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-ink-muted)' }}>
                  <Settings2 size={14} strokeWidth={1.5} />
                  Permissions
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)', fontWeight: 400 }}>
                    {showPerms ? '▲' : '▼'}
                  </span>
                </button>

                {showPerms && (
                  <div style={{ marginTop: 12, padding: '14px', borderRadius: 6, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-faint)', margin: '0 0 4px', lineHeight: 1.5 }}>
                      Restrictions apply when opened with the open password. The owner password bypasses all of them.
                    </p>
                    {[
                      { key: 'printing',     label: 'Allow printing' },
                      { key: 'copying',      label: 'Allow copying text & images' },
                      { key: 'modifying',    label: 'Allow modifying content' },
                      { key: 'annotating',   label: 'Allow adding comments' },
                      { key: 'fillingForms', label: 'Allow filling form fields' },
                    ].map(({ key, label }) => (
                      <Toggle
                        key={key}
                        checked={perms[key]}
                        onChange={v => setPerms(p => ({ ...p, [key]: v }))}
                        label={label}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Warning */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 6, background: `color-mix(in oklch, var(--color-warning) 12%, var(--color-surface))`, border: '1px solid var(--color-warning)' }}>
                <AlertCircle size={13} strokeWidth={1.5} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.55 }}>
                  If you forget the password, the PDF cannot be recovered. Store it somewhere safe before downloading.
                </p>
              </div>

              <ActionButton
                onClick={handleEncrypt}
                disabled={!canEncrypt}
                loading={processing}
                label="Encrypt & Download"
                loadingLabel="Encrypting…"
              />
            </div>
          )}
        </>
      )}

      {/* ── UNLOCK panel ───────────────────────────────────────────────────── */}
      {mode === 'unlock' && (
        <>
          {!file ? <DropZone /> : <FileCard />}

          {/* Encryption detection badge */}
          {file && pdfEncStatus === 'checking' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', marginBottom: 16 }}>
              <div style={{ width: 12, height: 12, border: '2px solid var(--color-ink-faint)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', flexShrink: 0, animation: 'pdf-sec-spin 0.75s linear infinite' }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
                Checking encryption…
              </span>
            </div>
          )}

          {file && pdfEncStatus === 'unencrypted' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 6, background: `color-mix(in oklch, var(--color-warning) 12%, var(--color-surface))`, border: '1px solid var(--color-warning)', marginBottom: 16 }}>
              <AlertCircle size={14} strokeWidth={1.5} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 2px' }}>
                  No password detected
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.55 }}>
                  This PDF is not password-protected. You can still unlock it to remove owner restrictions (if any) and get a clean, unrestricted copy.
                </p>
              </div>
            </div>
          )}

          {file && pdfEncStatus === 'encrypted' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 6, background: `color-mix(in oklch, var(--color-info) 12%, var(--color-surface))`, border: '1px solid var(--color-info)', marginBottom: 16 }}>
              <Lock size={14} strokeWidth={1.5} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 2px' }}>
                  Password-protected PDF
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.55 }}>
                  Enter the password below to unlock and download an unprotected copy.
                </p>
              </div>
            </div>
          )}

          {file && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

              <PasswordInput
                label="PDF Password"
                hint={pdfEncStatus === 'unencrypted' ? 'not required — this PDF has no user password' : 'leave blank if the PDF has no user password'}
                value={unlockPass}
                onChange={v => { setUnlockPass(v); setStatus(null) }}
                onEnter={() => canUnlock && handleUnlock()}
                placeholder={pdfEncStatus === 'encrypted' ? 'Enter the password used to open this PDF' : 'No password needed'}
              />

              {processing && progress.total > 0 && (
                <ProgressBar
                  current={progress.current}
                  total={progress.total}
                  label={`Rendering page ${progress.current} of ${progress.total}…`}
                />
              )}

              <ActionButton
                onClick={handleUnlock}
                disabled={!canUnlock}
                loading={processing}
                label="Unlock & Download"
                loadingLabel={progress.total > 0 ? `Rendering ${progress.current}/${progress.total}…` : 'Loading…'}
              />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 6, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
                <Info size={13} strokeWidth={1.5} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.55 }}>
                  Output is a <strong>flattened PDF</strong> — each page is rendered as a 144 dpi image. Text stays readable but is no longer selectable or searchable.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Status */}
      {status && (
        <div style={{ marginBottom: 16 }}>
          <StatusBanner type={status.type} message={status.message} onClose={() => setStatus(null)} />
        </div>
      )}

      {/* Clear */}
      {file && !processing && (
        <div style={{ marginBottom: 24 }}>
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border-strong)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', background: 'var(--color-surface)', color: 'var(--color-ink-muted)' }}>
            <RotateCcw size={13} strokeWidth={1.5} />
            Clear & Reset
          </button>
        </div>
      )}

      {/* Privacy card */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: `color-mix(in oklch, var(--color-success) 10%, var(--color-surface))`, border: '1px solid var(--color-success)' }}>
        <ShieldCheck size={16} strokeWidth={1.5} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 2px' }}>
            100% Client-Side Processing
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.55 }}>
            Your PDF and passwords never leave your device. Encryption uses AES-128 via pdf-lib-plus-encrypt.
            Clicking "Clear & Reset" wipes all data from memory.
          </p>
        </div>
      </div>

      <style>{`@keyframes pdf-sec-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
