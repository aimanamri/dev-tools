# Dev Tools

A collection of 19 client-side developer utilities built with React + Vite. No data ever leaves your browser.

## Tools

| Tool | Path | Description |
|---|---|---|
| Password Generator | `/password` | Cryptographically secure passwords with entropy estimation |
| Timestamp Converter | `/timestamp` | Unix timestamp ↔ human-readable date, UTC/local, Discord tags |
| JSON Formatter | `/json` | Format, minify, and validate JSON with inline error display |
| Base64 Converter | `/base64` | Encode/decode Base64 for text and files |
| Cron Generator | `/cron` | Build cron expressions visually with plain-English explanations |
| QR Code Generator | `/qr` | Generate QR codes for URLs, vCards, SMS, email, and more |
| SVG Converter | `/svg` | Optimize SVG and convert to JSX, CSS background, or Base64 |
| Markdown Preview | `/markdown` | Live rendering with syntax highlighting, math (KaTeX), and Mermaid diagrams |
| JSON Converters | `/json-convert` | Export JSON as CSV, YAML, XML, Python dict, or Markdown table |
| JSON Tree Viewer | `/json-tree` | Explore nested JSON in a collapsible interactive tree |
| JSON Diff | `/json-diff` | Side-by-side visual diff of two JSON documents |
| Timezone Converter | `/timezone` | Compare any moment across global timezones with DST awareness |
| Python → JSON | `/pydict` | Convert Python dict literals to valid JSON |
| Blowfish Config Transpiler | `/blowfish` | Bi-directional YAML ↔ TOML transpiler for Hugo Blowfish theme config |
| Blowfish Article Generator | `/blowfish-article` | GUI front matter builder for Hugo Blowfish articles |
| IP Subnet Calculator | `/subnet` | Dual-stack IPv4 & IPv6 subnet calculator |
| IP Converter | `/ip-convert` | Convert IPv4 addresses to binary, hex, and integer representations |
| PDF Tool Suite | `/pdf` | View, reorder, merge, split, watermark, and fill PDF forms |
| PDF Security | `/pdf-security` | Encrypt PDFs with AES-128 password protection or unlock protected PDFs |

## Stack

- **React 18** + **Vite**
- **Tailwind CSS v3** with OKLCH design tokens
- **React Router v7**
- **Lucide React** icons

## Getting Started

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
cd app
npm run build
```

Output is in `app/dist/` — deploy as a static site on any host (Netlify, Vercel, Cloudflare Pages, etc.).

## Privacy

All processing happens in-browser. No analytics, no tracking, no server.
