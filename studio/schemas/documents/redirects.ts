import {defineType} from 'sanity'

// Singleton — manages all site redirects (migration + ongoing).
//
// THE SITE READS THIS DOCUMENT AT BUILD TIME. `site/lib/redirects.ts` merges its
// entries with the migration CSV and returns the result from `redirects()` in
// `site/next.config.ts`. Doctrine: `BI/rules/technical-seo.md` → TECH-10.
//
// This comment made that claim for months while nothing under `site/` referenced
// the document — an operator could add a redirect, publish, and change nothing.
// The wiring landed 2026-08-10; the claim is now true and is asserted by
// `site/lib/__tests__/redirects.test.ts`.
//
// A published change here still needs a rebuild to take effect: Next resolves
// `redirects()` once at build, not per request.

const PRECEDENCE_NOTE =
  'Rows marked "Written by the build" come from the migration sitemap and are ' +
  'rewritten every time Site Prep runs. Rows you add here are yours and are ' +
  'never overwritten. Where both name the same From path, YOURS WINS — so to ' +
  'change where a migrated URL goes, add your own row rather than editing the ' +
  'build-written one. The build log reports every override and every ' +
  'disagreement between this screen and the CSV.'

export const redirects = defineType({
  name: 'redirects',
  title: 'Redirects',
  type: 'document',
  description: PRECEDENCE_NOTE,
  fields: [
    {
      name: 'items',
      title: 'Redirect Rules',
      type: 'array',
      description: `Add a row for each redirect. From = old path, To = new path. ${PRECEDENCE_NOTE}`,
      of: [
        {
          type: 'object',
          name: 'redirect',
          fields: [
            {
              name: 'from',
              title: 'From (old path)',
              type: 'string',
              description: 'e.g. /old-page/',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'to',
              title: 'To (new path)',
              type: 'string',
              description: 'e.g. /new-page/',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'type',
              title: 'Redirect Type',
              type: 'string',
              options: {
                list: [
                  {title: '301 — Permanent', value: '301'},
                  {title: '302 — Temporary', value: '302'},
                ],
                layout: 'radio',
              },
              initialValue: '301',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              // Provenance, written by `generate_redirects` in
              // BE/Site-Prep-Tool/site_prep_tool.py and by nothing else. An
              // absent value means an operator added the row, which is what
              // makes it win a conflict — so this field is read-only, and it is
              // hidden on the rows where it is absent rather than inviting
              // someone to set it.
              name: 'source',
              title: 'Origin',
              type: 'string',
              readOnly: true,
              hidden: ({parent}) => (parent as {source?: string} | undefined)?.source !== 'migration',
              description:
                'Written by the build from the migration sitemap. Site Prep rewrites ' +
                'this row on every run; add your own row above to override it.',
              options: {
                list: [{title: 'Written by the build (migration)', value: 'migration'}],
              },
            },
          ],
          preview: {
            select: {from: 'from', to: 'to', type: 'type', source: 'source'},
            prepare({from, to, type, source}) {
              const badge = source === 'migration' ? 'build' : 'yours'
              return {
                title: from ?? '—',
                subtitle: `→ ${to ?? '—'}  ·  ${type ?? '301'}  ·  ${badge}`,
              }
            },
          },
        },
      ],
    },
  ],

  preview: {
    prepare() {
      return {title: 'Redirects'}
    },
  },
})
