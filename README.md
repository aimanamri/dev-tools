<div align="center">

<img src=".github/assets/banner.gif" width="640" alt="The Dev Tools logo, a pixel art terminal window. The text after the prompt changes: format json, merge pdf, make qr codes, build cron, calc subnets, encode base64.">

# Dev Tools

**19 developer tools that run in your browser. No server. No sign-up. No tracking.**

[**Open the live site: devtools.aimanuddin.com**](https://devtools.aimanuddin.com)

[![CI](https://github.com/aimanamri/dev-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/aimanamri/dev-tools/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/tag/aimanamri/dev-tools?sort=semver&label=version)](https://github.com/aimanamri/dev-tools/tags)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS 3](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?logo=pwa&logoColor=white)](#how-it-works)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](#run-with-docker)

</div>

---

## Contents

- [What it is](#what-it-is)
- [Tools](#tools)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Quick start](#quick-start)
- [Build and deploy](#build-and-deploy)
- [Run with Docker](#run-with-docker)
- [Versions and releases](#versions-and-releases)
- [Contribute](#contribute)
- [Disclaimer and license](#disclaimer-and-license)

## What it is

Dev Tools is a single-page web application. It puts 19 everyday developer tools in one place.

- **Private.** Each tool runs as JavaScript in your browser. The site does not send your text, files or passwords to a server.
- **No accounts.** You do not sign up. The site has no analytics, no advertisements and no cookies.
- **Offline.** After the first visit, a service worker keeps a copy of the site. The tools also operate without a network connection.
- **Static.** The build output is a folder of static files. You can put it on any web host, or run it in a small Docker container.

## Tools

| Group | Tool | Path | What it does |
|---|---|---|---|
| JSON | JSON Formatter | `/json` | Format, minify and validate JSON. See each error with its position. |
| JSON | JSON Converters | `/json-convert` | Convert JSON to CSV, YAML, XML, a Python dict or a Markdown table. |
| JSON | JSON Tree Viewer | `/json-tree` | Examine nested JSON in a tree. Open and close each branch. |
| JSON | JSON Diff | `/json-diff` | Compare two JSON documents side by side. See each change. |
| Converters | Base64 Converter | `/base64` | Encode and decode Base64 text and files. |
| Converters | Python → JSON | `/pydict` | Convert a Python dict to valid JSON. No Python code runs. |
| Converters | SVG Converter | `/svg` | Clean an SVG. Convert it to JSX, a CSS background or Base64. |
| Generators | Password Generator | `/password` | Make secure random passwords. See the strength of each password. |
| Generators | QR Code Generator | `/qr` | Make QR codes for links, contact cards, SMS, email and other data. |
| Date and time | Timestamp Converter | `/timestamp` | Convert Unix timestamps to dates, and dates to timestamps. |
| Date and time | Timezone Converter | `/timezone` | Compare one time in many time zones, with daylight saving time. |
| Network | IP Subnet Calculator | `/subnet` | Calculate IPv4 and IPv6 subnets, masks and host ranges. |
| Network | IP Address Converter | `/ip-convert` | Convert an IPv4 address to binary, hexadecimal and integer values. |
| Text and markup | Markdown Preview | `/markdown` | Write Markdown with code highlighting, math and diagrams. Export HTML. |
| Text and markup | Cron Generator | `/cron` | Build a cron expression. Read what it does in plain English. |
| PDF | PDF Tool Suite | `/pdf` | View, reorder, merge, split and watermark PDF files. Fill PDF forms. |
| PDF | PDF Security | `/pdf-security` | Add a password to a PDF, or remove one. |
| Hugo | Blowfish Config | `/blowfish` | Convert Hugo Blowfish configuration files between YAML and TOML. |
| Hugo | Hugo Article Generator | `/blowfish-article` | Build the front matter for a Hugo Blowfish article in a form. |

The text for each tool is in [`app/src/site/meta.js`](app/src/site/meta.js). The page titles, the sitemap and `llms.txt` come from this file.

## How it works

```
Browser
 ├─ index.html, page HTML files     static files from any web host
 ├─ React app (one chunk per tool)  loads a tool only when you open it
 ├─ Your input  ──► tool code ──► result      all in memory, on your device
 └─ Service worker                  keeps a copy of the site for offline use
```

Security controls:

- A strict Content Security Policy. All scripts, styles and fonts come from the same origin. `eval` is not permitted.
- `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy` headers. The same values are in [`app/public/.htaccess`](app/public/.htaccess), [`nginx-security-headers.inc`](nginx-security-headers.inc) and the Vite preview server. `.htaccess` also sets HSTS. For Docker, set HSTS on the proxy that terminates HTTPS.
- DOMPurify cleans all HTML that the Markdown and SVG tools show.
- An error boundary stops one broken tool. The other parts of the site continue to operate.

## Tech stack

| Area | Tools |
|---|---|
| UI | [React 19](https://react.dev), [React Router 7](https://reactrouter.com), [Tailwind CSS 3](https://tailwindcss.com), [Framer Motion](https://motion.dev), [Lucide](https://lucide.dev) icons |
| Build | [Vite 8](https://vite.dev), [vite-plugin-pwa](https://vite-pwa-org.netlify.app), a custom SEO plugin |
| Fonts | Inter and JetBrains Mono, served from the site with [Fontsource](https://fontsource.org) |
| PDF | [pdf.js](https://mozilla.github.io/pdf.js/), [pdf-lib](https://pdf-lib.js.org), pdf-lib-plus-encrypt |
| Markdown | [marked](https://marked.js.org), [highlight.js](https://highlightjs.org), [KaTeX](https://katex.org), [Mermaid](https://mermaid.js.org), [DOMPurify](https://github.com/cure53/DOMPurify) |
| Data | js-yaml, smol-toml, PapaParse, diff, Luxon, cronstrue, qrcode.react |
| Tests | [Vitest](https://vitest.dev), ESLint |
| Art | [Pixelbolt](https://github.com/skulitom/Pixelbolt) pixel art recipes for the logo, icons and banner |
| Serve | nginx (unprivileged image) in Docker, or Apache with `.htaccess` |

## Project layout

```
dev-tools/
├─ app/                        The web app (frontend). There is no backend.
│  ├─ index.html               HTML template. The build sets the meta tags for each page.
│  ├─ package.json             App dependencies and the version number of the site
│  ├─ vite.config.js           Build, PWA, security headers for preview, version injection
│  ├─ build/seo-plugin.js      Writes page HTML files, sitemap.xml, robots.txt and llms.txt
│  ├─ public/                  Static files: icons, og-image.png, .htaccess, theme-init.js
│  └─ src/
│     ├─ main.jsx, App.jsx     Start point and routes
│     ├─ site/meta.js          Site name, page titles and tool descriptions (one source)
│     ├─ tools/                One component for each tool, and registry.js (icons)
│     ├─ pages/                Other pages (Disclaimer)
│     ├─ lib/                  Pure logic with unit tests (JSON, Base64, subnet, cron, ...)
│     ├─ components/           Shell (sidebar, toolbar, footer), UI parts, error boundary
│     ├─ hooks/, styles/       Theme hook and design tokens
├─ branding/                   Pixelbolt recipes and the script that renders the icons
├─ scripts/
│  ├─ release.mjs              SemVer bump from commit messages, CHANGELOG.md
│  └─ zip-dist.mjs             Packs app/dist into release/devtools-v<version>.zip
├─ .github/assets/             README banner and logo GIFs
├─ .github/workflows/ci.yml    CI: lint, tests, build and a Docker test for each pull request
├─ Dockerfile, compose.yaml    Production container (nginx, non-root)
├─ nginx.conf                  nginx site configuration for the container
├─ nginx-security-headers.inc  Security headers that nginx.conf includes
└─ package.json                Root scripts that call the app scripts
```

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer and npm.

1. Get the code:

   ```bash
   git clone https://github.com/aimanamri/dev-tools.git
   cd dev-tools
   ```

2. Install the dependencies:

   ```bash
   npm run setup
   ```

3. Start the development server. It reloads the page when you change a file:

   ```bash
   npm run dev
   ```

   Open http://localhost:5173.

4. Before you send a change, run the linter, the tests and a build:

   ```bash
   npm run check
   ```

### Run in production mode on your computer

```bash
npm run build
npm run preview
```

Open http://localhost:4173. The preview server sends the same security headers as production.

Note: the Vite preview server sends the home page HTML for `/json`. Production servers (Apache and nginx) send `json/index.html`, which has the correct meta tags. Use Docker to test the production routing.

## Build and deploy

### Static host (ZIP file)

```bash
npm run build:zip
```

This command builds the site and writes `release/devtools-v<version>.zip`. To deploy:

1. Open the file manager or the FTP client of your web host.
2. Upload the contents of the ZIP file to the web root (for example `public_html/`).
3. Make sure that `.htaccess` is in the web root. Some file managers hide files that start with a dot.

On Apache and LiteSpeed hosts, `.htaccess` sets HTTPS, the page routes and the security headers. On nginx hosts, copy the rules from [`nginx.conf`](nginx.conf) and [`nginx-security-headers.inc`](nginx-security-headers.inc).

The ZIP file and the `release/` folder are in `.gitignore`.

### Other commands

| Command | What it does |
|---|---|
| `npm run setup` | Installs the app dependencies (`npm ci` in `app/`) |
| `npm run dev` | Starts the development server |
| `npm run build` | Builds the site into `app/dist/` |
| `npm run build:zip` | Builds the site and packs it into a ZIP file |
| `npm run preview` | Serves `app/dist/` on port 4173 |
| `npm test` | Runs the unit tests |
| `npm run lint` | Runs ESLint |
| `npm run check` | Runs lint, tests and build |
| `npm run release` | Sets the next version from the commit messages |
| `npm run branding` | Renders the logo, icons and banner again (needs Pixelbolt) |

## Run with Docker

The image builds the site in a Node.js stage. Then it serves the files with nginx as a non-root user on port 8080.

```bash
docker compose up -d --build
```

Open http://localhost:8080. To stop the container:

```bash
docker compose down
```

Without Compose:

```bash
docker build -t dev-tools .
docker run --rm -p 8080:8080 --read-only --tmpfs /tmp dev-tools
```

The container has a health check, a read-only file system and no Linux capabilities.

## Versions and releases

The project uses [Semantic Versioning](https://semver.org) and [Conventional Commits](https://www.conventionalcommits.org).

| Commit type | Example | Version change |
|---|---|---|
| `feat:` | `feat: add a UUID generator` | minor (1.2.0 → 1.3.0) |
| `fix:`, `sec:`, `perf:` | `fix: accept URL-safe Base64` | patch (1.2.0 → 1.2.1) |
| `feat!:` or `BREAKING CHANGE:` | `feat!: remove the old API` | major (1.2.0 → 2.0.0) |
| `docs:`, `chore:`, `build:`, `test:` | `docs: correct the README` | none |

To make a release:

```bash
npm run release -- --dry-run
npm run release -- --commit
git push --follow-tags
```

The release script writes the same version to `package.json`, `app/package.json`, `app/package-lock.json` and `compose.yaml`, and adds an entry to [`CHANGELOG.md`](CHANGELOG.md). The site footer reads the version from `app/package.json` at build time. Thus all version numbers stay the same.

## Contribute

1. Make a branch from `main`.
2. Write the change. Put pure logic in `app/src/lib/` and add tests in `app/src/lib/__tests__/`.
3. To add a tool: add its text to `app/src/site/meta.js`, its icon to `app/src/tools/registry.js` and its route to `app/src/App.jsx`.
4. Write UI text in [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org): short sentences, active voice, no em dashes.
5. Run `npm run check`. Use a Conventional Commit message.
6. Open a pull request.

To report a defect, open an [issue](https://github.com/aimanamri/dev-tools/issues). Do not put private data in an issue.

## Disclaimer and license

The site is supplied "as is", without a warranty. Examine all output before you use it in production. Read the full [disclaimer](https://devtools.aimanuddin.com/disclaimer).

Released under the [MIT License](LICENSE).
