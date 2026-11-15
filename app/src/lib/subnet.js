// IPv4 and IPv6 subnet math. No network access is necessary.

// ─── Pure-JS IPv4 helpers ──────────────────────────────────────────────────

export function ipv4ToInt(ip) {
  const parts = ip.trim().split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

export function intToIPv4(n) {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join('.')
}

export function ipv4ToBinary(ip) {
  return ip
    .split('.')
    .map(o => Number(o).toString(2).padStart(8, '0'))
    .join('.')
}

export function intToBinary32(n) {
  return (n >>> 0).toString(2).padStart(32, '0')
}

export function ipv4ToHex(ip) {
  return '0x' + ip
    .split('.')
    .map(o => Number(o).toString(16).padStart(2, '0').toUpperCase())
    .join('')
}

export function toArpa(ip) {
  return ip.split('.').reverse().join('.') + '.in-addr.arpa'
}

export function ipv4Class(ip) {
  const first = Number(ip.split('.')[0])
  if (first >= 1 && first <= 126) return 'A'
  if (first === 127) return 'A (Loopback)'
  if (first >= 128 && first <= 191) return 'B'
  if (first >= 192 && first <= 223) return 'C'
  if (first >= 224 && first <= 239) return 'D (Multicast)'
  return 'E (Reserved)'
}

export function isPrivateIPv4(ip) {
  const n = ipv4ToInt(ip)
  const ranges = [
    [ipv4ToInt('10.0.0.0'), ipv4ToInt('10.255.255.255')],
    [ipv4ToInt('172.16.0.0'), ipv4ToInt('172.31.255.255')],
    [ipv4ToInt('192.168.0.0'), ipv4ToInt('192.168.255.255')],
  ]
  return ranges.some(([lo, hi]) => n >= lo && n <= hi)
}

export function validateIPv4(ip) {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return false
  return parts.every(p => {
    const n = Number(p)
    return /^\d+$/.test(p) && n >= 0 && n <= 255
  })
}

export function calcIPv4(ip, prefix) {
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

export function validateIPv6(addr) {
  // Accepts full or compressed notation
  try {
    expandIPv6(addr)
    return true
  } catch {
    return false
  }
}

export function expandIPv6(addr) {
  addr = String(addr).trim().toLowerCase()
  // Remove a zone index such as "%eth0".
  addr = addr.replace(/%[a-z0-9_.-]+$/, '')
  // An IPv4 address at the end ("::ffff:192.0.2.1") is equal to two groups.
  const v4 = /^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(addr)
  if (v4) {
    if (!validateIPv4(v4[2])) throw new Error('invalid')
    const o = v4[2].split('.').map(Number)
    addr = `${v4[1]}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`
  }
  let groups
  if (addr.includes('::')) {
    const halves = addr.split('::')
    if (halves.length !== 2) throw new Error('invalid')
    const left = halves[0] ? halves[0].split(':') : []
    const right = halves[1] ? halves[1].split(':') : []
    const missing = 8 - left.length - right.length
    // "::" must replace one group or more.
    if (missing < 1) throw new Error('invalid')
    groups = [...left, ...Array(missing).fill('0'), ...right]
  } else {
    groups = addr.split(':')
    if (groups.length !== 8) throw new Error('invalid')
  }
  if (!groups.every(g => /^[0-9a-f]{1,4}$/.test(g))) throw new Error('invalid')
  return groups.map(g => g.padStart(4, '0'))
}

export function compressIPv6(groups) {
  const short = g => g.replace(/^0+/, '') || '0'
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
  if (best.len < 2) return groups.map(short).join(':')
  const before = groups.slice(0, best.start).map(short).join(':')
  const after = groups.slice(best.start + best.len).map(short).join(':')
  return `${before}::${after}`
}

export function ipv6GroupsToBigInt(groups) {
  return groups.reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g, 16)), 0n)
}

export function bigIntToIPv6Groups(n) {
  const groups = []
  for (let i = 0; i < 8; i++) {
    groups.unshift((n & 0xffffn).toString(16).padStart(4, '0'))
    n >>= 16n
  }
  return groups
}

export function calcIPv6(addr, prefix) {
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

