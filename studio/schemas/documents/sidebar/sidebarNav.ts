import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

export const sidebarNav = defineType({
  name: 'sidebarNav',
  title: 'Sidebar Nav',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Family Law Nav" or "About Section Nav"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'header',
      title: 'Header',
      type: 'string',
      components: {input: TokenStringInput},
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      components: {input: TokenTextInput},
    },
    {
      name: 'mode',
      title: 'Navigation Mode',
      type: 'string',
      options: {
        list: [
          {title: 'Practice Areas — context-aware AOL hierarchy (no setup required)', value: 'practiceArea'},
          {title: 'Geo Practice Area — context-aware geo-targeted AOL hierarchy (no setup required)', value: 'geoPracticeArea'},
          {title: 'Custom Links — manually selected pages', value: 'custom'},
          {title: 'Recent Blog Posts — auto-generated', value: 'recentPosts'},
          {title: 'FAQ Blog Posts — auto-generated', value: 'faqPosts'},
        ],
        layout: 'radio',
      },
      initialValue: 'practiceArea',
      validation: (Rule) => Rule.required().warning(),
    },
    // ─── Practice Areas mode ──────────────────────────────────────────────────
    // No field needed — the front end derives the primary AOL from the visitor's
    // pathname at render time and projects the full firm-wide AOL tree from
    // GROQ (see SIDEBAR_FRAGMENT in lib/sanity/queries.ts and BI-Sidebar.md §1).
    // Pre-Phase-2.3 schema had a `practiceArea` reference field here; dropped
    // post-Phase-2.5 cleanup. Existing documents that previously set the field
    // retain orphan data (Sanity preserves unknown-field values); the renderer
    // ignores it.
    // ─── Geo Practice Area mode ───────────────────────────────────────────────
    // No field needed — same context-aware behavior as `practiceArea` mode:
    // the front end derives the primary AOL from the visitor's pathname and
    // projects the full firm-wide AOL tree from GROQ. Both modes share the
    // same `areasOfLaw` projection (the schema distinction lives only in the
    // mode enum for editor intent). Pre-Phase-2.3 schema had a
    // `geoPracticeArea` reference field here; dropped in the WS-Sidebar
    // workstream-close cleanup. Existing documents that previously set the
    // field retain orphan data (Sanity preserves unknown-field values); the
    // renderer ignores it.
    // ─── Blog Posts mode ─────────────────────────────────────────────────────
    {
      name: 'postCount',
      title: 'Number of Posts',
      type: 'number',
      description: 'How many posts to display in the sidebar',
      initialValue: 5,
      hidden: ({document}) => !['recentPosts', 'faqPosts'].includes((document?.mode as string | undefined) ?? ''),
      validation: (Rule) => Rule.min(1).max(20).integer().warning(),
    },
    // ─── Custom Links mode ────────────────────────────────────────────────────
    {
      name: 'links',
      title: 'Links',
      type: 'array',
      description: 'Manually select the pages to show in this nav',
      hidden: ({document}) => document?.mode !== 'custom',
      validation: (Rule) =>
        Rule.custom<unknown[]>((value, context) => {
          if (context.document?.mode === 'custom' && (!value || value.length === 0)) {
            return {message: 'Select at least one link', level: 'warning' as const}
          }
          return true
        }),
      of: [
        {
          type: 'reference',
          to: [
            {type: 'practiceArea'},
            {type: 'geoPracticeArea'},
            {type: 'generalPage'},
            {type: 'aboutPage'},
            {type: 'contactPage'},
            {type: 'faqPage'},
            {type: 'locationPage'},
            {type: 'serviceAreaPage'},
            {type: 'landingPage'},
            {type: 'reviewPage'},
            {type: 'blogPost'},
          ],
        },
      ],
    },
  ],
  preview: {
    select: {title: 'name', subtitle: 'mode'},
    prepare({title, subtitle}) {
      const labels: Record<string, string> = {
        practiceArea: 'Practice Areas',
        geoPracticeArea: 'Geo Practice Area',
        custom: 'Custom Links',
        recentPosts: 'Recent Posts',
        faqPosts: 'FAQ Posts',
      }
      const modeLabel = subtitle ? labels[subtitle] : ''
      return {
        title: title ?? 'Sidebar Nav',
        subtitle: `Sidebar Nav${modeLabel ? ` — ${modeLabel}` : ''}`,
      }
    },
  },
})
