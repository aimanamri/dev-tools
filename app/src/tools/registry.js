import {
  KeyRound, Clock, Braces, Binary, CalendarClock,
  QrCode, FileImage, FileText, ArrowLeftRight, Network, GitCompare,
  Globe, FileCode2, Layers, NotebookPen, Cpu, Hash, File, ShieldCheck,
} from 'lucide-react'

export const TOOLS = [
  { path: '/password',         label: 'Password Generator',    icon: KeyRound,      desc: 'Make secure random passwords. See the strength of each password.' },
  { path: '/timestamp',        label: 'Timestamp Converter',   icon: Clock,         desc: 'Convert Unix timestamps to dates. Convert dates to Unix timestamps.' },
  { path: '/json',             label: 'JSON Formatter',        icon: Braces,        desc: 'Format, minify and validate JSON. See each error with its position.' },
  { path: '/base64',           label: 'Base64 Converter',      icon: Binary,        desc: 'Encode and decode Base64 text and files in your browser.' },
  { path: '/cron',             label: 'Cron Generator',        icon: CalendarClock, desc: 'Build a cron expression field by field. Read what it does in plain English.' },
  { path: '/qr',               label: 'QR Code Generator',     icon: QrCode,        desc: 'Make QR codes for links, contact cards, SMS, email and other data.' },
  { path: '/svg',              label: 'SVG Converter',         icon: FileImage,     desc: 'Clean an SVG. Convert it to JSX, a CSS background or Base64.' },
  { path: '/markdown',         label: 'Markdown Preview',      icon: FileText,      desc: 'Write Markdown and see the result immediately. Includes code highlighting, math and diagrams.' },
  { path: '/json-convert',     label: 'JSON Converters',       icon: ArrowLeftRight,desc: 'Convert JSON to CSV, YAML, XML, a Python dict or a Markdown table.' },
  { path: '/json-tree',        label: 'JSON Tree Viewer',      icon: Network,       desc: 'Examine nested JSON in a tree. Open and close each branch.' },
  { path: '/json-diff',        label: 'JSON Diff',             icon: GitCompare,    desc: 'Compare two JSON documents side by side. See each change.' },
  { path: '/timezone',         label: 'Timezone Converter',    icon: Globe,         desc: 'Compare one time in many time zones. Offsets include daylight saving time.' },
  { path: '/pydict',           label: 'Python → JSON',         icon: FileCode2,     desc: 'Convert a Python dict to valid JSON. Supports True, False, None, tuples and single quotes.' },
  { path: '/blowfish',         label: 'Blowfish Config',       icon: Layers,        desc: 'Convert Hugo Blowfish configuration files between YAML and TOML. Includes templates.' },
  { path: '/blowfish-article', label: 'Hugo Article Generator',icon: NotebookPen,   desc: 'Build the front matter for a Hugo Blowfish article in a form. Preview and download the .md file.' },
  { path: '/subnet',           label: 'IP Subnet Calculator',  icon: Cpu,           desc: 'Calculate IPv4 and IPv6 subnets. See the network address, host range, masks and binary values.' },
  { path: '/ip-convert',       label: 'IP Address Converter',  icon: Hash,          desc: 'Convert an IPv4 address to binary, hexadecimal and integer values. Convert binary to an address.' },
  { path: '/pdf',              label: 'PDF Tool Suite',        icon: File,          desc: 'View, reorder, merge, split and watermark PDF files. Fill PDF forms. Your files stay in your browser.' },
  { path: '/pdf-security',     label: 'PDF Security',          icon: ShieldCheck,   desc: 'Add a password to a PDF or remove one. Your files stay in your browser.' },
]
