import {defineType} from 'sanity'
import {PageLinkInput} from '../../components/PageLinkInput'
import {TokenStringInput} from '../../components/TokenStringInput'

export const footerSettings = defineType({
  name: 'footerSettings',
  title: 'Footer Settings',
  type: 'document',
  fieldsets: [
    {name: 'cta', title: 'Contact CTA', options: {collapsible: true, collapsed: false}},
    {name: 'layout', title: 'Layout', options: {collapsible: true, collapsed: false}},
    {name: 'form', title: 'Form', options: {collapsible: true, collapsed: true}},
    {name: 'actionButtons', title: 'Action Buttons', options: {collapsible: true, collapsed: true}},
    {name: 'navigation', title: 'Footer Navigation', options: {collapsible: true, collapsed: true}},
    {name: 'social', title: 'Social Media', options: {collapsible: true, collapsed: true}},
  ],
  fields: [
    // ─── Contact CTA ──────────────────────────────────────────────────────────
    {
      name: 'ctaText',
      title: 'Contact CTA Text',
      type: 'string',
      fieldset: 'cta',
      description: 'Headline shown in the footer contact section — e.g. "Schedule a Free Consultation"',
      components: {input: TokenStringInput},
      initialValue: 'Schedule a Free Consultation',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'ctaUrl',
      title: 'Contact CTA URL',
      type: 'string',
      fieldset: 'cta',
      description: 'Relative path the CTA button links to — e.g. /contact/',
      components: {input: PageLinkInput},
      initialValue: '/',
      validation: (Rule) => Rule.required().warning(),
    },

    // ─── Layout ───────────────────────────────────────────────────────────────
    {
      name: 'footerLayout',
      title: 'Footer Layout',
      type: 'string',
      fieldset: 'layout',
      description: 'Choose the visual layout for the site footer',
      options: {
        list: [
          {title: 'Anchor — Single location', value: 'anchor'},
          {title: 'Crest — Single location', value: 'crest'},
          {title: 'Pillar — Single location', value: 'pillar'},
          {title: 'Meridian — Single location', value: 'meridian'},
          {title: 'Districts — Multiple locations (card grid)', value: 'districts'},
          {title: 'Switchboard — Multiple locations (tabbed office selector)', value: 'switchboard'},
          {title: 'Beacon (Form) — Single location', value: 'beacon'},
        ],
        layout: 'radio',
      },
      initialValue: 'anchor',
    },
    {
      name: 'footerScheme',
      title: 'Footer Color Scheme',
      type: 'string',
      fieldset: 'layout',
      description: 'Dark (brand background, light text) or Light (neutral background, dark text). Applies to every footer layout.',
      options: {
        list: [
          {title: 'Dark', value: 'dark'},
          {title: 'Light', value: 'light'},
        ],
        layout: 'radio',
      },
      initialValue: 'dark',
    },

    // ─── Form ─────────────────────────────────────────────────────────────────
    {
      name: 'form',
      title: 'Form',
      type: 'reference',
      to: [{type: 'siteForm'}],
      fieldset: 'form',
      description: 'Select the form to display in footer layouts that include a contact form',
    },

    // ─── Action Buttons ───────────────────────────────────────────────────────
    {
      name: 'actionButton1Label',
      title: 'Action Button 1 Label',
      type: 'string',
      fieldset: 'actionButtons',
      description: 'e.g. "Review Us"',
      components: {input: TokenStringInput},
    },
    {
      name: 'actionButton1Url',
      title: 'Action Button 1 URL',
      type: 'string',
      fieldset: 'actionButtons',
      description: 'Leave blank to hide the button',
      components: {input: PageLinkInput},
    },
    {
      name: 'actionButton2Label',
      title: 'Action Button 2 Label',
      type: 'string',
      fieldset: 'actionButtons',
      description: 'e.g. "Make a Payment"',
      components: {input: TokenStringInput},
    },
    {
      name: 'actionButton2Url',
      title: 'Action Button 2 URL',
      type: 'string',
      fieldset: 'actionButtons',
      description: 'Leave blank to hide the button',
      components: {input: PageLinkInput},
    },

    // ─── Footer Navigation ─────────────────────────────────────────────────────
    {
      name: 'column1',
      title: 'Footer Nav — Column 1',
      type: 'array',
      fieldset: 'navigation',
      of: [
        {
          type: 'object',
          name: 'footerLink',
          fields: [
            {
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'href',
              title: 'URL',
              type: 'string',
              components: {input: PageLinkInput},
              validation: (Rule) => Rule.required().warning(),
            },
          ],
          preview: {
            select: {title: 'label', subtitle: 'href'},
          },
        },
      ],
    },
    {
      name: 'column2',
      title: 'Footer Nav — Column 2',
      type: 'array',
      fieldset: 'navigation',
      of: [
        {
          type: 'object',
          name: 'footerLink',
          fields: [
            {
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'href',
              title: 'URL',
              type: 'string',
              components: {input: PageLinkInput},
              validation: (Rule) => Rule.required().warning(),
            },
          ],
          preview: {
            select: {title: 'label', subtitle: 'href'},
          },
        },
      ],
    },

    // ─── Social Media ─────────────────────────────────────────────────────────
    {
      name: 'facebookUrl',
      title: 'Facebook URL',
      type: 'url',
      fieldset: 'social',
    },
    {
      name: 'instagramUrl',
      title: 'Instagram URL',
      type: 'url',
      fieldset: 'social',
    },
    {
      name: 'twitterUrl',
      title: 'X (Twitter) URL',
      type: 'url',
      fieldset: 'social',
    },
    {
      name: 'linkedInUrl',
      title: 'LinkedIn URL',
      type: 'url',
      fieldset: 'social',
    },
    {
      name: 'youTubeUrl',
      title: 'YouTube URL',
      type: 'url',
      fieldset: 'social',
    },
    {
      name: 'avvoUrl',
      title: 'Avvo URL (firm)',
      type: 'url',
      fieldset: 'social',
      description: 'Firm-level Avvo profile. Surfaced in Organization JSON-LD `sameAs`; attorney-level Avvo profiles live on attorneyPage.',
    },
    {
      name: 'justiaUrl',
      title: 'Justia URL (firm)',
      type: 'url',
      fieldset: 'social',
      description: 'Firm-level Justia profile. Surfaced in Organization JSON-LD `sameAs`; attorney-level Justia profiles live on attorneyPage.',
    },

  ],

  preview: {
    prepare() {
      return {title: 'Footer Settings'}
    },
  },
})
