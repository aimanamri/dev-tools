import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  AlertCircle, Copy, Check, RotateCcw, ArrowLeftRight,
  ChevronDown, AlertTriangle, RefreshCw, ClipboardPaste,
} from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import hljsYAML from 'highlight.js/lib/languages/yaml'
import hljsINI from 'highlight.js/lib/languages/ini'
import yaml from 'js-yaml'
import { parse as parseTOML, stringify as stringifyTOML } from 'smol-toml'
import DOMPurify from 'dompurify'

let _hljsReady = false
function ensureHljs() {
  if (_hljsReady) return
  hljs.registerLanguage('yaml', hljsYAML)
  hljs.registerLanguage('ini', hljsINI)
  _hljsReady = true
}

// ── Templates ──────────────────────────────────────────────────────────────
const TEMPLATES = {
  'hugo.toml': `# Site Configuration
# File: config/_default/hugo.toml

# The theme name (remove this if you are using Hugo Modules)
theme = "blowfish"

# The URL to the root of the website
baseURL = "https://myawesomesite.com/"

# Default language of theme components and content
defaultContentLanguage = "en"

# Generate a robots.txt file to allow search engines to crawl
enableRobotsTXT = true

# The number of words used to generate the article summary (0 uses the first sentence)
summaryLength = 30

[pagination]
# The number of articles listed on each page of the article listing
pagerSize = 10

[outputs]
# Output formats generated for the site (Blowfish requires these three)
home = ["HTML", "RSS", "JSON"]

[permalinks]
# Custom URL structures for your content types
posts = "/:year/:month/:title/"

[taxonomies]
# How content is categorized
tag = "tags"
category = "categories"
author = "authors"
series = "series"
`,

  'params.toml': `# Theme Parameters
# File: config/_default/params.toml

# --- Global ---
# Theme color scheme (blowfish, avocado, fire, ocean, forest, princess, neon, bloody, terminal, marvel, noir, autumn, congo, slate, github, one-light)
colorScheme = "blowfish"
# Default appearance mode (light or dark)
defaultAppearance = "dark"
# Automatically switch based on visitor's OS preference
autoSwitchAppearance = true
# Enable accessibility toggle button
enableA11y = true
# Enable search functionality
enableSearch = true
# Enable copy-to-clipboard buttons on code blocks
enableCodeCopy = true
# Add BreadcrumbList for SEO
enableStructuredBreadcrumbs = true
# Use tailwind-scrollbar styling instead of default browser scrollbar
enableStyledScrollbar = true
# Enable reply-by-email link at the end of posts
replyByEmail = true
# Default server for forgejo shortcode
forgejoDefaultServer = "https://codeberg.org"
# Default server for gitea shortcode
giteaDefaultServer = "https://gitea.com"
# Sections displayed in the recent articles list
mainSections = ["posts", "tutorials"]
# Show article/list views (requires Firebase integration)
showViews = true
# Show article/list likes (requires Firebase integration)
showLikes = true
# Output meta robots tag in HTML head
robots = "index, follow"
# Disable image zoom across the site
disableImageZoom = false
# Disable image optimization across the site
disableImageOptimization = false
# Disable image optimization specifically for markdown images
disableImageOptimizationMD = false
# Width to scale background images
backgroundImageWidth = 1200
# Hide text in the header (useful if using a logo only)
disableTextInHeader = false
# Default background image (from assets/)
defaultBackgroundImage = "background.jpg"
# Default featured image for articles
defaultFeaturedImage = "featured.jpg"
# Default Open Graph/Twitter share image
defaultSocialImage = "social-share.png"
# Allow hotlinking external images without Hugo processing
hotlinkFeatureImage = false
# CSS object-position for default images
imagePosition = "center"
# Highlight the currently active menu area
highlightCurrentMenuArea = true
# Highlight Table of Contents items currently in view
smartTOC = true
# Hide deeper nested TOC items not in focus
smartTOCHideUnfocusedChildren = true
# Hash algorithm for CSS/JS fingerprinting (sha512, sha384, sha256)
fingerprintAlgorithm = "sha512"

[seo]
# Fallback order for HTML meta description
metaDescriptionOrder = ["description", "summary", "site"]

[header]
# Site header layout (basic, fixed, fixed-fill, fixed-fill-blur)
layout = "fixed-fill-blur"

[footer]
# Show the footer menu
showMenu = true
# Show the copyright string
showCopyright = true
# Show "Powered by Blowfish" attribution
showThemeAttribution = true
# Show light/dark mode appearance switcher in footer
showAppearanceSwitcher = true
# Show the scroll-to-top arrow
showScrollToTop = true

[homepage]
# Homepage layout (page, profile, hero, card, background, custom)
layout = "profile"
# Image used in hero/card layouts
homepageImage = "hero-image.jpg"
# Display recent articles list on homepage
showRecent = true
# Number of recent articles to display
showRecentItems = 5
# Display a "show more" link at the end of recent posts
showMoreLink = true
# Destination for the "show more" button
showMoreLinkDest = "/posts"
# Display recent articles as a grid of cards
cardView = true
# Expand card gallery to take full screen width
cardViewScreenWidth = false
# Blur homepage background image on scroll
layoutBackgroundBlur = true
# Apply image filter to homepage background
disableHeroImageFilter = false

[article]
# Show publishing dates
showDate = true
# Show views (requires Firebase)
showViews = true
# Show likes (requires Firebase)
showLikes = true
# Show date within article even if hidden in cards
showDateOnlyInArticle = false
# Show last updated date
showDateUpdated = true
# Show author box in footer
showAuthor = true
# Move author box to the bottom of the page
showAuthorBottom = true
# Show thumbnail as a hero image
showHero = true
# Hero image style (basic, big, background, thumbAndBackground)
heroStyle = "background"
# Blur background hero style on scroll
layoutBackgroundBlur = true
# Add space between header and body in background hero
layoutBackgroundHeaderSpace = true
# Show breadcrumbs in header
showBreadcrumbs = true
# Show draft label when building drafts
showDraftLabel = true
# Show link to edit the article on GitHub/GitLab
showEdit = true
# URL to edit link repository
editURL = "https://github.com/johndoe/myblog/edit/main/content"
# Append current file path to editURL
editAppendPath = true
# Expand series module by default
seriesOpened = false
# Show heading anchor links
showHeadingAnchors = true
# Show next/previous links at the bottom
showPagination = true
# Flip the direction of next/prev links
invertPagination = false
# Show reading time
showReadingTime = true
# Display table of contents in articles
showTableOfContents = true
# Display related content
showRelatedContent = true
# Limit of related articles to display
relatedContentLimit = 3
# Show all related taxonomies
showTaxonomies = true
# Show categories (requires showTaxonomies = true)
showCategories = true
# Show tags (requires showTaxonomies = true)
showTags = true
# Make categories a secondary color to distinguish from tags
showCategoriesInSecondaryColor = true
# Show multiple author badges
showAuthorsBadges = false
# Show exact word count
showWordCount = true
# Include comments partial at the bottom
showComments = true
# Social sharing links to display ("bluesky", "email", "facebook", "line", "linkedin", "mastodon", "pinterest", "reddit", "telegram", "twitter", "whatsapp")
sharingLinks = ["twitter", "linkedin", "reddit", "mastodon", "email"]
# Activate Zen Mode reading feature
showZenMode = true
# Force external links in Markdown to open in a new tab
externalLinkForceNewTab = true

[list]
# Show hero image on list pages
showHero = false
# Style of the list hero (basic, big, background, thumbAndBackground)
heroStyle = "basic"
# Blur list background image on scroll
layoutBackgroundBlur = true
# Add space between header and body
layoutBackgroundHeaderSpace = true
# Show breadcrumbs
showBreadcrumbs = true
# Show table of contents on lists
showTableOfContents = false
# Show article summaries in list view
showSummary = true
# Show views (requires Firebase)
showViews = false
# Show likes (requires Firebase)
showLikes = false
# Display items as cards
showCards = true
# Sort articles by weight instead of date
orderByWeight = false
# Group list entries by year
groupByYear = true
# Display list as a card gallery
cardView = true
# Expand card gallery to full screen width
cardViewScreenWidth = false
# Restrict item width to 'prose' for readability
constrainItemsWidth = false

[sitemap]
# Content types to exclude from sitemap.xml
excludedKinds = ["taxonomy", "term"]

[taxonomy]
# Show number of articles inside a taxonomy term
showTermCount = true
# Show hero image
showHero = false
# Hero style (basic, big, background, thumbAndBackground)
heroStyle = "basic"
# Blur background on scroll
layoutBackgroundBlur = true
# Space between header and body
layoutBackgroundHeaderSpace = true
# Show breadcrumbs
showBreadcrumbs = true
# Show views
showViews = false
# Show likes
showLikes = false
# Show table of contents
showTableOfContents = false
# Display lists as card gallery
cardView = true

[term]
# Show hero image
showHero = false
# Hero style
heroStyle = "basic"
# Blur background on scroll
layoutBackgroundBlur = true
# Space between header and body
layoutBackgroundHeaderSpace = true
# Show breadcrumbs
showBreadcrumbs = true
# Show views
showViews = false
# Show likes
showLikes = false
# Show table of contents
showTableOfContents = false
# Group articles by year
groupByYear = true
# Display as card gallery
cardView = true
# Take full screen width for cards
cardViewScreenWidth = false

[firebase]
# Firebase Integration parameters (for views and likes)
apiKey = "AIzaSyB-example-key-here"
authDomain = "myblog-firebase.firebaseapp.com"
projectId = "myblog-firebase"
storageBucket = "myblog-firebase.appspot.com"
messagingSenderId = "123456789012"
appId = "1:123456789012:web:a1b2c3d4e5f6g7h8"
measurementId = "G-ABC123XYZ9"

[fathomAnalytics]
# Fathom Analytics Tracking
site = "ABCDEFGH"
domain = "analytics.johndoe.com"

[umamiAnalytics]
# Umami Analytics Tracking
websiteid = "123e4567-e89b-12d3-a456-426614174000"
domain = "umami.johndoe.com"
dataDomains = "johndoe.com,blog.johndoe.com"
scriptName = "script.js"
enableTrackEvent = true

[selineAnalytics]
# Seline Analytics Tracking
token = "seline_token_example_123"
enableTrackEvent = true

[buymeacoffee]
# BuyMeACoffee Widget Integration
identifier = "johndoe"
globalWidget = true
globalWidgetMessage = "If you like my content, consider buying me a coffee!"
globalWidgetColor = "#FFDD00"
globalWidgetPosition = "right"

[verification]
# Webmaster tools site verifications
google = "google-site-verification-abc123def456"
bing = "bing-verification-string-7890"
pinterest = "pinterest-site-verification"
yandex = "yandex-verification-string"
fediverse = "@johndoe@mastodon.social"

[rssnext]
# Claim RSS feed identity
feedId = "feed_123456789"
userId = "user_987654321"

[advertisement]
# Google AdSense integration
adsense = "ca-pub-1234567890abcdef"
`,

  'menus.toml': `[[main]]
  name = "Blog"
  pageRef = "posts"
  weight = 10

[[main]]
  name = "Projects"
  pageRef = "projects"
  weight = 20

[[main]]
  name = "Tags"
  pageRef = "tags"
  weight = 30

[[main]]
  name = "About"
  pageRef = "about"
  weight = 40
`,

  'languages.en.toml': `# Language and i18n
# File: config/_default/languages.en.toml

# Top-level language code (lowercase)
languageCode = "en"
# Name of the language
languageName = "English"
# Order of language when building multilingual sites
weight = 1
# Site title displayed in header and footer
title = "My Blowfish Blog"

[params]
# Name used when the language appears on the website switcher
displayName = "EN"
# ISO language code for HTML metadata (case-sensitive)
isoCode = "en-US"
# Enable Right-to-Left reflow
rtl = false
# Date formatting (Hugo standard)
dateFormat = "2 January 2006"
# Relative path to logo in assets/ folder
logo = "logo.png"
# Secondary logo for dark/light mode toggling
secondaryLogo = "logo-dark.png"
# Website description used in site metadata
description = "A blog about technology, coding, and life."
# Footer copyright message ({ year } is dynamically replaced)
copyright = "© { year } John Doe. All rights reserved."

[params.author]
# Author's name for article footers and homepage profile
name = "John Doe"
# Author's email (used if reply-by-email is enabled)
email = "hello@johndoe.com"
# Path to 1:1 aspect ratio author image in assets/ folder
image = "profile-pic.jpg"
# Image quality to minimize artifacts (1-100)
imageQuality = 96
# Headline for the profile homepage
headline = "Software Engineer & Open Source Enthusiast"
# Bio displayed in article footers
bio = "I write code and share tutorials about **Go**, *Hugo*, and web development."
# Links to display alongside author details
links = [
  { twitter = "https://twitter.com/johndoe" },
  { github = "https://github.com/johndoe" },
  { linkedin = "https://linkedin.com/in/johndoe" }
]
`,

  'module.toml': `[[imports]]
  path = "github.com/nunocoracao/blowfish/v2"
`,
}

const TEMPLATE_NAMES = Object.keys(TEMPLATES)

// ── Format detection ────────────────────────────────────────────────────────
function detectFormat(text) {
  const lines = text.trim().split('\n').filter(l => {
    const t = l.trim()
    return t && !t.startsWith('#') && !t.startsWith(';')
  })
  if (!lines.length) return null
  let tomlScore = 0
  let yamlScore = 0
  for (const line of lines) {
    if (/^\s*\[\[[\w.]+\]\]/.test(line)) { tomlScore += 4; continue }
    if (/^\s*\[[\w.]+\]/.test(line))     { tomlScore += 2; continue }
    if (/^\s*[\w."'-]+\s*=\s*/.test(line)) tomlScore += 1
    if (/^\s*[\w"'-]+\s*:(\s|$)/.test(line)) yamlScore += 1
    if (/^\s*-\s+/.test(line)) yamlScore += 1
  }
  if (tomlScore === 0 && yamlScore === 0) return null
  return tomlScore >= yamlScore ? 'toml' : 'yaml'
}

// ── Conversion ──────────────────────────────────────────────────────────────
function convert(input, mode) {
  if (!input.trim()) return { output: '', error: null }
  try {
    if (mode === 'toml-to-yaml') {
      const parsed = parseTOML(input)
      const out = yaml.dump(parsed, {
        lineWidth: 120,
        quotingType: '"',
        noCompatMode: true,
        sortKeys: false,
      })
      return { output: out, error: null }
    } else {
      const parsed = yaml.load(input)
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Expected a YAML mapping (object) at the root level.')
      }
      const out = stringifyTOML(parsed)
      return { output: out, error: null }
    }
  } catch (e) {
    return { output: '', error: e.message }
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export default function BlowfishTranspiler() {
  const [input, setInput] = useState(TEMPLATES['params.toml'])
  const [mode, setMode] = useState('toml-to-yaml')
  const [selectedTemplate, setSelectedTemplate] = useState('params.toml')
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [copiedOutput, setCopiedOutput] = useState(false)
  const [convertFlash, setConvertFlash] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowTemplateMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { output, error } = useMemo(() => convert(input, mode), [input, mode])

  const highlightedOutput = useMemo(() => {
    ensureHljs()
    if (!output) return ''
    const lang = mode === 'toml-to-yaml' ? 'yaml' : 'ini'
    try {
      const result = hljs.highlight(output, { language: lang })
      return DOMPurify.sanitize(result.value, { FORCE_BODY: true, ALLOWED_TAGS: ['span'], ALLOWED_ATTR: ['class'] })
    } catch {
      return DOMPurify.sanitize(output)
    }
  }, [output, mode])

  const inputLabel  = mode === 'toml-to-yaml' ? 'TOML' : 'YAML'
  const outputLabel = mode === 'toml-to-yaml' ? 'YAML' : 'TOML'
  const inputLines  = input.split('\n').length

  const handleInputChange = useCallback((e) => {
    const text = e.target.value
    setInput(text)
    const detected = detectFormat(text)
    if (detected === 'toml') setMode('toml-to-yaml')
    else if (detected === 'yaml') setMode('yaml-to-toml')
  }, [])

  const handleTemplateSelect = useCallback((name) => {
    setSelectedTemplate(name)
    setInput(TEMPLATES[name])
    setMode('toml-to-yaml')
    setShowTemplateMenu(false)
  }, [])

  const handleSwap = useCallback(() => {
    if (!output) return
    setInput(output)
    setMode(prev => prev === 'toml-to-yaml' ? 'yaml-to-toml' : 'toml-to-yaml')
    setSelectedTemplate(null)
  }, [output])

  const handleReset = useCallback(() => {
    setInput('')
    setSelectedTemplate(null)
    setMode('toml-to-yaml')
  }, [])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInput(text)
      const detected = detectFormat(text)
      if (detected === 'toml') setMode('toml-to-yaml')
      else if (detected === 'yaml') setMode('yaml-to-toml')
    } catch { /* user denied clipboard */ }
  }, [])

  const handleClearInput = useCallback(() => {
    setInput('')
    setSelectedTemplate(null)
  }, [])

  const handleCopyOutput = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => {
      setCopiedOutput(true)
      setTimeout(() => setCopiedOutput(false), 2000)
    })
  }, [output])

  const handleConvert = useCallback(() => {
    setConvertFlash(true)
    setTimeout(() => setConvertFlash(false), 800)
  }, [])

  // ── Shared button styles ────────────────────────────────────────────────
  const btnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--color-border-strong)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-ink-muted)',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 120ms ease-out, color 120ms ease-out',
    lineHeight: 1,
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>

      {/* Scoped styles — hljs token colors + layout */}
      <style>{`
        .blowfish-pre {
          margin: 0;
          padding: 0.75rem;
          overflow: auto;
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          line-height: 1.6;
          background: var(--color-input-bg);
          color: var(--color-ink);
          height: 100%;
          box-sizing: border-box;
          white-space: pre;
          tab-size: 2;
        }
        .blowfish-pre code { font-family: inherit; }

        /* YAML / INI (TOML) tokens — light */
        .blowfish-pre .hljs-attr     { color: oklch(0.440 0.140 215); }
        .blowfish-pre .hljs-string   { color: oklch(0.430 0.140 145); }
        .blowfish-pre .hljs-number   { color: oklch(0.520 0.175 65); }
        .blowfish-pre .hljs-literal  { color: oklch(0.450 0.190 28); }
        .blowfish-pre .hljs-comment  { color: oklch(0.560 0.012 28); font-style: italic; }
        .blowfish-pre .hljs-section  { color: oklch(0.450 0.185 28); font-weight: 600; }
        .blowfish-pre .hljs-keyword  { color: oklch(0.440 0.140 215); }
        .blowfish-pre .hljs-bullet   { color: oklch(0.430 0.140 145); }
        .blowfish-pre .hljs-variable { color: oklch(0.440 0.140 215); }
        .blowfish-pre .hljs-meta     { color: oklch(0.520 0.175 65); }
        .blowfish-pre .hljs-tag      { color: oklch(0.450 0.190 28); }

        /* dark overrides */
        html.dark .blowfish-pre .hljs-attr     { color: oklch(0.660 0.125 215); }
        html.dark .blowfish-pre .hljs-string   { color: oklch(0.640 0.120 145); }
        html.dark .blowfish-pre .hljs-number   { color: oklch(0.680 0.155 65); }
        html.dark .blowfish-pre .hljs-literal  { color: oklch(0.640 0.170 28); }
        html.dark .blowfish-pre .hljs-comment  { color: oklch(0.450 0.015 28); font-style: italic; }
        html.dark .blowfish-pre .hljs-section  { color: oklch(0.640 0.170 28); font-weight: 600; }
        html.dark .blowfish-pre .hljs-keyword  { color: oklch(0.660 0.125 215); }
        html.dark .blowfish-pre .hljs-bullet   { color: oklch(0.640 0.120 145); }
        html.dark .blowfish-pre .hljs-variable { color: oklch(0.660 0.125 215); }
        html.dark .blowfish-pre .hljs-meta     { color: oklch(0.680 0.155 65); }
        html.dark .blowfish-pre .hljs-tag      { color: oklch(0.640 0.170 28); }

        .blowfish-panes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          align-items: start;
        }
        .blowfish-panel {
          border: 1px solid var(--color-border-strong);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .blowfish-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-strong);
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .blowfish-panel-label {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-ink-muted);
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .blowfish-panel-actions {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .blowfish-textarea {
          width: 100%;
          min-height: 320px;
          padding: 0.75rem;
          background: var(--color-input-bg);
          color: var(--color-ink);
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          line-height: 1.6;
          border: none;
          outline: none;
          resize: vertical;
          box-sizing: border-box;
          tab-size: 2;
        }
        .blowfish-output-wrap {
          min-height: 320px;
          background: var(--color-input-bg);
          overflow: auto;
          display: flex;
          flex-direction: column;
        }
        .blowfish-format-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-family: var(--font-mono);
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .chip-toml {
          background: var(--color-primary-subtle);
          color: var(--color-primary);
        }
        .chip-yaml {
          background: var(--color-accent-subtle);
          color: var(--color-accent);
        }
        .blowfish-error {
          margin-top: 0.75rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.625rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--color-error);
          background: color-mix(in oklch, var(--color-error) 8%, transparent);
          font-size: 0.8125rem;
          font-family: var(--font-mono);
          color: var(--color-error);
          line-height: 1.5;
          word-break: break-word;
        }
        .blowfish-mode-pill {
          display: inline-flex;
          border: 1px solid var(--color-border-strong);
          border-radius: 6px;
          overflow: hidden;
        }
        .blowfish-mode-pill button {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          font-family: var(--font-mono);
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background-color 120ms ease-out, color 120ms ease-out;
          line-height: 1;
          white-space: nowrap;
        }
        .blowfish-mode-pill button.active {
          background: var(--color-primary);
          color: var(--color-ink-on-primary);
        }
        .blowfish-mode-pill button:not(.active) {
          background: var(--color-surface);
          color: var(--color-ink-muted);
        }
        .blowfish-mode-pill button:not(.active):hover {
          background: var(--color-surface-raised);
        }
        .blowfish-doc-tree {
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          line-height: 1.8;
          color: var(--color-ink-muted);
          padding: 0.75rem 1rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border-strong);
          border-radius: 8px;
          white-space: pre;
          overflow-x: auto;
        }
        .blowfish-doc-tree .tree-path { color: var(--color-ink); font-weight: 600; }
        .blowfish-doc-tree .tree-comment { color: var(--color-ink-faint); }
        .blowfish-warning {
          display: flex;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--color-warning);
          background: color-mix(in oklch, var(--color-warning) 10%, transparent);
        }
        .blowfish-file-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
          font-family: var(--font-sans);
        }
        .blowfish-file-table th {
          text-align: left;
          padding: 0.5rem 0.75rem;
          background: var(--color-surface);
          color: var(--color-ink-muted);
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--color-border-strong);
        }
        .blowfish-file-table td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-ink);
          vertical-align: top;
        }
        .blowfish-file-table tr:last-child td { border-bottom: none; }
        .blowfish-file-table tr:hover td { background: var(--color-surface); }
        .file-name {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-primary);
          font-weight: 500;
          white-space: nowrap;
        }
        .scheme-tag {
          display: inline-block;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.6875rem;
          margin: 0.1rem;
          background: var(--color-surface-raised);
          color: var(--color-ink-muted);
          border: 1px solid var(--color-border);
        }
        .blowfish-btn-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          padding: 0.3rem 0.5rem;
          border-radius: 5px;
          border: 1px solid var(--color-border-strong);
          background: transparent;
          color: var(--color-ink-muted);
          cursor: pointer;
          font-size: 0.75rem;
          font-family: var(--font-sans);
          font-weight: 500;
          transition: background-color 120ms ease-out, color 120ms ease-out, transform 120ms ease-out;
          line-height: 1;
          white-space: nowrap;
        }
        .blowfish-btn-icon:hover { background: var(--color-surface-raised); }
        .blowfish-btn-icon:active { transform: scale(0.96); }
        .blowfish-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 320px;
          color: var(--color-ink-faint);
          font-family: var(--font-sans);
          font-size: 0.8125rem;
          gap: 0.375rem;
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="mb-5">
        <h1
          className="text-xl font-semibold mb-1"
          style={{ color: 'var(--color-ink)', letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}
        >
          Blowfish Config Transpiler
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-sans)' }}>
          Bi-directional YAML ↔ TOML conversion for Hugo Blowfish theme config files.
          Paste or select a template — format is detected automatically.
        </p>
      </div>

      {/* ── Controls row ── */}
      <div
        className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-md"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)' }}
      >

        {/* Template dropdown */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            style={{ ...btnBase, gap: '0.25rem' }}
            onClick={() => setShowTemplateMenu(v => !v)}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'; e.currentTarget.style.color = 'var(--color-ink)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface)'; e.currentTarget.style.color = 'var(--color-ink-muted)' }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              {selectedTemplate ?? 'Select template'}
            </span>
            <ChevronDown size={12} />
          </button>

          {showTemplateMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                minWidth: '180px',
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
                zIndex: 100,
                overflow: 'hidden',
                padding: '0.25rem',
              }}
            >
              {TEMPLATE_NAMES.map(name => (
                <button
                  key={name}
                  onClick={() => handleTemplateSelect(name)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.375rem 0.625rem',
                    background: selectedTemplate === name ? 'var(--color-primary-subtle)' : 'transparent',
                    color: selectedTemplate === name ? 'var(--color-primary)' : 'var(--color-ink)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: selectedTemplate === name ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (selectedTemplate !== name) e.currentTarget.style.background = 'var(--color-surface)' }}
                  onMouseLeave={e => { if (selectedTemplate !== name) e.currentTarget.style.background = 'transparent' }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--color-border-strong)', flexShrink: 0 }} />

        {/* Mode pill */}
        <div className="blowfish-mode-pill">
          <button
            className={mode === 'toml-to-yaml' ? 'active' : ''}
            onClick={() => setMode('toml-to-yaml')}
          >
            TOML → YAML
          </button>
          <button
            className={mode === 'yaml-to-toml' ? 'active' : ''}
            onClick={() => setMode('yaml-to-toml')}
          >
            YAML → TOML
          </button>
        </div>

        {/* Swap button */}
        <button
          className="blowfish-btn-icon"
          onClick={handleSwap}
          title="Swap: move output to input and flip direction"
          disabled={!output}
          style={{ opacity: output ? 1 : 0.4, cursor: output ? 'pointer' : 'not-allowed' }}
        >
          <ArrowLeftRight size={12} />
          Swap
        </button>

        {/* Convert button */}
        <button
          className="blowfish-btn-icon"
          onClick={handleConvert}
          style={{
            color: convertFlash ? 'var(--color-success)' : undefined,
            borderColor: convertFlash ? 'var(--color-success)' : undefined,
          }}
        >
          {convertFlash ? <Check size={12} /> : <RefreshCw size={12} />}
          Convert
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Reset button */}
        <button
          className="blowfish-btn-icon"
          onClick={handleReset}
          style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in oklch, var(--color-error) 8%, transparent)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* ── Dual pane ── */}
      <div className="blowfish-panes mb-4">

        {/* Input pane */}
        <div className="blowfish-panel">
          <div className="blowfish-panel-header">
            <div className="blowfish-panel-label">
              <span className={`blowfish-format-chip ${inputLabel === 'TOML' ? 'chip-toml' : 'chip-yaml'}`}>
                {inputLabel}
              </span>
              <span>Input</span>
              <span style={{ color: 'var(--color-ink-faint)', fontWeight: 400 }}>
                {inputLines} {inputLines === 1 ? 'line' : 'lines'}
              </span>
            </div>
            <div className="blowfish-panel-actions">
              <button className="blowfish-btn-icon" onClick={handlePaste}>
                <ClipboardPaste size={11} />
                Paste
              </button>
              <button className="blowfish-btn-icon" onClick={handleClearInput}>
                Clear
              </button>
            </div>
          </div>
          <textarea
            className="blowfish-textarea"
            value={input}
            onChange={handleInputChange}
            spellCheck={false}
            placeholder={`Paste ${inputLabel} here — format is auto-detected`}
          />
        </div>

        {/* Output pane */}
        <div className="blowfish-panel">
          <div className="blowfish-panel-header">
            <div className="blowfish-panel-label">
              <span className={`blowfish-format-chip ${outputLabel === 'TOML' ? 'chip-toml' : 'chip-yaml'}`}>
                {outputLabel}
              </span>
              <span>Output</span>
              {output && (
                <span style={{ color: 'var(--color-ink-faint)', fontWeight: 400 }}>
                  {output.split('\n').length} lines
                </span>
              )}
            </div>
            <div className="blowfish-panel-actions">
              <button
                className="blowfish-btn-icon"
                onClick={handleCopyOutput}
                disabled={!output}
                style={{ opacity: output ? 1 : 0.4, cursor: output ? 'pointer' : 'not-allowed' }}
              >
                {copiedOutput ? <Check size={11} style={{ color: 'var(--color-success)' }} /> : <Copy size={11} />}
                {copiedOutput ? 'Copied' : 'Copy Output'}
              </button>
            </div>
          </div>

          <div className="blowfish-output-wrap">
            {output ? (
              <pre className="blowfish-pre">
                <code
                  dangerouslySetInnerHTML={{ __html: highlightedOutput || output }}
                />
              </pre>
            ) : error ? (
              <div className="blowfish-empty">
                <AlertCircle size={14} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
                <span style={{ color: 'var(--color-error)' }}>Fix the error to see output</span>
              </div>
            ) : (
              <div className="blowfish-empty">
                Output will appear here
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Error display ── */}
      {error && (
        <div className="blowfish-error mb-4">
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Documentation panel ── */}
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--color-border-strong)' }}
      >
        {/* Doc header */}
        <div
          className="px-4 py-3"
          style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border-strong)',
          }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', margin: 0 }}
          >
            Blowfish <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-primary)' }}>config/_default/</code> Structure
          </h2>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-sans)', margin: '0.25rem 0 0' }}
          >
            Hugo's modular config system — each file controls a distinct aspect of your site.
          </p>
        </div>

        <div className="p-4" style={{ background: 'var(--color-bg)' }}>

          {/* ⚠️ Critical warning */}
          <div className="blowfish-warning mb-5">
            <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', margin: '0 0 0.25rem' }}
              >
                Check your root <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>hugo.toml</code> file
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, margin: 0 }}
              >
                When using <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>config/_default/</code>,
                make sure a root <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>hugo.toml</code> exists — create one if it doesn't.
                If it already exists, update it to point to the correct <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>theme</code> and{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>baseURL</code>, as Hugo will read the root file first and may shadow your <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>_default/</code> directory.
              </p>
            </div>
          </div>

          {/* Project folder notice */}
          <div className="blowfish-warning mb-5">
            <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', margin: '0 0 0.25rem' }}
              >
                Place these files in your <strong>project</strong>, not inside the theme
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, margin: 0 }}
              >
                These configuration files belong in your <strong>project's</strong>{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>config/_default/</code> folder,{' '}
                <em>not</em> inside{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>themes/blowfish/</code>.
                Creating them in your project folder allows you to safely override the theme defaults without modifying theme files.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >

            {/* Directory tree */}
            <div>
              <h3
                className="text-xs font-semibold mb-2"
                style={{
                  color: 'var(--color-ink-muted)',
                  fontFamily: 'var(--font-sans)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  margin: '0 0 0.5rem',
                }}
              >
                Directory layout
              </h3>
              <div className="blowfish-doc-tree">
                <span className="tree-path">config/</span>{'\n'}
                {'└── '}<span className="tree-path">_default/</span>{'\n'}
                {'    ├── '}<span className="tree-path">hugo.toml</span>
                <span className="tree-comment">         # Core config</span>{'\n'}
                {'    ├── '}<span className="tree-path">params.toml</span>
                <span className="tree-comment">       # Theme params</span>{'\n'}
                {'    ├── '}<span className="tree-path">menus.toml</span>
                <span className="tree-comment">        # Navigation</span>{'\n'}
                {'    ├── '}<span className="tree-path">languages.en.toml</span>
                <span className="tree-comment">  # i18n / author</span>{'\n'}
                {'    └── '}<span className="tree-path">module.toml</span>
                <span className="tree-comment">       # Hugo modules</span>
              </div>
            </div>

            {/* File reference table */}
            <div>
              <h3
                className="text-xs font-semibold mb-2"
                style={{
                  color: 'var(--color-ink-muted)',
                  fontFamily: 'var(--font-sans)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  margin: '0 0 0.5rem',
                }}
              >
                File reference
              </h3>
              <div
                style={{
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <table className="blowfish-file-table">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="file-name">hugo.toml</span></td>
                      <td style={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem' }}>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>baseURL</code>,
                        {' '}<code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>title</code>,
                        {' '}<code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>theme</code>,
                        {' '}language, robots
                      </td>
                    </tr>
                    <tr>
                      <td><span className="file-name">params.toml</span></td>
                      <td style={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem' }}>
                        Color scheme, layout, author info, article/list display options
                      </td>
                    </tr>
                    <tr>
                      <td><span className="file-name">menus.toml</span></td>
                      <td style={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem' }}>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>[[main]]</code>
                        {' '}and{' '}
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>[[footer]]</code>
                        {' '}navigation arrays
                      </td>
                    </tr>
                    <tr>
                      <td><span className="file-name">languages.en.toml</span></td>
                      <td style={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem' }}>
                        Per-language author profile, bio, and social links
                      </td>
                    </tr>
                    <tr>
                      <td><span className="file-name">module.toml</span></td>
                      <td style={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem' }}>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>[[imports]]</code>
                        {' '}— declares Blowfish as a Hugo module dependency
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Color scheme reference */}
          <div className="mt-5">
            <h3
              className="text-xs font-semibold mb-2"
              style={{
                color: 'var(--color-ink-muted)',
                fontFamily: 'var(--font-sans)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                margin: '0 0 0.5rem',
              }}
            >
              Available{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'none', letterSpacing: 0 }}>colorScheme</code>
              {' '}values
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {['ocean', 'slate', 'sandstone', 'tokyonight', 'terminal', 'neon', 'avocado', 'cherry', 'fire', 'congo', 'noir'].map(s => (
                <span key={s} className="scheme-tag">{s}</span>
              ))}
            </div>
            <p
              className="text-xs mt-2"
              style={{ color: 'var(--color-ink-faint)', fontFamily: 'var(--font-sans)', lineHeight: 1.5, margin: '0.5rem 0 0' }}
            >
              Set in <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>params.toml</code> — e.g.{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>colorScheme = "ocean"</code>.
              Pair with <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>defaultAppearance = "dark"</code> or{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>"light"</code>.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
