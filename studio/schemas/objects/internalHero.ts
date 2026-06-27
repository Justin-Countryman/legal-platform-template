import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'
import {heroImageField} from './heroSurfaceFields'

export const internalHero = defineType({
  name: 'internalHero',
  title: 'Internal Hero',
  type: 'object',
  options: {collapsible: true, collapsed: true},
  fields: [
    {
      name: 'heading',
      title: 'Heading (H1)',
      type: 'string',
      description: 'Required when hero is used — this becomes the H1',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      components: {input: TokenTextInput},
    },
    {
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      of: [{type: 'ctaButton'}],
    },
    {
      name: 'schemeOverride',
      title: 'Background Scheme',
      type: 'string',
      description: 'Override the site default background scheme for this page (applies only when no background image is shown).',
      options: {
        list: [
          {title: 'Inherit site default', value: 'inherit'},
          {title: 'Dark — brand color, white text', value: 'dark'},
          {title: 'Light — neutral tint, dark text', value: 'light'},
        ],
        layout: 'radio',
      },
      initialValue: 'inherit',
    },
    heroImageField({
      name: 'backgroundImage',
      title: 'Background Image',
      description: 'Upload to override the site default background image on this page (uses a dark scrim, white text). Leave empty to inherit the site default.',
      altLabel: 'hero background image',
      fit: {
        description: 'Cover fills the band (cropped). Tile repeats the image as a pattern.',
        coverTitle: 'Cover — fill the band',
        tileTitle: 'Tile — repeat as a pattern',
      },
    }),
    {
      name: 'backgroundNone',
      title: 'No background image on this page',
      type: 'boolean',
      description: 'Force a plain background even if the site has a default image. Ignored when you upload your own image above.',
      initialValue: false,
    },
    {
      name: 'scrimOpacityOverride',
      title: 'Scrim Opacity Override',
      type: 'number',
      description: 'Optional. Override the site default scrim strength (0–100) over the background image for this page. Leave empty to inherit.',
      validation: (Rule) => Rule.min(0).max(100),
    },
    heroImageField({
      name: 'foregroundImage',
      title: 'Foreground Image',
      description: 'Upload to override the site default foreground subject on this page (shown bottom-right, full color above the scrim, hidden on mobile). Leave empty to inherit the site default.',
      altLabel: 'hero foreground image',
    }),
    {
      name: 'foregroundNone',
      title: 'No foreground image on this page',
      type: 'boolean',
      description: 'Force no foreground even if the site has a default. Ignored when you upload your own image above.',
      initialValue: false,
    },
  ],
  preview: {
    select: {title: 'heading'},
    prepare({title}) {
      return {title: title ?? 'Internal Hero'}
    },
  },
})
