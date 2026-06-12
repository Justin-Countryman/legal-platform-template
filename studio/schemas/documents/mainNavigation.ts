import {defineType} from 'sanity'
import {PageLinkInput} from '../../components/PageLinkInput'
import {PhoneTokenInput} from '../../components/PhoneTokenInput'
import {TokenStringInput} from '../../components/TokenStringInput'
import {AttorneyOrderInput} from '../../components/AttorneyOrderInput'
import {PracticeAreaOrderInput} from '../../components/PracticeAreaOrderInput'

export const mainNavigation = defineType({
  name: 'mainNavigation',
  title: 'Header Settings',
  type: 'document',
  fieldsets: [
    {
      name: 'layout',
      title: 'Layout & Behavior',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'topBar',
      title: 'Top Bar',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'phone',
      title: 'Phone',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'ctaButtons',
      title: 'CTA Buttons',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [

    // ─── Layout & Behavior ────────────────────────────────────────────────────
    {
      name: 'headerLayout',
      title: 'Desktop Header Layout',
      type: 'string',
      fieldset: 'layout',
      description: 'Choose the structural layout for the desktop header',
      options: {
        list: [
          {title: 'Ridge — logo left | single row | nav + CTA right', value: 'ridge'},
          {title: 'Apex — logo left | tagline + phone stacked top-right | nav + CTA bottom-right', value: 'apex'},
          {title: 'Ledge — logo left | tagline + phone inline top-right | nav + CTA bottom-right', value: 'ledge'},
          {title: 'Spire — logo left | phone + CTA stacked top-right | nav bottom-right', value: 'spire'},
          {title: 'Mesa — logo left | tagline + phone + CTA inline top-right | nav bottom-right', value: 'mesa'},
          {title: 'Prism — logo left | nav center | phone + CTA stacked right', value: 'prism'},
          {title: 'Crest — nav left | logo centered | phone + CTA right', value: 'crest'},
        ],
        layout: 'radio',
      },
      initialValue: 'apex',
    },
    {
      name: 'mobileLayout',
      title: 'Mobile Header Layout',
      type: 'string',
      fieldset: 'layout',
      description: 'Choose the mobile header style. Action bar variants use the CTA button and phone fields — configure those in the Phone and CTA Buttons sections.',
      options: {
        list: [
          {title: 'Standard — logo left, hamburger menu right (single row)', value: 'standard'},
          {title: 'Action Bar Top — Menu · Email · Call strip above a centered logo', value: 'bar-top'},
          {title: 'Action Bar Bottom — centered logo above the Menu · Email · Call strip', value: 'bar-bottom'},
          {title: 'Phone Split — logo row, then phone number left + menu button right', value: 'phone-split'},
          {title: 'Logo Split — logo + menu button on top, phone number below', value: 'logo-split'},
        ],
        layout: 'radio',
      },
      initialValue: 'standard',
    },
    {
      name: 'defaultScheme',
      title: 'Default Color Scheme',
      type: 'string',
      fieldset: 'layout',
      description: 'Header appearance on page load before the user scrolls',
      options: {
        list: [
          {title: 'Light — white background, dark text and logo', value: 'light'},
          {title: 'Dark — dark background, white text and logo', value: 'dark'},
          {title: 'Transparent Light — no background, dark text (hero merge with light background)', value: 'transparent-light'},
          {title: 'Transparent Dark — no background, white text (hero merge with dark/image background)', value: 'transparent-dark'},
        ],
        layout: 'radio',
      },
      initialValue: 'light',
    },
    {
      name: 'heroMerge',
      title: 'Hero Merge',
      type: 'boolean',
      fieldset: 'layout',
      description: 'When enabled the header sits on top of the hero image — the hero background bleeds through the header. The hero section must be the first section on the page for this to work correctly. Requires Sticky on Scroll to be enabled.',
      initialValue: false,
      validation: (Rule) => Rule.custom((value, context) => {
        if (value === true && !(context.document as Record<string, unknown>)?.sticky) {
          return 'Hero Merge requires Sticky on Scroll to be enabled'
        }
        return true
      }).error(),
    },
    {
      name: 'sticky',
      title: 'Sticky on Scroll',
      type: 'boolean',
      fieldset: 'layout',
      description: 'When enabled the header follows the user as they scroll down the page. Must be enabled when using Hero Merge.',
      initialValue: true,
    },
    {
      name: 'scrolledScheme',
      title: 'Scroll Color Scheme',
      type: 'string',
      fieldset: 'layout',
      description: 'Header appearance after the user scrolls past the trigger point. Only applies when Sticky is enabled.',
      hidden: ({document}) => !document?.sticky && !document?.heroMerge,
      options: {
        list: [
          {title: 'Light — white background, dark text and logo', value: 'light'},
          {title: 'Dark — dark background, white text and logo', value: 'dark'},
          {title: 'Glass Light — white tint with blur, white text', value: 'glass'},
          {title: 'Glass Dark — dark tint with blur, white text', value: 'glass-dark'},
        ],
        layout: 'radio',
      },
      initialValue: 'light',
    },
    {
      name: 'stickyHideSupplementary',
      title: 'Compact on Scroll',
      type: 'boolean',
      fieldset: 'layout',
      description: 'When enabled the phone number row and top bar collapse on scroll, leaving just the logo, navigation, and primary CTA visible. Requires Sticky to be enabled.',
      hidden: ({document}) => !document?.sticky && !document?.heroMerge,
      initialValue: true,
      validation: (Rule) => Rule.custom((value, context) => {
        if (value === true && !(context.document as Record<string, unknown>)?.sticky) {
          return 'Compact on Scroll has no effect unless Sticky on Scroll is enabled'
        }
        return true
      }).warning(),
    },
    {
      name: 'compactStyle',
      title: 'Compact Style',
      type: 'string',
      fieldset: 'layout',
      description: 'How the compact header appears when scrolled. Floating lifts the header off the top edge with a gap and rounded corners — pairs well with Glass color schemes.',
      hidden: ({document}) => !document?.sticky && !document?.heroMerge,
      options: {
        list: [
          {title: 'Docked — full width, flush to top edge', value: 'docked'},
          {title: 'Floating — inset from edges with rounded pill', value: 'float'},
        ],
        layout: 'radio',
      },
      initialValue: 'docked',
    },

    // ─── Top Bar ──────────────────────────────────────────────────────────────
    {
      name: 'topBarDesktop',
      title: 'Show Top Bar on Desktop',
      type: 'boolean',
      fieldset: 'topBar',
      description: 'Display the thin strip above the main header on desktop. Always collapses first when the user scrolls. The right-side message is desktop-only.',
      initialValue: false,
    },
    {
      name: 'topBarMobile',
      title: 'Show Top Bar on Mobile',
      type: 'boolean',
      fieldset: 'topBar',
      description: 'Display the top bar on mobile. Only the left-side message shows on mobile (the right-side content is desktop-only). Controlled independently from desktop.',
      initialValue: false,
    },
    {
      name: 'topBarPinSide',
      title: 'Top Bar — Location Pin Icon',
      type: 'string',
      fieldset: 'topBar',
      description: 'Show a location pin icon next to the left or right content, or hide it',
      options: {
        list: [
          {title: 'None — no pin icon', value: 'none'},
          {title: 'Left — pin appears next to left content', value: 'left'},
          {title: 'Right — pin appears next to right content', value: 'right'},
        ],
        layout: 'radio',
      },
      initialValue: 'none',
    },
    {
      name: 'topBarLeft',
      title: 'Top Bar — Left Content',
      type: 'string',
      fieldset: 'topBar',
      description: 'Text shown on the left side of the top bar — e.g. "Serving Minneapolis, St. Paul & Surrounding Areas"',
      components: {input: TokenStringInput},
    },
    {
      name: 'topBarRight',
      title: 'Top Bar — Right Content',
      type: 'string',
      fieldset: 'topBar',
      description: 'Text shown on the right side of the top bar — e.g. "Call (612) 825-3567 for a free consultation". Desktop only — hidden on mobile.',
      components: {input: TokenStringInput},
    },
    {
      name: 'topBarStyle',
      title: 'Top Bar Color Style',
      type: 'string',
      fieldset: 'topBar',
      description: 'Background color for the top bar strip',
      options: {
        list: [
          {title: 'Brand Primary', value: 'primary'},
          {title: 'Brand Secondary', value: 'secondary'},
          {title: 'Dark', value: 'dark'},
        ],
        layout: 'radio',
      },
      initialValue: 'primary',
    },

    // ─── Phone ────────────────────────────────────────────────────────────────
    {
      name: 'headerPhoneTagline',
      title: 'Phone Tagline',
      type: 'string',
      fieldset: 'phone',
      description: 'Text shown before the phone number — e.g. "Call for a free consultation"',
      initialValue: 'Call for a free consultation',
    },
    {
      name: 'headerPhone',
      title: 'Primary Phone Number',
      type: 'string',
      fieldset: 'phone',
      description: 'Select a shortcode to pull from the location record, or type a number directly.',
      components: {input: PhoneTokenInput},
    },
    {
      name: 'headerPhone2',
      title: 'Secondary Phone Number',
      type: 'string',
      fieldset: 'phone',
      description: 'Optional second number (e.g. toll-free). Displays stacked below the primary number. Leave blank to hide.',
      components: {input: PhoneTokenInput},
    },

    // ─── CTA Buttons ─────────────────────────────────────────────────────────
    {
      name: 'headerCtaLabel',
      title: 'Button 1 — Label',
      type: 'string',
      fieldset: 'ctaButtons',
      description: 'e.g. "Free Consultation"',
      initialValue: 'Free Consultation',
    },
    {
      name: 'headerCtaUrl',
      title: 'Button 1 — URL',
      type: 'string',
      fieldset: 'ctaButtons',
      description: 'Page the button links to — typically the contact page',
      components: {input: PageLinkInput},
      initialValue: '/contact/',
    },
    {
      name: 'headerCtaLabel2',
      title: 'Button 2 — Label',
      type: 'string',
      fieldset: 'ctaButtons',
      description: 'Optional second button — e.g. "Make a Payment"',
    },
    {
      name: 'headerCtaUrl2',
      title: 'Button 2 — URL',
      type: 'string',
      fieldset: 'ctaButtons',
      description: 'Leave blank to hide the second button',
      components: {input: PageLinkInput},
    },

    // ─── Navigation Items ─────────────────────────────────────────────────────
    {
      name: 'items',
      title: 'Navigation Items',
      type: 'array',
      validation: (Rule) => Rule.min(1).warning('Add at least one nav item'),
      of: [

        // ─── Standard Nav Link ───────────────────────────────────────────────
        {
          type: 'object',
          name: 'navItemStandard',
          title: 'Nav Link',
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
              description: 'Leave blank if this item is a dropdown parent only',
              components: {input: PageLinkInput},
            },
            {
              name: 'children',
              title: 'Sub-menu Items',
              type: 'array',
              description: 'Optional — adds a dropdown for this nav item',
              of: [
                {
                  type: 'object',
                  name: 'navSubItem',
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
          ],
          preview: {
            select: {title: 'label', subtitle: 'href'},
            prepare({title, subtitle}: {title?: string; subtitle?: string}) {
              return {
                title: title ?? 'Nav Link',
                subtitle: subtitle ?? '(dropdown parent)',
              }
            },
          },
        },

        // ─── Attorneys Dropdown ──────────────────────────────────────────────
        {
          type: 'object',
          name: 'navItemAttorneys',
          title: 'Attorneys Dropdown',
          fields: [
            {
              name: 'label',
              title: 'Label',
              type: 'string',
              initialValue: 'Our Attorneys',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'href',
              title: 'URL',
              type: 'string',
              description: 'Link for the top-level item — typically the attorney index page',
              components: {input: PageLinkInput},
            },
            {
              name: 'attorneyOrder',
              title: 'Attorney Order',
              type: 'array',
              description: 'Click "+ Add All Attorneys" to populate, then drag to reorder. Leave empty to sort alphabetically.',
              components: {input: AttorneyOrderInput},
              of: [{type: 'reference', to: [{type: 'attorneyPage'}]}],
            },
          ],
          preview: {
            select: {title: 'label', subtitle: 'href'},
            prepare({title, subtitle}: {title?: string; subtitle?: string}) {
              return {title: title ?? 'Attorneys Dropdown', subtitle: subtitle ?? ''}
            },
          },
        },

        // ─── Practice Areas Dropdown ─────────────────────────────────────────
        {
          type: 'object',
          name: 'navItemPracticeAreas',
          title: 'Practice Areas Dropdown',
          fields: [
            {
              name: 'label',
              title: 'Label',
              type: 'string',
              initialValue: 'Practice Areas',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'href',
              title: 'URL',
              type: 'string',
              description: 'Link for the top-level item — typically a practice areas index page',
              components: {input: PageLinkInput},
            },
            {
              name: 'displayMode',
              title: 'Navigation Style',
              type: 'string',
              options: {
                list: [
                  {title: 'Parent pages only', value: 'flat'},
                  {title: 'Parent + child pages — indented list', value: 'hierarchy'},
                ],
                layout: 'radio',
              },
              initialValue: 'flat',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'practiceAreaOrder',
              title: 'Practice Area Order',
              type: 'array',
              description: 'Click "+ Add All Practice Areas" to populate, then drag to reorder. Leave empty to sort alphabetically.',
              components: {input: PracticeAreaOrderInput},
              of: [{type: 'reference', to: [{type: 'practiceArea'}]}],
            },
          ],
          preview: {
            select: {title: 'label', subtitle: 'href'},
            prepare({title, subtitle}: {title?: string; subtitle?: string}) {
              return {title: title ?? 'Practice Areas Dropdown', subtitle: subtitle ?? ''}
            },
          },
        },

      ],
    },
  ],

  preview: {
    prepare() {
      return {title: 'Header Settings'}
    },
  },
})
