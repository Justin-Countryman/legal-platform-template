#!/usr/bin/env node
//
// check-unknown-utility-classes — fail the build on a Tailwind class that does
// not exist.
//
// ─── The failure mode ────────────────────────────────────────────────────────
//
// Tailwind emits no CSS for a class it does not recognise, and raises no error.
// A misspelled utility is therefore invisible: it type-checks, it lints, it
// builds, it tests green, and the only symptom is that the style is silently
// absent on the rendered page.
//
// It has shipped at least five times:
//   `bg-surface-muted` + `shadow-card`  — the card surface of all five homepage
//        block components. Every card computed background-color: rgba(0,0,0,0)
//        and box-shadow: none; the composed homepage read as unstyled text on
//        white. Fixed 2026-07-21 (a2b0edc). The correct names were `bg-muted`
//        and `shadow-card-rest` — the token the components' own header comments
//        already cited by name.
//   `border-on-dark`                    — ReviewPageContent.tsx, resolved to
//        currentColor instead of the intended hairline. Fixed in WS4.
//   `bg-bg-mid`, `text-brand-light`, `outline-text-on-dark/50`
//                                       — found by the first run of this check.
//
// Nothing caught any of them. This does.
// Provenance: monorepo BI/OUTSTANDING.md item 56.
//
// ─── How it decides ──────────────────────────────────────────────────────────
//
// Tailwind itself is the oracle. `candidatesToCss()` returns null for a
// candidate that produces no CSS — the exact condition that makes the bug
// invisible — so this check asks the same compiler that builds the site,
// loaded from the same app/globals.css. There is no hand-maintained list of
// valid utilities to drift: every core utility, every `@theme` token, every
// `@utility` block and every plugin utility is known automatically, and a new
// token is usable the moment it is declared.
//
// Three things Tailwind legitimately returns null for are NOT reported:
//
//   1. Plain CSS classes the project defines itself. `.text-page-h1` lives in
//      an `@layer utilities` block in globals.css — real CSS, but not a
//      registered utility, so Tailwind reports nothing for it. Any class with
//      a literal selector in the project's own CSS is treated as defined.
//   2. Tailwind's marker classes. `group` and `peer` exist to be referenced by
//      `group-hover:` / `peer-focus:` variants and emit no CSS by design.
//   3. Documented non-Tailwind hooks — see NON_TAILWIND_CLASSES below.
//
// Everything else that resolves to nothing is a defect and fails the run.
//
// ─── What it cannot see ──────────────────────────────────────────────────────
//
// Class names assembled at runtime. `className={styles[variant]}` or
// `` `bg-${tone}-500` `` are not resolvable without executing the component,
// so the pieces are skipped and counted, never guessed at. Run with --verbose
// for the per-site list. See scripts/lib/class-candidates.mjs for the exact
// boundary and why it is drawn there.

import {__unstable__loadDesignSystem} from '@tailwindcss/node'
import {parse} from '@typescript-eslint/parser'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

import {extractClassCandidates} from './lib/class-candidates.mjs'

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Directories holding JSX that Tailwind scans for class names.
const SOURCE_DIRS = ['app', 'components', 'lib']

// The stylesheet that defines the design system — the same entry point
// app/layout.tsx imports, so this check sees exactly what the site is built with.
const ENTRY_CSS = 'app/globals.css'

// Test files pass deliberately fake class names (`my-custom-class`) to assert
// that a component forwards its className prop. Those are fixtures, not styling,
// and they never reach a rendered page.
const TEST_PATH = /(^|\/)__tests__\//

// Classes that legitimately produce no CSS. Each needs a reason, not just a name.
const NON_TAILWIND_CLASSES = new Map([
  ['group', 'Tailwind marker class — referenced by group-* variants, emits no CSS by design'],
  ['peer', 'Tailwind marker class — referenced by peer-* variants, emits no CSS by design'],
  [
    'footer-form-embed',
    'Deliberate hook for legacy CSS shipped inside operator-pasted form HTML — see components/layout/footers/FormEmbed.tsx',
  ],
])

// `group/name` and `peer/name` are the named-group forms of the markers above.
const NAMED_MARKER = /^(group|peer)\//

// ─── Collect ────────────────────────────────────────────────────────────────

function collectSourceFiles(root) {
  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(full)
    }
  }
  for (const dir of SOURCE_DIRS) {
    const full = path.join(root, dir)
    if (fs.existsSync(full)) walk(full)
  }
  return files.filter((f) => !TEST_PATH.test(path.relative(root, f))).sort()
}

/**
 * Parse every source file and index each class name by where it appears.
 * @returns {{sites: Map<string, string[]>, skipped: Array<{file: string, line: number, reason: string}>, parseFailures: string[]}}
 */
export function collectClassSites(root) {
  const sites = new Map()
  const skipped = []
  const parseFailures = []

  for (const file of collectSourceFiles(root)) {
    const relative = path.relative(root, file)
    let ast
    try {
      ast = parse(fs.readFileSync(file, 'utf8'), {
        jsx: true,
        loc: true,
        sourceType: 'module',
        ecmaVersion: 'latest',
      })
    } catch (error) {
      // A file this check cannot parse is a file it cannot vouch for. Say so
      // loudly rather than counting it as clean.
      parseFailures.push(`${relative}: ${error.message}`)
      continue
    }

    const {candidates, skipped: fileSkips} = extractClassCandidates(ast)
    for (const {name, line} of candidates) {
      if (!sites.has(name)) sites.set(name, [])
      sites.get(name).push(`${relative}:${line}`)
    }
    for (const skip of fileSkips) {
      skipped.push({file: relative, line: skip.line, reason: skip.reason})
    }
  }

  return {sites, skipped, parseFailures}
}

// ─── Resolve ────────────────────────────────────────────────────────────────

/**
 * Every class name the project's own CSS defines with a literal selector.
 *
 * Deliberately generous: it reads `.foo` anywhere in the stylesheet rather than
 * parsing the cascade, so a class mentioned in a comment counts as defined.
 * That bias suppresses reports rather than inventing them, which is the
 * platform's standing false-negatives-over-false-positives posture.
 */
export function readPlainCssClasses(root) {
  const defined = new Set()
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.css')) {
        const css = fs.readFileSync(full, 'utf8')
        for (const match of css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) defined.add(match[1])
      }
    }
  }
  walk(root)
  return defined
}

async function loadDesignSystem(root) {
  const cssPath = path.join(root, ENTRY_CSS)
  if (!fs.existsSync(cssPath)) {
    throw new Error(`Cannot find ${ENTRY_CSS} — this check must run from site/.`)
  }
  return __unstable__loadDesignSystem(fs.readFileSync(cssPath, 'utf8'), {base: root})
}

/**
 * Split class names into resolvable and unknown, applying the three exemptions.
 *
 * @param {string[]} names
 * @param {{candidatesToCss: (names: string[]) => (string|null)[]}} designSystem
 * @param {Set<string>} plainCssClasses
 * @returns {string[]} the unknown ones, sorted
 */
export function findUnknown(names, designSystem, plainCssClasses) {
  const checkable = names.filter(
    (name) => !NON_TAILWIND_CLASSES.has(name) && !NAMED_MARKER.test(name),
  )
  const css = designSystem.candidatesToCss(checkable)
  return checkable
    .filter((name, i) => css[i] === null && !plainCssClasses.has(name))
    .sort()
}

// ─── Report ─────────────────────────────────────────────────────────────────

async function main() {
  const verbose = process.argv.includes('--verbose')
  const {sites, skipped, parseFailures} = collectClassSites(SITE_ROOT)
  const designSystem = await loadDesignSystem(SITE_ROOT)
  const plainCssClasses = readPlainCssClasses(SITE_ROOT)
  const unknown = findUnknown([...sites.keys()], designSystem, plainCssClasses)

  const scanned = sites.size

  if (parseFailures.length > 0) {
    console.error(`\n${parseFailures.length} file(s) could not be parsed and were NOT checked:`)
    for (const failure of parseFailures) console.error(`  ${failure}`)
  }

  if (unknown.length === 0) {
    console.log(
      `Tailwind utility check passed — ${scanned} distinct class names resolve, ` +
        `${skipped.length} runtime-assembled fragment(s) skipped.`,
    )
    if (verbose) reportSkipped(skipped)
    process.exit(parseFailures.length > 0 ? 1 : 0)
  }

  console.error(`\nUnknown Tailwind utility class${unknown.length === 1 ? '' : 'es'} — these produce NO CSS:\n`)
  for (const name of unknown) {
    console.error(`  ${name}`)
    for (const site of sites.get(name)) console.error(`      ${site}`)
  }
  console.error(
    `\n${unknown.length} unknown class name${unknown.length === 1 ? '' : 's'} across ` +
      `${unknown.reduce((n, name) => n + sites.get(name).length, 0)} site(s).`,
  )
  console.error(
    '\nTailwind emits nothing for these and raises no error, so the style is simply\n' +
      'absent on the rendered page. Check the spelling against the tokens in\n' +
      `${ENTRY_CSS} (@theme / @utility). If a class is deliberately not a Tailwind\n` +
      'utility, add it to NON_TAILWIND_CLASSES in this script with a reason.\n' +
      'Provenance: monorepo BI/OUTSTANDING.md item 56.',
  )
  if (verbose) reportSkipped(skipped)
  process.exit(1)
}

function reportSkipped(skipped) {
  if (skipped.length === 0) return
  console.error(`\nNot checked — class names assembled at runtime (${skipped.length}):`)
  const byReason = new Map()
  for (const skip of skipped) {
    if (!byReason.has(skip.reason)) byReason.set(skip.reason, [])
    byReason.get(skip.reason).push(`${skip.file}:${skip.line}`)
  }
  for (const [reason, locations] of [...byReason].sort((a, b) => b[1].length - a[1].length)) {
    console.error(`  ${reason} (${locations.length})`)
    for (const location of locations) console.error(`      ${location}`)
  }
}

// Only run when invoked directly, so the tests can import the pieces.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
