import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'

export const sidebarCtaBox = defineType({
  name: 'sidebarCtaBox',
  title: 'Sidebar CTA',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Free Consultation CTA Box"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'header',
      title: 'Header',
      type: 'string',
      components: {input: TokenStringInput},
    },
    {
      name: 'supportingText1',
      title: 'Supporting Text 1',
      type: 'string',
      description: 'Short trust line shown below the header — e.g. "Calls Answered 24/7"',
      components: {input: TokenStringInput},
    },
    {
      name: 'supportingText2',
      title: 'Supporting Text 2',
      type: 'string',
      description: 'Second trust line shown above the phone number — e.g. "Toll Free"',
      components: {input: TokenStringInput},
    },
    {
      name: 'phoneNumber',
      title: 'Phone Number',
      type: 'string',
      description: 'Leave blank to pull from site settings / location document',
      components: {input: TokenStringInput},
    },
    {
      name: 'button',
      title: 'Button',
      type: 'ctaButton',
    },
    {
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Centered', value: 'centered'},
        ],
        layout: 'radio',
      },
      initialValue: 'left',
      validation: (Rule) => Rule.required().warning(),
    },
  ],
  preview: {
    select: {title: 'name', subtitle: 'header'},
    prepare({title, subtitle}) {
      return {
        title: title ?? 'Sidebar CTA',
        subtitle: `Sidebar CTA${subtitle ? ` — ${subtitle}` : ''}`,
      }
    },
  },
})
