#!/usr/bin/env node
//
// check-template-is-blank — the template must carry no firm's identity but the
// sample firm's own placeholders.
//
// ─── Why this replaced the old guard rather than joining it ──────────────────
//
// The previous scrub guard was a BLOCKLIST: it grepped for one retired client's
// name fragments and Sanity project ID. That shape cannot work.
//
//   * It only ever catches the clients someone remembered to add. A CURRENT
//     client's domain leaking into the template passed it untouched, which is
//     the gap OUTSTANDING recorded for months.
//   * Adding today's client fixes it until the next client is provisioned.
//   * The template cannot derive a roster the way the monorepo guard does —
//     `Clients/` does not exist in this repository, by design.
//
// So the rule is inverted. THE TEMPLATE IS A BLANK STARTING POINT: the only
// firm domain and Sanity project ID that belong in it are the sample firm's own
// placeholders. Anything else is a leak, whoever it belongs to — including
// clients that do not exist yet. An allowlist of what BELONGS needs no human to
// remember every new client; a blocklist of what does not, does.
//
// Provenance: OUTSTANDING items 76-79.
//
// ─── The three things that are allowed ───────────────────────────────────────
//
//   1. Reserved endings that can never be registered — RFC 2606 / RFC 6761:
//      .test .example .invalid .localhost, plus example.com/.net/.org and any
//      subdomain of them. Documentation and tests inside the template use these
//      legitimately, and the monorepo's fixtures were moved onto
//      `examplefirm.test` for exactly this reason (OUTSTANDING item 78).
//   2. Platform and product infrastructure — the Sanity CDN, schema.org,
//      w3.org, the video embed hosts, and the documentation links listed in
//      PLATFORM_HOSTS below. These are real domains that belong to nobody's
//      firm, and the rule has to accommodate them or the template cannot ship.
//      This list grows only when the PLATFORM gains a dependency, never when a
//      client is provisioned — which is what makes it an allowlist and not a
//      blocklist wearing a hat.
//   3. The Sanity project sentinel, `TEMPLATE_SANITY_PROJECT_ID`.
//
// Everything else fails, and the failure names the identifier, file and line.

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ─── Allowlist ──────────────────────────────────────────────────────────────

// Endings that can never be registered by anyone (RFC 2606 §2, RFC 6761).
const RESERVED_TLDS = ['test', 'example', 'invalid', 'localhost']

// Second-level names reserved for documentation (RFC 2606 §3). Subdomains too.
const RESERVED_DOMAINS = ['example.com', 'example.net', 'example.org']

// Real hosts the platform itself depends on. Each needs a reason; a host that
// cannot be justified as PLATFORM infrastructure does not belong here.
const PLATFORM_HOSTS = new Map([
  ['cdn.sanity.io', 'Sanity image CDN — every rendered image URL'],
  ['sanity.io', 'Sanity product + docs links'],
  ['sanity.studio', 'hosted Studio hostnames (scripts/README.md seed project)'],
  ['api.sanity.io', 'Sanity query API — searchVisibility.ts'],
  ['schema.org', 'JSON-LD @context — Organization / Breadcrumb structured data'],
  ['w3.org', 'SVG xmlns'],
  ['youtube.com', 'video embed host'],
  ['youtube-nocookie.com', 'privacy-preserving video embed host'],
  ['youtu.be', 'short-form video embed host'],
  ['vimeo.com', 'video embed host'],
  ['google.com', 'Maps directions URL builder — SwitchboardFooter'],
  ['fonts.google.com', 'font license attribution (the CDN itself is banned by lint)'],
  ['vercel.sh', 'vercel.json $schema'],
  ['jsdelivr.net', 'sanity-typegen.json $schema'],
  ['nextjs.org', 'generated next-env.d.ts doc link'],
  ['lucide.dev', 'icon library attribution'],
  ['sil.org', 'SIL Open Font License text'],
  ['github.com', 'source and documentation links'],
  ['facebook.com', 'social profile URL shape — Design Studio demo data'],
  ['instagram.com', 'social profile URL shape — Design Studio demo data'],
  ['linkedin.com', 'social profile URL shape — Design Studio demo data'],
  // Legal directories. `footerSettings` carries a dedicated field for each
  // (justiaUrl, avvoUrl, martindaleUrl, findLawUrl, superLawyersUrl,
  // lawInfoUrl, lawyersComUrl, yelpUrl), so these are platform concepts and
  // belong to directory companies, not to any firm.
  ['justia.com', 'legal directory — footerSettings.justiaUrl'],
  ['avvo.com', 'legal directory — footerSettings.avvoUrl'],
  ['martindale.com', 'legal directory — footerSettings.martindaleUrl'],
  ['findlaw.com', 'legal directory — footerSettings.findLawUrl'],
  ['lawyers.com', 'legal directory — footerSettings.lawyersComUrl'],
  ['superlawyers.com', 'legal directory — footerSettings.superLawyersUrl'],
  ['lawinfo.com', 'legal directory — footerSettings.lawInfoUrl'],
  ['yelp.com', 'review directory — footerSettings.yelpUrl'],
])

// There is deliberately NO list of bespoke placeholder domains here.
//
// One existed briefly, holding a single registrable placeholder used as the
// "e.g." hint on siteSettings.primaryDomain. That hint now reads a reserved
// documentation domain covered by RESERVED_DOMAINS above, so the entry had
// nothing left to permit. It was removed together with the literal rather than
// left behind: a roster entry that outlives its reason is exactly what this
// guard was rebuilt to stop, and the next reader would have had no way to tell
// a live allowance from a dead one. Any future placeholder should use a
// reserved ending instead of earning an entry here.
//
// The banned literal is deliberately not repeated in this comment — this file
// is scanned like every other, so naming it here would fail the guard. That is
// the guard working, not a limitation: it proves the check sees its own source.

// The only Sanity project identifier the template may name.
const PROJECT_SENTINEL = 'TEMPLATE_SANITY_PROJECT_ID'

// Values that are obviously not a real project: the sentinel, blanks, and the
// throwaway the typegen CI job substitutes to satisfy Sanity's format validator.
const PROJECT_PLACEHOLDERS = new Set([
  PROJECT_SENTINEL.toLowerCase(),
  'ci0placeholder',
  'your-project-id',
  'project-id',
  'projectid',
])

// ─── Scan surface ───────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out',
  '.turbo', '.sanity', '.vercel', 'coverage',
])

// Lock files are generated by npm and carry thousands of registry and funding
// URLs. A firm's domain cannot reach them, so scanning them would mean
// allowlisting the whole npm ecosystem to protect nothing.
const SKIP_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'])

const SCANNED_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.css', '.yml', '.yaml', '.md', '.html', '.txt', '.env',
])

// TLDs a firm's site plausibly uses. Deliberately NOT "any dotted token": bare
// matching would fire on `index.d.ts`, `this.state.pos` and `es.array.iterator`
// in every file. A scheme'd URL is matched regardless of TLD (see HOST_IN_URL).
const REAL_TLDS = [
  'com', 'net', 'org', 'io', 'co', 'law', 'legal', 'us', 'biz', 'info',
  'dev', 'app', 'ai', 'uk', 'ca', 'attorney', 'lawyer', 'gov', 'edu',
]

const HOST_IN_URL = /\bhttps?:\/\/([A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,})/g
const BARE_HOST = new RegExp(
  String.raw`\b([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:${REAL_TLDS.join('|')}|${RESERVED_TLDS.join('|')}))\b`,
  'gi',
)

// A Sanity project ID named in a context that identifies it as one.
const PROJECT_CONTEXTS = [
  /projectId\s*[:=]\s*['"`]([^'"`]+)['"`]/gi,
  /NEXT_PUBLIC_SANITY_PROJECT_ID\s*[:=]\s*['"`]?([A-Za-z0-9_-]+)['"`]?/g,
  /\bhttps?:\/\/([a-z0-9]{8})\.api\.sanity\.io/gi,
  /cdn\.sanity\.io\/images\/([a-z0-9]{8})\b/gi,
]

// A standalone quoted 8-character lowercase-alphanumeric string: the literal
// shape of a Sanity project ID. This is the net that keeps the new rule a
// SUPERSET of the old blocklist, which caught its one hardcoded ID anywhere in
// a file rather than only in a projectId assignment.
//
// It fires only on a line that ALSO mentions Sanity, because the shape alone is
// far too common to act on: `address1`, `address2` and `address3` are schema
// field names of exactly that shape, and the first draft of this guard reported
// all three. The fix is NOT a list of known-innocent words — that list would rot
// with every new eight-character field name, which is the same failure mode as
// the blocklist this guard replaced. Requiring Sanity context on the line is a
// rule, not a roster.
const BARE_PROJECT_ID = /['"`]([a-z0-9]{8})['"`]/g
const SANITY_CONTEXT = /sanity|projectid|project_id|dataset/i

// ─── Walk ───────────────────────────────────────────────────────────────────

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.isSymbolicLink()) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(full)
    } else if (!SKIP_FILES.has(entry.name) && SCANNED_EXT.has(path.extname(entry.name))) {
      yield full
    }
  }
}

// ─── Rules ──────────────────────────────────────────────────────────────────

export function isAllowedHost(host) {
  const lower = host.toLowerCase().replace(/\.$/, '')
  const labels = lower.split('.')
  const tld = labels[labels.length - 1]

  if (RESERVED_TLDS.includes(tld)) return true
  if (RESERVED_DOMAINS.some((d) => lower === d || lower.endsWith(`.${d}`))) return true

  // Platform hosts match on the host itself or any subdomain of it, so
  // `img.youtube.com` rides on `youtube.com` without a separate entry.
  for (const allowed of PLATFORM_HOSTS.keys()) {
    if (lower === allowed || lower.endsWith(`.${allowed}`)) return true
  }
  return false
}

export function isAllowedProjectId(value) {
  return PROJECT_PLACEHOLDERS.has(String(value).toLowerCase())
}

function findingsForFile(relPath, text) {
  const findings = []
  const lines = text.split('\n')

  lines.forEach((line, index) => {
    const lineNo = index + 1
    const seen = new Set()

    const flagHost = (host) => {
      const key = `h:${host.toLowerCase()}`
      if (seen.has(key) || isAllowedHost(host)) return
      seen.add(key)
      findings.push({
        file: relPath, line: lineNo, kind: 'domain',
        value: host, text: line.trim().slice(0, 150),
      })
    }

    for (const m of line.matchAll(HOST_IN_URL)) flagHost(m[1])
    for (const m of line.matchAll(BARE_HOST)) flagHost(m[1])

    for (const pattern of PROJECT_CONTEXTS) {
      pattern.lastIndex = 0
      for (const m of line.matchAll(pattern)) {
        const value = m[1]
        if (isAllowedProjectId(value)) continue
        const key = `p:${value}`
        if (seen.has(key)) continue
        seen.add(key)
        findings.push({
          file: relPath, line: lineNo, kind: 'sanity project ID',
          value, text: line.trim().slice(0, 150),
        })
      }
    }

    if (!SANITY_CONTEXT.test(line)) return
    for (const m of line.matchAll(BARE_PROJECT_ID)) {
      const value = m[1]
      if (isAllowedProjectId(value)) continue
      // Only a token carrying BOTH letters and digits looks like a project ID;
      // an all-letter eight-character word is a word.
      if (!/[a-z]/.test(value) || !/[0-9]/.test(value)) continue
      const key = `p:${value}`
      if (seen.has(key)) continue
      seen.add(key)
      findings.push({
        file: relPath, line: lineNo, kind: 'possible sanity project ID',
        value, text: line.trim().slice(0, 150),
      })
    }
  })

  return findings
}

export function scan(root = ROOT) {
  const findings = []
  let filesScanned = 0
  for (const file of walk(root)) {
    filesScanned += 1
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    findings.push(...findingsForFile(path.relative(root, file), text))
  }
  return {findings, filesScanned}
}

// ─── Report ─────────────────────────────────────────────────────────────────

function main() {
  const {findings, filesScanned} = scan()

  if (findings.length === 0) {
    console.log(
      `Template blank-slate guard passed — ${filesScanned} files scanned, ` +
        'no firm identity found beyond the sample placeholders.',
    )
    process.exit(0)
  }

  console.error("\nIdentity found in the template that is not the sample firm's.\n")
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}`)
    console.error(`      ${f.kind}: ${f.value}`)
    console.error(`      ${f.text}`)
  }
  console.error(`\n${findings.length} finding(s).`)
  console.error(
    '\nThe template is a blank starting point: the only firm domain and Sanity\n' +
      'project ID that belong in it are the sample firm\'s own placeholders.\n' +
      'Anything else ships to every client generated from this template.\n\n' +
      'If this is a real client identifier, remove it — do not add an exception.\n' +
      'If it is documentation or a test fixture, use a reserved ending that can\n' +
      'never be registered: .test .example .invalid, or example.com.\n' +
      'If it is genuinely new PLATFORM infrastructure, add it to PLATFORM_HOSTS\n' +
      'in scripts/check-template-is-blank.mjs with the reason.\n' +
      'Provenance: OUTSTANDING items 76-79.',
  )
  process.exit(1)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
