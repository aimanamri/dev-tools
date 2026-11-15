import {
  KeyRound, Clock, Braces, Binary, CalendarClock,
  QrCode, FileImage, FileText, ArrowLeftRight, Network, GitCompare,
  Globe, FileCode2, Layers, NotebookPen, Cpu, Hash, File, ShieldCheck,
} from 'lucide-react'

import { TOOL_META } from '../site/meta'

// Icon for each tool path. The text for each tool is in src/site/meta.js.
const ICONS = {
  '/password': KeyRound,
  '/timestamp': Clock,
  '/json': Braces,
  '/base64': Binary,
  '/cron': CalendarClock,
  '/qr': QrCode,
  '/svg': FileImage,
  '/markdown': FileText,
  '/json-convert': ArrowLeftRight,
  '/json-tree': Network,
  '/json-diff': GitCompare,
  '/timezone': Globe,
  '/pydict': FileCode2,
  '/blowfish': Layers,
  '/blowfish-article': NotebookPen,
  '/subnet': Cpu,
  '/ip-convert': Hash,
  '/pdf': File,
  '/pdf-security': ShieldCheck,
}

export const TOOLS = TOOL_META.map(t => ({ path: t.path, label: t.label, icon: ICONS[t.path], desc: t.desc }))
