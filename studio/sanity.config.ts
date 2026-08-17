import {createClient} from '@sanity/client'
import {createMockAuthStore, defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'
import {structure} from './structure'

// ─── The offline schema-extraction switch ───────────────────────────────────
//
// `sanity schema extract` reads nothing but the local schema files, yet it
// cannot run without one network round trip: resolving this config builds an
// auth store, and that store's `getCurrentUser` bootstrap hits /users/me before
// the schema is ever touched. Against a project that does not exist the call
// fails, the follow-up /ping succeeds, and the CLI throws CorsOriginError and
// writes nothing. The template ships a scrubbed sentinel projectId, so that is
// every run of it here.
//
// The cost of that was a CI job that could not fail: monorepo OUTSTANDING item
// 165 — extraction died before writing, the freshness step then diffed the
// untouched committed file against itself, and the job reported green on drift
// it had never looked at. `ogTitle` and `ogDescription` were stale on 22
// document types while it did so.
//
// The fix is to supply the auth store rather than to reach a project. Sanity
// exports `createMockAuthStore` for exactly this — it emits one resolved state
// and makes no request — so extraction runs fully offline, needs no project id,
// real or borrowed, and cannot regress when someone deletes a throwaway project
// (which has already happened once: OUTSTANDING item 22).
//
// Gated on an env var so it touches nothing a client's Studio does. The
// SANITY_STUDIO_ prefix is load-bearing: Sanity's bundlers statically replace
// only that prefix, and a bare process.env read would survive into the browser
// build. Set by the typegen-freshness CI job and by `npm run typegen:offline`.
//
// PROVEN, not reasoned: the schema this path extracts is byte-identical to the
// committed schema.json that the authenticated procedure produced, and it
// extracts with HTTP_PROXY pointed at a closed port.
const OFFLINE_SCHEMA_EXTRACT = process.env.SANITY_STUDIO_OFFLINE_SCHEMA_EXTRACT === '1'

// Singletons that should never be deleted
const PROTECTED_TYPES = [
  'siteSettings',
  'designSettings',
  'mainNavigation',
  'footerSettings',
  'heroSettings',
  'globalCta',
  'homePage',
  'blogIndex',
  'attorneyIndex',
  'staffIndex',
  'eventIndex',
  'videoIndex',
]

export default defineConfig({
  name: 'TEMPLATE_CLIENT_SLUG',
  title: 'TEMPLATE_CLIENT_NAME',

  projectId: 'TEMPLATE_SANITY_PROJECT_ID',
  // Vite reads SANITY_STUDIO_* env vars at build/run time. Default to
  // production so unconfigured local installs keep working; set
  // SANITY_STUDIO_DATASET=staging in a sanity.cli env profile or an
  // env file when a non-prod dataset exists.
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  // Offline extraction only. The client is never used to make a request — the
  // mock store hands it straight back — but it must be a real client, because
  // resolveConfig derives every source client from this one. It carries its own
  // placeholder id rather than the config's, since the sentinel above fails
  // @sanity/client's projectId format validator.
  ...(OFFLINE_SCHEMA_EXTRACT
    ? {
        auth: createMockAuthStore({
          client: createClient({
            projectId: 'offline-schema-extract',
            dataset: 'production',
            apiVersion: '2021-06-07',
            useCdn: false,
          }),
          currentUser: null,
        }),
      }
    : {}),

  plugins: [
    structureTool({structure}),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, {schemaType}) => {
      if (PROTECTED_TYPES.includes(schemaType)) {
        // Remove delete from protected singletons
        return prev.filter((action) => action.action !== 'delete')
      }
      // Move delete to the top of the overflow list so it's easy to find
      const deleteAction = prev.find((action) => action.action === 'delete')
      const rest = prev.filter((action) => action.action !== 'delete')
      return deleteAction ? [...rest, deleteAction] : rest
    },
  },
})
