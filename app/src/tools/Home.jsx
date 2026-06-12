import { useNavigate } from 'react-router-dom'
import { TOOLS } from './registry'
import Card from '../components/ui/Card'

export default function Home() {
  const navigate = useNavigate()
  return (
    <div>
      <div className="mb-6">
        <h1
          className="text-xl font-sans font-semibold mb-1"
          style={{ color: 'var(--color-ink)', letterSpacing: '-0.02em' }}
        >
          Developer Tools
        </h1>
        <p className="text-sm font-sans" style={{ color: 'var(--color-ink-muted)' }}>
          Nineteen utilities. All client-side. No data leaves your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {TOOLS.map(({ path, label, icon: Icon, desc }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="text-left rounded-md border p-4 transition-colors duration-fast ease-out group cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border-strong)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
              e.currentTarget.style.borderColor = 'var(--color-border-strong)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface)'
              e.currentTarget.style.borderColor = 'var(--color-border-strong)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon
                size={16}
                strokeWidth={1.5}
                style={{ color: 'var(--color-primary)' }}
              />
              <span
                className="text-sm font-mono font-medium"
                style={{ color: 'var(--color-ink)' }}
              >
                {label}
              </span>
            </div>
            <p
              className="text-xs font-sans leading-relaxed"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              {desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
