import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'TEMPLATE_SANITY_PROJECT_ID',
    // Env-driven for multi-env workflows (staging dataset, etc.); falls
    // back to production for unconfigured installs.
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  studioHost: 'TEMPLATE_CLIENT_SLUG',
})
