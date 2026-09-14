import {describe, expect, it} from 'vitest'
import {parse, evaluate} from 'groq-js'
import {CANVAS_FRAGMENT, SECTIONS_FRAGMENT} from '../queries'

// ─── The shared section body projects the same thing on both paths ────────────
//
// Phase 10 (2026-09-14; monorepo WS-V1-PHASE10-DESIGN §4). A shared section is
// rendered by one component from two sources: the referenced document in a
// page's `sections` list (SECTIONS_FRAGMENT, dereferenced) and the page-owned
// inline copy in `homePage.canvas` (CANVAS_FRAGMENT). If the two projections
// drift, the same component sees two shapes and one of them breaks in
// production only. This test builds every section as a document AND as an
// inline member with the same field values, evaluates both fragments under
// groq-js, and asserts the projected members are identical once the keys that
// differ by construction (`_id` on a document, `_key` on a member) are removed.
// It also asserts the six old block branches still project (release one keeps
// them) and that every inline member the schema accepts is projected at all.

const PAIRS: Array<[doc: string, inline: string, fields: Record<string, unknown>]> = [
  ['practiceAreaNav', 'practiceAreaNavInline', {
    tagline: 'Practice areas', heading: 'How we can help', description: 'Counsel.', layout: 'tile',
    sectionLayout: 'centered', gridMode: 'equal', mobileDisplay: 'stacked', hoverEffects: ['lift'],
    showArrow: true, iconPosition: 'auto', mode: 'manual', surface: 'light', spacing: 'normal',
    items: [
      {_key: 'i1', _type: 'practiceAreaNavItem', page: {_type: 'reference', _ref: 'pa-family'}, label: 'Family', featured: true},
      {_key: 'i2', _type: 'practiceAreaNavItem', page: {_type: 'reference', _ref: 'pa-missing'}},
    ],
  }],
  ['practiceAreaNav', 'practiceAreaNavInline', {heading: 'Every area', mode: 'allTopLevel'}],
  ['attorneySection', 'attorneySectionInline', {
    heading: 'Our people', mode: 'manual', layout: 'grid', cardStyle: 'portrait', surface: 'tint',
    attorneys: [{_key: 'a1', _type: 'reference', _ref: 'atty-1'}, {_key: 'a2', _type: 'reference', _ref: 'atty-missing'}],
  }],
  ['attorneySection', 'attorneySectionInline', {heading: 'Everyone', mode: 'all'}],
  ['badgesSection', 'badgesSectionInline', {
    heading: 'Recognised', layout: 'centeredGrid', buttons: [{_key: 'b', title: 'See all', url: '/awards/', variant: 'primary'}],
    badges: [{_key: 'g1', _type: 'reference', _ref: 'badge-1'}, {_key: 'g2', _type: 'reference', _ref: 'badge-missing'}],
  }],
  ['testimonialsGrid', 'testimonialsGridInline', {
    heading: 'Clients', surface: 'tint', testimonials: [{_key: 't1', _type: 'reference', _ref: 'testi-1'}],
  }],
  ['featuredTestimonial', 'featuredTestimonialInline', {
    heading: 'One voice', testimonial: {_type: 'reference', _ref: 'testi-1'}, surface: 'dark',
  }],
  ['videoSection', 'videoSectionInline', {
    heading: 'Watch', layout: 'split', videos: [{_key: 'v1', _type: 'reference', _ref: 'video-1'}],
  }],
  ['caseResultsSection', 'caseResultsSectionInline', {
    heading: 'Results', intro: 'Some of them.', ctaButton: {title: 'More', url: '/results/', variant: 'secondary'},
    caseResults: [{_key: 'c1', _type: 'reference', _ref: 'result-1'}, {_key: 'c2', _type: 'reference', _ref: 'result-missing'}],
  }],
  // The content section (Phase 11), once per layout and once with video media.
  ['contentSection', 'contentSectionInline', {
    layout: 'split', mediaSide: 'left', tagline: 'About', heading: 'Why {{firmName}}', headingEmphasis: '{{firmName}}',
    body: [{_type: 'block', _key: 'b', style: 'normal', markDefs: [], children: [{_type: 'span', _key: 's', text: 'We help.', marks: []}]}],
    items: [{_key: 'i1', _type: 'contentSectionItem', title: 'Local', body: 'Here since 1990.'}],
    pullQuote: {text: 'We answer every call.', attribution: 'The partners'}, proof: {number: '$40M', caption: 'recovered'},
    badges: [{_key: 'g1', _type: 'reference', _ref: 'badge-1'}, {_key: 'g2', _type: 'reference', _ref: 'badge-missing'}],
    buttons: [{_key: 'b1', title: 'Call us', url: '/contact/', variant: 'primary'}], showPhone: true,
    media: {kind: 'photo', image: {_type: 'image', alt: 'The office', asset: {_ref: 'image-1'}}}, imageTreatment: 'framed', surface: 'dark',
  }],
  ['contentSection', 'contentSectionInline', {
    layout: 'twoColumnText', heading: 'Two columns',
    items: [{_key: 'i1', _type: 'contentSectionItem', title: 'One'}, {_key: 'i2', _type: 'contentSectionItem', title: 'Two'}],
  }],
  ['contentSection', 'contentSectionInline', {layout: 'statement', heading: 'A statement', buttons: [{_key: 'b1', title: 'A', url: '/a/'}, {_key: 'b2', title: 'B', url: '/b/'}]}],
  ['contentSection', 'contentSectionInline', {layout: 'ribbon', heading: 'Serving the county since 1990', marquee: true}],
  ['contentSection', 'contentSectionInline', {layout: 'statRow', items: [{_key: 's1', _type: 'contentSectionItem', title: '500+', body: 'families'}]}],
  ['contentSection', 'contentSectionInline', {layout: 'split', heading: 'Watch', media: {kind: 'video', video: {_type: 'reference', _ref: 'video-1'}}}],
]

const OLD_MEMBERS = [
  {_type: 'narrativeBlock', _key: 'o1', heading: 'Story', body: [{_type: 'block', _key: 'b', children: [{_type: 'span', _key: 's', text: 'Hi', marks: []}]}]},
  {_type: 'differentiatorBlock', _key: 'o2', heading: 'Why', differentiators: [{_key: 'd', title: 't', body: 'b'}]},
  {_type: 'caseResultsBlock', _key: 'o3', heading: 'Old results', caseResults: [{_key: 'c', _type: 'reference', _ref: 'result-1'}]},
  {_type: 'attorneyHighlightBlock', _key: 'o4', heading: 'Old people', mode: 'manual', attorneys: [{_key: 'a', _type: 'reference', _ref: 'atty-1'}]},
  {_type: 'badgesBlock', _key: 'o5', heading: 'Old badges', badges: [{_key: 'g', _type: 'reference', _ref: 'badge-1'}]},
  {_type: 'siloNavBlock', _key: 'o6', heading: 'Old areas', mode: 'allTopLevel'},
]

const documents = PAIRS.map(([doc, , fields], i) => ({_id: `sec-${i}`, _type: doc, _rev: '1', name: `Section ${i}`, ...fields}))
const members = PAIRS.map(([, inline, fields], i) => ({_key: `m-${i}`, _type: inline, ...fields}))

const DATASET = [
  ...documents,
  {_id: 'host', _type: 'generalPage', _rev: '1', slug: {current: 'host'},
    sections: [...documents.map((d) => ({_type: 'reference', _ref: d._id, _key: `r-${d._id}`})), {_type: 'reference', _ref: 'sec-missing', _key: 'r-missing'}]},
  {_id: 'homePage-home', _type: 'homePage', _rev: '1', canvas: [...members, ...OLD_MEMBERS]},
  {_id: 'pa-family', _type: 'practiceArea', _rev: '1', title: 'Family Law', navLabel: 'Family', slug: {current: 'family-law'}, metaDescription: 'Divorce.'},
  {_id: 'pa-estate', _type: 'practiceArea', _rev: '1', title: 'Estate Planning', slug: {current: 'estate-planning'}, metaDescription: 'Wills.'},
  {_id: 'atty-1', _type: 'attorneyPage', _rev: '1', title: 'Jane Roe', firstName: 'Jane', lastName: 'Roe', slug: {current: 'attorneys/jane-roe'}, jobTitle: 'Partner'},
  {_id: 'attorneyIndex-attorneys', _type: 'attorneyIndex', _rev: '1', orderedAttorneys: [{_key: 'x', _type: 'reference', _ref: 'atty-1'}]},
  {_id: 'badge-1', _type: 'badge', _rev: '1', image: {alt: 'Best', asset: {_ref: 'image-1'}}},
  {_id: 'testi-1', _type: 'testimonial', _rev: '1', quote: 'Superb.', name: 'A client', numberOfStars: 5},
  {_id: 'video-1', _type: 'video', _rev: '1', title: 'Intro', youTubeUrl: 'https://www.youtube.com/watch?v=abc123xyz00'},
  {_id: 'result-1', _type: 'caseResult', _rev: '1', amount: '$1M', caseType: 'Truck', caption: 'Settled.', year: 2025},
]

async function run(query: string) {
  const value = await evaluate(parse(query), {dataset: DATASET, params: {}})
  return value.get()
}

// `_id` exists only on a document, `_key` only on a member, and `name` is the
// document-only internal label (the inline copy has no such field, so it
// projects null). Everything else must agree.
function strip(member: Record<string, unknown>): Record<string, unknown> {
  const out = {...member}
  delete out._id
  delete out._key
  delete out.name
  return out
}

describe('SECTION_BODY: the inline member and the referenced document project the same keys and values', () => {
  it('projects the content section keys on the inline member: items, the image with its own alt, the dereferenced video, proof, pull quote, body and badges', async () => {
    const canvas = (await run(`*[_id == "homePage-home"][0].canvas ${CANVAS_FRAGMENT}`)) as Array<Record<string, unknown>>
    const first = PAIRS.findIndex(([doc]) => doc === 'contentSection')
    const split = canvas[first] as {
      tagline: string; headingEmphasis: string; items: Array<{title: string}>; media: {kind: string; image: {alt: string}}
      proof: {number: string}; pullQuote: {text: string}; body: unknown[]; badges: unknown[]; imageTreatment: string
    }
    expect(split.tagline).toBe('About')
    expect(split.headingEmphasis).toBe('{{firmName}}')
    expect(split.items.map((i) => i.title)).toEqual(['Local'])
    expect(split.media.kind).toBe('photo')
    expect(split.media.image.alt).toBe('The office')
    expect(split.proof.number).toBe('$40M')
    expect(split.pullQuote.text).toBe('We answer every call.')
    expect(split.body).toHaveLength(1)
    expect(split.badges).toHaveLength(1) // the dangling badge dropped
    expect(split.imageTreatment).toBe('framed')
    const video = canvas[first + 5] as {media: {video: {title: string; youTubeUrl: string}}}
    expect(video.media.video).toEqual(expect.objectContaining({title: 'Intro', youTubeUrl: 'https://www.youtube.com/watch?v=abc123xyz00'}))
    // Another section's items still resolve through its own branch, not the content section's.
    expect((canvas[0] as {items: Array<{href: string}>}).items[0].href).toBe('/family-law/')
  })

  it('for every shared section, both modes where a mode exists', async () => {
    const sections = (await run(`*[_id == "host"][0].sections ${SECTIONS_FRAGMENT}`)) as Array<Record<string, unknown>>
    const canvas = (await run(`*[_id == "homePage-home"][0].canvas ${CANVAS_FRAGMENT}`)) as Array<Record<string, unknown>>
    expect(sections).toHaveLength(PAIRS.length) // the dangling reference dropped
    expect(canvas).toHaveLength(PAIRS.length + OLD_MEMBERS.length)
    PAIRS.forEach(([doc, inline], i) => {
      const fromDoc = sections[i]
      const fromCanvas = canvas[i]
      expect(fromDoc._type).toBe(doc)
      expect(fromCanvas._type).toBe(inline)
      const a = strip(fromDoc)
      const b = strip(fromCanvas)
      a._type = b._type = 'same'
      expect(Object.keys(b).sort(), `${inline} keys`).toEqual(Object.keys(a).sort())
      expect(b, `${inline} values`).toEqual(a)
    })
  })

  it('resolves the practice-area items and attorneys on the inline member, not only on the document', async () => {
    const canvas = (await run(`*[_id == "homePage-home"][0].canvas ${CANVAS_FRAGMENT}`)) as Array<Record<string, unknown>>
    const curated = canvas[0] as {items: Array<{href: string; label: string; featured?: boolean}>}
    expect(curated.items.map((i) => i.href)).toEqual(['/family-law/']) // the dangling page dropped
    expect(curated.items[0].label).toBe('Family')
    const all = canvas[1] as {items: Array<{href: string}>}
    expect(all.items.map((i) => i.href).sort()).toEqual(['/estate-planning/', '/family-law/'])
    const manual = canvas[2] as {attorneys: Array<{title: string; slug: string}>}
    expect(manual.attorneys).toEqual([expect.objectContaining({title: 'Jane Roe', slug: 'attorneys/jane-roe'})])
    const everyone = canvas[3] as {attorneys: Array<{title: string}>}
    expect(everyone.attorneys.map((a) => a.title)).toEqual(['Jane Roe'])
    const results = canvas[8] as {caseResults: Array<{amount: string}>; ctaButton: {title: string}}
    expect(results.caseResults).toEqual([expect.objectContaining({amount: '$1M', year: 2025})])
    expect(results.ctaButton.title).toBe('More')
  })

  it('still projects the six old block types through their own branches', async () => {
    const canvas = (await run(`*[_id == "homePage-home"][0].canvas ${CANVAS_FRAGMENT}`)) as Array<Record<string, unknown>>
    const old = canvas.slice(PAIRS.length)
    expect(old.map((m) => m._type)).toEqual(OLD_MEMBERS.map((m) => m._type))
    // The old branches project their own shapes, not the section body: an old
    // attorney member carries `name`/`href` cards, a section member `title`/`slug`.
    const oldAttorneys = old[3] as {attorneys: Array<{name: string; href: string}>}
    expect(oldAttorneys.attorneys[0]).toEqual(expect.objectContaining({name: 'Jane Roe', href: '/attorneys/jane-roe'}))
    expect(old[3]).not.toHaveProperty('appearance')
    const oldSilo = old[5] as {items: Array<{href: string}>}
    expect(oldSilo.items.map((i) => i.href).sort()).toEqual(['/estate-planning/', '/family-law/'])
  })
})
