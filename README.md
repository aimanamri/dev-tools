# Dev Tools

> 19 client-side developer utilities — fast, private, no server required.

A single-page application built with React and Vite that bundles a suite of everyday developer tools into one clean interface. Every operation runs entirely in your browser. No data is sent to any server, no accounts, no tracking.

---

## Features at a glance

- **100% client-side** — files, passwords, and keys never leave your device
- **Dark / light mode** — persisted to `localStorage`, respects system preference on first load
- **Responsive layout** — collapsible sidebar, works on desktop and tablet
- **Keyboard-friendly** — inputs trigger actions on Enter, copy buttons give instant feedback
- **Fast builds** — Vite + Rolldown, code-split per tool, lazy-loaded diagram chunks

---

## Tools

### Generators & Converters

| Tool | Route | Description |
|---|---|---|
| **Password Generator** | `/password` | Cryptographically secure passwords via `crypto.getRandomValues()`. Configurable length, character sets, exclusion rules. Live entropy bits, crack-time estimate, and 5-level strength meter. |
| **Base64 Converter** | `/base64` | Encode and decode Base64 for plain text and binary files. Supports UTF-8, ASCII, Latin-1. Drag-and-drop file encode; Base64 → file download for decode. |
| **QR Code Generator** | `/qr` | Nine QR types: URL, plain text, email, SMS, phone, vCard, multi-URL, App Store link, PDF link. Customisable colours, size, and error correction. PNG and SVG export. |

### JSON Tools

| Tool | Route | Description |
|---|---|---|
| **JSON Formatter** | `/json` | Format and minify JSON with real-time validation. 2-space, 4-space, or tab indent. Inline error messages with character position. |
| **JSON Converters** | `/json-convert` | Export JSON to CSV, YAML, XML, Python dict, `JSON.stringify` string, or Markdown table. Live conversion on every keystroke. |
| **JSON Tree Viewer** | `/json-tree` | Explore deeply nested JSON in a collapsible, colour-coded tree. Depth-based auto-expand, expand/collapse all, copy as formatted JSON. |
| **JSON Diff** | `/json-diff` | Side-by-side and unified diff of two JSON documents. Key-order normalised before diffing so structural differences are not flagged. Addition/deletion counts and copy-as-patch. |

### Date & Time

| Tool | Route | Description |
|---|---|---|
| **Timestamp Converter** | `/timestamp` | Convert Unix timestamps (s / ms / µs / ns) to and from human-readable dates. UTC and local timezone modes, 10 output formats, Discord timestamp tags, local timezone card. |
| **Timezone Converter** | `/timezone` | Compare any moment across a curated list of 27 global timezones plus your local zone. DST-aware Luxon backend, add/remove zones, live clock display. |

### Network & IP

| Tool | Route | Description |
|---|---|---|
| **IP Subnet Calculator** | `/subnet` | Dual-stack IPv4 and IPv6 subnet calculator. Network address, broadcast, host range, subnet mask, all-subnets table. Binary representation and IPv6 transition addresses included. |
| **IP Converter** | `/ip-convert` | Convert IPv4 addresses to 32-bit binary (dotted and plain), hexadecimal, and integer. Reverse binary-to-IP with live bit counter and per-octet breakdown. |

### Text & Markup

| Tool | Route | Description |
|---|---|---|
| **Markdown Preview** | `/markdown` | Live Markdown rendering with GitHub Flavored Markdown, `highlight.js` syntax highlighting, KaTeX math (`$inline$` and `$$block$$`), and Mermaid diagrams. Import `.md` files, export `.md` or standalone `.html`. |
| **Cron Generator** | `/cron` | Build cron expressions field-by-field with chip presets and a raw input that syncs back to the builder. Real-time `cronstrue` description, 15 preset schedules, per-field validation with plain-English error messages. |
| **Python → JSON** | `/pydict` | Convert Python dict literals to valid JSON. Handles `True / False / None`, single-quoted strings, tuples, trailing commas, triple-quoted strings, and `#` comments. |

### SVG

| Tool | Route | Description |
|---|---|---|
| **SVG Converter** | `/svg` | Paste or upload an SVG. Outputs: minified SVG, CSS `background-image` data URI, Base64 data URI, React JSX component. Inline colour editor for interactive palette swaps. Live preview. |

### Hugo / Blowfish

| Tool | Route | Description |
|---|---|---|
| **Blowfish Config Transpiler** | `/blowfish` | Bi-directional YAML ↔ TOML converter for Hugo Blowfish theme configuration files. Auto-detects input format, five built-in templates populated from real Blowfish reference files, syntax-highlighted output. |
| **Blowfish Article Generator** | `/blowfish-article` | GUI front matter builder for Hugo Blowfish articles. Generates ready-to-use `.md` files with YAML front matter. Supports tags, categories, hero styles, sharing links, and multilingual filename suffixes. Live rendered preview. |

### PDF

| Tool | Route | Description |
|---|---|---|
| **PDF Tool Suite** | `/pdf` | View, reorder (drag-and-drop), merge, split, watermark, fill form fields, and edit metadata. Powered by PDF.js and pdf-lib. |
| **PDF Security** | `/pdf-security` | **Encrypt** any PDF with AES-128 password protection (open password, owner password, granular permissions). **Unlock** password-protected or owner-restricted PDFs. Encryption detection badge shown on file load. |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 |
| Build tool | Vite 8 (Rolldown bundler) |
| Styling | Tailwind CSS v3 + OKLCH CSS custom properties |
| Routing | React Router v7 |
| Icons | Lucide React (1.5 px stroke) |
| Fonts | Inter (UI) + JetBrains Mono (code/data) via Google Fonts |
| PDF rendering | PDF.js (`pdfjs-dist`) |
| PDF editing | pdf-lib + pdf-lib-plus-encrypt |
| Markdown | marked + DOMPurify + highlight.js + KaTeX + Mermaid |
| Drag-and-drop | dnd-kit |

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
cd app
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build for production

```bash
cd app
npm run build
```

Static output is written to `app/dist/`. Deploy to any static host — Netlify, Vercel, Cloudflare Pages, GitHub Pages, or a plain web server.

### `.htaccess` included

`app/public/.htaccess` is bundled into the build. It configures:
- SPA fallback (`FallbackResource /index.html`) for client-side routing
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Gzip compression for JS, CSS, fonts, and SVG

---

## Project Structure

```
dev-tools/
├── app/
│   ├── public/
│   │   ├── .htaccess          # Apache SPA + security headers
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── shell/         # AppShell, Sidebar, Toolbar
│   │   │   └── ui/            # Button, Input, Card
│   │   ├── hooks/
│   │   │   └── useTheme.js    # Dark/light mode toggle + localStorage
│   │   ├── styles/
│   │   │   └── tokens.css     # OKLCH design tokens (light + dark)
│   │   ├── tools/             # One file per tool
│   │   ├── App.jsx            # Route definitions
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

---

## Privacy

- No network requests are made during tool usage
- No analytics or telemetry
- No cookies
- Files and passwords are held in component state and released when you navigate away or click **Clear & Reset**
