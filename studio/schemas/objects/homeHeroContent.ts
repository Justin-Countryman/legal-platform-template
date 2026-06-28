import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'

// ─── Homepage Hero — Content ──────────────────────────────────────────────────
// The homepage hero's editorial CONTENT (the unique hero on `/`). Its design +
// layout live in Hero Settings (heroSettings.homepageHero, object `homeHeroDesign`)
// — one editing surface for hero design alongside the internal-hero defaults. The
// page renders by merging this content with that design at fetch time.
export const homeHeroContent = defineType({
  name: 'homeHeroContent',
  title: 'Homepage Hero',
  type: 'object',
  options: {collapsible: true, collapsed: false},
  fields: [
    defineField({name: 'eyebrow', title: 'Eyebrow / Tagline', type: 'string', components: {input: TokenStringInput}, description: 'Optional small label above the headline.'}),
    defineField({name: 'heading', title: 'Heading (H1)', type: 'string', components: {input: TokenStringInput}, validation: (Rule) => Rule.required().warning()}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 3, components: {input: TokenTextInput}}),
    defineField({name: 'buttons', title: 'Buttons', type: 'array', of: [{type: 'ctaButton'}]}),
  ],
  preview: {
    select: {title: 'heading'},
    prepare({title}) {
      return {title: title ?? 'Homepage Hero', subtitle: 'Content — design lives in Hero Settings → Homepage Hero'}
    },
  },
})
