import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import { useTheme } from '../../hooks/useTheme'

const TOOL_TITLES = {
  '/password':        'Password Generator',
  '/timestamp':       'Timestamp Converter',
  '/json':            'JSON Formatter & Validator',
  '/base64':          'Base64 Converter',
  '/cron':            'Cron Expression Generator',
  '/qr':              'QR Code Generator',
  '/svg':             'SVG Converter',
  '/markdown':        'Markdown Live Preview',
  '/json-convert':    'JSON Data Converters',
  '/json-tree':       'JSON Tree Viewer',
  '/json-diff':       'JSON Diff',
  '/timezone':        'Timezone Converter',
  '/pydict':          'Python → JSON',
  '/blowfish':        'Blowfish Config Transpiler',
  '/blowfish-article':'Hugo Article Generator',
  '/subnet':          'IP Subnet Calculator',
  '/ip-convert':      'IP Conversion Tool',
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { isDark, toggle: toggleTheme } = useTheme()

  const title = TOOL_TITLES[location.pathname] ?? null

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const sidebarWidth = collapsed ? 48 : 240

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Mobile overlay — always mounted, fades in/out to avoid pop */}
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

      {/* Sidebar — desktop, width animates with strong ease-out */}
      <div
        className="flex-shrink-0 h-full hidden md:block"
        style={{
          width: sidebarWidth,
          // Specify exact property — never transition: all
          transition: 'width 220ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <Sidebar collapsed={collapsed} />
      </div>

      {/* Sidebar — mobile drawer with iOS pull-from-edge easing */}
      <div
        className="fixed left-0 top-0 h-full z-modal md:hidden"
        style={{
          width: 240,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          // iOS drawer curve: feels like pulling from the edge
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <Sidebar collapsed={false} />
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
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
