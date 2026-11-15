#!/usr/bin/env node
// Bumps the version with Semantic Versioning, from Conventional Commit messages.
//
//   npm run release              find the bump from the commits since the last tag
//   npm run release -- minor     force a major, minor or patch bump
//   npm run release -- 2.0.0     set an exact version
//   npm run release -- --dry-run show the result, change nothing
//   npm run release -- --commit  also make the release commit and the tag
//
// The rules (https://www.conventionalcommits.org):
//   "BREAKING CHANGE" in the body, or "!" after the type  -> major
//   feat                                                 -> minor
//   fix, sec, perf                                       -> patch
//   Other types (chore, docs, build, ci, refactor, test, style) do not change the version.
//
// The script writes the same version to every file in VERSION_FILES, thus the
// root package, the app package, the lock file and the UI footer always agree.
// The UI reads the version from app/package.json at build time (vite.config.js).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const doCommit = args.includes('--commit')
const explicit = args.find(a => !a.startsWith('--'))

const VERSION_FILES = ['package.json', 'app/package.json', 'app/package-lock.json']

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim()
const readJson = f => JSON.parse(readFileSync(join(root, f), 'utf8'))

function lastTag() {
  try {
    return git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*')
  } catch {
    return null
  }
}

function commitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD'
  const raw = git('log', range, '--format=%H%x1f%s%x1f%b%x1e')
  return raw.split('\x1e').map(s => s.trim()).filter(Boolean).map(entry => {
    const [hash, subject, body = ''] = entry.split('\x1f')
    const m = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/.exec(subject)
    return {
      hash: hash.slice(0, 7),
      type: m ? m[1].toLowerCase() : 'other',
      scope: m?.[2] ?? null,
      breaking: Boolean(m?.[3]) || /BREAKING[ -]CHANGE/.test(body),
      text: m ? m[4] : subject,
    }
  })
}

function bump(version, level) {
  const [maj, min, pat] = version.split('.').map(Number)
  if (level === 'major') return `${maj + 1}.0.0`
  if (level === 'minor') return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
}

function levelFor(commits) {
  if (commits.some(c => c.breaking)) return 'major'
  if (commits.some(c => c.type === 'feat')) return 'minor'
  if (commits.some(c => ['fix', 'sec', 'perf'].includes(c.type))) return 'patch'
  return null
}

const SECTIONS = [
  ['breaking', 'Breaking changes'],
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['sec', 'Security'],
  ['perf', 'Performance'],
  ['docs', 'Documentation'],
  ['build', 'Build'],
]

function changelogEntry(version, commits) {
  const date = new Date().toISOString().slice(0, 10)
  const lines = [`## v${version} (${date})`, '']
  for (const [key, title] of SECTIONS) {
    const items = key === 'breaking' ? commits.filter(c => c.breaking) : commits.filter(c => c.type === key && !c.breaking)
    if (!items.length) continue
    lines.push(`### ${title}`, '')
    for (const c of items) lines.push(`- ${c.scope ? `**${c.scope}:** ` : ''}${c.text} (${c.hash})`)
    lines.push('')
  }
  return lines.join('\n')
}

function writeVersion(version) {
  for (const f of VERSION_FILES) {
    const path = join(root, f)
    if (!existsSync(path)) continue
    const json = JSON.parse(readFileSync(path, 'utf8'))
    json.version = version
    if (f.endsWith('package-lock.json') && json.packages?.['']) json.packages[''].version = version
    writeFileSync(path, JSON.stringify(json, null, 2) + '\n')
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const current = readJson('app/package.json').version
const mismatch = VERSION_FILES.filter(f => existsSync(join(root, f)) && readJson(f).version !== current)
if (mismatch.length) console.warn(`Warning: these files had a different version: ${mismatch.join(', ')}. The script corrects them.`)

const tag = lastTag()
const commits = commitsSince(tag)
let next
if (explicit && /^\d+\.\d+\.\d+$/.test(explicit)) next = explicit
else if (['major', 'minor', 'patch'].includes(explicit)) next = bump(current, explicit)
else if (explicit) {
  console.error(`Unknown argument "${explicit}". Use major, minor, patch or a version such as 1.2.3.`)
  process.exit(1)
} else {
  const level = levelFor(commits)
  if (!level) {
    console.log(`No feat, fix, sec or perf commits since ${tag ?? 'the start'}. The version stays ${current}.`)
    process.exit(0)
  }
  next = bump(current, level)
}

const entry = changelogEntry(next, commits)
console.log(`Version: ${current} -> ${next} (${commits.length} commits since ${tag ?? 'the start'})\n`)
console.log(entry)
if (dryRun) process.exit(0)

writeVersion(next)
const clPath = join(root, 'CHANGELOG.md')
const header = '# Changelog\n\nAll notable changes to this project. The format follows Conventional Commits and Semantic Versioning.\n\n'
const old = existsSync(clPath) ? readFileSync(clPath, 'utf8').replace(header, '') : ''
writeFileSync(clPath, header + entry + '\n' + old)
console.log(`Wrote version ${next} to ${VERSION_FILES.join(', ')} and CHANGELOG.md.`)

if (doCommit) {
  git('add', ...VERSION_FILES, 'CHANGELOG.md')
  git('commit', '-m', `chore(release): v${next}`)
  git('tag', '-a', `v${next}`, '-m', `v${next}`)
  console.log(`Made the commit and the tag v${next}. To publish: git push --follow-tags`)
} else {
  console.log(`Next: examine the changes, then: git commit -am "chore(release): v${next}" && git tag -a v${next} -m v${next}`)
}
