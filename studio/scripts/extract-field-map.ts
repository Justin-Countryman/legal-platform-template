/**
 * extract-field-map — the per-field map of the schema, written once from the
 * schema itself, for every reader that is not the Studio.
 *
 * Run: npm run field-map   (from studio/; `npx sanity exec` so the .tsx
 * schema components load the way the Studio loads them)
 *
 * WHY THIS EXISTS. `sanity schema extract` (`schema.json`) is GROQ type nodes:
 * it carries no `initialValue`, no `description`, no `title`, no option list.
 * The platform's Site Build Tool creates every settings singleton and page
 * shell through the mutation API, which never evaluates `initialValue` (that
 * is Studio's document-creation path only), so every field a composer did not
 * write landed absent and Studio showed an unselected radio (monorepo
 * `OUTSTANDING.md` item 195). The build kept hand copies of the defaults and
 * they drifted. This file is the single source instead: the schema, walked
 * once here, committed beside `schema.json`, freshness-checked by the same CI
 * job (`typegen-freshness`), read by the build.
 *
 * TWO ANSWERS PER DOCUMENT TYPE, deliberately:
 *   - `initialDocument`: what Studio itself would create for the type, from
 *     Sanity's own `defaultTemplateForType` + `resolveInitialValue` (both
 *     `@internal`, both present in sanity 6.13.2). This is the authority.
 *   - `fields`: the compiled walk, one row per field path, with the metadata
 *     the resolver does not return (title, description, option list, required
 *     marker, hidden/readOnly, the `buildTime` prop from schemas/buildTime.ts).
 *   `scripts/verify-field-map.ts` folds the rows by the platform's rules and
 *   requires them to agree with `initialDocument`, so if the internal API ever
 *   moves, CI says so on the branch that moved it.
 *
 * WHAT THE WALK RECORDS AND DOES NOT. Every field of every document type,
 * recursing into object-typed fields (paths dotted) and into object members
 * of arrays (`items[]<navItemPracticeAreas>`), to a bounded depth. Image,
 * file, slug, reference and geopoint fields are rows with no descent: their
 * inner defaults (an image's `fit: 'cover'`) are exactly what the platform
 * must never write as a bare object (`heroSurfaceFields.ts`). `hidden` and
 * `readOnly` are recorded as booleans, or as the string "<predicate>" when
 * the schema declares a function; they are never evaluated. A function-valued
 * `initialValue` is recorded as "<function>" and fails the run: none exists
 * today and one would need a decision, not a silent skip.
 *
 * Deterministic output: keys sorted, two-space JSON, trailing newline, so the
 * CI diff is readable and the drift probe (`check-typegen-detects-drift.mjs`)
 * lands its planted field here too.
 *
 * Detected by: `.github/workflows/ci.yml` typegen-freshness (regenerates and
 * diffs), `scripts/verify-field-map.ts` (rows agree with the resolver).
 */

;(globalThis as never as {window: unknown}).window ??= {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (h: never) => clearTimeout(h),
}

import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import * as sanity from 'sanity'
import {createSchema, validateDocument} from 'sanity'
import {schemaTypes} from '../schemas/index.ts'
import {SINGLETON_IDS} from '../singletons.ts'
import {BUILD_TIME_SENTENCE} from '../schemas/buildTime.ts'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(HERE, '..', 'field-map.json')
const MAX_DEPTH = 6

// Types whose inner structure is Sanity's, not the platform's: a row, no descent.
const OPAQUE_TYPES = new Set(['image', 'file', 'slug', 'reference', 'geopoint', 'crossDatasetReference', 'globalDocumentReference'])

type Row = {
  path: string
  type: string
  jsonType: string
  title?: string
  description?: string
  initialValue?: unknown
  options?: {list?: unknown[]; layout?: string}
  of?: string[]
  required?: 'warning' | 'error'
  requiredMessage?: string
  hidden?: boolean | '<predicate>'
  readOnly?: boolean | '<predicate>'
  buildTime?: true
}

const schema = createSchema({name: 'template', types: schemaTypes as never})

const fakeClient = {fetch: async () => null, withConfig: () => fakeClient, config: () => ({projectId: 'offline-schema-extract', dataset: 'production'})} as never
const getClient = () => fakeClient

let problems = 0

function optionsOf(type: any): Row['options'] | undefined {
  const opts = type?.options
  if (!opts || typeof opts !== 'object') return undefined
  const out: Row['options'] = {}
  if (Array.isArray(opts.list)) out.list = opts.list.map((o: any) => (o && typeof o === 'object' && 'value' in o ? o.value : o))
  if (typeof opts.layout === 'string') out.layout = opts.layout
  return Object.keys(out).length ? out : undefined
}

function flag(v: unknown): boolean | '<predicate>' | undefined {
  if (v === undefined) return undefined
  if (typeof v === 'function') return '<predicate>'
  return Boolean(v)
}

/** The declared type name of a field type, past Sanity's anonymous wrappers. */
function declaredName(t: any): string {
  let cur = t
  while (cur && (!cur.name || /^_/.test(cur.name)) && cur.type) cur = cur.type
  return cur?.name ?? t?.name ?? 'unknown'
}

function isOpaque(t: any): boolean {
  let cur = t
  while (cur) {
    if (OPAQUE_TYPES.has(cur.name)) return true
    cur = cur.type
  }
  return false
}

function walk(type: any, prefix: string, rows: Row[], depth: number): void {
  if (!type || depth > MAX_DEPTH || type.jsonType !== 'object' || !Array.isArray(type.fields)) return
  for (const field of type.fields) {
    const t = field.type
    const p = prefix ? `${prefix}.${field.name}` : field.name
    const row: Row = {path: p, type: declaredName(t), jsonType: t.jsonType}
    if (typeof t.title === 'string') row.title = t.title
    if (typeof t.description === 'string') row.description = t.description
    if (t.initialValue !== undefined) {
      if (typeof t.initialValue === 'function') {
        row.initialValue = '<function>'
        problems++
        console.error(`FAIL  ${p}: function-valued initialValue; the map records literals only`)
      } else {
        row.initialValue = t.initialValue
      }
    }
    const opts = optionsOf(t)
    if (opts) row.options = opts
    const hidden = flag(t.hidden)
    if (hidden !== undefined) row.hidden = hidden
    const readOnly = flag(t.readOnly)
    if (readOnly !== undefined) row.readOnly = readOnly
    if (t.buildTime === true) row.buildTime = true
    if (t.jsonType === 'array' && Array.isArray(t.of)) row.of = t.of.map((m: any) => declaredName(m))
    rows.push(row)

    if (t.jsonType === 'object' && !isOpaque(t)) walk(t, p, rows, depth + 1)
    if (t.jsonType === 'array' && Array.isArray(t.of)) {
      for (const member of t.of) {
        if (member.jsonType === 'object' && !isOpaque(member)) walk(member, `${p}[]<${declaredName(member)}>`, rows, depth + 1)
      }
    }
  }
}

type Marker = {level?: string; path?: unknown[]; item?: {message?: string}}

/** Required markers on an EMPTY document: which fields warn or error when absent. */
async function requiredMarkers(typeName: string): Promise<Marker[]> {
  const doc = {
    _id: `field-map-${typeName}`, _type: typeName,
    _createdAt: '2026-09-11T00:00:00Z', _updatedAt: '2026-09-11T00:00:00Z', _rev: 'x',
  }
  const workspace = {
    schema,
    i18n: {t: (k: string) => k, loadNamespaces: async () => undefined},
    getClient,
  } as never
  return (await validateDocument({document: doc as never, workspace, getClient} as never)) as Marker[]
}

function markerPath(m: Marker): string {
  return (m.path ?? []).map((seg) => (typeof seg === 'object' && seg !== null && '_key' in (seg as object) ? '[]' : String(seg))).join('.')
}

async function initialDocument(typeName: string): Promise<Record<string, unknown>> {
  const s = schema.get(typeName)
  const template = (sanity as any).defaultTemplateForType(s)
  const context = {projectId: 'offline-schema-extract', dataset: 'production', schema, currentUser: null, getClient}
  return (sanity as any).resolveInitialValue(schema, template, {}, context)
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value as object).sort().map((k) => [k, sortKeys((value as any)[k])]))
  }
  return value
}

async function main(): Promise<void> {
  const documentTypes = schema
    .getTypeNames()
    .filter((n) => !n.startsWith('sanity.'))
    .map((n) => schema.get(n) as any)
    .filter((t) => t && t.type?.name === 'document')
    .map((t) => t.name as string)
    .sort()

  const types: Record<string, unknown> = {}
  for (const name of documentTypes) {
    const rows: Row[] = []
    walk(schema.get(name), '', rows, 0)
    const markers = await requiredMarkers(name)
    for (const m of markers) {
      if (m.level !== 'warning' && m.level !== 'error') continue
      const mp = markerPath(m)
      const row = rows.find((r) => r.path === mp)
      if (!row) continue
      row.required = m.level
      if (m.item?.message) row.requiredMessage = m.item.message
    }
    for (const r of rows) {
      if (r.buildTime && !(r.description ?? '').endsWith(BUILD_TIME_SENTENCE)) {
        problems++
        console.error(`FAIL  ${name}.${r.path}: buildTime prop without the sentence (use schemas/buildTime.ts)`)
      }
      if (!r.buildTime && (r.description ?? '').includes(BUILD_TIME_SENTENCE)) {
        problems++
        console.error(`FAIL  ${name}.${r.path}: the build-time sentence without the prop (use schemas/buildTime.ts)`)
      }
    }
    types[name] = {
      kind: 'document',
      title: (schema.get(name) as any)?.title,
      singletonId: SINGLETON_IDS[name] ?? null,
      initialDocument: await initialDocument(name),
      fields: rows,
    }
  }

  const out = {
    generatedBy: 'studio/scripts/extract-field-map.ts (npm run field-map)',
    sanity: (sanity as any).SANITY_VERSION ?? null,
    singletons: {...SINGLETON_IDS},
    buildTimeSentence: BUILD_TIME_SENTENCE,
    types,
  }
  if (problems) {
    console.error(`${problems} problem(s); field-map.json not written`)
    process.exitCode = 1
    return
  }
  fs.writeFileSync(OUT, JSON.stringify(sortKeys(out), null, 2) + '\n')
  const fieldCount = Object.values(types).reduce((n, t: any) => n + t.fields.length, 0)
  console.log(`field-map.json: ${documentTypes.length} document types, ${fieldCount} field rows, ${Object.keys(SINGLETON_IDS).length} singletons`)
}

await main()
