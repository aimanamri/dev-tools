import { Link } from 'react-router-dom'
import { SITE } from '../site/meta'

// Written in ASD-STE100 Simplified Technical English.
const LAST_UPDATED = '15 November 2026'

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-lg font-semibold font-sans" style={{ color: 'var(--color-ink)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

const p = 'text-sm font-sans leading-relaxed m-0'
const ul = 'text-sm font-sans leading-relaxed list-disc pl-5 m-0 flex flex-col gap-1'
const link = 'underline underline-offset-4'

export default function Disclaimer() {
  return (
    <article className="max-w-2xl mx-auto flex flex-col gap-7" style={{ color: 'var(--color-ink-muted)' }}>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold font-sans" style={{ color: 'var(--color-ink)' }}>
          Disclaimer
        </h1>
        <p className={p}>Last updated: {LAST_UPDATED}.</p>
        <p className={p}>
          Read this page before you use {SITE.name}. It tells you how the site processes your
          data and what the limits of its responsibility are.
        </p>
      </header>

      <Section id="local" title="1. All tools operate in your browser">
        <p className={p}>
          Each tool runs as JavaScript on your device. When you paste text, type data or
          select a file, your browser processes it. The site does not send your input, your
          files or your results to a server.
        </p>
        <ul className={ul}>
          <li>The site has no user accounts and no sign-up.</li>
          <li>The site has no analytics, no advertisements and no tracking scripts.</li>
          <li>The site does not use cookies.</li>
          <li>All fonts, scripts and styles come from this site. The site does not load files from other servers.</li>
        </ul>
      </Section>

      <Section id="storage" title="2. Data that stays on your device">
        <p className={p}>The site keeps a small quantity of data in your browser:</p>
        <ul className={ul}>
          <li>
            <strong style={{ color: 'var(--color-ink)' }}>Theme:</strong> your light or dark theme
            selection, in local storage. To remove it, clear the site data in your browser.
          </li>
          <li>
            <strong style={{ color: 'var(--color-ink)' }}>Offline copy:</strong> a service worker keeps
            a copy of the site files. Thus the tools also operate without a network connection.
            This copy does not contain your input.
          </li>
        </ul>
        <p className={p}>
          When you close or reload a tool, your input is removed from memory. Download or copy
          your results before you close the page.
        </p>
      </Section>

      <Section id="links" title="3. Data that you send out">
        <p className={p}>
          Some tools give you a link, a QR code or a file. When you open, scan or share that
          output, it goes where you send it. The Markdown export loads two style sheets from the
          jsDelivr network when you open the exported HTML file. The site does not control other
          websites.
        </p>
      </Section>

      <Section id="warranty" title="4. No warranty">
        <p className={p}>
          The site and its source code are supplied &quot;as is&quot;, under the MIT License,
          without a warranty of any kind. The author does not guarantee that the results are
          correct, complete or applicable to your task.
        </p>
        <ul className={ul}>
          <li>Examine all output before you use it in production systems.</li>
          <li>Keep a copy of your original files. The PDF tools write new files, but a defect can occur.</li>
          <li>
            Do not use the password tool or the PDF security tool as your only security control.
            Use a password manager to keep passwords.
          </li>
          <li>Time zone data comes from your browser. Rules for daylight saving time can change.</li>
        </ul>
      </Section>

      <Section id="liability" title="5. Limit of liability">
        <p className={p}>
          The author is not responsible for loss of data, loss of money or other damage that
          occurs because you used, or could not use, this site. You use the site at your own risk.
        </p>
      </Section>

      <Section id="third-party" title="6. Other software">
        <p className={p}>
          The site uses open source libraries, for example React, pdf.js, pdf-lib, Mermaid and
          KaTeX. Each library has its own license. The full list is in the{' '}
          <code>package.json</code> file of the source code.
        </p>
      </Section>

      <Section id="contact" title="7. Questions and problems">
        <p className={p}>
          To report a defect or to ask a question, open an issue in the{' '}
          <a className={link} href={SITE.repo} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
            GitHub repository
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          . Do not put private data in an issue.
        </p>
        <p className={p}>
          <Link className={link} to="/" style={{ color: 'var(--color-primary)' }}>Go back to the tools</Link>
        </p>
      </Section>
    </article>
  )
}
