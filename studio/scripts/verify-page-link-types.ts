/**
 * verify-page-link-types — every type the page-link picker offers has a slug
 * in the extract and a route in the site, and every routed type with a slug
 * is offered.
 *
 * Run: npm run verify:page-link-types   (from studio/, via `sanity exec` because
 * the picker is a .tsx module)
 *
 * `components/PageLinkInput.tsx` fills a URL field from a `<select>` of the
 * site's pages. Until 2026-09-11 it could not pick staff, blog posts or blog
 * categories (monorepo plan Phase 5; WS-V1-PHASE5-DESIGN §4). The picker
 * builds `href = /${slug}/`, which is right only because every slug on this
 * platform is a whole path (`staff/jane-doe`, `blog/foo`,
 * `blog/category/bar`); this script pins both halves of that: the type
 * declares `slug` in `schema.json`, and `site/app/(site)` has a route that
 * can serve it.
 *
 * The route map below is the platform's, written down once: the catch-all
 * serves the content types by slug; the named directories serve the rest.
 * A type with a slug and no route (`blogTag`) stays OUT of the picker; a type
 * with no slug (`pressItem`, `caseResult`, `eventCategory`) cannot be in it.
 *
 * Reads the picker's own exported list, so the assertion is against the
 * artifact the Studio ships. Exits non-zero on any failure.
 * Detected by: itself (CI studio-build job).
 */

import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PAGE_LINK_TYPES} from '../components/PageLinkInput.tsx'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const STUDIO = path.resolve(HERE, '..')
const SITE = path.resolve(STUDIO, '..', 'site')

// Which site route serves each type. The catch-all is `app/(site)/[...slug]`;
// the others are named directories under `app/(site)`.
const ROUTE_FOR: Record<string, string> = {
  practiceArea: '[...slug]',
  geoPracticeArea: '[...slug]',
  locationPage: '[...slug]',
  serviceAreaIndex: 'service-area',
  serviceAreaPage: 'service-area',
  aboutPage: '[...slug]',
  contactPage: 'contact',
  faqPage: '[...slug]',
  generalPage: '[...slug]',
  landingPage: '[...slug]',
  blogIndex: 'blog',
  blogPost: 'blog',
  blogCategory: 'blog/category',
  eventIndex: 'events',
  eventPage: 'events',
  attorneyPage: 'attorneys',
  attorneyIndex: 'attorneys',
  staffIndex: 'staff',
  staffPage: 'staff',
  reviewPage: '[...slug]',
  testimonialsPage: 'testimonials',
  videoIndex: 'videos',
  homePage: '',
}

// Routed types the picker deliberately does not offer, with the reason.
const NOT_OFFERED: Record<string, string> = {
  testimonialsPage: 'no slug field: it is served at a fixed route',
  videoIndex: 'no slug field: it is served at a fixed route',
  homePage: 'offered as the fixed "Home (/)" option, not from the dataset',
}

type SchemaType = {name: string; type: string; attributes?: Record<string, unknown>}
const schema = JSON.parse(fs.readFileSync(path.join(STUDIO, 'schema.json'), 'utf8')) as SchemaType[]
const documents = new Map(schema.filter((t) => t.type === 'document').map((t) => [t.name, t]))

let failures = 0
function fail(msg: string): void {
  failures++
  console.log(`FAIL  ${msg}`)
}

for (const type of PAGE_LINK_TYPES) {
  const doc = documents.get(type)
  if (!doc) { fail(`${type}: not a document type in schema.json`); continue }
  if (!doc.attributes || !('slug' in doc.attributes)) { fail(`${type}: no slug attribute in schema.json`); continue }
  const route = ROUTE_FOR[type]
  if (route === undefined) { fail(`${type}: no entry in ROUTE_FOR (which site route serves it?)`); continue }
  const dir = path.join(SITE, 'app', '(site)', route)
  if (!fs.existsSync(dir)) { fail(`${type}: route directory ${path.relative(SITE, dir)} does not exist`); continue }
  console.log(`PASS  ${type}: slug declared, served by app/(site)/${route || '(root)'}`)
}

// The other direction: a routed, slugged document type the picker forgot.
for (const [type, route] of Object.entries(ROUTE_FOR)) {
  if ((PAGE_LINK_TYPES as readonly string[]).includes(type)) continue
  if (type in NOT_OFFERED) { console.log(`PASS  ${type}: not offered (${NOT_OFFERED[type]})`); continue }
  const doc = documents.get(type)
  if (doc?.attributes && 'slug' in doc.attributes) fail(`${type} has a slug and a route (${route}) and the picker does not offer it`)
}

if (failures) {
  console.log(`\n${failures} failure(s)`)
  process.exitCode = 1
} else {
  console.log('\nAll expectations met.')
}
