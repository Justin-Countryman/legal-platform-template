/**
 * verify-field-map — the field map's rows, folded by the platform's rules,
 * equal the document Studio itself would create.
 *
 * Run: npm run verify:field-map   (from studio/, via `sanity exec`)
 *
 * `field-map.json` carries two answers per document type (see
 * extract-field-map.ts): `initialDocument`, from Sanity's own initial-value
 * resolver, and `fields`, the compiled walk. The platform's Site Build Tool
 * reads the ROWS and applies three rules when it creates a document through
 * the mutation API (monorepo `BE/_shared/schema_defaults.py`, WS-V1-PHASE5-
 * DESIGN §9 item 3):
 *
 *   1. top-level scalar and plain-object defaults only; never an image, file,
 *      slug, reference or geopoint object (Studio's resolver materialises
 *      `{_type: 'image', fit: 'cover'}`, the empty-image trap
 *      `heroSurfaceFields.ts` documents);
 *   2. nested defaults one level down, merged into an object the composer
 *      writes, never creating one it did not;
 *   3. array members never defaulted (the recipe supplies them).
 *
 * This script folds the rows by those rules and requires the result to equal
 * `initialDocument` minus the classes the rules decline. If the `@internal`
 * resolver ever changes what it returns, or the walk misses a default, this
 * is red on the branch that did it, not on a client dataset later.
 *
 * It also pins two invariants the platform repo relies on: every `buildTime`
 * row ends with the sentence and only those rows carry it; and every
 * singleton in the map declares a document type the schema has.
 *
 * Exits non-zero on any failure. Detected by: itself (CI studio-build job).
 */

;(globalThis as never as {window: unknown}).window ??= {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (h: never) => clearTimeout(h),
}

import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createSchema} from 'sanity'
import {schemaTypes} from '../schemas/index.ts'
import {BUILD_TIME_SENTENCE} from '../schemas/buildTime.ts'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MAP = path.resolve(HERE, '..', 'field-map.json')

type Row = {
  path: string
  type: string
  jsonType: string
  description?: string
  initialValue?: unknown
  buildTime?: true
}
type TypeEntry = {fields: Row[]; initialDocument: Record<string, unknown>; singletonId: string | null}
type FieldMap = {singletons: Record<string, string>; buildTimeSentence: string; types: Record<string, TypeEntry>}

const OPAQUE = new Set(['image', 'file', 'slug', 'reference', 'geopoint'])

const map = JSON.parse(fs.readFileSync(MAP, 'utf8')) as FieldMap
const schema = createSchema({name: 'verify', types: schemaTypes as never})

let failures = 0
function fail(msg: string): void {
  failures++
  console.log(`FAIL  ${msg}`)
}

function isEmpty(v: unknown): boolean {
  return v === '' || v === null || v === undefined || (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0)
}

/** Rules 1 to 3 over the rows: `{topLevelKey: value | {nestedKey: value}}`. */
function fold(rows: Row[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const byPath = new Map(rows.map((r) => [r.path, r]))
  for (const r of rows) {
    if (r.initialValue === undefined || isEmpty(r.initialValue)) continue
    if (r.path.includes('[]')) continue // rule 3
    const segs = r.path.split('.')
    if (segs.length === 1) {
      if (r.jsonType === 'object') continue // an object's own default is its fields'
      out[r.path] = r.initialValue
    } else if (segs.length === 2) {
      const parent = byPath.get(segs[0])
      if (!parent || parent.jsonType !== 'object' || OPAQUE.has(parent.type)) continue // rule 1
      const bucket = (out[segs[0]] ??= {}) as Record<string, unknown>
      bucket[segs[1]] = r.initialValue
    }
    // deeper than one level: rule 2 stops here; the resolver's answer below
    // is stripped to the same depth before comparing.
  }
  return out
}

/** The resolver's document, stripped to what the rules keep. */
function expected(doc: Record<string, unknown>, rows: Row[]): Record<string, unknown> {
  const byPath = new Map(rows.map((r) => [r.path, r]))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc)) {
    if (k.startsWith('_')) continue
    const row = byPath.get(k)
    if (!row) { fail(`resolver returned ${k}, which the walk has no row for`); continue }
    if (isEmpty(v)) continue
    if (row.jsonType === 'object') {
      if (OPAQUE.has(row.type)) continue // rule 1: an image object is declined
      const inner: Record<string, unknown> = {}
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        if (ik.startsWith('_')) continue
        const irow = byPath.get(`${k}.${ik}`)
        if (!irow) { fail(`resolver returned ${k}.${ik}, which the walk has no row for`); continue }
        if (isEmpty(iv) || irow.jsonType === 'object' || irow.jsonType === 'array') continue // depth 1 only; rule 3
        inner[ik] = iv
      }
      if (Object.keys(inner).length) out[k] = inner
      continue
    }
    if (row.jsonType === 'array') continue // rule 3
    out[k] = v
  }
  return out
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(',')}}`
  return JSON.stringify(v)
}

const typeNames = Object.keys(map.types).sort()
if (typeNames.length === 0) fail('the map has no document types')

for (const name of typeNames) {
  const entry = map.types[name]
  const got = stable(fold(entry.fields))
  const want = stable(expected(entry.initialDocument, entry.fields))
  if (got !== want) {
    fail(`${name}: folded rows differ from Studio's initial document\n      rows:     ${got}\n      resolver: ${want}`)
  } else {
    console.log(`PASS  ${name}: ${Object.keys(fold(entry.fields)).length} defaulted top-level keys agree with the resolver`)
  }
  for (const r of entry.fields) {
    const has = (r.description ?? '').includes(BUILD_TIME_SENTENCE)
    if (r.buildTime && !has) fail(`${name}.${r.path}: buildTime without the sentence`)
    if (!r.buildTime && has) fail(`${name}.${r.path}: the sentence without buildTime`)
    if (r.initialValue === '<function>') fail(`${name}.${r.path}: function-valued initialValue`)
  }
}

if (map.buildTimeSentence !== BUILD_TIME_SENTENCE) fail('the map carries a stale build-time sentence; regenerate')

// The census that found exactly one build-time field (design §9 item 8).
const buildTimeRows = typeNames.flatMap((n) => map.types[n].fields.filter((r) => r.buildTime).map((r) => `${n}.${r.path}`))
if (stable(buildTimeRows) !== stable(['siteSettings.hideFromSearch'])) {
  fail(`build-time fields are ${JSON.stringify(buildTimeRows)}; the census says exactly siteSettings.hideFromSearch. Adding one is a next.config.ts/generateStaticParams read, recorded in the design outcome, then this list.`)
} else {
  console.log('PASS  build-time fields: exactly siteSettings.hideFromSearch')
}

for (const [type, id] of Object.entries(map.singletons)) {
  const t = schema.get(type) as any
  if (!t || t.type?.name !== 'document') fail(`singleton ${type} (${id}) is not a document type`)
  if (map.types[type]?.singletonId !== id) fail(`singleton ${type}: map row says ${map.types[type]?.singletonId}, list says ${id}`)
}
console.log(`PASS  ${Object.keys(map.singletons).length} singletons declare document types`)

if (failures) {
  console.log(`\n${failures} failure(s)`)
  process.exitCode = 1
} else {
  console.log('\nAll expectations met.')
}
