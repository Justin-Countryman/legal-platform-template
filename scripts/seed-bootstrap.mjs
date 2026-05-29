#!/usr/bin/env node
/**
 * Sample Firm seed bootstrap
 *
 * Creates the 12 sample documents the Provisioning Tool will import into
 * every new client's empty Sanity dataset (5 main pages + 5 singletons + 2
 * reference-target docs). After this script populates the scratch project,
 * run `sanity dataset export` to produce `studio/seedData/sampleFirm.ndjson`.
 *
 * Usage:
 *   SANITY_SEED_PROJECT_ID=<scratch-id> SANITY_SEED_TOKEN=<write-token> \
 *     node scripts/seed-bootstrap.mjs
 *
 * Requires: cd studio && npm install (uses @sanity/client from the template)
 *
 * See studio/seedData/regenerate.md for full setup procedure.
 */

import {createClient} from '@sanity/client'

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
  // Singletons (siteSettings references sampleLocation — must run after it)
  sampleSiteSettings,
  sampleDesignSettings,
  sampleMainNavigation,
  sampleFooterSettings,
  sampleGlobalCta,
  // Main pages
  sampleHomePage,
  samplePracticeArea,
  sampleAttorneyPage,
  sampleContactPage,
  sampleLocationPage,
]

async function main() {
  console.log(`Seeding ${docs.length} documents to project ${projectId} / dataset ${dataset}\n`)

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
        'scratch project and fix manually, then re-run this script (createOrReplace is\n' +
        'idempotent). When all 12 docs pass, run:\n\n' +
        '  cd studio && npx sanity dataset export production seedData/sampleFirm.ndjson \\\n' +
        '    --raw --asset-concurrency 0 --overwrite\n',
    )
    process.exit(1)
  }

  console.log(
    '\nAll docs created. Now export the dataset to NDJSON:\n\n' +
      '  cd studio && npx sanity dataset export production seedData/sampleFirm.ndjson \\\n' +
      '    --raw --asset-concurrency 0 --overwrite\n\n' +
      'Then commit studio/seedData/sampleFirm.ndjson to the template repo.\n',
  )
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
