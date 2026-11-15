// Site and page metadata. One source for page titles, meta tags, the sitemap,
// robots.txt and llms.txt. This file has no React or browser code, thus the
// build (vite.config.js) can import it too.
//
// Write all text in ASD-STE100 Simplified Technical English: short sentences,
// active voice, no em dashes.

export const SITE = {
  name: 'Dev Tools',
  url: 'https://devtools.aimanuddin.com',
  repo: 'https://github.com/aimanamri/dev-tools/',
  author: 'Aiman Amri',
  title: 'Dev Tools: Free Developer Tools That Run in Your Browser',
  description:
    'Free developer tools that run in your browser. Format JSON, edit PDF files, make QR codes, convert Base64 and timestamps, and calculate subnets. No server. No sign-up. No tracking.',
  ogImage: '/og-image.png',
  ogImageAlt: 'The Dev Tools logo, a terminal window with a prompt, and the text: 19 developer tools that run in your browser.',
  themeColor: '#3d6a80',
}

// group: the heading for the tool in llms.txt.
export const TOOL_META = [
  { path: '/password', label: 'Password Generator', group: 'Generators',
    desc: 'Make secure random passwords. See the strength of each password.',
    seo: 'Make strong random passwords in your browser with crypto.getRandomValues(). Set the length and the character types. See the entropy and the estimated time to break each password.' },
  { path: '/timestamp', label: 'Timestamp Converter', group: 'Date and time',
    desc: 'Convert Unix timestamps to dates. Convert dates to Unix timestamps.',
    seo: 'Convert Unix timestamps in seconds, milliseconds, microseconds or nanoseconds to dates in UTC and local time. Get ISO 8601, RFC 2822 and Discord timestamp formats.' },
  { path: '/json', label: 'JSON Formatter', group: 'JSON',
    desc: 'Format, minify and validate JSON. See each error with its position.',
    seo: 'Format, minify and validate JSON in your browser. Select 2 spaces, 4 spaces or tabs. See each syntax error with its position.' },
  { path: '/base64', label: 'Base64 Converter', group: 'Converters',
    desc: 'Encode and decode Base64 text and files in your browser.',
    seo: 'Encode text and files to Base64. Decode Base64 to text or to a file. Supports UTF-8, ASCII, Latin-1, URL-safe Base64 and data URLs.' },
  { path: '/cron', label: 'Cron Generator', group: 'Text and markup',
    desc: 'Build a cron expression field by field. Read what it does in plain English.',
    seo: 'Build a cron expression field by field or from a preset. Read a plain English description of the schedule. Each field shows clear errors.' },
  { path: '/qr', label: 'QR Code Generator', group: 'Generators',
    desc: 'Make QR codes for links, contact cards, SMS, email and other data.',
    seo: 'Make QR codes for links, text, email, SMS, phone numbers, contact cards (vCard) and app store links. Set the colours, the size and the error correction. Download PNG or SVG.' },
  { path: '/svg', label: 'SVG Converter', group: 'Converters',
    desc: 'Clean an SVG. Convert it to JSX, a CSS background or Base64.',
    seo: 'Clean and minify an SVG. Convert it to a React JSX component, a CSS background-image data URI or Base64. Change its colours and see a live preview.' },
  { path: '/markdown', label: 'Markdown Preview', group: 'Text and markup',
    desc: 'Write Markdown and see the result immediately. Includes code highlighting, math and diagrams.',
    seo: 'Write GitHub Flavored Markdown and see a live preview with code highlighting, KaTeX math and Mermaid diagrams. Export Markdown or a standalone HTML file.' },
  { path: '/json-convert', label: 'JSON Converters', group: 'JSON',
    desc: 'Convert JSON to CSV, YAML, XML, a Python dict or a Markdown table.',
    seo: 'Convert JSON to CSV, YAML, XML, a Python dict, an escaped JSON string or a Markdown table. The output changes as you type.' },
  { path: '/json-tree', label: 'JSON Tree Viewer', group: 'JSON',
    desc: 'Examine nested JSON in a tree. Open and close each branch.',
    seo: 'Examine nested JSON in a tree with colours for each type. Open and close each branch. Expand or collapse all branches.' },
  { path: '/json-diff', label: 'JSON Diff', group: 'JSON',
    desc: 'Compare two JSON documents side by side. See each change.',
    seo: 'Compare two JSON documents side by side or in one column. The tool sorts the keys first, thus a different key sequence is not a change.' },
  { path: '/timezone', label: 'Timezone Converter', group: 'Date and time',
    desc: 'Compare one time in many time zones. Offsets include daylight saving time.',
    seo: 'Compare one time in many time zones. The offsets include daylight saving time. Add and remove zones.' },
  { path: '/pydict', label: 'Python → JSON', group: 'Converters',
    desc: 'Convert a Python dict to valid JSON. Supports True, False, None, tuples and single quotes.',
    seo: 'Convert a Python dict, list or tuple literal to valid JSON. Supports True, False, None, single quotes, comments, trailing commas and escapes. No code runs.' },
  { path: '/blowfish', label: 'Blowfish Config', group: 'Hugo',
    desc: 'Convert Hugo Blowfish configuration files between YAML and TOML. Includes templates.',
    seo: 'Convert Hugo Blowfish theme configuration files between YAML and TOML. Start from templates for each configuration file.' },
  { path: '/blowfish-article', label: 'Hugo Article Generator', group: 'Hugo',
    desc: 'Build the front matter for a Hugo Blowfish article in a form. Preview and download the .md file.',
    seo: 'Build the front matter for a Hugo Blowfish article in a form. See a live preview and download the Markdown file.' },
  { path: '/subnet', label: 'IP Subnet Calculator', group: 'Network',
    desc: 'Calculate IPv4 and IPv6 subnets. See the network address, host range, masks and binary values.',
    seo: 'Calculate IPv4 and IPv6 subnets. See the network address, the broadcast address, the host range, the masks, the binary values and all subnets.' },
  { path: '/ip-convert', label: 'IP Address Converter', group: 'Network',
    desc: 'Convert an IPv4 address to binary, hexadecimal and integer values. Convert binary to an address.',
    seo: 'Convert an IPv4 address to 32-bit binary, hexadecimal and integer values. Convert a binary value back to an address.' },
  { path: '/pdf', label: 'PDF Tool Suite', group: 'PDF',
    desc: 'View, reorder, merge, split and watermark PDF files. Fill PDF forms. Your files stay in your browser.',
    seo: 'View, reorder, merge, split and watermark PDF files, and fill PDF forms. All work occurs in your browser. The site does not upload your files.' },
  { path: '/pdf-security', label: 'PDF Security', group: 'PDF',
    desc: 'Add a password to a PDF or remove one. Your files stay in your browser.',
    seo: 'Add an AES-128 password to a PDF, or remove the password from a PDF that you can open. All work occurs in your browser.' },
]

export const PAGES = [
  { path: '/', title: SITE.title, description: SITE.description },
  ...TOOL_META.map(t => ({
    path: t.path,
    title: `${t.label} | ${SITE.name}`,
    description: t.seo,
  })),
  {
    path: '/disclaimer',
    title: `Disclaimer | ${SITE.name}`,
    description: 'How Dev Tools processes your data, and the limits of its responsibility. All tools operate in your browser. The site has no warranty.',
  },
]

export function pageFor(path) {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path
  return PAGES.find(p => p.path === clean) ?? PAGES[0]
}
