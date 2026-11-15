// Vite plugin. After the build, it writes:
//   - dist/<page>/index.html for each page, with the correct title, description,
//     canonical URL and social tags. Link previews (X, LinkedIn, Facebook, Discord,
//     WhatsApp) do not run JavaScript, thus each page needs its own HTML.
//   - dist/sitemap.xml, dist/robots.txt and dist/llms.txt
// All text comes from src/site/meta.js.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SITE, PAGES, TOOL_META } from '../src/site/meta.js'

const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

function setTag(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`seo-plugin: index.html has no ${label}`)
  return html.replace(pattern, replacement)
}

function pageHtml(template, page) {
  const url = SITE.url + page.path
  let html = template
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${escText(page.title)}</title>`, '<title>')
  const metas = [
    ['name', 'description', page.description],
    ['property', 'og:title', page.title],
    ['property', 'og:description', page.description],
    ['property', 'og:url', url],
    ['name', 'twitter:title', page.title],
    ['name', 'twitter:description', page.description],
  ]
  for (const [attr, key, value] of metas) {
    const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`)
    html = setTag(html, re, `<meta ${attr}="${key}" content="${escAttr(value)}" />`, key)
  }
  html = setTag(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escAttr(url)}" />`, 'canonical link')
  return html
}

function sitemap(lastmod) {
  const urls = PAGES.map(p => [
    '  <url>',
    `    <loc>${SITE.url}${p.path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <priority>${p.path === '/' ? '1.0' : p.path === '/disclaimer' ? '0.3' : '0.8'}</priority>`,
    '  </url>',
  ].join('\n'))
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

function robots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`
}

// llms.txt: a Markdown summary for AI crawlers (https://llmstxt.org).
function llms(version) {
  const groups = []
  for (const t of TOOL_META) {
    let g = groups.find(x => x.name === t.group)
    if (!g) groups.push((g = { name: t.group, tools: [] }))
    g.tools.push(t)
  }
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    `${SITE.name} (version ${version}) is a free, open source web application with ${TOOL_META.length} developer tools.`,
    'Each tool runs as JavaScript in the browser of the user. The site sends no input, files or results to a server.',
    'The site has no accounts, no analytics and no cookies. It operates offline after the first visit.',
    '',
    `- Website: ${SITE.url}/`,
    `- Source code (MIT License): ${SITE.repo}`,
    `- Disclaimer: ${SITE.url}/disclaimer`,
    '',
  ]
  for (const g of groups) {
    lines.push(`## ${g.name}`, '')
    for (const t of g.tools) lines.push(`- [${t.label}](${SITE.url}${t.path}): ${t.seo}`)
    lines.push('')
  }
  lines.push('## Optional', '', `- [README](${SITE.repo}blob/main/README.md): how to run, build and deploy the site.`, '')
  return lines.join('\n')
}

export default function seoPlugin({ version }) {
  let outDir = 'dist'
  return {
    name: 'devtools-seo',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    // The home page meta goes into index.html before other plugins (the service worker) read it.
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return pageHtml(html, PAGES[0])
      },
    },
    closeBundle() {
      const template = readFileSync(join(outDir, 'index.html'), 'utf8')
      for (const page of PAGES) {
        if (page.path === '/') continue
        const dir = join(outDir, page.path.slice(1))
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'index.html'), pageHtml(template, page))
      }
      const lastmod = new Date().toISOString().slice(0, 10)
      writeFileSync(join(outDir, 'sitemap.xml'), sitemap(lastmod))
      writeFileSync(join(outDir, 'robots.txt'), robots())
      writeFileSync(join(outDir, 'llms.txt'), llms(version))
    },
  }
}
