import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  MotionConfig,
} from 'framer-motion'
import { ArrowUpRight, ShieldCheck, ChevronDown, Lock } from 'lucide-react'
import { TOOLS } from './registry'

// Height of one stage = viewport minus the 48px toolbar that sits above <main>.
const PANE = 'calc(100vh - 48px)'
// Scroll height each tool's description occupies in the sticky showcase.
const STEP = 'calc((100vh - 48px) * 0.55)'

const COLORS = {
  primary: 'var(--color-primary)',
  accent: 'var(--color-accent)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  ink: 'var(--color-ink)',
  muted: 'var(--color-ink-muted)',
  faint: 'var(--color-ink-faint)',
}

// framer's useScroll does not track a `target` against a custom scroll
// `container`, so we measure each section against the scroller ourselves and
// feed a MotionValue. Progress: 0 when the section top meets the container top,
// 1 when its bottom meets the container top (the sticky-pinned span).
function useSceneProgress(ref, container) {
  const mv = useMotionValue(0)
  useEffect(() => {
    const el = ref.current
    const scroller = container?.current
    if (!el || !scroller) return
    let frame = 0
    const update = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const cr = scroller.getBoundingClientRect()
      const p = r.height ? (cr.top - r.top) / r.height : 0
      mv.set(Math.min(1, Math.max(0, p)))
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref, container, mv])
  return mv
}

function Bar({ w, h = 8, c = 'var(--color-border-strong)' }) {
  return <span style={{ display: 'block', width: w, height: h, borderRadius: 4, backgroundColor: c }} />
}

function Tok({ c = COLORS.ink, children }) {
  return <span style={{ color: c }}>{children}</span>
}

// ─── shared preview primitives ─────────────────────────────────────────────────

function Code({ children, size = '0.8125rem', lh = 1.95 }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: size, lineHeight: lh, color: COLORS.ink }}>
      {children}
    </div>
  )
}

function KV({ k, v, vc = COLORS.ink }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: COLORS.muted }}>{k}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: vc }}>{v}</span>
    </div>
  )
}

function Octets({ parts, cidr }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: '1rem', flexWrap: 'wrap' }}>
      {parts.map((o, i) => (
        <Fragment key={i}>
          <span style={{ padding: '4px 8px', borderRadius: 4, backgroundColor: 'var(--color-primary-subtle)', color: COLORS.primary }}>{o}</span>
          {i < parts.length - 1 && <Tok c={COLORS.faint}>.</Tok>}
        </Fragment>
      ))}
      {cidr != null && <span style={{ marginLeft: 4, fontSize: '0.8125rem', color: COLORS.muted }}>/{cidr}</span>}
    </div>
  )
}

// ─── per-tool previews ─────────────────────────────────────────────────────────

function JsonPreview() {
  return (
    <Code>
      <div><Tok c={COLORS.faint}>{'{'}</Tok></div>
      <div style={{ paddingLeft: 16 }}><Tok c={COLORS.accent}>"name"</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.success}>"devtools"</Tok><Tok c={COLORS.faint}>,</Tok></div>
      <div style={{ paddingLeft: 16 }}><Tok c={COLORS.accent}>"tools"</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.primary}>19</Tok><Tok c={COLORS.faint}>,</Tok></div>
      <div style={{ paddingLeft: 16 }}><Tok c={COLORS.accent}>"clientSide"</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.primary}>true</Tok><Tok c={COLORS.faint}>,</Tok></div>
      <div style={{ paddingLeft: 16 }}><Tok c={COLORS.accent}>"uploads"</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.warning}>null</Tok></div>
      <div><Tok c={COLORS.faint}>{'}'}</Tok></div>
    </Code>
  )
}

function PasswordPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', letterSpacing: '0.04em', color: COLORS.ink, wordBreak: 'break-all', lineHeight: 1.5 }}>
        k7$Lm9!qX2<Tok c={COLORS.primary}>vP</Tok>@1z<Tok c={COLORS.accent}>Rf</Tok>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[COLORS.success, COLORS.success, COLORS.success, COLORS.success, 'var(--color-border-strong)'].map((c, i) => (
          <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c }} />
        ))}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: COLORS.success }}>● very strong · 92 bits</span>
    </div>
  )
}

function TimestampPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <KV k="Unix" v="1718236800" />
      <KV k="ISO 8601" v="2024-06-13T00:00Z" />
      <KV k="Relative" v="in 2 hours" vc={COLORS.primary} />
      <KV k="Local" v="Thu, 13 Jun 08:00" />
    </div>
  )
}

function Base64Preview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: COLORS.faint }}>TEXT</span>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', color: COLORS.ink }}>Hello, devtools</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: COLORS.primary, margin: '2px 0' }}>↓ encode</div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: COLORS.faint }}>BASE64</span>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', color: COLORS.accent, wordBreak: 'break-all' }}>SGVsbG8sIGRldnRvb2xz</div>
    </div>
  )
}

function CronPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', display: 'flex', gap: 12 }}>
        <Tok c={COLORS.primary}>0</Tok><Tok c={COLORS.primary}>9</Tok><Tok c={COLORS.faint}>*</Tok><Tok c={COLORS.faint}>*</Tok><Tok c={COLORS.accent}>1-5</Tok>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: COLORS.muted }}>
        At 09:00, Monday to Friday
      </div>
      <div style={{ display: 'flex', gap: 14, fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: COLORS.faint }}>
        {['min', 'hour', 'dom', 'mon', 'dow'].map(f => <span key={f}>{f}</span>)}
      </div>
    </div>
  )
}

function QrPreview() {
  const n = 11
  const cells = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const corner = (r < 3 && c < 3) || (r < 3 && c > n - 4) || (r > n - 4 && c < 3)
      const on = corner || ((r * 7 + c * 3 + (r ^ c)) % 3 === 0)
      cells.push(on)
    }
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 2, width: 168, aspectRatio: '1', margin: '0 auto' }}>
      {cells.map((on, i) => (
        <span key={i} style={{ aspectRatio: '1', borderRadius: 1, backgroundColor: on ? COLORS.ink : 'transparent' }} />
      ))}
    </div>
  )
}

function SvgPreview() {
  return (
    <Code lh={1.95}>
      <div><Tok c={COLORS.primary}>{'<svg'}</Tok> <Tok c={COLORS.accent}>viewBox</Tok>=<Tok c={COLORS.success}>{'"0 0 24 24"'}</Tok><Tok c={COLORS.primary}>{'>'}</Tok></div>
      <div style={{ paddingLeft: 16 }}><Tok c={COLORS.primary}>{'<path'}</Tok> <Tok c={COLORS.accent}>d</Tok>=<Tok c={COLORS.success}>{'"M12 2L2 22h20Z"'}</Tok></div>
      <div style={{ paddingLeft: 40 }}><Tok c={COLORS.accent}>fill</Tok>=<Tok c={COLORS.success}>{'"#e2502a"'}</Tok> <Tok c={COLORS.primary}>{'/>'}</Tok></div>
      <div><Tok c={COLORS.primary}>{'</svg>'}</Tok></div>
    </Code>
  )
}

function MarkdownDocPreview() {
  return (
    <Code lh={2}>
      <div><Tok c={COLORS.primary}># DevTools</Tok></div>
      <div>Render <b>{'**markdown**'}</b> with <Tok c={COLORS.accent}>`code`</Tok>,</div>
      <div><Tok c={COLORS.primary}>-</Tok> lists and tables</div>
      <div><Tok c={COLORS.primary}>-</Tok> math <Tok c={COLORS.accent}>$E=mc^2$</Tok></div>
      <div><Tok c={COLORS.faint}>{'> blockquotes'}</Tok></div>
    </Code>
  )
}

function ConvertPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {['CSV', 'YAML', 'XML'].map((t, i) => (
          <span key={t} style={{
            padding: '3px 10px', borderRadius: 9999, fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
            backgroundColor: i === 0 ? 'var(--color-primary)' : 'var(--color-surface-raised)',
            color: i === 0 ? 'var(--color-ink-on-primary)' : COLORS.muted,
          }}>{t}</span>
        ))}
      </div>
      <Code lh={1.95}>
        <div><Tok c={COLORS.accent}>id,name,role</Tok></div>
        <div>1,Ada,<Tok c={COLORS.primary}>admin</Tok></div>
        <div>2,Lin,<Tok c={COLORS.primary}>viewer</Tok></div>
      </Code>
    </div>
  )
}

function TreePreview() {
  const Row = ({ pad, label, val, c }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: pad, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', lineHeight: 2.1 }}>
      <Tok c={COLORS.faint}>{val === undefined ? '▾' : '•'}</Tok>
      <Tok c={COLORS.ink}>{label}</Tok>
      {val !== undefined && <><Tok c={COLORS.faint}>:</Tok><Tok c={c}>{val}</Tok></>}
    </div>
  )
  return (
    <div>
      <Row pad={0} label="response" />
      <Row pad={18} label="status" val="200" c={COLORS.primary} />
      <Row pad={18} label="items" />
      <Row pad={36} label="0" val={'"alpha"'} c={COLORS.success} />
      <Row pad={36} label="1" val={'"beta"'} c={COLORS.success} />
      <Row pad={18} label="ok" val="true" c={COLORS.primary} />
    </div>
  )
}

function DiffPreview() {
  const line = (sign, text, bg, fg) => (
    <div style={{ display: 'flex', gap: 8, padding: '1px 6px', borderRadius: 3, backgroundColor: bg || 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', lineHeight: 2 }}>
      <span style={{ width: 10, color: fg || COLORS.faint }}>{sign}</span>
      <span style={{ color: fg || COLORS.ink }}>{text}</span>
    </div>
  )
  return (
    <div>
      {line(' ', '"name": "app",')}
      {line('-', '"debug": true,', 'color-mix(in oklch, var(--color-error) 14%, transparent)', 'var(--color-error)')}
      {line('+', '"debug": false,', 'color-mix(in oklch, var(--color-success) 16%, transparent)', COLORS.success)}
      {line(' ', '"version": 2')}
    </div>
  )
}

function TimezonePreview() {
  const rows = [['New York', '09:00', 'EDT'], ['London', '14:00', 'BST'], ['Tokyo', '22:00', 'JST'], ['Sydney', '23:00', 'AEST']]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map(([city, time, tz]) => (
        <div key={city} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: COLORS.muted }}>{city}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: COLORS.ink }}>{time} <Tok c={COLORS.faint}>{tz}</Tok></span>
        </div>
      ))}
    </div>
  )
}

function PyDictPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Code>
        <div><Tok c={COLORS.faint}>{'{'}</Tok></div>
        <div style={{ paddingLeft: 16 }}><Tok c={COLORS.success}>'name'</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.success}>'devtools'</Tok><Tok c={COLORS.faint}>,</Tok></div>
        <div style={{ paddingLeft: 16 }}><Tok c={COLORS.success}>'active'</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.primary}>True</Tok><Tok c={COLORS.faint}>,</Tok></div>
        <div style={{ paddingLeft: 16 }}><Tok c={COLORS.success}>'count'</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.warning}>None</Tok><Tok c={COLORS.faint}>,</Tok></div>
        <div><Tok c={COLORS.faint}>{'}'}</Tok></div>
      </Code>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: COLORS.primary }}>→ valid JSON</span>
    </div>
  )
}

function BlowfishPreview() {
  return (
    <Code>
      <div><Tok c={COLORS.primary}>[params]</Tok></div>
      <div><Tok c={COLORS.accent}>colorScheme</Tok> <Tok c={COLORS.faint}>=</Tok> <Tok c={COLORS.success}>"blowfish"</Tok></div>
      <div><Tok c={COLORS.accent}>darkMode</Tok> <Tok c={COLORS.faint}>=</Tok> <Tok c={COLORS.success}>"auto"</Tok></div>
      <div style={{ marginTop: 6 }}><Tok c={COLORS.primary}>[params.header]</Tok></div>
      <div><Tok c={COLORS.accent}>layout</Tok> <Tok c={COLORS.faint}>=</Tok> <Tok c={COLORS.success}>"fixed"</Tok></div>
    </Code>
  )
}

function ArticlePreview() {
  return (
    <Code>
      <div><Tok c={COLORS.faint}>---</Tok></div>
      <div><Tok c={COLORS.accent}>title</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.success}>"My First Post"</Tok></div>
      <div><Tok c={COLORS.accent}>date</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.ink}>2024-06-13</Tok></div>
      <div><Tok c={COLORS.accent}>tags</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.success}>["hugo", "blog"]</Tok></div>
      <div><Tok c={COLORS.accent}>draft</Tok><Tok c={COLORS.faint}>: </Tok><Tok c={COLORS.primary}>false</Tok></div>
      <div><Tok c={COLORS.faint}>---</Tok></div>
    </Code>
  )
}

function SubnetPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Octets parts={['192', '168', '1', '0']} cidr="24" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <KV k="Network" v="192.168.1.0" />
        <KV k="Broadcast" v="192.168.1.255" />
        <KV k="Usable hosts" v="254" vc={COLORS.primary} />
      </div>
    </div>
  )
}

function IpConvertPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Octets parts={['192', '168', '1', '10']} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <KV k="binary" v="11000000.10101000…" />
        <KV k="hex" v="0xC0A8010A" vc={COLORS.accent} />
        <KV k="integer" v="3232235786" vc={COLORS.primary} />
      </div>
    </div>
  )
}

function DocPreview({ locked }) {
  return (
    <div style={{ position: 'relative', height: 150, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {[-8, 0, 8].map((dx, i) => (
        <div key={i} style={{
          position: 'absolute', width: 96, height: 128, borderRadius: 6,
          backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border-strong)',
          transform: `translateX(${dx * 2.4}px) rotate(${dx * 0.5}deg)`,
          boxShadow: 'var(--shadow-sm)', padding: 12,
          display: 'flex', flexDirection: 'column', gap: 6, zIndex: i,
        }}>
          <Bar w="70%" h={5} />
          <Bar w="100%" h={4} c="var(--color-border)" />
          <Bar w="90%" h={4} c="var(--color-border)" />
          <Bar w="95%" h={4} c="var(--color-border)" />
          <Bar w="60%" h={4} c="var(--color-border)" />
        </div>
      ))}
      {locked && (
        <span style={{
          position: 'absolute', zIndex: 10, width: 40, height: 40, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: COLORS.primary, boxShadow: '0 0 0 6px var(--color-surface-wash)',
        }}>
          <Lock size={18} strokeWidth={2} style={{ color: 'var(--color-ink-on-primary)' }} />
        </span>
      )}
    </div>
  )
}

// Each tool gets a preview that mirrors what it actually does.
const PREVIEWS = {
  '/password': PasswordPreview,
  '/timestamp': TimestampPreview,
  '/json': JsonPreview,
  '/base64': Base64Preview,
  '/cron': CronPreview,
  '/qr': QrPreview,
  '/svg': SvgPreview,
  '/markdown': MarkdownDocPreview,
  '/json-convert': ConvertPreview,
  '/json-tree': TreePreview,
  '/json-diff': DiffPreview,
  '/timezone': TimezonePreview,
  '/pydict': PyDictPreview,
  '/blowfish': BlowfishPreview,
  '/blowfish-article': ArticlePreview,
  '/subnet': SubnetPreview,
  '/ip-convert': IpConvertPreview,
  '/pdf': () => <DocPreview />,
  '/pdf-security': () => <DocPreview locked />,
}

// ─── scene visual: a faux browser window holding the preview ───────────────────

function SceneFrame({ tool }) {
  const { path, icon: Icon } = tool
  const Preview = PREVIEWS[path] || JsonPreview
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 rounded-pill"
        style={{ background: 'radial-gradient(closest-side, var(--color-primary-glow), transparent)', opacity: 0.9 }}
      />
      <div
        className="relative w-full overflow-hidden rounded-lg border"
        style={{
          borderColor: 'var(--color-border-strong)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          className="flex items-center gap-2 border-b px-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)', height: 34 }}
        >
          <span style={{ display: 'flex', gap: 6 }}>
            {['var(--color-error)', 'var(--color-warning)', 'var(--color-success)'].map((c, i) => (
              <span key={i} style={{ width: 9, height: 9, borderRadius: 9999, backgroundColor: c, opacity: 0.7 }} />
            ))}
          </span>
          <span className="ml-2 flex items-center gap-1.5 font-mono text-2xs" style={{ color: 'var(--color-ink-faint)' }}>
            <Icon size={12} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
            devtools{path}
          </span>
        </div>
        <div className="p-6" style={{ minHeight: 210, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Preview />
        </div>
      </div>
    </div>
  )
}

// ─── sticky showcase: one pinned visual that crossfades while text scrolls ─────

function ShowcaseStep({ tool, index, total, active, onActive, container }) {
  const navigate = useNavigate()
  const ref = useRef(null)
  const Icon = tool.icon

  useEffect(() => {
    const el = ref.current
    const root = container?.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) onActive(index) }),
      { root: root || null, rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [index, onActive, container])

  return (
    <div ref={ref} className="flex flex-col justify-center" style={{ minHeight: STEP, paddingBlock: '2rem' }}>
      {/* inline visual on mobile; desktop uses the shared sticky panel instead */}
      <div className="mb-6 w-full max-w-md lg:hidden">
        <SceneFrame tool={tool} />
      </div>
      <motion.div
        initial={false}
        animate={{ opacity: active ? 1 : 0.4 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--color-primary-subtle)' }}>
            <Icon size={22} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--color-ink-faint)' }}>
            {String(index + 1).padStart(2, '0')} / {total}
          </span>
        </div>
        <h2
          className="font-sans font-semibold text-ink"
          style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.75rem)', lineHeight: 1.06, letterSpacing: '-0.03em', textWrap: 'balance' }}
        >
          {tool.label}
        </h2>
        <p className="mt-3 font-sans text-ink-muted" style={{ fontSize: '1.0625rem', lineHeight: 1.6, maxWidth: '42ch' }}>
          {tool.desc}
        </p>
        <motion.button
          onClick={() => navigate(tool.path)}
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
          className="mt-6 inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-mono text-sm font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-ink-on-primary)' }}
        >
          Open {tool.label}
          <ArrowUpRight size={16} strokeWidth={2} />
        </motion.button>
      </motion.div>
    </div>
  )
}

function Showcase({ container }) {
  const [active, setActive] = useState(0)
  return (
    <section className="mx-auto max-w-6xl px-6 sm:px-12">
      <div className="lg:grid lg:grid-cols-2 lg:gap-14">
        {/* shared sticky visual (desktop only) */}
        <div className="hidden lg:block">
          <div className="sticky flex items-center" style={{ top: 0, height: PANE }}>
            <div className="relative w-full max-w-md">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <SceneFrame tool={TOOLS[active]} />
              </motion.div>
            </div>
          </div>
        </div>

        {/* scrolling descriptions */}
        <div>
          {TOOLS.map((tool, i) => (
            <ShowcaseStep
              key={tool.path}
              tool={tool}
              index={i}
              total={TOOLS.length}
              active={i === active}
              onActive={setActive}
              container={container}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── intro hero ────────────────────────────────────────────────────────────────

const HERO_WORDS = [
  { t: 'Nineteen' }, { t: 'developer' }, { t: 'tools,' },
  { t: 'one', br: true }, { t: 'at', }, { t: 'a' }, { t: 'time.', primary: true },
]

function Hero({ container, onExplore }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const scrollYProgress = useSceneProgress(ref, container)
  const y = useTransform(scrollYProgress, [0, 1], [0, -70])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92])
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0])

  const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }
  const word = {
    hidden: { y: '110%', opacity: 0, rotate: 2 },
    show: { y: 0, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 320, damping: 30 } },
  }
  const fade = {
    hidden: { y: 14, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  }

  return (
    <section ref={ref} style={{ position: 'relative', height: PANE }}>
      <motion.div
        style={reduce ? undefined : { y, scale, opacity }}
        className="mx-auto flex h-full max-w-5xl flex-col justify-center px-6 sm:px-12"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(110% 80% at 30% 20%, black, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(110% 80% at 30% 20%, black, transparent 70%)',
            opacity: 0.35,
          }}
        />
        <motion.h1
          variants={containerV}
          initial="hidden"
          animate="show"
          className="relative flex flex-wrap items-baseline font-sans font-semibold text-ink"
          style={{ fontSize: 'clamp(2.4rem, 6.5vw, 4.5rem)', lineHeight: 1.02, letterSpacing: '-0.035em' }}
        >
          {HERO_WORDS.map((w, i) => (
            <Fragment key={i}>
              {w.br && <span className="basis-full" style={{ height: 0 }} />}
              <span className="overflow-hidden" style={{ display: 'inline-flex', paddingBottom: '0.08em' }}>
                <motion.span variants={word} style={{ color: w.primary ? 'var(--color-primary)' : undefined, marginRight: '0.26em' }}>
                  {w.t}
                </motion.span>
              </span>
            </Fragment>
          ))}
        </motion.h1>

        <motion.p
          variants={fade} initial="hidden" animate="show" transition={{ delay: 0.6 }}
          className="relative mt-5 max-w-xl font-sans text-ink-muted"
          style={{ fontSize: '1.125rem', lineHeight: 1.6 }}
        >
          A client-side toolbox for everyday developer work. Scroll to meet each one, or jump straight in.
        </motion.p>

        <motion.div
          variants={fade} initial="hidden" animate="show" transition={{ delay: 0.72 }}
          className="relative mt-6 inline-flex items-center gap-2 self-start rounded-pill border px-3 py-1.5"
          style={{ borderColor: 'var(--color-border-strong)', backgroundColor: 'var(--color-surface-wash)' }}
        >
          <ShieldCheck size={14} strokeWidth={1.75} style={{ color: 'var(--color-success)' }} />
          <span className="font-mono text-2xs font-medium text-ink-muted">100% client-side · nothing leaves this tab</span>
        </motion.div>

        <motion.button
          onClick={onExplore}
          variants={fade} initial="hidden" animate="show" transition={{ delay: 0.9 }}
          className="relative mt-10 inline-flex items-center gap-2 self-start font-mono text-xs"
          style={{ color: 'var(--color-ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Scroll to explore
          <motion.span
            animate={reduce ? undefined : { y: [0, 4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'inline-flex' }}
          >
            <ChevronDown size={14} strokeWidth={2} style={{ color: 'var(--color-primary)' }} />
          </motion.span>
        </motion.button>
      </motion.div>
    </section>
  )
}

// ─── finale: quick-access grid of every tool ───────────────────────────────────

function FinaleGrid() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-12">
      <h2 className="font-sans text-lg font-semibold text-ink" style={{ letterSpacing: '-0.02em' }}>
        All tools
      </h2>
      <p className="mb-6 mt-1 font-sans text-sm text-ink-muted">Jump straight to any of the nineteen.</p>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {TOOLS.map(tool => {
          const Icon = tool.icon
          const hover = hovered === tool.path
          return (
            <motion.button
              key={tool.path}
              variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } } }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => navigate(tool.path)}
              onHoverStart={() => setHovered(tool.path)}
              onHoverEnd={() => setHovered(null)}
              className="flex items-center gap-3 rounded-lg border p-3 text-left"
              style={{
                backgroundColor: hover ? 'var(--color-surface-raised)' : 'var(--color-surface)',
                borderColor: hover ? 'var(--color-primary)' : 'var(--color-border-strong)',
                cursor: 'pointer',
                transition: 'border-color var(--dur-fast) var(--ease-out-quart), background-color var(--dur-fast) var(--ease-out-quart)',
              }}
            >
              <span
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md"
                style={{
                  backgroundColor: hover ? 'var(--color-primary)' : 'var(--color-primary-subtle)',
                  transition: 'background-color var(--dur-fast) var(--ease-out-quart)',
                }}
              >
                <Icon size={16} strokeWidth={1.75} style={{ color: hover ? 'var(--color-ink-on-primary)' : 'var(--color-primary)', transition: 'color var(--dur-fast) var(--ease-out-quart)' }} />
              </span>
              <span className="font-mono text-sm font-medium text-ink">{tool.label}</span>
            </motion.button>
          )
        })}
      </motion.div>
    </section>
  )
}

// ─── scroll progress rail ──────────────────────────────────────────────────────

function ProgressRail({ container, total }) {
  const { scrollYProgress } = useScroll({ container })
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1])
  const [n, setN] = useState(1)
  useMotionValueEvent(scrollYProgress, 'change', v => {
    // +1 hero stage before the tools; clamp to the tool count.
    setN(Math.min(total, Math.max(1, Math.round(v * (total + 1)))))
  })
  return (
    <div className="fixed right-4 top-1/2 z-sticky hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex">
      <span className="font-mono text-2xs tabular-nums" style={{ color: 'var(--color-ink-faint)' }}>
        {String(n).padStart(2, '0')}
      </span>
      <div style={{ position: 'relative', width: 2, height: 120, borderRadius: 9999, backgroundColor: 'var(--color-border-strong)', overflow: 'hidden' }}>
        <motion.div
          style={{ position: 'absolute', inset: 0, transformOrigin: 'top', scaleY: fill, backgroundColor: 'var(--color-primary)' }}
        />
      </div>
      <span className="font-mono text-2xs tabular-nums" style={{ color: 'var(--color-ink-faint)' }}>{total}</span>
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const { scrollRef } = useOutletContext() || {}

  function scrollToFirst() {
    const el = scrollRef?.current
    if (el) el.scrollTo({ top: el.clientHeight, behavior: 'smooth' })
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* break out of the <main> padding so each stage is full-bleed.
          No overflow here: overflow-x:hidden would make this a scroll
          container and break the sticky pinning inside each scene. */}
      <div style={{ margin: '-1.5rem' }}>
        <Hero container={scrollRef} onExplore={scrollToFirst} />
        <Showcase container={scrollRef} />
        <FinaleGrid />
      </div>
      {scrollRef && <ProgressRail container={scrollRef} total={TOOLS.length} />}
    </MotionConfig>
  )
}
