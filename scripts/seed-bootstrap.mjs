#!/usr/bin/env node
/**
 * Sample Firm seed bootstrap — TEMPLATE DEVELOPMENT ONLY
 *
 * Creates the 16 sample documents (5 main pages + 5 singletons + 6
 * reference-target docs: location, siteForm, badge, caseResult, faqItem,
 * testimonial), plus one uploaded badge image asset, in a SCRATCH/DEV
 * dataset so template development has content to render against.
 *
 * NEVER a client's dataset. Ruled 2026-07-23 (monorepo BI/OUTSTANDING.md
 * item 43): no fake content on real client sites — a newly provisioned
 * client starts empty and gets everything from its own data. The Client
 * Provisioning Tool has no seed-import path (removed under that ruling;
 * pinned by test). See studio/seedData/regenerate.md, Purpose section.
 *
 * After this script populates the scratch project, export AND FILTER per
 * studio/seedData/regenerate.md step 6 to produce
 * `studio/seedData/sampleFirm.ndjson` — never export straight to that path.
 *
 * Reference-only item types (item 43): `badgesSection`/`badgesBlock` and
 * `caseResultsBlock` hold references and render nothing without target
 * documents, so the seed carries one of each, wired into the homepage
 * canvas. `faqItem` and `testimonial` are seeded as reference targets for
 * the operator to wire (no faqSection/testimonialsGrid document ships in
 * the seed, so nothing renders empty). `video` is deliberately NOT seeded
 * (its section embeds an external video URL a sample cannot honestly
 * provide) and `pressItem` is deliberately NOT seeded (no section, query,
 * or component renders the type — see OUTSTANDING item 43/66).
 *
 * Usage:
 *   SANITY_SEED_PROJECT_ID=<scratch-id> SANITY_SEED_TOKEN=<write-token> \
 *     node scripts/seed-bootstrap.mjs
 *
 * Requires: cd studio && npm install (uses @sanity/client from the template)
 *
 * See studio/seedData/regenerate.md for full setup procedure.
 */

// The template repo has no root node_modules — @sanity/client is installed in
// studio/. A bare `import '@sanity/client'` resolves upward from scripts/ and
// finds nothing (the documented `cd studio && npm install` prerequisite
// installs it, but not anywhere this file's own imports can see), so resolve
// explicitly from studio/'s dependency tree.
import {createRequire} from 'node:module'
const requireFromStudio = createRequire(new URL('../studio/package.json', import.meta.url))
const {createClient} = requireFromStudio('@sanity/client')

const projectId = process.env.SANITY_SEED_PROJECT_ID
const token = process.env.SANITY_SEED_TOKEN
const dataset = process.env.SANITY_SEED_DATASET ?? 'production'

if (!projectId || !token) {
  console.error('Missing SANITY_SEED_PROJECT_ID or SANITY_SEED_TOKEN env vars.')
  console.error('See studio/seedData/regenerate.md for setup.')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Helpers ────────────────────────────────────────────────────────────────

const portableTextParagraph = (text) => [
  {
    _type: 'block',
    _key: Math.random().toString(36).slice(2, 10),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: Math.random().toString(36).slice(2, 10), text, marks: []}],
  },
]

// ─── Reference-target docs ──────────────────────────────────────────────────

const sampleLocation = {
  _id: 'sample-location-record',
  _type: 'location',
  title: 'Springfield Office',
  isPrimary: true,
  locationType: 'Physical',
  locationStatus: 'Active',
  address1: '123 Example St',
  address2: 'Suite 100',
  city: 'Springfield',
  state: 'Illinois',
  zip: '62701',
}

const sampleSiteForm = {
  _id: 'sample-contact-form',
  _type: 'siteForm',
  title: 'Sample Contact Form',
  // siteForm has no .error() fields per schema audit; structure-only stub.
}

// A neutral gray "award seal" PNG (300×300, generated placeholder artwork —
// two concentric gray discs and a ring, no text, no real award's trade dress).
// Embedded so the bootstrap needs no binary fixture on disk. Both badge
// renderers filter out imageless badges (`BadgeImage.src`), so the image is
// load-bearing: a badge doc without an asset reproduces the empty-section
// defect the seed exists to prevent. Uploaded in main() before the docs are
// written; Sanity dedupes asset uploads by content hash, so re-runs are
// idempotent.
const BADGE_PNG_BASE64 =
  // eslint-disable-next-line max-len
  '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'

const sampleBadge = {
  _id: 'sample-badge',
  _type: 'badge',
  name: 'Sample Legal Excellence Award',
  grantingBody: 'Sample Bar Association',
  year: '2024',
  explanation:
    'Placeholder recognition shipped with the Legal Platform Template. Replace with the firm’s real awards and designations in Sanity Studio.',
  // image.asset._ref is filled in by main() after the asset upload.
  image: {
    _type: 'image',
    alt: 'Sample Legal Excellence Award, Sample Bar Association — placeholder badge artwork',
  },
}

const sampleCaseResult = {
  _id: 'sample-case-result',
  _type: 'caseResult',
  // Deliberately non-monetary: sample content must not ship a fabricated
  // dollar figure. The results disclaimer renders automatically wherever
  // case results render (site/lib/legal.ts — code-constant floor), so no
  // per-item disclaimer field exists or is needed.
  amount: 'Favorable Outcome',
  caseType: 'Sample Matter',
  caption:
    'Placeholder case result shipped with the Legal Platform Template. Replace with the firm’s real, verifiable outcomes in Sanity Studio.',
  year: '2024',
  practiceArea: {_type: 'reference', _ref: 'sample-practice-area'},
}

const sampleFaqItem = {
  _id: 'sample-faq-item',
  _type: 'faqItem',
  question: 'What should I bring to my first consultation?',
  slug: {_type: 'slug', current: 'what-should-i-bring-to-my-first-consultation'},
  category: 'general',
  answer: portableTextParagraph(
    'Placeholder answer shipped with the Legal Platform Template: bring any documents related to your matter, ' +
      'a list of questions, and a summary of key dates. Replace with the firm’s real guidance in Sanity Studio.',
  ),
}

const sampleTestimonial = {
  _id: 'sample-testimonial',
  _type: 'testimonial',
  quote:
    'Placeholder testimonial shipped with the Legal Platform Template. Replace with a real client’s words, used with permission.',
  name: 'Jordan D.',
  caseType: 'General Practice',
  numberOfStars: 5,
}

// ─── 5 main page docs ───────────────────────────────────────────────────────

const sampleHomePage = {
  _id: 'sample-home',
  _type: 'homePage',
  slug: {_type: 'slug', current: 'home'},
  seoTitle: 'Sample Firm — Trusted Legal Counsel',
  metaDescription:
    'Sample Firm provides general legal counsel. Replace this content with your firm details via the Site Prep Tool.',
  noIndex: false,
  h1: 'Trusted legal counsel for every chapter',
  // Homepage canvas — wires the reference-only item docs so their blocks
  // render populated on a fresh client (item 43): a badges block referencing
  // sample-badge and a case-results block referencing sample-case-result.
  // Blocks are inline objects; the referenced documents are created first in
  // the run order below so reference resolution succeeds.
  canvas: [
    {
      _type: 'caseResultsBlock',
      _key: 'seed-case-results',
      heading: 'Results That Matter',
      intro: 'A sample of outcomes — placeholder content shipped with the template.',
      caseResults: [{_type: 'reference', _ref: 'sample-case-result', _key: 'seed-case-result-1'}],
    },
    {
      _type: 'badgesBlock',
      _key: 'seed-badges',
      heading: 'Recognized for Excellence',
      badges: [{_type: 'reference', _ref: 'sample-badge', _key: 'seed-badge-1'}],
    },
  ],
}

const samplePracticeArea = {
  _id: 'sample-practice-area',
  _type: 'practiceArea',
  title: 'General Practice',
  slug: {_type: 'slug', current: 'general-practice'},
  seoTitle: 'General Practice — Sample Firm',
  metaDescription:
    'Overview of general legal services offered by Sample Firm. Replace with your practice-area copy.',
  noIndex: false,
  body: portableTextParagraph(
    'General Practice is a placeholder practice area shipped with the Legal Platform Template. ' +
      'Edit this content via the Site Prep Tool, or in Sanity Studio directly for one-off sites.',
  ),
}

const sampleAttorneyPage = {
  _id: 'sample-attorney',
  _type: 'attorneyPage',
  title: 'Jane Doe',
  slug: {_type: 'slug', current: 'attorneys/jane-doe'},
  seoTitle: 'Jane Doe — Sample Firm',
  metaDescription:
    'Placeholder attorney profile for Jane Doe. Replace with your attorney roster via the Site Prep Tool.',
  noIndex: false,
  firstName: 'Jane',
  lastName: 'Doe',
  suffix: 'J.D.',
  jobTitle: 'Partner',
}

const sampleContactPage = {
  _id: 'sample-contact',
  _type: 'contactPage',
  title: 'Contact',
  slug: {_type: 'slug', current: 'contact'},
  seoTitle: 'Contact — Sample Firm',
  metaDescription: 'Get in touch with Sample Firm. Placeholder content shipped with the template.',
  noIndex: false,
  showHero: true,
  heading: 'Contact Sample Firm',
  description: 'Reach out for a consultation. This is placeholder copy shipped with the template.',
  contactForm: {_type: 'reference', _ref: 'sample-contact-form'},
}

const sampleLocationPage = {
  _id: 'sample-location',
  _type: 'locationPage',
  locationRef: {_type: 'reference', _ref: 'sample-location-record'},
  title: 'Springfield Office',
  slug: {_type: 'slug', current: 'springfield-office'},
  seoTitle: 'Springfield Office — Sample Firm',
  metaDescription:
    'Sample Firm Springfield Office — placeholder location page shipped with the template.',
  noIndex: false,
}

// ─── 5 required singletons ──────────────────────────────────────────────────

const sampleSiteSettings = {
  _id: 'siteSettings',
  _type: 'siteSettings',
  firmName: 'Sample Firm',
  firmNameShort: 'Sample Firm',
  primaryDomain: 'example.com',
  primaryLocation: {_type: 'reference', _ref: 'sample-location-record'},
  timezone: 'America/Chicago',
  languageCode: 'en',
  privacyPolicyUrl: '/privacy-policy/',
  disclaimerUrl: '/disclaimer/',
}

const sampleDesignSettings = {
  _id: 'designSettings',
  _type: 'designSettings',
  // All fields are .warning()-level; rely on schema initialValues for defaults
  // (analogous-accent, default, plain, rounded, etc.).
  colorApproach: 'analogous-accent',
}

const sampleMainNavigation = {
  _id: 'mainNavigation',
  _type: 'mainNavigation',
  // .warning()-level fields rely on schema initialValues.
}

const sampleFooterSettings = {
  _id: 'footerSettings',
  _type: 'footerSettings',
}

const sampleGlobalCta = {
  _id: 'globalCta',
  _type: 'globalCta',
  layout: 'centered',
  heading: 'Schedule a consultation',
  description: 'Placeholder global-CTA copy shipped with the template.',
}

// ─── Run order ──────────────────────────────────────────────────────────────
// Reference targets BEFORE referencing docs, so reference resolution succeeds.

const docs = [
  // Reference targets
  sampleLocation,
  sampleSiteForm,
  sampleBadge,
  sampleFaqItem,
  sampleTestimonial,
  // Singletons (siteSettings references sampleLocation — must run after it)
  sampleSiteSettings,
  sampleDesignSettings,
  sampleMainNavigation,
  sampleFooterSettings,
  sampleGlobalCta,
  // Main pages. Order matters twice here: sampleCaseResult references
  // sample-practice-area, and sampleHomePage's canvas references both
  // sample-case-result and sample-badge — strong references fail on a
  // missing target, so each target is written before its referrer.
  samplePracticeArea,
  sampleCaseResult,
  sampleHomePage,
  sampleAttorneyPage,
  sampleContactPage,
  sampleLocationPage,
]

async function main() {
  console.log(`Seeding ${docs.length} documents to project ${projectId} / dataset ${dataset}\n`)

  // Upload the badge artwork first and wire the returned asset id into the
  // badge doc — the doc write below fails schema-shape-silent (dangling
  // asset ref) without it. Sanity dedupes uploads by content hash, so
  // re-running never accumulates copies.
  const badgeAsset = await client.assets.upload(
    'image',
    Buffer.from(BADGE_PNG_BASE64, 'base64'),
    {filename: 'sample-badge.png'},
  )
  sampleBadge.image.asset = {_type: 'reference', _ref: badgeAsset._id}
  console.log(`✓ ${'image asset'.padEnd(20)} ${badgeAsset._id}`)

  let okCount = 0
  let errCount = 0

  for (const doc of docs) {
    try {
      const result = await client.createOrReplace(doc)
      console.log(`✓ ${result._type.padEnd(20)} ${result._id}`)
      okCount += 1
    } catch (err) {
      console.error(`✗ ${doc._type.padEnd(20)} ${doc._id}`)
      console.error(`  → ${err.message}`)
      if (err.details) console.error(`  → details: ${JSON.stringify(err.details)}`)
      errCount += 1
    }
  }

  console.log(`\nResult: ${okCount} OK, ${errCount} failed.`)

  if (errCount > 0) {
    console.error(
      '\nFailures are usually schema validation errors. Open Sanity Studio against the\n' +
        `scratch project and fix manually, then re-run this script (createOrReplace is\n` +
        `idempotent). When all ${docs.length} docs pass, export AND FILTER per\n` +
        'studio/seedData/regenerate.md step 6. Never export straight to\n' +
        'seedData/sampleFirm.ndjson — the raw export carries the create-only\n' +
        'singletons the Studio creates on its own, and an unfiltered seed is the\n' +
        'landmine the filter step exists to defuse.\n',
    )
    process.exit(1)
  }

  console.log(
    '\nAll docs created. Now export AND FILTER per studio/seedData/regenerate.md\n' +
      'step 6 (export to sampleFirm.raw.ndjson, jq-filter the create-only\n' +
      'singletons into sampleFirm.ndjson, delete the raw file). Never export\n' +
      'straight to seedData/sampleFirm.ndjson.\n',
  )
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
