import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import GitHubIcon from '../icons/GitHubIcon'
import { REPO_URL } from './SiteFooter'
import { TOOLS } from '../../tools/registry'

// Strong ease-out: gives instant-feeling response vs the weak built-in
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

function NavItem({ path, label, icon: Icon, collapsed }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <NavLink
      to={path}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 4,
        padding: '9px 12px',
        overflow: 'hidden',
        // Left border always present: only color changes, avoids layout shift
        borderLeft: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
        backgroundColor: isActive || hovered
          ? 'var(--color-sidebar-surface)'
          : 'transparent',
        color: isActive
          ? 'var(--color-ink-on-sidebar)'
          : 'var(--color-ink-sidebar-muted)',
        // Press feedback: every clickable element must confirm it heard the user
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transformOrigin: 'center',
        transition: [
          `background-color 120ms ${EASE}`,
          `border-color 120ms ${EASE}`,
          `color 120ms ${EASE}`,
          `transform 100ms ${EASE}`,
        ].join(', '),
        userSelect: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        flexShrink: 0,
      })}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={16}
            strokeWidth={1.5}
            style={{
              flexShrink: 0,
              color: isActive
                ? 'var(--color-primary)'
                : hovered
                ? 'var(--color-ink-on-sidebar)'
                : 'var(--color-ink-sidebar-muted)',
              transition: `color 120ms ${EASE}`,
            }}
          />
          {/* Label fades and collapses instead of popping in/out */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              lineHeight: 1.4,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              flex: '1 1 0',
              minWidth: 0,
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 200,
              transition: [
                `opacity 110ms ${EASE}`,
                `max-width 200ms ${EASE}`,
              ].join(', '),
            }}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, hidden = false }) {
  return (
    <aside
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-sidebar)',
        borderRight: '1px solid var(--color-border-sidebar)',
        overflow: 'hidden',
      }}
    >
      {/* Logo / wordmark */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px',
          borderBottom: '1px solid var(--color-border-sidebar)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 4,
            flexShrink: 0,
            backgroundColor: 'var(--color-primary)',
          }}
        >
          <ChevronRight size={14} color="white" strokeWidth={2.5} />
        </div>

        {/* Wordmark fades and collapses with the sidebar */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: 'var(--color-ink-on-sidebar)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            opacity: collapsed ? 0 : 1,
            maxWidth: collapsed ? 0 : 120,
            transition: [
              `opacity 110ms ${EASE}`,
              `max-width 200ms ${EASE}`,
            ].join(', '),
          }}
        >
          devtools
        </span>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Tools"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '0 8px',
          }}
        >
          {TOOLS.map(({ path, label, icon }) => (
            <NavItem
              key={path}
              path={path}
              label={label}
              icon={icon}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--color-border-sidebar)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Source code on GitHub"
          className="sidebar-repo-link"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            color: 'var(--color-ink-sidebar-muted)',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            borderRadius: 4,
            padding: '4px 0',
          }}
        >
          <GitHubIcon size={14} style={{ flexShrink: 0 }} />
          <span
            style={{
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 200,
              overflow: 'hidden',
              transition: `opacity 100ms ${EASE}`,
            }}
          >
            v{__APP_VERSION__} on GitHub
          </span>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </aside>
  )
}
