import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, ChevronRight, Sun, Moon } from 'lucide-react'

function formatDateTime(date) {
  const dd   = date.getDate().toString().padStart(2, '0')
  const mm   = (date.getMonth() + 1).toString().padStart(2, '0')
  const yyyy = date.getFullYear()
  let   h    = date.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const hh   = h.toString().padStart(2, '0')
  const min  = date.getMinutes().toString().padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min} ${ampm}`
}

function ToolbarBtn({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex items-center justify-center w-7 h-7 rounded-sm transition-[transform,background-color,color] duration-fast ease-out active:scale-[0.90]"
      style={{ color: 'var(--color-ink-sidebar-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-sidebar-surface)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  )
}

function Divider() {
  return (
    <div
      className="w-px h-4 flex-shrink-0"
      style={{ backgroundColor: 'var(--color-border-sidebar)' }}
    />
  )
}

export default function Toolbar({ title, collapsed, isDark, onToggleTheme, onToggleSidebar }) {
  const [now, setNow] = useState(() => formatDateTime(new Date()))

  useEffect(() => {
    const id = setInterval(() => setNow(formatDateTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className="flex items-center gap-2 px-3 h-12 border-b flex-shrink-0"
      style={{
        backgroundColor: 'var(--color-toolbar)',
        borderColor: 'var(--color-border-sidebar)',
      }}
    >
      {/* Sidebar toggle */}
      <ToolbarBtn
        onClick={onToggleSidebar}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <PanelLeftOpen  size={16} strokeWidth={1.5} />
          : <PanelLeftClose size={16} strokeWidth={1.5} />
        }
      </ToolbarBtn>

      <Divider />

      {/* Logo — links to home */}
      <Link
        to="/"
        className="flex items-center gap-1.5 flex-shrink-0 rounded-sm transition-opacity duration-fast"
        style={{ textDecoration: 'none', opacity: 1 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        title="Home"
      >
        <div
          className="flex items-center justify-center w-5 h-5 rounded-xs flex-shrink-0"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <ChevronRight size={11} color="white" strokeWidth={2.5} />
        </div>
        <span
          className="text-sm font-mono font-semibold tracking-tight leading-none hidden sm:block"
          style={{ color: 'var(--color-ink-on-sidebar)' }}
        >
          devtools
        </span>
      </Link>

      {/* Current page title breadcrumb */}
      {title && (
        <>
          <span
            className="text-xs flex-shrink-0"
            style={{ color: 'var(--color-border-sidebar)' }}
          >
            /
          </span>
          <span
            className="text-sm font-mono truncate"
            style={{ color: 'var(--color-ink-sidebar-muted)' }}
          >
            {title}
          </span>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Live datetime — hidden on small screens */}
      <span
        className="text-xs font-mono hidden sm:block flex-shrink-0"
        style={{ color: 'var(--color-ink-sidebar-muted)' }}
      >
        {now}
      </span>

      <Divider />

      {/* Theme toggle */}
      <ToolbarBtn
        onClick={onToggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark
          ? <Sun  size={15} strokeWidth={1.5} />
          : <Moon size={15} strokeWidth={1.5} />
        }
      </ToolbarBtn>
    </header>
  )
}
