import { describe, it, expect } from 'vitest'
import { parseJson, findUnsafeIntegers } from '../json'
import { toCSV, toXML, toPythonDict, toMarkdownTable, toYAML, xmlName } from '../jsonConvert'
import { encodeText, decodeText, processText, normaliseBase64 } from '../base64'
import { toEpochMs, fromEpochMs, fieldsToEpochMs } from '../timestamp'
import { parsePythonLiteral, pythonToJson } from '../pythonLiteral'
import { validateIPv4, validateIPv6, expandIPv6, compressIPv6, calcIPv4, calcIPv6 } from '../subnet'
import { validateField } from '../cron'

describe('json', () => {
  it('reports empty, valid and invalid input', () => {
    expect(parseJson('   ').ok).toBe(null)
    expect(parseJson('{"a":1}').value).toEqual({ a: 1 })
    expect(parseJson('{a:1}').ok).toBe(false)
  })
  it('ignores a byte order mark', () => {
    expect(parseJson('\uFEFF[1]').value).toEqual([1])
  })
  it('finds integers that lose precision', () => {
    expect(findUnsafeIntegers('{"id": 12345678901234567890, "s": "99999999999999999999"}')).toEqual(['12345678901234567890'])
    expect(findUnsafeIntegers('{"id": 9007199254740991, "f": 1.5e300}')).toEqual([])
  })
})

describe('jsonConvert', () => {
  it('writes all CSV columns when rows have different keys', () => {
    expect(toCSV([{ a: 1 }, { b: 2 }])).toBe('a,b\r\n1,\r\n,2')
  })
  it('protects CSV cells from formula injection', () => {
    expect(toCSV([{ a: '=1+1' }])).toContain("'=1+1")
  })
  it('handles primitives, nested arrays and empty input', () => {
    expect(toCSV(5)).toBe('value\r\n5')
    expect(toCSV([[1, 2]])).toContain('[1,2]')
    expect(toCSV([])).toBe('')
    expect(toMarkdownTable([])).toBe('')
  })
  it('makes valid XML element names', () => {
    expect(xmlName('1st item')).toBe('_1st_item')
    expect(xmlName('')).toBe('_')
    expect(xmlName('xmlThing')).toBe('_xmlThing')
    const xml = toXML({ '1 a': '<b> & "c"', ok: null, list: [1] })
    expect(xml).toContain('<_1_a key="1 a">&lt;b&gt; &amp; "c"</_1_a>')
    expect(xml).toContain('<ok/>')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.querySelector('parsererror')).toBe(null)
  })
  it('escapes Python strings', () => {
    expect(toPythonDict({ "it's": 'a\nb\\' })).toBe("{\n    'it\\'s': 'a\\nb\\\\'\n}")
    expect(toPythonDict([true, null])).toBe('[\n    True,\n    None\n]')
  })
  it('keeps Markdown table rows on one line', () => {
    expect(toMarkdownTable([{ a: 'x|y\nz' }])).toBe('| a |\n| --- |\n| x\\|y<br>z |')
  })
  it('writes YAML', () => {
    expect(toYAML({ a: [1] })).toBe('a:\n  - 1\n')
  })
})

describe('base64', () => {
  it('encodes and decodes Unicode text', () => {
    const text = 'héllo 👋 日本'
    expect(decodeText(encodeText(text, 'utf8'), 'utf8')).toBe(text)
  })
  it('accepts URL-safe input, missing padding, spaces and data URLs', () => {
    expect(decodeText('aGVsbG8', 'utf8')).toBe('hello')
    expect(decodeText('_-8', 'latin1')).toBe('\xff\xef')
    expect(decodeText('aGVs\nbG8=', 'utf8')).toBe('hello')
    expect(decodeText('data:text/plain;base64,aGVsbG8=', 'utf8')).toBe('hello')
  })
  it('gives clear errors', () => {
    expect(() => normaliseBase64('abc$')).toThrow(/"\$"/)
    expect(() => normaliseBase64('abcde')).toThrow(/length/)
    expect(() => decodeText('/w==', 'utf8')).toThrow(/not UTF-8/)
    expect(() => encodeText('日', 'latin1')).toThrow(/Latin-1/)
    expect(() => encodeText('é', 'ascii')).toThrow(/ASCII/)
  })
  it('processes each line and names the bad line', () => {
    expect(processText('a\n\nb', 'encode', 'utf8', true).output).toBe('YQ==\n\nYg==')
    expect(processText('YQ==\n$$', 'decode', 'utf8', true).error).toMatch(/^Line 2/)
    expect(processText('', 'encode', 'utf8', false)).toEqual({ output: '', error: null })
  })
  it('handles a large input', () => {
    const big = 'x'.repeat(2_000_000)
    expect(decodeText(encodeText(big, 'utf8'), 'utf8').length).toBe(big.length)
  })
})

describe('timestamp', () => {
  it('converts units', () => {
    expect(toEpochMs('1700000000', 'sec')).toBe(1700000000000)
    expect(toEpochMs('1700000000123456789', 'ns')).toBe(1700000000123)
    expect(toEpochMs('-1', 'sec')).toBe(-1000)
    expect(fromEpochMs(1500, 'sec')).toBe(1)
  })
  it('rejects empty, non-numeric and out-of-range input', () => {
    for (const bad of ['', '  ', 'abc', '0x10', '1e3', 'Infinity', '99999999999999999', '1.2.3']) {
      expect(toEpochMs(bad, 'sec')).toBe(null)
    }
    expect(toEpochMs('8640000000000001', 'ms')).toBe(null)
    expect(toEpochMs('8640000000000000', 'ms')).toBe(8.64e15)
  })
  it('builds a time from fields', () => {
    expect(fieldsToEpochMs({ year: 1970, month: 1, day: 1, hour: 0, min: 0, sec: 0 }, true)).toBe(0)
    expect(new Date(fieldsToEpochMs({ year: 50, month: 1, day: 1, hour: 0, min: 0, sec: 0 }, true)).getUTCFullYear()).toBe(50)
    expect(fieldsToEpochMs({ year: NaN, month: 1, day: 1, hour: 0, min: 0, sec: 0 }, true)).toBe(null)
    expect(fieldsToEpochMs({ year: 999999, month: 1, day: 1, hour: 0, min: 0, sec: 0 }, true)).toBe(null)
  })
})

describe('pythonLiteral', () => {
  it('converts the common literals', () => {
    expect(parsePythonLiteral("{'a': True, 'b': None, 'c': (1, 2), 'd': [1.5, -2, 0x1f, 1_000]}"))
      .toEqual({ a: true, b: null, c: [1, 2], d: [1.5, -2, 31, 1000] })
  })
  it('handles comments and trailing commas', () => {
    expect(parsePythonLiteral("[\n  'a',  # note\n  'b', # last\n]")).toEqual(['a', 'b'])
    expect(parsePythonLiteral("{'k': 'has # no comment',}")).toEqual({ k: 'has # no comment' })
  })
  it('handles string escapes and prefixes', () => {
    expect(parsePythonLiteral(String.raw`"it\'s \x41\u00e9\n"`)).toBe("it's Aé\n")
    expect(parsePythonLiteral(String.raw`r'C:\new'`)).toBe('C:\\new')
    expect(parsePythonLiteral(`'''line1\nline2 "q"'''`)).toBe('line1\nline2 "q"')
    expect(parsePythonLiteral(`'a' "b"`)).toBe('ab')
    expect(parsePythonLiteral(`b'bytes'`)).toBe('bytes')
    expect(parsePythonLiteral(`"True and None"`)).toBe('True and None')
  })
  it('converts keys that are not strings', () => {
    expect(parsePythonLiteral("{1: 'a', None: 'b', (1, 2): 'c', True: 'd'}"))
      .toEqual({ 1: 'a', None: 'b', '(1, 2)': 'c', True: 'd' })
  })
  it('converts sets, single-item tuples and assignments', () => {
    expect(parsePythonLiteral('{1, 2}')).toEqual([1, 2])
    expect(parsePythonLiteral('(1,)')).toEqual([1])
    expect(parsePythonLiteral('(1)')).toBe(1)
    expect(parsePythonLiteral('()')).toEqual([])
    expect(parsePythonLiteral('{}')).toEqual({})
    expect(parsePythonLiteral("config = {'a': 1}")).toEqual({ a: 1 })
  })
  it('keeps __proto__ as a normal key', () => {
    const v = parsePythonLiteral("{'__proto__': {'x': 1}}")
    expect(Object.keys(v)).toEqual(['__proto__'])
    expect({}.x).toBe(undefined)
  })
  it('gives errors with a position', () => {
    expect(() => parsePythonLiteral("{'a': 1")).toThrow(/"}" is missing/)
    expect(() => parsePythonLiteral("{'a' 1}")).toThrow(/comma or "}".*line 1, column 6/)
    expect(() => parsePythonLiteral("{'a': foo}")).toThrow(/name, not a literal/)
    expect(() => parsePythonLiteral("'abc")).toThrow(/not closed/)
    expect(() => parsePythonLiteral("float('nan')")).toThrow()
    expect(() => parsePythonLiteral('[nan]')).toThrow(/no JSON equivalent/)
    expect(() => parsePythonLiteral("f'{x}'")).toThrow(/f-strings/)
    expect(() => parsePythonLiteral('[1] [2]')).toThrow(/Unexpected text/)
    expect(() => parsePythonLiteral('['.repeat(5000))).toThrow(/nested too deeply/)
  })
  it('writes JSON text', () => {
    expect(pythonToJson("{'a': (1,)}", 0)).toBe('{"a":[1]}')
  })
})

describe('subnet', () => {
  it('validates IPv4', () => {
    expect(validateIPv4('192.168.1.1')).toBe(true)
    for (const bad of ['256.1.1.1', '1.2.3', '1.2.3.4.5', 'a.b.c.d', '1..2.3', '', '1.2.3.-4']) {
      expect(validateIPv4(bad)).toBe(false)
    }
  })
  it('validates IPv6', () => {
    for (const ok of ['::', '::1', '2001:db8::', 'fe80::1%eth0', '::ffff:192.0.2.1', '1:2:3:4:5:6:7:8']) {
      expect(validateIPv6(ok)).toBe(true)
    }
    for (const bad of ['zzzz::1', '12345::', ':::', '1:2:3:4:5:6:7:8:9', '1::2::3', '1:2:3:4:5:6:7::8', '', '::ffff:999.1.1.1', 'hello']) {
      expect(validateIPv6(bad)).toBe(false)
    }
  })
  it('expands and compresses IPv6', () => {
    expect(expandIPv6('::ffff:192.0.2.1').join(':')).toBe('0000:0000:0000:0000:0000:ffff:c000:0201')
    expect(compressIPv6(expandIPv6('2001:0db8:0001:0002:0003:0004:0005:0006'))).toBe('2001:db8:1:2:3:4:5:6')
    expect(compressIPv6(expandIPv6('2001:db8:0:0:1:0:0:1'))).toBe('2001:db8::1:0:0:1')
    expect(compressIPv6(expandIPv6('::'))).toBe('::')
  })
  it('calculates IPv4 boundary prefixes', () => {
    expect(calcIPv4('10.1.2.3', 0)).toMatchObject({ networkAddr: '0.0.0.0', broadcast: '255.255.255.255', mask: '0.0.0.0' })
    expect(calcIPv4('10.1.2.3', 32)).toMatchObject({ networkAddr: '10.1.2.3', usableHosts: 1 })
    expect(calcIPv4('10.1.2.3', 31)).toMatchObject({ firstHost: '10.1.2.2', lastHost: '10.1.2.3', usableHosts: 2 })
    expect(calcIPv4('192.168.1.130', 25)).toMatchObject({ networkAddr: '192.168.1.128', broadcast: '192.168.1.255', usableHosts: 126 })
    expect(calcIPv4('255.255.255.255', 24).networkAddr).toBe('255.255.255.0')
  })
  it('calculates IPv6 boundary prefixes', () => {
    expect(calcIPv6('2001:db8::1', 0).totalAddresses).toBe(1n << 128n)
    expect(calcIPv6('2001:db8::1', 128)).toMatchObject({ totalAddresses: 1n, networkCompressed: '2001:db8::1' })
    expect(calcIPv6('2001:db8:abcd::1', 48).networkCidr).toBe('2001:db8:abcd::/48')
  })
})

describe('cron', () => {
  it('accepts valid fields', () => {
    for (const [v, k] of [['*', 'minute'], ['*/5', 'minute'], ['0,15,30', 'minute'], ['9-17', 'hour'], ['1-5/2', 'dow'], ['7', 'dow'], ['MON-FRI', 'dow'], ['jan,jun', 'month'], ['5/15', 'minute']]) {
      expect(validateField(v, k)).toBe(null)
    }
  })
  it('rejects invalid fields', () => {
    for (const [v, k] of [['60', 'minute'], ['24', 'hour'], ['0', 'dom'], ['13', 'month'], ['8', 'dow'], ['*/0', 'minute'], ['5-1', 'hour'], ['1,,2', 'minute'], ['a', 'minute'], ['MON', 'month'], ['1-2-3', 'hour'], ['1.5', 'minute'], ['-1', 'minute'], ['*/', 'minute']]) {
      expect(validateField(v, k)).toBeTypeOf('string')
    }
  })
})
