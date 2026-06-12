import {
  KeyRound, Clock, Braces, Binary, CalendarClock,
  QrCode, FileImage, FileText, ArrowLeftRight, Network, GitCompare,
  Globe, FileCode2, Layers, NotebookPen, Cpu, Hash, File, ShieldCheck,
} from 'lucide-react'

export const TOOLS = [
  { path: '/password',         label: 'Password Generator',    icon: KeyRound,      desc: 'Cryptographically secure passwords with strength estimation.' },
  { path: '/timestamp',        label: 'Timestamp Converter',   icon: Clock,         desc: 'Convert between Unix timestamps and human-readable dates.' },
  { path: '/json',             label: 'JSON Formatter',        icon: Braces,        desc: 'Format, minify and validate JSON with inline error display.' },
  { path: '/base64',           label: 'Base64 Converter',      icon: Binary,        desc: 'Encode and decode Base64 text and files entirely client-side.' },
  { path: '/cron',             label: 'Cron Generator',        icon: CalendarClock, desc: 'Build cron expressions visually with plain-English explanations.' },
  { path: '/qr',               label: 'QR Code Generator',     icon: QrCode,        desc: 'Generate QR codes for URLs, vCards, SMS, email and more.' },
  { path: '/svg',              label: 'SVG Converter',         icon: FileImage,     desc: 'Optimize and convert SVG to JSX, CSS background, or Base64.' },
  { path: '/markdown',         label: 'Markdown Preview',      icon: FileText,      desc: 'Live markdown rendering with syntax highlighting and math.' },
  { path: '/json-convert',     label: 'JSON Converters',       icon: ArrowLeftRight,desc: 'Export JSON as CSV, YAML, XML, Python dict, or Markdown table.' },
  { path: '/json-tree',        label: 'JSON Tree Viewer',      icon: Network,       desc: 'Explore complex JSON payloads in an interactive collapsible tree.' },
  { path: '/json-diff',        label: 'JSON Diff',             icon: GitCompare,    desc: 'Visual side-by-side diff of two JSON documents with change highlighting.' },
  { path: '/timezone',         label: 'Timezone Converter',    icon: Globe,         desc: 'Compare any moment across global timezones with DST-aware offset display.' },
  { path: '/pydict',           label: 'Python → JSON',         icon: FileCode2,     desc: 'Convert Python dict literals to valid JSON — handles True, False, None and single quotes.' },
  { path: '/blowfish',         label: 'Blowfish Config',       icon: Layers,        desc: 'Bi-directional YAML ↔ TOML transpiler for Hugo Blowfish theme config files, with built-in templates.' },
  { path: '/blowfish-article', label: 'Hugo Article Generator',icon: NotebookPen,   desc: 'GUI front matter builder for Hugo Blowfish articles — generates ready-to-use .md files with live preview.' },
  { path: '/subnet',           label: 'IP Subnet Calculator',  icon: Cpu,           desc: 'Dual-stack IPv4 & IPv6 subnet calculator — network address, host range, masks, and binary breakdown.' },
  { path: '/ip-convert',       label: 'IP Address Converter',  icon: Hash,          desc: 'Convert IPv4 addresses to 32-bit binary and back, with hex, integer, and per-octet breakdown.' },
  { path: '/pdf',              label: 'PDF Tool Suite',        icon: File,          desc: 'View, reorder, merge, split, watermark and fill PDF forms — fully client-side, files never uploaded.' },
  { path: '/pdf-security',     label: 'PDF Security',          icon: ShieldCheck,   desc: 'Remove or add password protection to PDF files. Unlock encrypted PDFs or encrypt with open and owner passwords — 100% client-side.' },
]
