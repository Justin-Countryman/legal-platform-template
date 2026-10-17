import {defineType} from 'sanity'
import {buildTime} from '../buildTime'
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
    // The cookie banner (site/components/consent/ConsentBanner.tsx; monorepo
    // BI/rules/legal-pages.md). Until 2026-10-15 nothing rendered this text.
    {
      name: 'cookieBannerText',
      title: 'Cookie Banner Text',
      type: 'text',
      rows: 2,
      description:
        'The message in the cookie banner, beside Accept, Decline and a link to the privacy policy. The banner appears only when Scripts — Require Consent holds a script. Leave blank for the standard message.',
      components: {input: TokenTextInput},
      initialValue: 'We use analytics cookies to learn how visitors use this website. They stay off unless you accept.',
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
      // `buildTime`: three of the four crawler surfaces are fixed when the site
      // is built (item 240, the Studio half). See schemas/buildTime.ts.
      ...buildTime(
        'ON while a site is being built, and ON is what an unset value means — a site is hidden unless this is explicitly switched off. Turn it OFF at launch, when the live domain is attached. While ON: every page carries a noindex tag, every response carries a noindex header (so the sitemap, images and the social-share image are covered, not just pages), robots.txt disallows everything, and the sitemap is emitted empty.',
      ),
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
      // Corrected 2026-10-15: the help text said "Always renders"; nothing has
      // ever queried this field.
      description: 'Not shown on the website: nothing renders this field. Put the Search Console token in its own field above.',
    },
    {
      name: 'scriptsRequireConsent',
      title: 'Scripts — Require Consent',
      type: 'text',
      rows: 5,
      // Corrected 2026-10-15: the help text promised an opt-out that did not
      // exist, and the scripts loaded for every visitor.
      description:
        'Google Analytics 4 snippet only, pasted as Google gives it. It loads only after a visitor chooses Accept in the cookie banner, and never for a visitor who declines or whose browser sends Global Privacy Control. Advertising tags go in the Advertising fields below, never here. Any other script here does not run: the site’s security policy allows only the vendors it lists.',
      // An advertising tag pasted here would run as analytics, outside the advertising choice (monorepo
      // WS-AD-PIXELS-DESIGN-2026-10-15 §6); go-live refuses one in any pasted field. Warns, as every field rule does.
      validation: (Rule) =>
        Rule.custom((value) =>
          typeof value === 'string' && /fbevents|fbq\(|gtm\.js|GTM-|AW-\d|bat\.bing|uetq|snap\.licdn|lintrk|_linkedin_partner_id/.test(value)
            ? 'This looks like an advertising tag. Put its ID in the Advertising fields instead, so it runs only with the visitor’s advertising consent.'
            : true,
        ).warning(),
    },

    // ─── Advertising ──────────────────────────────────────────────────────────
    // Standard pixels by ID (monorepo WS-AD-PIXELS-DESIGN-2026-10-15; Justin 2026-10-15: "build a place for standard
    // pixels and connect to this functionality. clients will have it.", and on counting: "That is the role of pixel for
    // google ads etc. we don't need that"). The site renders each vendor's own base tag from the ID (site/lib/adPixels.ts)
    // on every page, only after a visitor accepts Advertising in the cookie banner, never on the hidden staging site, and
    // never on an address carrying something a visitor typed. What the firm counts is set in each vendor's own dashboard.
    // Each ID set is an advertising company the firm's privacy policy must name, and its lawyer must adopt that policy
    // before launch. The shapes are site/lib/outsideVendors.json's (`ids`), which site/lib/adIds.ts and the platform's
    // go-live check read (a field rule warns; the site uses nothing of the wrong shape).
    {
      name: 'metaPixelId',
      title: 'Advertising — Meta Pixel ID',
      type: 'string',
      description: 'The digits of the pixel ID from Meta Events Manager. In Events Manager, turn OFF Automatic Advanced Matching for this pixel, so it never reads a form.',
      validation: (Rule) => Rule.regex(/^\d{12,20}$/, {name: 'Meta Pixel ID'}).warning('A Meta Pixel ID is all digits, usually 15 or 16'),
    },
    {
      name: 'googleAdsId',
      title: 'Advertising — Google Ads tag ID',
      type: 'string',
      description: 'AW- and the digits (the Google tag for Google Ads). In Google Ads, leave Enhanced Conversions and its automatic detection of user-provided data OFF, so the tag never reads a form.',
      validation: (Rule) => Rule.regex(/^AW-\d{6,12}$/, {name: 'Google Ads tag ID'}).warning('A Google Ads tag ID is AW- and digits'),
    },
    {
      name: 'microsoftUetId',
      title: 'Advertising — Microsoft Advertising UET tag ID',
      type: 'string',
      description: 'The digits of the UET tag. In Microsoft Advertising, leave Enhanced Conversions OFF and the Clarity box CLEAR.',
      validation: (Rule) => Rule.regex(/^\d{4,12}$/, {name: 'UET tag ID'}).warning('A UET tag ID is all digits'),
    },
    {
      name: 'linkedInPartnerId',
      title: 'Advertising — LinkedIn Insight Tag partner ID',
      type: 'string',
      description: 'The digits of the partner ID from LinkedIn Campaign Manager. Turn OFF enhanced conversion tracking for the Insight Tag. LinkedIn’s tag also reads clicks and form submits on the page and cannot be told not to; it loads only with the visitor’s consent, and it cannot see inside the site’s Fillout forms.',
      validation: (Rule) => Rule.regex(/^\d{3,12}$/, {name: 'LinkedIn partner ID'}).warning('A LinkedIn partner ID is all digits'),
    },
    {
      name: 'doNotSellLink',
      title: 'Advertising — "Do Not Sell or Share" link',
      type: 'boolean',
      initialValue: false,
      description: 'Renames the footer’s Cookie settings link to "Do Not Sell or Share My Personal Information"; it opens the same choices. Turn it on only when the firm’s lawyer says the law requires the link (a firm covered by California’s privacy law, or one taking Connecticut residents’ sensitive details while it advertises). California’s other wording, "Your Privacy Choices", needs the state’s icon and a page for two rights, which this link is not, so it is not offered.',
    },
  ],

  preview: {
    prepare() {
      return {title: 'Site Settings'}
    },
  },
})
