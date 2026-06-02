import {defineType} from 'sanity'
import {PageLinkInput} from '../../components/PageLinkInput'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'

// Site Settings
// Operational configuration — firm identity, location, forms, scripts, reviews
// Visual identity lives in Design Settings

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    // ─── Firm Identity ────────────────────────────────────────────────────────
    {
      name: 'firmName',
      title: 'Firm Name — Full',
      type: 'string',
      description: 'Legal name including LLC, Ltd., etc. — used in footer, schema markup, legal lines',
      initialValue: '',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'firmNameShort',
      title: 'Firm Name — Short',
      type: 'string',
      description: 'Natural name without entity suffix — used in body content, headings, CTAs',
      initialValue: '',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'primaryDomain',
      title: 'Primary Domain',
      type: 'string',
      description: 'No https:// — e.g. yourfirm.com',
      initialValue: '',
      validation: (Rule) => Rule.required().warning(),
    },

    // ─── Location & Locale ────────────────────────────────────────────────────
    {
      name: 'primaryLocation',
      title: 'Primary Location Record',
      type: 'reference',
      to: [{type: 'location'}],
      description: 'Powers default phone number site-wide, footer address, and Organization schema',
    },
    {
      name: 'timezone',
      title: 'Timezone',
      type: 'string',
      description: 'IANA timezone for the firm — drives hours, dates, and schema output.',
      options: {
        list: [
          {title: 'Eastern Time — New York (ET)', value: 'America/New_York'},
          {title: 'Central Time — Chicago (CT)', value: 'America/Chicago'},
          {title: 'Mountain Time — Denver (MT)', value: 'America/Denver'},
          {title: 'Mountain Time — Phoenix, Arizona (no DST)', value: 'America/Phoenix'},
          {title: 'Pacific Time — Los Angeles (PT)', value: 'America/Los_Angeles'},
          {title: 'Alaska Time — Anchorage (AKT)', value: 'America/Anchorage'},
          {title: 'Hawaii–Aleutian Time — Honolulu (no DST)', value: 'Pacific/Honolulu'},
        ],
      },
      initialValue: 'America/Chicago',
    },
    {
      name: 'languageCode',
      title: 'Language Code',
      type: 'string',
      initialValue: 'en',
    },

    // ─── Legal Pages ──────────────────────────────────────────────────────────
    {
      name: 'privacyPolicyUrl',
      title: 'Privacy Policy URL',
      type: 'string',
      components: {input: PageLinkInput},
      description: 'e.g. /privacy-policy/',
      initialValue: '/privacy-policy/',
    },
    {
      name: 'disclaimerUrl',
      title: 'Legal Disclaimer URL',
      type: 'string',
      components: {input: PageLinkInput},
      description: 'e.g. /disclaimer/',
      initialValue: '/disclaimer/',
    },
    {
      name: 'cookiesUrl',
      title: 'Cookie Policy URL',
      type: 'string',
      components: {input: PageLinkInput},
      description: 'Optional — most law firm sites do not have a cookie policy',
    },

    // ─── Cookie Consent ───────────────────────────────────────────────────────
    {
      name: 'cookieBannerText',
      title: 'Cookie Banner Text',
      type: 'text',
      rows: 2,
      description: 'Customizable consent banner message',
      components: {input: TokenTextInput},
      initialValue: 'We use cookies to improve your experience. You can opt out at any time.',
    },

    // ─── Scripts ──────────────────────────────────────────────────────────────
    {
      name: 'scriptsNoConsent',
      title: 'Scripts — No Consent Required',
      type: 'text',
      rows: 5,
      description: 'Always renders — e.g. GSC verification, Bing verification',
    },
    {
      name: 'scriptsRequireConsent',
      title: 'Scripts — Require Consent',
      type: 'text',
      rows: 5,
      description: 'Loads immediately (opt-out model) but blocked if user opts out — e.g. GA4, Facebook Pixel, GTM, live chat',
    },
  ],

  preview: {
    prepare() {
      return {title: 'Site Settings'}
    },
  },
})
