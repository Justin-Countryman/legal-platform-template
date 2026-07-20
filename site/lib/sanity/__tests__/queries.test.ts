import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {parse, evaluate} from 'groq-js'
import {FOOTER_QUERY, NAP_TOKENS_QUERY} from '../queries'

// ─── Source-text inputs ───────────────────────────────────────────────────────
// Read queries.ts as a string so source-text meta-tests cover every []->
// projection regardless of which exported query or fragment it lives in
// (including inline projections inside compound queries that aren't
// extracted into named fragments — e.g. BLOG_POST_PAGE_QUERY's inline
// sidebar projection).

const QUERIES_PATH = path.resolve(__dirname, '..', 'queries.ts')
const QUERIES_SRC = readFileSync(QUERIES_PATH, 'utf-8')

// ─── Fixture documents ────────────────────────────────────────────────────────
// In-memory Sanity-dataset shape consumed by groq-js. Documents include three
// host docs (a practiceArea with sections; an attorneyIndex with ordered
// attorneys; an attorneyPage as a deref target) plus three section docs
// referenced from the practiceArea: one resolves cleanly, one is referenced
// but the section doc itself is *missing from the dataset* (dangling ref —
// the failure mode the filter is supposed to drop), one resolves cleanly.
// This shape lets every behavior test exercise the same valid/dangling/valid
// pattern uniformly across all 19 query positions.

const FIXTURE_DATASET = [
  // Section docs (referenced by practiceArea.sections)
  {
    _id: 'sec-attorney',
    _type: 'attorneySection',
    _rev: '1',
    heading: 'Attorneys',
    mode: 'manual',
  },
  // sec-faq INTENTIONALLY MISSING — its reference at the practiceArea side
  // dangles, exercising the canonical filter's "drop dangling-ref" job.
  {
    _id: 'sec-reviews',
    _type: 'reviewsSection',
    _rev: '1',
    heading: 'Reviews',
  },
  // Attorney docs (referenced by attorneyIndex.orderedAttorneys + practiceArea.sections[].attorneys + nav.attorneyOrder)
  {
    _id: 'atty-smith',
    _type: 'attorneyPage',
    _rev: '1',
    title: 'Jane Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    slug: {current: 'jane-smith'},
    h1: 'Jane Smith, Attorney',
  },
  // atty-jones INTENTIONALLY MISSING — dangling ref from attorneyIndex.orderedAttorneys
  {
    _id: 'atty-doe',
    _type: 'attorneyPage',
    _rev: '1',
    title: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    slug: {current: 'john-doe'},
    h1: 'John Doe, Attorney',
  },
  // Practice area doc (referenced by nav.practiceAreaOrder)
  {
    _id: 'pa-family',
    _type: 'practiceArea',
    _rev: '1',
    title: 'Family Law',
    slug: {current: 'family-law'},
  },
  // pa-business INTENTIONALLY MISSING — dangling ref from nav.practiceAreaOrder
  // Testimonial docs (referenced by ctaSection.testimonials + testimonialsPage.testimonials)
  {
    _id: 'tst-1',
    _type: 'testimonial',
    _rev: '1',
    quote: 'Great service',
    name: 'Client A',
    numberOfStars: 5,
  },
  // tst-2 INTENTIONALLY MISSING — dangling ref
  {
    _id: 'tst-3',
    _type: 'testimonial',
    _rev: '1',
    quote: 'Excellent',
    name: 'Client B',
    numberOfStars: 5,
  },
  // attorneyIndex doc (referenced indirectly via `*[_type=="attorneyIndex"][0]`)
  {
    _id: 'attorneyIndex',
    _type: 'attorneyIndex',
    _rev: '1',
    orderedAttorneys: [
      {_type: 'reference', _ref: 'atty-smith', _key: 'k1'},
      {_type: 'reference', _ref: 'atty-jones', _key: 'k2'}, // dangling
      {_type: 'reference', _ref: 'atty-doe', _key: 'k3'},
    ],
  },
  // Host doc for behavior tests — practiceArea with 3 section refs (one dangles)
  {
    _id: 'pa-host',
    _type: 'practiceArea',
    _rev: '1',
    title: 'Host Practice Area',
    slug: {current: 'host'},
    sections: [
      {_type: 'reference', _ref: 'sec-attorney', _key: 's1'},
      {_type: 'reference', _ref: 'sec-faq', _key: 's2'}, // dangling
      {_type: 'reference', _ref: 'sec-reviews', _key: 's3'},
    ],
  },
  // CTA section doc with 3 testimonial refs (one dangles)
  {
    _id: 'cta-host',
    _type: 'ctaSection',
    _rev: '1',
    testimonials: [
      {_type: 'reference', _ref: 'tst-1', _key: 't1'},
      {_type: 'reference', _ref: 'tst-2', _key: 't2'}, // dangling
      {_type: 'reference', _ref: 'tst-3', _key: 't3'},
    ],
  },
  // FAQ item docs (referenced by faq-host below; one ref dangles)
  {
    _id: 'faq-1',
    _type: 'faqItem',
    _rev: '1',
    question: 'What is your fee structure?',
    answer: [{_type: 'block', _key: 'a1', children: [{_type: 'span', _key: 's1', text: 'Hourly.'}]}],
    category: 'general',
    slug: {current: 'what-is-your-fee-structure'},
    tags: ['fees'],
  },
  // faq-2 INTENTIONALLY MISSING — dangling ref from faq-host.faqItems
  {
    _id: 'faq-3',
    _type: 'faqItem',
    _rev: '1',
    question: 'Do you offer free consultations?',
    answer: [{_type: 'block', _key: 'a3', children: [{_type: 'span', _key: 's3', text: 'Yes.'}]}],
    category: 'general',
    slug: {current: 'do-you-offer-free-consultations'},
  },
  // Host doc carrying 3 faqItem refs (one dangles)
  {
    _id: 'faq-host',
    _type: 'practiceArea',
    _rev: '1',
    title: 'FAQ Host Practice Area',
    slug: {current: 'faq-host'},
    faqItems: [
      {_type: 'reference', _ref: 'faq-1', _key: 'f1'},
      {_type: 'reference', _ref: 'faq-2', _key: 'f2'}, // dangling
      {_type: 'reference', _ref: 'faq-3', _key: 'f3'},
    ],
  },
]

async function runQuery(query: string, params: Record<string, unknown> = {}) {
  const tree = parse(query)
  const result = await evaluate(tree, {dataset: FIXTURE_DATASET, params})
  return result.get()
}

// ─── Pattern-discipline tests (behavior-execution + source-text meta) ─────────
// These four tests REPLACE the four v0.20.0 string-match tests that previously
// lived here. They cover the same intent (catalog stability + canonical-pattern
// presence + broken-pattern absence) with the addition of actual GROQ
// EXECUTION against fixtures — the v0.20.0 broken pattern would have been
// caught at write time by the anti-pattern lockdown test below.
//
// See BI/BI-TESTING.md → "Behavior-execution discipline for query tests" for
// the doctrine + the cautionary tale this regression net is built on.

describe('GROQ canonical filter-before-dereference pattern', () => {
  // Canonical pattern locked in WS-GROQ-Null-Leak-Hotfix (v0.20.1):
  //
  //   field[defined(@->_id)]->{...}     // canonical (filter-before-deref)
  //   field[]->{...}[defined(_id)]      // BROKEN (v0.20.0 — produces [null,null,null])
  //   field[]->[defined(_id)]{...}      // BROKEN (pre-projection — original WS9.3 finding)
  //
  // See BI/skills/skill-sanity-schema/SKILL.md → "Reference array dereferencing"
  // for the mechanism + consumer-side belt-and-suspenders pairing.

  it('catalog-stability: queries.ts contains exactly 25 canonical filter-before-deref patterns', () => {
    // If this count changes, the catalog has drifted. Update this number in
    // lockstep with any new []-> projection and verify the new projection ships
    // with the canonical [defined(@->_id)]-> shape.
    // Catalog grew 19 → 22 in WS-FAQ-Migration (2026-05-14) when `faqItems[]`
    // on practiceArea/geoPracticeArea/serviceAreaPage/faqPage + `questions[]`
    // on faqSection migrated from inline `faqItem` objects to references.
    // Grew 22 → 23 with VIDEO_INDEX_PAGE_QUERY.videos[] (Video Library).
    // Grew 23 → 24 with a video/attorney-section reference dereference added
    // after v0.1.0; that addition never bumped this assertion, so the source
    // carried 24 while this test asserted 23. Corrected to 24 after confirming
    // all 24 occurrences are genuine, distinct field[defined(@->_id)]->
    // projections (no stray or duplicated pattern).
    // Grew 24 → 25 in WS-Homepage-Canvas Phase 1 item 1a (2026-07-20) when
    // `badges[]` on badgesSection migrated from inline badge objects to
    // `badge` item references, the same inline-to-reference promotion the
    // faqItem migration made above.
    const matches = QUERIES_SRC.match(/\[defined\(@->_id\)\]->/g) ?? []
    expect(matches.length).toBe(25)
  })

  it('source-text meta: queries.ts contains zero broken-pattern occurrences', () => {
    // Two broken patterns retired from canonical entirely:
    //   field[]->{...}[defined(_id)]    (v0.20.0 — post-projection, nulls everything)
    //   field[]->[defined(_id)]{...}    (pre-projection — original WS9.3 broken form)
    // Defense-in-depth source-text scan; the behavior-execution test below is
    // the primary check.
    expect(QUERIES_SRC).not.toMatch(/\}\[defined\(_id\)\]/)
    expect(QUERIES_SRC).not.toMatch(/\[\]->\[defined\(_id\)\]/)
  })

  it('behavior: filter-before-dereference drops dangling refs and returns survivors', async () => {
    // Parameterized behavior coverage. The pattern shape is uniform across
    // all 19 sites — direct refs deref, chained-singleton deref, fragment-
    // interpolated deref — so a single behavior probe per shape category
    // covers the platform's full risk surface. The fixture's pa-host doc
    // carries 3 section refs of which 1 dangles (sec-faq is intentionally
    // absent from the dataset). The canonical filter must return 2 docs,
    // both with concrete _id and _type, in original order.
    const directShapeResult = await runQuery(
      `*[_id == "pa-host"][0].sections[defined(@->_id)]->{_id, _type}`,
    )
    expect(Array.isArray(directShapeResult)).toBe(true)
    expect(directShapeResult).toHaveLength(2)
    expect(directShapeResult.map((s: {_id: string}) => s._id)).toEqual([
      'sec-attorney',
      'sec-reviews',
    ])
    expect(directShapeResult.every((s: {_type: string}) => typeof s._type === 'string')).toBe(true)

    // Chained-singleton shape (the 3 sites at lines 70, 299, 899 in queries.ts).
    const chainedShapeResult = await runQuery(
      `*[_type == "attorneyIndex"][0].orderedAttorneys[defined(@->_id)]->{_id, title}`,
    )
    expect(Array.isArray(chainedShapeResult)).toBe(true)
    expect(chainedShapeResult).toHaveLength(2)
    expect(chainedShapeResult.map((a: {_id: string}) => a._id)).toEqual([
      'atty-smith',
      'atty-doe',
    ])

    // Fragment-interpolated shape (line 45 in queries.ts — testimonials field).
    const fragmentShapeResult = await runQuery(
      `*[_id == "cta-host"][0].testimonials[defined(@->_id)]->{_id, quote}`,
    )
    expect(Array.isArray(fragmentShapeResult)).toBe(true)
    expect(fragmentShapeResult).toHaveLength(2)
    expect(fragmentShapeResult.map((t: {_id: string}) => t._id)).toEqual(['tst-1', 'tst-3'])

    // faqItem reference shape (new in WS-FAQ-Migration). Projects the same
    // fields the runtime consumes (question, answer, category, slug, tags)
    // and drops dangling refs.
    const faqShapeResult = await runQuery(
      `*[_id == "faq-host"][0].faqItems[defined(@->_id)]->{
        _id, question, category, "slug": slug.current, tags
      }`,
    )
    expect(Array.isArray(faqShapeResult)).toBe(true)
    expect(faqShapeResult).toHaveLength(2)
    expect(faqShapeResult.map((f: {_id: string}) => f._id)).toEqual(['faq-1', 'faq-3'])
    expect(faqShapeResult[0]).toMatchObject({
      question: 'What is your fee structure?',
      category: 'general',
      slug: 'what-is-your-fee-structure',
    })
  })

  it('anti-pattern lockdown: v0.20.0 post-projection [defined(_id)] returns [null,null,null] on dangling-ref fixture', async () => {
    // This test locks in the v0.20.0 failure mode so the broken pattern can
    // never silently reappear. The v0.20.0 audit shipped this pattern as
    // canonical across 19 sites; every sections-bearing page in pre-migration data crashed
    // for ~24 hours because the filter produces an array of NULLS rather
    // than dropping them. The corresponding source-text scan above prevents
    // accidental reintroduction at the source layer; this test prevents
    // accidental reintroduction at the doctrine layer (someone re-reading
    // the v0.20.0 OUTSTANDING entry and believing the original framing).
    const v0_20_0_brokenResult = await runQuery(
      `*[_id == "pa-host"][0].sections[]->{_id, _type}[defined(_id)]`,
    )
    expect(Array.isArray(v0_20_0_brokenResult)).toBe(true)
    expect(v0_20_0_brokenResult).toHaveLength(3) // length preserved
    expect(v0_20_0_brokenResult).toEqual([null, null, null]) // entries all null

    // Sanity check: the same fixture under the canonical Option B returns
    // 2 concrete survivors, not nulls. Documents the diff directly.
    const canonicalResult = await runQuery(
      `*[_id == "pa-host"][0].sections[defined(@->_id)]->{_id, _type}`,
    )
    expect(canonicalResult).toHaveLength(2)
    expect(canonicalResult.every((s: unknown) => s !== null)).toBe(true)
  })
})

// ─── displayOnWebsite deny-by-default on location listings ────────────────────
// A location marked displayOnWebsite=false must not render anywhere the public
// site lists offices (footer, contact page, location index, LocalBusiness
// JSON-LD). Every one of those surfaces is fed by one of the two location-
// COLLECTION selects — FOOTER_QUERY (queries.ts:425) and NAP_TOKENS_QUERY
// (queries.ts:780) — and before this fix both filtered only on
// `locationStatus == "Active"`, so a do-not-display office rendered everywhere.
//
// The filter is deny-by-default: the office renders only on an explicit
// `displayOnWebsite == true`. An unset field suppresses. This is the OPPOSITE
// polarity from the writer's tri-state default (BE/_shared/zite.py:
// `displayOnWebsite unanswered -> True`), and it is safe only because the
// writer now writes an explicit boolean on every location it creates and the
// Studio schema sets `initialValue: true` — so no real location doc lacks the
// field (verified against the sole live dataset at the time of this fix: 1
// location, field defined, 0 missing). The deny-by-default read filter is the
// belt to that suspenders: a legacy or hand-created doc missing the field is
// suppressed rather than leaked.
//
// The fixture mirrors the real location payload shape (_type location, city,
// locationStatus Active, displayOnWebsite boolean, locationType Physical) plus
// two divergent offices no live dataset yet contains but the schema permits:
// one explicitly false, one with the field unset.

const LOCATION_FIXTURE = [
  // siteSettings host — NAP_TOKENS_QUERY roots on this doc; without it the
  // whole projection is null and .locations can't be read.
  {
    _id: 'siteSettings',
    _type: 'siteSettings',
    _rev: '1',
    firmName: 'Example Law Firm, P.A.',
    primaryLocation: {_type: 'reference', _ref: 'loc-visible'},
  },
  // Visible office — Active + explicit displayOnWebsite true. Must render.
  {
    _id: 'loc-visible',
    _type: 'location',
    _rev: '1',
    city: 'Visible City',
    locationStatus: 'Active',
    locationType: 'Physical',
    isPrimary: true,
    displayOnWebsite: true,
    address1: '1000 Visible Way',
    officePhone: '651-555-0100',
  },
  // Hidden office — Active but displayOnWebsite EXPLICITLY false. The bug:
  // pre-fix this renders everywhere. Must be suppressed.
  {
    _id: 'loc-hidden',
    _type: 'location',
    _rev: '1',
    city: 'Hidden City',
    locationStatus: 'Active',
    locationType: 'Physical',
    isPrimary: false,
    displayOnWebsite: false,
    address1: '2000 Hidden Way',
    officePhone: '651-555-0200',
  },
  // Legacy office — Active, displayOnWebsite UNSET. Deny-by-default: suppressed.
  {
    _id: 'loc-unset',
    _type: 'location',
    _rev: '1',
    city: 'Legacy City',
    locationStatus: 'Active',
    locationType: 'Physical',
    isPrimary: false,
    address1: '3000 Legacy Way',
    officePhone: '651-555-0300',
  },
]

async function runAgainstLocations(query: string) {
  const tree = parse(query)
  const result = await evaluate(tree, {dataset: LOCATION_FIXTURE, params: {}})
  return result.get()
}

describe('displayOnWebsite deny-by-default on location listings', () => {
  it('FOOTER_QUERY excludes displayOnWebsite=false and unset locations', async () => {
    const result = await runAgainstLocations(FOOTER_QUERY)
    const cities = (result.locations ?? []).map((l: {city: string}) => l.city)
    expect(cities).toEqual(['Visible City'])
    expect(cities).not.toContain('Hidden City')
    expect(cities).not.toContain('Legacy City')
  })

  it('NAP_TOKENS_QUERY excludes displayOnWebsite=false and unset locations', async () => {
    const result = await runAgainstLocations(NAP_TOKENS_QUERY)
    const cities = (result.locations ?? []).map((l: {city: string}) => l.city)
    expect(cities).toEqual(['Visible City'])
    expect(cities).not.toContain('Hidden City')
    expect(cities).not.toContain('Legacy City')
  })
})

// ─── Consumer-side null-filter typed-predicate semantics ──────────────────────
// Kept verbatim from v0.20.0 — these test in-memory predicate shape, not GROQ
// behavior. The typed-predicate `.filter()` guard at consumer sites remains
// canonical as belt-and-suspenders defense (the GROQ filter is the primary
// safety; the consumer filter is a safety net against future query regressions
// that bypass the canonical shape).

describe('Consumer-side null-filter typed-predicate semantics', () => {
  it('drops null entries from a mixed array (typed predicate)', () => {
    type Item = {id: string; slug: string}
    const input: (Item | null)[] = [
      {id: 'a', slug: 'foo'},
      null,
      {id: 'b', slug: 'bar'},
      null,
    ]
    const result = input.filter((x: Item | null): x is Item => x !== null)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('drops null entries AND items with missing slug (slug-keyed predicate)', () => {
    type Item = {id: string; slug: string}
    const input: (Item | null)[] = [
      {id: 'a', slug: 'foo'},
      null,
      {id: 'b', slug: ''}, // empty slug — still drops despite being non-null
      {id: 'c', slug: 'bar'},
    ]
    const result = input.filter(
      (x: Item | null): x is Item => x !== null && Boolean(x.slug),
    )
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(['a', 'c'])
  })

  it('is a no-op on an already-safe array (production case)', () => {
    type Item = {id: string; slug: string}
    const input: Item[] = [
      {id: 'a', slug: 'foo'},
      {id: 'b', slug: 'bar'},
      {id: 'c', slug: 'baz'},
    ]
    const result = input.filter((x: Item | null): x is Item => x !== null)
    expect(result).toHaveLength(input.length)
    expect(result).toEqual(input)
  })
})
