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

    // ─── Results Disclaimer ───────────────────────────────────────────────────
    // Wording OVERRIDE only. The site renders a built-in default whenever this
    // is blank, so case results can never publish without a disclaimer — see
    // `site/lib/legal.ts` for why the default lives in code and not here.
    //
    // Deliberately NO initialValue. Pre-filling this would bake a copy of the
    // default into every new client's dataset, and a later compliance fix to
    // the constant would then silently fail to reach them — the stale-copy
    // version of the same failure the code constant exists to prevent. Blank
    // means "use the current standard text", which is what an operator who
    // has no jurisdiction-specific requirement actually wants. Studio cannot
    // import the constant from `site/` either: that cross-package import is
    // what breaks Sanity config load in CI (OUTSTANDING item 22).
    {
      name: 'resultsDisclaimer',
      title: 'Case Results Disclaimer',
      type: 'text',
      rows: 2,
      description:
        'Rendered automatically wherever case results appear — required by bar advertising rules. Leave blank to use the standard disclaimer; fill this in only if your jurisdiction requires different wording.',
      components: {input: TokenTextInput},
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

    // ─── Search visibility ────────────────────────────────────────────────────
    // Ruled 2026-07-25 (Justin). Doctrine: BI-URL-Architecture.md → Search
    // visibility. This replaces the hand-edit pattern (a `robots` block in
    // app/layout.tsx plus an X-Robots-Tag in next.config.ts) that used to hide
    // a site: hiding is an operator setting now, never a code change.
    //
    // `initialValue` below is UI sugar for a Studio-created document ONLY. It
    // is NOT what makes a built site hidden — Site Build writes siteSettings
    // create-only and initialValue never fires for a tool-created document. The
    // real guarantee is fail-closed on the read side: only an explicit `false`
    // makes a site visible. See site/lib/searchVisibility.ts.
    {
      name: 'hideFromSearch',
      title: 'Hide this site from search engines',
      type: 'boolean',
      initialValue: true,
      description:
        'ON while a site is being built, and ON is what an unset value means — a site is hidden unless this is explicitly switched off. Turn it OFF at launch, when the live domain is attached. While ON: every page carries a noindex tag, every response carries a noindex header (so the sitemap, images and the social-share image are covered, not just pages), robots.txt disallows everything, and the sitemap is emitted empty.',
    },

    // ─── Scripts ──────────────────────────────────────────────────────────────
    {
      name: 'gscVerification',
      title: 'Google Search Console Verification Token',
      type: 'string',
      description: 'Token only (the content value of the google-site-verification meta tag, not the full tag). Rendered server-side into <head> so Search Console can verify — its crawler does not run JavaScript.',
    },
    {
      name: 'scriptsNoConsent',
      title: 'Scripts — No Consent Required',
      type: 'text',
      rows: 5,
      description: 'Always renders — e.g. Bing verification, other non-tracking tags',
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
