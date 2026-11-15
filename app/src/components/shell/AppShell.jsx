import { Suspense, useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import ErrorBoundary from '../ErrorBoundary'
import SiteFooter from './SiteFooter'
import { useTheme } from '../../hooks/useTheme'
import { TOOLS } from '../../tools/registry'

// Page titles come from the tool registry. Add other pages here.
const PAGE_TITLES = {
  ...Object.fromEntries(TOOLS.map(t => [t.path, t.label])),
  '/disclaimer': 'Disclaimer',
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { isDark, toggle: toggleTheme } = useTheme()
  const scrollRef = useRef(null)

  const title = PAGE_TITLES[location.pathname] ?? null

  // Close the mobile drawer when the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [location.pathname])

  const sidebarWidth = collapsed ? 48 : 240

  return (
    <div
      id="app-root"
      onKeyDown={e => { if (e.key === 'Escape' && mobileOpen) setMobileOpen(false) }}
      className="flex h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <a href="#main-content" className="skip-link">Skip to the main content</a>

      {/* Mobile overlay: always mounted, fades in/out to avoid pop */}
      <div
        className="fixed inset-0 z-modal-backdrop md:hidden"
        style={{
          backgroundColor: 'oklch(0 0 0 / 0.5)',
          opacity: mobileOpen ? 1 : 0,
          // Disable pointer events when invisible so clicks pass through
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar: desktop, width animates with strong ease-out */}
      <div
        className="flex-shrink-0 h-full hidden md:block"
        style={{
          width: sidebarWidth,
          // Specify exact property: never transition: all
          transition: 'width 220ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <Sidebar collapsed={collapsed} />
      </div>

      {/* Sidebar: mobile drawer with iOS pull-from-edge easing */}
      <div
        className="fixed left-0 top-0 h-full z-modal md:hidden"
        style={{
          width: 240,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          // iOS drawer curve: feels like pulling from the edge
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <Sidebar collapsed={false} hidden={!mobileOpen} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <Toolbar
          title={title}
          collapsed={collapsed}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => {
            if (window.innerWidth < 768) {
              setMobileOpen(o => !o)
            } else {
              setCollapsed(c => !c)
            }
          }}
        />

        <main
          id="main-content"
          tabIndex={-1}
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: 'transparent' }}
        >
          <Suspense
            fallback={
              <p role="status" className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                Loading the tool.
              </p>
            }
          >
            <ErrorBoundary resetKey={location.pathname}>
              <Outlet context={{ scrollRef }} />
            </ErrorBoundary>
          </Suspense>
          <SiteFooter />
        </main>
      </div>
    </div>
  )
}
