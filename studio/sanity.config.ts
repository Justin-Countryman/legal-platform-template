import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'
import {structure} from './structure'

// Singletons that should never be deleted
const PROTECTED_TYPES = [
  'siteSettings',
  'designSettings',
  'mainNavigation',
  'footerSettings',
  'heroSettings',
  'globalCta',
  'redirects',
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
