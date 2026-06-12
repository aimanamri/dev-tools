import { useState, useCallback } from 'react'
import { Copy, Check, Trash2, Network } from 'lucide-react'

// ─── Pure-JS IPv4 helpers ──────────────────────────────────────────────────

function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function intToIPv4(n) {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join('.')
}

function ipv4ToBinary(ip) {
  return ip
    .split('.')
    .map(o => Number(o).toString(2).padStart(8, '0'))
    .join('.')
}

function intToBinary32(n) {
  return (n >>> 0).toString(2).padStart(32, '0')
}

function ipv4ToHex(ip) {
  return '0x' + ip
    .split('.')
    .map(o => Number(o).toString(16).padStart(2, '0').toUpperCase())
    .join('')
}

function toArpa(ip) {
  return ip.split('.').reverse().join('.') + '.in-addr.arpa'
}

function ipv4Class(ip) {
  const first = Number(ip.split('.')[0])
  if (first >= 1 && first <= 126) return 'A'
  if (first === 127) return 'A (Loopback)'
  if (first >= 128 && first <= 191) return 'B'
  if (first >= 192 && first <= 223) return 'C'
  if (first >= 224 && first <= 239) return 'D (Multicast)'
  return 'E (Reserved)'
}

function isPrivateIPv4(ip) {
  const n = ipv4ToInt(ip)
  const ranges = [
    [ipv4ToInt('10.0.0.0'), ipv4ToInt('10.255.255.255')],
    [ipv4ToInt('172.16.0.0'), ipv4ToInt('172.31.255.255')],
    [ipv4ToInt('192.168.0.0'), ipv4ToInt('192.168.255.255')],
  ]
  return ranges.some(([lo, hi]) => n >= lo && n <= hi)
}

function validateIPv4(ip) {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return false
  return parts.every(p => {
    const n = Number(p)
    return /^\d+$/.test(p) && n >= 0 && n <= 255
  })
}

function calcIPv4(ip, prefix) {
  const cidr = parseInt(prefix, 10)
  const maskInt = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0
  const wildcardInt = (~maskInt) >>> 0
  const ipInt = ipv4ToInt(ip)
  const networkInt = (ipInt & maskInt) >>> 0
  const broadcastInt = (networkInt | wildcardInt) >>> 0
  const firstHostInt = cidr < 31 ? networkInt + 1 : networkInt
  const lastHostInt = cidr < 31 ? broadcastInt - 1 : broadcastInt
  const totalHosts = Math.pow(2, 32 - cidr)
  const usableHosts = cidr >= 31 ? totalHosts : Math.max(0, totalHosts - 2)

  const networkAddr = intToIPv4(networkInt)
  const mask = intToIPv4(maskInt)
  const wildcard = intToIPv4(wildcardInt)
  const broadcast = intToIPv4(broadcastInt)
  const firstHost = intToIPv4(firstHostInt)
  const lastHost = intToIPv4(lastHostInt)

  // IPv4-mapped IPv6
  const hexIP = ip.split('.').map(o => Number(o).toString(16).padStart(2, '0'))
  const ipv4Mapped = `::ffff:${hexIP.slice(0, 2).join('')}:${hexIP.slice(2, 4).join('')}`
  const sixToFour = `2002:${hexIP.slice(0, 2).join('')}:${hexIP.slice(2, 4).join('')}::/48`

  // All networks
  const numNetworks = totalHosts >= 2 ? totalHosts / (cidr < 31 ? Math.pow(2, 32 - cidr) : 1) : 1
  const networks = []
  if (cidr <= 24) {
    const step = Math.pow(2, 32 - cidr)
    const maxNets = Math.min(256, Math.ceil(Math.pow(2, 32) / step))
    for (let i = 0; i < maxNets; i++) {
      const net = (i * step) >>> 0
      networks.push({
        network: intToIPv4(net),
        range: `${intToIPv4(net + 1)} – ${intToIPv4(net + step - 2)}`,
        broadcast: intToIPv4(net + step - 1),
      })
    }
  }

  return {
    ip,
    cidr,
    networkAddr,
    mask,
    wildcard,
    broadcast,
    firstHost,
    lastHost,
    totalHosts,
    usableHosts,
    ipClass: ipv4Class(ip),
    isPrivate: isPrivateIPv4(ip),
    binary: {
      ip: ipv4ToBinary(ip),
      mask: ipv4ToBinary(mask),
      network: ipv4ToBinary(networkAddr),
      broadcast: ipv4ToBinary(broadcast),
    },
    hex: ipv4ToHex(ip),
    intVal: ipInt >>> 0,
    arpa: toArpa(ip),
    ipv4Mapped,
    sixToFour,
    networks: networks.slice(0, 256),
  }
}

// ─── Pure-JS IPv6 helpers ──────────────────────────────────────────────────

function validateIPv6(addr) {
  // Accepts full or compressed notation
  try {
    expandIPv6(addr)
    return true
  } catch {
    return false
  }
}

function expandIPv6(addr) {
  addr = addr.trim().toLowerCase()
  if (addr.includes('::')) {
    const halves = addr.split('::')
    if (halves.length !== 2) throw new Error('invalid')
    const left = halves[0] ? halves[0].split(':') : []
    const right = halves[1] ? halves[1].split(':') : []
    const missing = 8 - left.length - right.length
    if (missing < 0) throw new Error('invalid')
    const mid = Array(missing).fill('0000')
    return [...left, ...mid, ...right].map(g => g.padStart(4, '0'))
  }
  const groups = addr.split(':')
  if (groups.length !== 8) throw new Error('invalid')
  return groups.map(g => g.padStart(4, '0'))
}

function compressIPv6(groups) {
  const full = groups.join(':')
  // Replace the longest run of zero groups with ::
  let best = { start: -1, len: 0 }
  let cur = { start: -1, len: 0 }
  groups.forEach((g, i) => {
    if (g === '0000') {
      if (cur.start === -1) cur = { start: i, len: 1 }
      else cur.len++
      if (cur.len > best.len) best = { ...cur }
    } else {
      cur = { start: -1, len: 0 }
    }
  })
  if (best.len < 2) return full
  const before = groups.slice(0, best.start).map(g => g.replace(/^0+/, '') || '0').join(':')
  const after = groups.slice(best.start + best.len).map(g => g.replace(/^0+/, '') || '0').join(':')
  return `${before}::${after}`
}

function ipv6GroupsToBigInt(groups) {
  return groups.reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g, 16)), 0n)
}

function bigIntToIPv6Groups(n) {
  const groups = []
  for (let i = 0; i < 8; i++) {
    groups.unshift((n & 0xffffn).toString(16).padStart(4, '0'))
    n >>= 16n
  }
  return groups
}

function calcIPv6(addr, prefix) {
  const cidr = parseInt(prefix, 10)
  const groups = expandIPv6(addr)
  const ipInt = ipv6GroupsToBigInt(groups)

  const totalBits = 128n
  const hostBits = BigInt(128 - cidr)
  const maskInt = cidr === 0 ? 0n : ((1n << totalBits) - 1n) ^ ((1n << hostBits) - 1n)
  const networkInt = ipInt & maskInt
  const lastInt = networkInt | ((1n << hostBits) - 1n)
  const firstHostInt = cidr < 127 ? networkInt + 1n : networkInt
  const lastHostInt = cidr < 127 ? lastInt - 1n : lastInt

  const networkGroups = bigIntToIPv6Groups(networkInt)
  const lastGroups = bigIntToIPv6Groups(lastInt)
  const maskGroups = bigIntToIPv6Groups(maskInt)
  const firstHostGroups = bigIntToIPv6Groups(firstHostInt)
  const lastHostGroups = bigIntToIPv6Groups(lastHostInt)

  const compressed = compressIPv6(groups)
  const networkFull = networkGroups.join(':')
  const networkCompressed = compressIPv6(networkGroups)

  const totalAddresses = 1n << hostBits

  // Network type detection
  let networkType = 'Global Unicast'
  const firstGroup = parseInt(groups[0], 16)
  if (groups[0] === 'fe80' || (firstGroup & 0xffc0) === 0xfe80) networkType = 'Link-Local'
  else if (groups[0].startsWith('fc') || groups[0].startsWith('fd')) networkType = 'Unique Local'
  else if (groups[0] === 'ff00' || groups[0].startsWith('ff')) networkType = 'Multicast'
  else if (ipInt === 1n) networkType = 'Loopback'
  else if (ipInt === 0n) networkType = 'Unspecified'

  return {
    addr,
    cidr,
    compressed,
    expanded: groups.join(':'),
    networkFull,
    networkCompressed,
    networkCidr: `${networkCompressed}/${cidr}`,
    firstHost: compressIPv6(firstHostGroups),
    lastHost: compressIPv6(lastHostGroups),
    last: compressIPv6(lastGroups),
    mask: compressIPv6(maskGroups),
    totalAddresses,
    networkType,
    groups,
    networkGroups,
  }
}

// ─── Shared Copy button ────────────────────────────────────────────────────

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copy"
      className="ml-auto flex-shrink-0 p-1 rounded transition-colors"
      style={{
        color: copied ? 'var(--color-success)' : 'var(--color-ink-faint)',
        backgroundColor: 'transparent',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
    </button>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────

function Row({ label, value, mono = true }) {
  if (value === undefined || value === null || value === '') return null
  const val = String(value)
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      <td
        className="py-1.5 pr-4 text-xs whitespace-nowrap"
        style={{ color: 'var(--color-ink-muted)', width: '44%' }}
      >
        {label}
      </td>
      <td className="py-1.5">
        <div className="flex items-center gap-1">
          <span
            className={`text-xs break-all ${mono ? 'font-mono' : ''}`}
            style={{ color: 'var(--color-ink)' }}
          >
            {val}
          </span>
          <CopyBtn value={val} />
        </div>
      </td>
    </tr>
  )
}

function SectionHead({ title }) {
  return (
    <tr>
      <td
        colSpan={2}
        className="pt-3 pb-1 text-2xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        {title}
      </td>
    </tr>
  )
}

// ─── IPv4 Result ──────────────────────────────────────────────────────────

function IPv4Result({ result }) {
  const { ip, cidr, networkAddr, mask, wildcard, broadcast, firstHost, lastHost, totalHosts,
    usableHosts, ipClass, isPrivate, binary, hex, intVal, arpa, ipv4Mapped, sixToFour,
    networks } = result

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Network Address', val: networkAddr },
          { label: 'Subnet Mask', val: mask },
          { label: 'Usable Hosts', val: usableHosts.toLocaleString() },
          { label: 'Broadcast', val: broadcast },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="rounded-md p-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-2xs mb-1" style={{ color: 'var(--color-ink-muted)' }}>{label}</p>
            <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-ink)' }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--color-border-strong)' }}
      >
        <div
          className="px-3 py-2 text-xs font-semibold"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-ink-muted)', borderBottom: '1px solid var(--color-border)' }}
        >
          Network Details — {ip}/{cidr}
        </div>
        <div className="px-3" style={{ backgroundColor: 'var(--color-input-bg)' }}>
          <table className="w-full">
            <tbody>
              <SectionHead title="Address Info" />
              <Row label="IP Address" value={`${ip}/${cidr}`} />
              <Row label="Network Address" value={networkAddr} />
              <Row label="Usable Host Range" value={cidr >= 31 ? `${firstHost} – ${lastHost}` : `${firstHost} – ${lastHost}`} />
              <Row label="Broadcast Address" value={broadcast} />
              <Row label="Total Hosts" value={totalHosts.toLocaleString()} />
              <Row label="Usable Hosts" value={usableHosts.toLocaleString()} />

              <SectionHead title="Masking Information" />
              <Row label="Subnet Mask" value={mask} />
              <Row label="Wildcard Mask" value={wildcard} />
              <Row label="Subnet Mask (Binary)" value={intToBinary32(ipv4ToInt(mask)).match(/.{8}/g).join('.')} />

              <SectionHead title="Identifier Data" />
              <Row label="IP Class" value={ipClass} mono={false} />
              <Row label="IP Type" value={isPrivate ? 'Private' : 'Public'} mono={false} />
              <Row label="CIDR Notation" value={`${networkAddr}/${cidr}`} />
              <Row label="Hex" value={hex} />
              <Row label="Integer" value={String(intVal)} />
              <Row label="Binary" value={binary.ip} />
              <Row label="arpa" value={arpa} />

              <SectionHead title="Binary Representation" />
              <Row label="IP Address" value={binary.ip} />
              <Row label="Subnet Mask" value={binary.mask} />
              <Row label="Network Address" value={binary.network} />
              <Row label="Broadcast Address" value={binary.broadcast} />

              <SectionHead title="IPv6 Transition" />
              <Row label="IPv4-Mapped IPv6" value={ipv4Mapped} />
              <Row label="6to4 Prefix" value={sixToFour} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Subnet list */}
      {networks.length > 0 && (
        <div
          className="rounded-md overflow-hidden"
          style={{ border: '1px solid var(--color-border-strong)' }}
        >
          <div
            className="px-3 py-2 text-xs font-semibold"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-ink-muted)', borderBottom: '1px solid var(--color-border)' }}
          >
            All /{cidr} Networks {networks.length >= 256 ? '(first 256)' : `(${networks.length} total)`}
          </div>
          <div className="overflow-x-auto" style={{ backgroundColor: 'var(--color-input-bg)', maxHeight: 280 }}>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                  {['#', 'Network', 'Usable Range', 'Broadcast'].map(h => (
                    <th key={h} className="px-3 py-1.5 text-left font-medium" style={{ color: 'var(--color-ink-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {networks.map((net, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-3 py-1 tabular-nums" style={{ color: 'var(--color-ink-faint)' }}>{i}</td>
                    <td className="px-3 py-1" style={{ color: 'var(--color-ink)' }}>{net.network}/{cidr}</td>
                    <td className="px-3 py-1" style={{ color: 'var(--color-ink)' }}>{net.range}</td>
                    <td className="px-3 py-1" style={{ color: 'var(--color-ink)' }}>{net.broadcast}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── IPv6 Result ──────────────────────────────────────────────────────────

function IPv6Result({ result }) {
  const { addr, cidr, compressed, expanded, networkFull, networkCompressed, networkCidr,
    firstHost, lastHost, last, mask, totalAddresses, networkType } = result

  const totalStr = totalAddresses > 10n ** 18n
    ? totalAddresses.toLocaleString()
    : totalAddresses.toLocaleString()

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Network', val: networkCidr },
          { label: 'Type', val: networkType },
          { label: 'Total Addresses', val: totalAddresses.toLocaleString() },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="rounded-md p-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-2xs mb-1" style={{ color: 'var(--color-ink-muted)' }}>{label}</p>
            <p className="text-xs font-mono font-medium break-all" style={{ color: 'var(--color-ink)' }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Detail */}
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--color-border-strong)' }}
      >
        <div
          className="px-3 py-2 text-xs font-semibold"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-ink-muted)', borderBottom: '1px solid var(--color-border)' }}
        >
          Network Details — {compressed}/{cidr}
        </div>
        <div className="px-3" style={{ backgroundColor: 'var(--color-input-bg)' }}>
          <table className="w-full">
            <tbody>
              <SectionHead title="Address" />
              <Row label="Input Address" value={addr} />
              <Row label="Compressed" value={compressed} />
              <Row label="Expanded" value={expanded} />

              <SectionHead title="Network" />
              <Row label="Network Address" value={`${networkCompressed}/${cidr}`} />
              <Row label="Network (Full)" value={`${networkFull}/${cidr}`} />
              <Row label="First Usable Host" value={firstHost} />
              <Row label="Last Usable Host" value={lastHost} />
              <Row label="Last Address" value={last} />

              <SectionHead title="Properties" />
              <Row label="Subnet Mask" value={mask} />
              <Row label="Network Type" value={networkType} mono={false} />
              <Row label="Prefix Length" value={`/${cidr}`} />
              <Row label="Total Addresses" value={totalAddresses.toLocaleString()} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Reference Table ──────────────────────────────────────────────────────

const ipv4Ref = [
  { cidr: '/1',  mask: '128.0.0.0',     hosts: '2,147,483,646' },
  { cidr: '/8',  mask: '255.0.0.0',     hosts: '16,777,214' },
  { cidr: '/16', mask: '255.255.0.0',   hosts: '65,534' },
  { cidr: '/24', mask: '255.255.255.0', hosts: '254' },
  { cidr: '/25', mask: '255.255.255.128', hosts: '126' },
  { cidr: '/26', mask: '255.255.255.192', hosts: '62' },
  { cidr: '/27', mask: '255.255.255.224', hosts: '30' },
  { cidr: '/28', mask: '255.255.255.240', hosts: '14' },
  { cidr: '/29', mask: '255.255.255.248', hosts: '6' },
  { cidr: '/30', mask: '255.255.255.252', hosts: '2' },
  { cidr: '/31', mask: '255.255.255.254', hosts: '2 (point-to-point)' },
  { cidr: '/32', mask: '255.255.255.255', hosts: '1 (host route)' },
]

// ─── Main Component ───────────────────────────────────────────────────────

export default function IPSubnetCalculator() {
  const [tab, setTab] = useState('ipv4')

  // IPv4 state
  const [v4IP, setV4IP] = useState('192.168.1.0')
  const [v4Prefix, setV4Prefix] = useState('24')
  const [v4Error, setV4Error] = useState('')
  const [v4Result, setV4Result] = useState(null)

  // IPv6 state
  const [v6Addr, setV6Addr] = useState('2001:db8::')
  const [v6Prefix, setV6Prefix] = useState('32')
  const [v6Error, setV6Error] = useState('')
  const [v6Result, setV6Result] = useState(null)

  const calcV4 = useCallback(() => {
    const ip = v4IP.trim()
    const prefix = parseInt(v4Prefix, 10)
    if (!validateIPv4(ip)) {
      setV4Error('Invalid IPv4 address. Expected format: 0–255.0–255.0–255.0–255')
      setV4Result(null)
      return
    }
    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      setV4Error('Prefix length must be between 0 and 32.')
      setV4Result(null)
      return
    }
    setV4Error('')
    setV4Result(calcIPv4(ip, v4Prefix))
  }, [v4IP, v4Prefix])

  const calcV6 = useCallback(() => {
    const addr = v6Addr.trim()
    const prefix = parseInt(v6Prefix, 10)
    if (!validateIPv6(addr)) {
      setV6Error('Invalid IPv6 address. Use full or compressed notation (e.g. 2001:db8::1).')
      setV6Result(null)
      return
    }
    if (isNaN(prefix) || prefix < 0 || prefix > 128) {
      setV6Error('Prefix length must be between 0 and 128.')
      setV6Result(null)
      return
    }
    setV6Error('')
    setV6Result(calcIPv6(addr, v6Prefix))
  }, [v6Addr, v6Prefix])

  const clearV4 = () => { setV4IP(''); setV4Prefix('24'); setV4Error(''); setV4Result(null) }
  const clearV6 = () => { setV6Addr(''); setV6Prefix('64'); setV6Error(''); setV6Result(null) }

  const inputStyle = {
    backgroundColor: 'var(--color-input-bg)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem',
    padding: '7px 12px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 120ms',
  }

  const labelStyle = {
    fontSize: '0.75rem',
    color: 'var(--color-ink-muted)',
    marginBottom: 4,
    display: 'block',
  }

  const tabs = [
    { id: 'ipv4', label: 'IPv4' },
    { id: 'ipv6', label: 'IPv6' },
    { id: 'ref', label: 'Reference' },
    { id: 'learn', label: 'Learn' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Network size={18} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
            IP Subnet Calculator
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          Dual-stack IPv4 & IPv6 subnet calculations — network address, host range, masks, and more.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0.5 p-1 rounded-md w-fit"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 py-1 rounded text-sm font-mono transition-colors"
            style={{
              backgroundColor: tab === t.id ? 'var(--color-input-bg)' : 'transparent',
              color: tab === t.id ? 'var(--color-ink)' : 'var(--color-ink-muted)',
              border: tab === t.id ? '1px solid var(--color-border)' : '1px solid transparent',
              boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── IPv4 ── */}
      {tab === 'ipv4' && (
        <div className="space-y-5">
          <div
            className="rounded-md p-4 space-y-4"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label style={labelStyle}>IP Address</label>
                <input
                  type="text"
                  value={v4IP}
                  onChange={e => setV4IP(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && calcV4()}
                  placeholder="e.g. 192.168.1.0"
                  style={{
                    ...inputStyle,
                    borderColor: v4Error ? 'var(--color-error)' : 'var(--color-border-strong)',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Prefix Length (CIDR)</label>
                <select
                  value={v4Prefix}
                  onChange={e => setV4Prefix(e.target.value)}
                  style={{ ...inputStyle }}
                >
                  {Array.from({ length: 33 }, (_, i) => (
                    <option key={i} value={i}>/{i}</option>
                  ))}
                </select>
              </div>
            </div>

            {v4Error && (
              <p className="text-xs" style={{ color: 'var(--color-error)' }}>{v4Error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={calcV4}
                className="px-4 py-2 rounded-sm text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-ink-on-primary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
              >
                Calculate
              </button>
              <button
                onClick={clearV4}
                className="px-3 py-2 rounded-sm text-sm transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--color-ink-muted)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 size={13} strokeWidth={1.5} />
                Clear
              </button>
            </div>
          </div>

          {v4Result && <IPv4Result result={v4Result} />}
        </div>
      )}

      {/* ── IPv6 ── */}
      {tab === 'ipv6' && (
        <div className="space-y-5">
          <div
            className="rounded-md p-4 space-y-4"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label style={labelStyle}>IPv6 Address</label>
                <input
                  type="text"
                  value={v6Addr}
                  onChange={e => setV6Addr(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && calcV6()}
                  placeholder="e.g. 2001:db8::1"
                  style={{
                    ...inputStyle,
                    borderColor: v6Error ? 'var(--color-error)' : 'var(--color-border-strong)',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Prefix Length</label>
                <select
                  value={v6Prefix}
                  onChange={e => setV6Prefix(e.target.value)}
                  style={{ ...inputStyle }}
                >
                  {Array.from({ length: 129 }, (_, i) => (
                    <option key={i} value={i}>/{i}</option>
                  ))}
                </select>
              </div>
            </div>

            {v6Error && (
              <p className="text-xs" style={{ color: 'var(--color-error)' }}>{v6Error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={calcV6}
                className="px-4 py-2 rounded-sm text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-ink-on-primary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
              >
                Calculate
              </button>
              <button
                onClick={clearV6}
                className="px-3 py-2 rounded-sm text-sm transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--color-ink-muted)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 size={13} strokeWidth={1.5} />
                Clear
              </button>
            </div>
          </div>

          {v6Result && <IPv6Result result={v6Result} />}
        </div>
      )}

      {/* ── Reference Table ── */}
      {tab === 'ref' && (
        <div className="space-y-4">
          <div
            className="rounded-md overflow-hidden"
            style={{ border: '1px solid var(--color-border-strong)' }}
          >
            <div
              className="px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-ink-muted)', borderBottom: '1px solid var(--color-border)' }}
            >
              IPv4 CIDR Quick Reference
            </div>
            <div className="overflow-x-auto" style={{ backgroundColor: 'var(--color-input-bg)' }}>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    {['Prefix', 'Subnet Mask', 'Usable Hosts / Subnet'].map(h => (
                      <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: 'var(--color-ink-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ipv4Ref.map(row => (
                    <tr key={row.cidr} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-1.5" style={{ color: 'var(--color-primary)' }}>{row.cidr}</td>
                      <td className="px-4 py-1.5" style={{ color: 'var(--color-ink)' }}>{row.mask}</td>
                      <td className="px-4 py-1.5" style={{ color: 'var(--color-ink)' }}>{row.hosts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className="rounded-md overflow-hidden"
            style={{ border: '1px solid var(--color-border-strong)' }}
          >
            <div
              className="px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-ink-muted)', borderBottom: '1px solid var(--color-border)' }}
            >
              IPv4 Classes
            </div>
            <div style={{ backgroundColor: 'var(--color-input-bg)' }}>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    {['Class', 'Range', 'Default Mask', 'Purpose'].map(h => (
                      <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: 'var(--color-ink-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { cls: 'A', range: '1.0.0.0 – 126.255.255.255', mask: '255.0.0.0 (/8)', purpose: 'Large networks' },
                    { cls: 'B', range: '128.0.0.0 – 191.255.255.255', mask: '255.255.0.0 (/16)', purpose: 'Medium networks' },
                    { cls: 'C', range: '192.0.0.0 – 223.255.255.255', mask: '255.255.255.0 (/24)', purpose: 'Small networks' },
                    { cls: 'D', range: '224.0.0.0 – 239.255.255.255', mask: 'N/A', purpose: 'Multicast' },
                    { cls: 'E', range: '240.0.0.0 – 255.255.255.255', mask: 'N/A', purpose: 'Reserved / Research' },
                  ].map(row => (
                    <tr key={row.cls} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-1.5 font-semibold" style={{ color: 'var(--color-primary)' }}>{row.cls}</td>
                      <td className="px-4 py-1.5" style={{ color: 'var(--color-ink)' }}>{row.range}</td>
                      <td className="px-4 py-1.5" style={{ color: 'var(--color-ink)' }}>{row.mask}</td>
                      <td className="px-4 py-1.5" style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-sans)' }}>{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Learn ── */}
      {tab === 'learn' && (
        <div className="space-y-4 max-w-2xl">
          {[
            {
              title: 'What is a Subnet?',
              body: `A subnet (subnetwork) is a logical subdivision of an IP network. Subnetting divides a large network into smaller, manageable segments — improving security, reducing congestion, and enabling more efficient use of IP address space. Devices on the same subnet can communicate directly; devices on different subnets require a router.`,
            },
            {
              title: 'What is a Router?',
              body: `A router is a network device that forwards data packets between different subnets or networks. It examines the destination IP address of each packet and uses a routing table to determine the best path to forward it. Without a router, hosts on different subnets cannot reach each other.`,
            },
            {
              title: 'Network Number vs. Host Identifier',
              body: `An IP address has two logical parts: the network portion (identified by the subnet mask) and the host portion. The subnet mask applied via bitwise AND isolates the network address. The remaining bits identify the specific host within that network. Example: in 192.168.1.50/24, the network is 192.168.1.0 and the host is .50.`,
            },
            {
              title: 'CIDR Notation',
              body: `Classless Inter-Domain Routing (CIDR) notation represents both an IP address and its associated routing prefix. Written as an address followed by a slash and the prefix length (e.g., 10.0.0.0/8). The prefix length indicates how many leading bits of the address are fixed for the network. CIDR replaced the rigid Class A/B/C system, enabling flexible allocation and helping slow IPv4 address exhaustion.`,
            },
            {
              title: 'Network Address & Broadcast',
              body: `The network address is the first address in a subnet (all host bits set to 0). It identifies the subnet itself and is not assignable to any host. The broadcast address is the last address (all host bits set to 1). Packets sent to this address reach all hosts on the subnet. Only the addresses between these two are usable host addresses.`,
            },
            {
              title: 'IPv6 Addressing',
              body: `IPv6 uses 128-bit addresses written as eight groups of four hexadecimal digits (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334). Consecutive groups of zeros can be compressed with :: (once per address). IPv6 was designed to overcome IPv4 exhaustion — providing 2¹²⁸ ≈ 3.4 × 10³⁸ unique addresses. Subnetting in IPv6 follows the same CIDR principles, with prefix lengths from /0 to /128.`,
            },
          ].map(({ title, body }) => (
            <div
              key={title}
              className="rounded-md p-4"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
