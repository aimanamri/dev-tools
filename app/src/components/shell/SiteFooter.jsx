import { Link } from 'react-router-dom'
import GitHubIcon from '../icons/GitHubIcon'

export const REPO_URL = 'https://github.com/aimanamri/dev-tools/'

const linkClass =
  'inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 underline-offset-4 hover:underline ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

export default function SiteFooter() {
  return (
    <footer
      className="mt-12 pt-5 pb-2 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-sans"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
    >
      <p className="m-0">
        Dev Tools v{__APP_VERSION__}. All tools operate in your browser. The site sends no data to a server.
      </p>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to="/disclaimer" className={linkClass} style={{ color: 'var(--color-ink-muted)' }}>
          Disclaimer
        </Link>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          style={{ color: 'var(--color-ink)' }}
        >
          <GitHubIcon size={15} />
          <span>Source code on GitHub</span>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </nav>
    </footer>
  )
}
