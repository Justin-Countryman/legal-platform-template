import {defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'
import {ContentTokenInput} from '../../components/ContentTokenInput'

// Maps static token keys to display labels for the editor badge.
// Location tokens (location.{id}.phone / .address) are parsed dynamically.
const STATIC_LABELS: Record<string, string> = {
  firmName: 'Firm Name (Full)',
  firmNameShort: 'Firm Name (Short)',
  primaryPhone: 'Primary Phone',
  primaryTollFree: 'Primary Toll-Free Phone',
}

function tokenKeyToLabel(key: string | undefined): string {
  if (!key) return 'Token'
  if (STATIC_LABELS[key]) return STATIC_LABELS[key]
  if (key.startsWith('location.')) {
    const parts = key.split('.')
    const field = parts[2]
    if (field === 'phone')    return 'Phone'
    if (field === 'fax')      return 'Fax'
    if (field === 'address')  return 'Address (Full)'
    if (field === 'address1') return 'Address Line 1'
    if (field === 'address2') return 'Address Line 2'
    if (field === 'address3') return 'Address Line 3'
    if (field === 'city')     return 'City'
    if (field === 'state')    return 'State'
    if (field === 'zip')      return 'ZIP'
    return 'Location'
  }
  return key
}

export const contentToken = defineType({
  name: 'contentToken',
  title: 'NAP Shortcode',
  type: 'object',
  icon: TagIcon,
  fields: [
    {
      name: 'tokenKey',
      title: 'Token',
      type: 'string',
      components: {input: ContentTokenInput},
      validation: (Rule) => Rule.required().warning(),
    },
  ],
  preview: {
    select: {title: 'tokenKey'},
    prepare({title}) {
      return {
        title: tokenKeyToLabel(title),
        subtitle: title,
      }
    },
  },
})
