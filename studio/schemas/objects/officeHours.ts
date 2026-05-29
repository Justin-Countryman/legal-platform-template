import {defineType} from 'sanity'
import {ClockIcon} from '@sanity/icons'

// Office Hours block — a body-content insert (like an image) that renders the
// weekly hours grid for the page's linked location at view time. Insert it from
// the "+" menu inside blockContent. It stores no hours itself; the site pulls
// them live from the location record so the grid never drifts from Studio edits.
export const officeHours = defineType({
  name: 'officeHours',
  title: 'Office Hours',
  type: 'object',
  icon: ClockIcon,
  fields: [
    {
      name: 'title',
      title: 'Heading (optional)',
      type: 'string',
      description: 'Optional heading shown above the hours grid, e.g. "Office Hours". Leave blank to render just the grid.',
    },
  ],
  preview: {
    select: {title: 'title'},
    prepare({title}) {
      return {
        title: title || 'Office Hours',
        subtitle: 'Live weekly hours from the linked location',
      }
    },
  },
})
