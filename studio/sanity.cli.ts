import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'TEMPLATE_SANITY_PROJECT_ID',
    // Env-driven for multi-env workflows (staging dataset, etc.); falls
    // back to production for unconfigured installs.
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  studioHost: 'TEMPLATE_CLIENT_SLUG',

  // A deployed client Studio serves the bundle the platform built and nothing
  // newer. The CLI's default for this has already flipped once (`sanity init`
  // turned auto-updates on in 3.57) and it is resolved from a chain of flag,
  // this key, then a legacy key, so the decision lives here in the file the
  // platform controls rather than in whichever default the CLI ships. Written
  // explicitly with the Sanity v6 upgrade, 2026-09-11 (monorepo
  // WS-V1-PHASE5-DESIGN §9 item 20).
  deployment: {
    autoUpdates: false,
  },

  // Typegen, moved here from `sanity-typegen.json` with the same upgrade. The
  // schema extract and the generated types both live where they did:
  // `studio/schema.json` in, `site/types/sanity.types.ts` out, queries read
  // from the site's app, components and lib trees.
  typegen: {
    path: ['../site/app/**/*.{ts,tsx}', '../site/components/**/*.{ts,tsx}', '../site/lib/**/*.{ts,tsx}'],
    schema: './schema.json',
    generates: '../site/types/sanity.types.ts',
  },
})
