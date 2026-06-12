'use client'

import {useCallback, useId, useRef, useState, type KeyboardEvent} from 'react'
import Link from 'next/link'
import {MdChevronRight, MdClose} from 'react-icons/md'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {Button} from '@/components/ui/Button'
import {ButtonGroup} from '@/components/ui/ButtonGroup'
import {CardLink} from '@/components/ui/CardLink'
import {Chip} from '@/components/ui/Chip'
import {DialogPanel} from '@/components/ui/DialogPanel'
import {FormField} from '@/components/ui/FormField'
import {IconButton} from '@/components/ui/IconButton'
import {Input} from '@/components/ui/Input'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {Select} from '@/components/ui/Select'
import {Tagline} from '@/components/ui/Tagline'
import {TertiaryArrow} from '@/components/ui/TertiaryArrow'
import {InternalHero, type InternalHeroData} from '@/components/layout/InternalHero'
import {ApexHeader} from '@/components/layout/headers/ApexHeader'
import {CrestHeader} from '@/components/layout/headers/CrestHeader'
import {LedgeHeader} from '@/components/layout/headers/LedgeHeader'
import {MesaHeader} from '@/components/layout/headers/MesaHeader'
import {PrismHeader} from '@/components/layout/headers/PrismHeader'
import {RidgeHeader} from '@/components/layout/headers/RidgeHeader'
import {SpireHeader} from '@/components/layout/headers/SpireHeader'
import {TopBar, type HeaderData, type NavItem} from '@/components/layout/headers/shared'
import {AnchorFooter} from '@/components/layout/footers/AnchorFooter'
import {BeaconFooter} from '@/components/layout/footers/BeaconFooter'
import {CrestFooter} from '@/components/layout/footers/CrestFooter'
import {DistrictsFooter} from '@/components/layout/footers/DistrictsFooter'
import {SwitchboardFooter} from '@/components/layout/footers/SwitchboardFooter'
import {MeridianFooter} from '@/components/layout/footers/MeridianFooter'
import {PillarFooter} from '@/components/layout/footers/PillarFooter'
import {type FooterData} from '@/components/layout/Footer'
import {ContentSidebarLayout} from '@/components/layout/ContentSidebarLayout'
import {MobileDrawer} from '@/components/layout/headers/shared'
import {Sidebar, type SidebarComponent} from '@/components/layout/Sidebar'
import {SidebarDesignSettingsProvider} from '@/lib/sidebarDesignSettingsContext'
import {ClassicSidebarLayout} from '@/components/attorney/layouts/ClassicSidebarLayout'
import {FeatureGridLayout} from '@/components/attorney/layouts/FeatureGridLayout'
import {PremiumHorizontalLayout} from '@/components/attorney/layouts/PremiumHorizontalLayout'
import {SplitHeroLayout} from '@/components/attorney/layouts/SplitHeroLayout'
import {type Attorney} from '@/components/attorney/types'
import {HeroSchemeProvider} from '@/lib/heroSchemeContext'
import {AttorneySectionBlock, type AttorneySectionBlockData} from '@/components/sections/AttorneySectionBlock'
import {BadgesSectionBlock, type BadgesSectionBlockData} from '@/components/sections/BadgesSectionBlock'
import {CtaSectionBlock, type CtaSectionBlockData} from '@/components/sections/CtaSectionBlock'
import {FaqSectionBlock, type FaqSectionBlockData} from '@/components/sections/FaqSectionBlock'
import {FeaturedTestimonialSection, type FeaturedTestimonialSectionData} from '@/components/sections/FeaturedTestimonialSection'
import {GlobalCta, type GlobalCtaData} from '@/components/sections/GlobalCta'
import {ReviewsSectionBlock, type ReviewsSectionBlockData} from '@/components/sections/ReviewsSectionBlock'
import {TestimonialsGridSection, type TestimonialsGridSectionData} from '@/components/sections/TestimonialsGridSection'
import {VideoSectionBlock, type VideoSectionBlockData} from '@/components/sections/VideoSectionBlock'
import {type TestimonialData} from '@/components/ui/TestimonialCard'
import {
  CalendarIcon, ClockIcon, MapPinIcon,
  PhoneIcon, MailIcon, VideoIcon,
  LinkIcon, UsersIcon, BookmarkIcon,
} from '@/components/ui/icons'
import {TAGLINE_STYLE_MAP, type TaglineStyle, MARKETING_SCALE_MAP, MOTION_TEMPO_MAP, STRUCTURAL_DURATIONS, UI_RADIUS_MAP, BUTTON_SHAPE_MAP, ELEVATION_STYLE_MAP} from '@/lib/designTokens'
import {FONT_PRESETS} from '@/fonts/presets'

// ─── Section helpers (shared by tab panels) ───────────────────────────────────

function Heading({children}: {children: React.ReactNode}) {
  return <h2 className="mb-2 text-xl font-semibold text-foreground">{children}</h2>
}

function Subheading({children}: {children: React.ReactNode}) {
  return <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-foreground-muted">{children}</h3>
}

function Note({children}: {children: React.ReactNode}) {
  return <p className="mb-6 text-sm text-foreground-muted">{children}</p>
}

function LightSurface({children}: {children: React.ReactNode}) {
  return (
    <div className="rounded-ui border border-border bg-background p-6">
      {children}
    </div>
  )
}

function DarkSurface({children}: {children: React.ReactNode}) {
  return (
    <div data-ring-context="dark" className="rounded-ui bg-brand-dark p-6">
      {children}
    </div>
  )
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId =
  | 'foundation'
  | 'typography'
  | 'buttons'
  | 'atoms'
  | 'molecules'
  | 'organisms'
  | 'layouts'

type TabDef = {
  id: TabId
  label: string
}

// Tab order: atomic-design progression — design tokens → text rendering →
// canonical primitive (Button) → other atoms → compositions → section blocks →
// page-frame structures.
const TABS: readonly TabDef[] = [
  {id: 'foundation', label: 'Foundation'},
  {id: 'typography', label: 'Typography'},
  {id: 'buttons',    label: 'Buttons'},
  {id: 'atoms',      label: 'Atoms'},
  {id: 'molecules',  label: 'Molecules'},
  {id: 'organisms',  label: 'Organisms'},
  {id: 'layouts',    label: 'Layouts'},
] as const

// Chip icon names + plausible labels for the icon-grid preview (Step 4).
const CHIP_DEMOS: ReadonlyArray<{
  icon: 'calendar' | 'clock' | 'map-pin' | 'phone' | 'mail' | 'video' | 'link' | 'users' | 'bookmark'
  label: string
}> = [
  {icon: 'calendar', label: 'March 15, 2026'},
  {icon: 'clock', label: '10:00 AM'},
  {icon: 'map-pin', label: 'Minneapolis, MN'},
  {icon: 'phone', label: '(763) 560-5700'},
  {icon: 'mail', label: 'info@example.com'},
  {icon: 'video', label: 'Virtual Event'},
  {icon: 'link', label: 'Related'},
  {icon: 'users', label: 'Workshop'},
  {icon: 'bookmark', label: 'Estate Planning'},
]

// ─── Tab panel content ────────────────────────────────────────────────────────

// ─── Placeholder panels (WS11 scaffolding) ──────────────────────────────────
//
// Each of these renders a single placeholder section pointing at the
// WS-Atomic-Reorg commit that populates it. They land in WS11 Commit 1 so
// the 7-tab structure is testable in isolation before content lands.

function TypographyPanel() {
  return (
    <section className="mb-12">
      <Heading>Typography</Heading>
      <Note>
        Two independent decisions per client. <code>fontPairingPreset</code> applies
        site-wide (heading + body pair). <code>marketingScale</code> is opt-in and
        applies only to homepage and landing-page headlines (internal pages use
        standard sizing regardless). Internal H1s use the fixed{' '}
        <code>.text-page-h1</code> scale. Tagline typography (decorative eyebrow
        above headings) lives in the final section of this tab.
      </Note>

      {/* ── Active font pairing samples ─────────────────────────────────── */}
      <Subheading>Font pairing — active client</Subheading>
      <Note>
        Heading + body fonts emitted by <code>buildFontCSS()</code> at runtime via{' '}
        <code>--dynamic-font-heading</code> and <code>--dynamic-font-body</code>. The
        active preset comes from <code>designSettings.fontPairingPreset</code>; if a
        custom upload is configured instead it overrides via the same CSS variable
        chain. Tailwind utilities <code>font-heading</code> and <code>font-body</code>{' '}
        read these variables — no hardcoded font-family in components.
      </Note>

      <LightSurface>
        <h1 className="font-heading text-3xl font-bold text-foreground">Heading typography sample (font-heading)</h1>
        <h2 className="mt-4 font-heading text-2xl font-semibold text-foreground">Subheading rendered with font-heading</h2>
        <p className="mt-4 font-body text-base text-foreground">
          Body copy uses <code>font-body</code>. The body font carries readability across
          long-form prose — case studies, blog posts, legal substance pages. The heading
          font carries authority across H1-H4 marketing positions and internal page titles.
        </p>
        <p className="mt-2 font-body text-sm text-foreground-muted">
          Smaller body copy at 14px — supporting text, captions, metadata.
        </p>
      </LightSurface>

      <p className="mt-3 text-xs text-foreground-muted">
        16 presets are defined in <code>fonts/presets.ts</code> and surfaced as a numeric
        dropdown via <code>designSettings.fontPairingPreset</code>. WOFF2 files are
        self-hosted in <code>site/public/fonts/files/&lt;slug&gt;/</code> — no Google
        Fonts CDN at runtime. The catalog grid below renders every preset using its
        own committed woff2 files so editors can compare without changing settings.
        Ids 3 and 8 are intentionally vacant (culled in WS-Polish). See{' '}
        <code>skill-typography → Decision 1 — Font pairing</code> for the full doctrine.
      </p>

      {/* ── Preset catalog (all 16 presets rendered with their own fonts) ───
          @font-face declarations for every preset font are emitted in a single
          <style> block scoped to this panel, so each preview cell renders in
          the actual preset typeface. Same provenance as buildFontCSS() at
          runtime — these are the same /fonts/files/<slug>/ woff2 URLs. ── */}
      <div className="mt-12">
        <Subheading>Preset catalog (all 16)</Subheading>
        <Note>
          Every preset rendered in its actual heading and body fonts. Use this grid to
          compare candidates before selecting <code>fontPairingPreset</code> in Design
          Settings. Ids 3 and 8 are intentionally absent (culled in the WS-Polish
          audit close); ids 14&ndash;18 were added in the same workstream.
        </Note>

        <style dangerouslySetInnerHTML={{
          __html: (() => {
            // Dedupe @font-face declarations by family+src so duplicate fonts across
            // presets (e.g. Open Sans appears in 4 presets) emit only once.
            const seen = new Set<string>()
            const lines: string[] = []
            for (const p of FONT_PRESETS) {
              for (const role of [p.heading, p.body] as const) {
                const regularKey = `${role.family}|${role.files.regular}|400|normal`
                if (!seen.has(regularKey)) {
                  seen.add(regularKey)
                  lines.push(`@font-face{font-family:'${role.family}';src:url('${role.files.regular}') format('woff2');font-weight:400;font-style:normal;font-display:swap;}`)
                }
                if ('bold' in role.files && role.files.bold) {
                  const k = `${role.family}|${role.files.bold}|700|normal`
                  if (!seen.has(k)) {
                    seen.add(k)
                    lines.push(`@font-face{font-family:'${role.family}';src:url('${role.files.bold}') format('woff2');font-weight:700;font-style:normal;font-display:swap;}`)
                  }
                }
              }
            }
            return lines.join('')
          })(),
        }} />

        <ul
          role="list"
          aria-label="Font pairing presets"
          className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FONT_PRESETS.map((p) => (
            <li key={p.id} className="rounded-ui border border-border bg-background p-5">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {p.id} &mdash; {p.name}
                </h4>
                <code className="text-[10px] text-foreground-subtle">id {p.id}</code>
              </div>
              <p
                className="mb-1 text-2xl font-bold text-foreground"
                style={{fontFamily: `'${p.heading.family}', Georgia, serif`}}
              >
                Heading sample
              </p>
              <p
                className="mb-3 text-sm text-foreground"
                style={{fontFamily: `'${p.body.family}', system-ui, sans-serif`}}
              >
                Body copy carries the reading load &mdash; the body font does most of
                the work across long-form prose.
              </p>
              <p className="text-xs text-foreground-muted">
                <span className="font-semibold">Tone:</span> {p.tone}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                <span className="font-semibold">Best for:</span> {p.bestFor}
              </p>
              <p className="mt-2 text-[10px] text-foreground-subtle">
                <code>{p.heading.family}</code> + <code>{p.body.family}</code>
                {p.heading.slug === p.body.slug && ' (mono-pair)'}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Marketing scale catalog (sourced from canonical map) ─────── */}
      <div className="mt-12">
        <Subheading>Marketing scale catalog (homepage + landingPage only)</Subheading>
        <Note>
          <code>marketingScale</code> drives the <code>marketing-h1..h4</code> clamp
          utilities&rsquo; desktop ceilings on homepage and landing-page headlines.
          Internal pages use <code>.text-page-h1</code> and standard Tailwind sizing
          regardless. The catalog below sources its desktop ceilings from{' '}
          <code>MARKETING_SCALE_MAP</code> in <code>lib/designTokens.ts</code> — the
          same map <code>buildDesignTokenCSS</code> reads from{' '}
          <code>designSettings.marketingScale</code>. Mobile floor is locked across
          all presets at <code>text-3xl</code> (1.875rem / 30px); fluid scaling via{' '}
          <code>clamp()</code> interpolates from mobile floor to per-preset ceiling.
        </Note>

        <LightSurface>
          <div className="space-y-8">
            {/* default — no --marketing-* override; clamp falls back to standard ceilings */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                default — standard internal-page sizing (no preset)
              </p>
              <h1 className="marketing-h1 font-heading font-bold text-foreground">
                Marketing H1 at default scale
              </h1>
              <p className="mt-1 text-xs text-foreground-muted">
                Desktop ceiling: <code>3.5rem</code> (matches <code>.text-page-h1</code> lg
                breakpoint — homepage renders identically to internal pages typographically)
              </p>
            </div>

            {(['sm', 'md', 'lg'] as const).map(key => {
              const ceilings = MARKETING_SCALE_MAP[key]
              if (!ceilings) return null
              const labels: Record<typeof key, string> = {
                sm: 'sm — Perfect Fourth (1.333) — restrained but clearly marketing',
                md: 'md — Augmented Fourth (1.414) — classic bold marketing',
                lg: 'lg — Golden Ratio (1.618) — dramatic, hero-driven (capped at 8rem)',
              }
              const styleVars = {
                '--marketing-h1': ceilings.h1,
                '--marketing-h2': ceilings.h2,
                '--marketing-h3': ceilings.h3,
                '--marketing-h4': ceilings.h4,
              } as React.CSSProperties
              return (
                <div key={key} style={styleVars}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                    {labels[key]}
                  </p>
                  <h1 className="marketing-h1 font-heading font-bold text-foreground">
                    Marketing H1 at {key} scale
                  </h1>
                  <p className="mt-1 text-xs text-foreground-muted">
                    Desktop ceiling: <code>{ceilings.h1}</code>
                  </p>
                </div>
              )
            })}
          </div>
        </LightSurface>
      </div>

      {/* ── Internal page H1 ─────────────────────────────────────────── */}
      <div className="mt-12">
        <Subheading>Internal page H1 (text-page-h1)</Subheading>
        <Note>
          Fixed three-breakpoint scale: <code>2rem</code> mobile →{' '}
          <code>2.5rem</code> md → <code>3.5rem</code> lg. Used for every internal
          page H1 (practice areas, attorneys, blog post detail, contact, etc.). The
          mobile floor is non-negotiable per <code>BI-PRINCIPLES.md → Mobile-first</code>
          {' '}and is enforced by the <code>platform/h1-mobile-cap</code> ESLint rule.
        </Note>

        <LightSurface>
          <h1 className="text-page-h1 font-heading font-bold text-foreground">
            Internal page heading sample
          </h1>
          <p className="mt-2 font-body text-base text-foreground-muted">
            Body copy below the H1 demonstrates the typographic hierarchy editors see
            on practice-area, attorney, and blog-post pages.
          </p>
        </LightSurface>
      </div>

      {/* ── HTML element catalog (Marketing | Standard) ─────────────── */}
      <div className="mt-12">
        <Subheading>HTML element catalog</Subheading>
        <Note>
          Every text element the platform renders, shown side-by-side at marketing-tier
          sizing (homepage + landing page only) and standard-tier sizing (every other
          internal page). The marketing tier renders <code>h1-h4</code> via the
          {' '}<code>marketing-h1..h4</code> clamp utilities, which fluid-scale from a
          locked mobile floor up to per-preset desktop ceilings sourced from{' '}
          <code>MARKETING_SCALE_MAP</code>. <code>h5-h6</code> have no marketing
          variant and use standard sizing on both tiers.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* ── Marketing column ──────────────────────────────────────── */}
          <div>
            <Subheading>Marketing tier</Subheading>
            <LightSurface>
              <div className="space-y-6">

                {/* Headings */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h1</code> · <code>.marketing-h1</code></p>
                  <h1 className="marketing-h1 font-heading font-bold text-foreground">
                    Marketing H1 heading
                  </h1>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h2</code> · <code>.marketing-h2</code></p>
                  <h2 className="marketing-h2 font-heading font-bold text-foreground">
                    Marketing H2 heading
                  </h2>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h3</code> · <code>.marketing-h3</code></p>
                  <h3 className="marketing-h3 font-heading font-semibold text-foreground">
                    Marketing H3 heading
                  </h3>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h4</code> · <code>.marketing-h4</code></p>
                  <h4 className="marketing-h4 font-heading font-semibold text-foreground">
                    Marketing H4 heading
                  </h4>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h5</code> · <code>text-lg font-semibold</code> (no marketing variant)</p>
                  <h5 className="text-lg font-semibold font-heading text-foreground">
                    Marketing H5 heading
                  </h5>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h6</code> · <code>text-base font-semibold uppercase tracking-wider</code></p>
                  <h6 className="text-base font-semibold font-heading uppercase tracking-wider text-foreground-muted">
                    Marketing H6 heading
                  </h6>
                </div>

                {/* Paragraph with inline marks */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>p</code> with inline <code>strong</code>, <code>em</code>, <code>code</code></p>
                  <p className="font-body text-base text-foreground">
                    Body copy carries the bulk of marketing content. Use{' '}
                    <strong>strong</strong> for emphasis that matters semantically,{' '}
                    <em>em</em> for stress emphasis, and <code>code</code> for technical
                    references like file paths or tokens. All three inline marks
                    inherit the surrounding font-body and cascade-aware color.
                  </p>
                </div>

                {/* Blockquote */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>blockquote</code> · border-l + pl-4 + italic</p>
                  <blockquote className="border-l-4 border-accent pl-4 italic font-body text-base text-foreground">
                    A well-positioned blockquote earns its weight by being short, by being
                    earned by what comes before it, and by leaving the reader with one
                    line they can carry away.
                    <footer className="mt-2 text-sm not-italic text-foreground-muted">— Editorial convention</footer>
                  </blockquote>
                </div>

                {/* Unordered list */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>ul</code> · list-disc list-outside</p>
                  <ul className="list-disc list-outside ml-5 space-y-1 font-body text-base text-foreground">
                    <li>Estate planning that protects your family</li>
                    <li>Family law guidance from initial consultation through resolution</li>
                    <li>Business law for closely-held companies and startups</li>
                    <li>Probate and trust administration with deliberate care</li>
                  </ul>
                </div>

                {/* Ordered list */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>ol</code> · list-decimal list-outside</p>
                  <ol className="list-decimal list-outside ml-5 space-y-1 font-body text-base text-foreground">
                    <li>Schedule an initial consultation at no charge</li>
                    <li>Discuss your goals, constraints, and timeline</li>
                    <li>Receive a written plan with fees and expected outcomes</li>
                  </ol>
                </div>

                {/* Definition list */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>dl</code> · definition list (office-hours pattern)</p>
                  <dl className="font-body text-base text-foreground">
                    <dt className="font-semibold">Office Hours</dt>
                    <dd className="mt-1 text-foreground-muted">Monday – Friday, 8:30 AM – 5:30 PM</dd>
                  </dl>
                </div>

                {/* Links */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted">Links — internal · external · tertiary</p>
                  <ul className="list-none space-y-2 font-body text-base">
                    <li>
                      <Link href="/about/" className="text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover">
                        Internal link to the about page
                      </Link>
                    </li>
                    <li>
                      <a href="https://example.com/" target="_blank" rel="noopener noreferrer" className="text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover">
                        External link (opens in new tab)
                      </a>
                    </li>
                    <li>
                      <Link href="/contact/" className="text-action-text font-medium transition-colors duration-ui-fast hover:text-action-hover">
                        Tertiary CTA link with action-text accent →
                      </Link>
                    </li>
                  </ul>
                </div>

              </div>
            </LightSurface>
          </div>

          {/* ── Standard column ───────────────────────────────────────── */}
          <div>
            <Subheading>Standard tier</Subheading>
            <LightSurface>
              <div className="space-y-6">

                {/* Headings */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h1</code> · <code>.text-page-h1</code></p>
                  <h1 className="text-page-h1 font-heading font-bold text-foreground">
                    Standard H1 heading
                  </h1>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h2</code> · <code>text-3xl md:text-4xl</code></p>
                  <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
                    Standard H2 heading
                  </h2>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h3</code> · <code>text-xl md:text-2xl</code></p>
                  <h3 className="text-xl md:text-2xl font-heading font-semibold text-foreground">
                    Standard H3 heading
                  </h3>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h4</code> · <code>text-lg md:text-xl</code></p>
                  <h4 className="text-lg md:text-xl font-heading font-semibold text-foreground">
                    Standard H4 heading
                  </h4>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h5</code> · <code>text-base font-semibold</code></p>
                  <h5 className="text-base font-semibold font-heading text-foreground">
                    Standard H5 heading
                  </h5>
                </div>
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>h6</code> · <code>text-sm font-semibold uppercase tracking-wider</code></p>
                  <h6 className="text-sm font-semibold font-heading uppercase tracking-wider text-foreground-muted">
                    Standard H6 heading
                  </h6>
                </div>

                {/* Paragraph with inline marks */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>p</code> with inline <code>strong</code>, <code>em</code>, <code>code</code></p>
                  <p className="font-body text-base text-foreground">
                    Body copy carries the bulk of marketing content. Use{' '}
                    <strong>strong</strong> for emphasis that matters semantically,{' '}
                    <em>em</em> for stress emphasis, and <code>code</code> for technical
                    references like file paths or tokens. All three inline marks
                    inherit the surrounding font-body and cascade-aware color.
                  </p>
                </div>

                {/* Blockquote */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>blockquote</code> · border-l + pl-4 + italic</p>
                  <blockquote className="border-l-4 border-accent pl-4 italic font-body text-base text-foreground">
                    A well-positioned blockquote earns its weight by being short, by being
                    earned by what comes before it, and by leaving the reader with one
                    line they can carry away.
                    <footer className="mt-2 text-sm not-italic text-foreground-muted">— Editorial convention</footer>
                  </blockquote>
                </div>

                {/* Unordered list */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>ul</code> · list-disc list-outside</p>
                  <ul className="list-disc list-outside ml-5 space-y-1 font-body text-base text-foreground">
                    <li>Estate planning that protects your family</li>
                    <li>Family law guidance from initial consultation through resolution</li>
                    <li>Business law for closely-held companies and startups</li>
                    <li>Probate and trust administration with deliberate care</li>
                  </ul>
                </div>

                {/* Ordered list */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>ol</code> · list-decimal list-outside</p>
                  <ol className="list-decimal list-outside ml-5 space-y-1 font-body text-base text-foreground">
                    <li>Schedule an initial consultation at no charge</li>
                    <li>Discuss your goals, constraints, and timeline</li>
                    <li>Receive a written plan with fees and expected outcomes</li>
                  </ol>
                </div>

                {/* Definition list */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted"><code>dl</code> · definition list (office-hours pattern)</p>
                  <dl className="font-body text-base text-foreground">
                    <dt className="font-semibold">Office Hours</dt>
                    <dd className="mt-1 text-foreground-muted">Monday – Friday, 8:30 AM – 5:30 PM</dd>
                  </dl>
                </div>

                {/* Links */}
                <div>
                  <p className="mb-1 text-xs text-foreground-muted">Links — internal · external · tertiary</p>
                  <ul className="list-none space-y-2 font-body text-base">
                    <li>
                      <Link href="/about/" className="text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover">
                        Internal link to the about page
                      </Link>
                    </li>
                    <li>
                      <a href="https://example.com/" target="_blank" rel="noopener noreferrer" className="text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover">
                        External link (opens in new tab)
                      </a>
                    </li>
                    <li>
                      <Link href="/contact/" className="text-action-text font-medium transition-colors duration-ui-fast hover:text-action-hover">
                        Tertiary CTA link with action-text accent →
                      </Link>
                    </li>
                  </ul>
                </div>

              </div>
            </LightSurface>
          </div>

        </div>
      </div>

      {/* ── Taglines (relocated from Small Elements in WS11 Commit 5) ── */}
      <div className="mt-12">
        <Subheading>Taglines</Subheading>
        <Note>
          Decorative typographic label above a heading. Driven by Sanity <code>taglineStyle</code>{' '}
          (<code>plain</code> / <code>lined</code> / <code>titlecase</code>). The <code>tagline</code>{' '}
          utility class can be applied to semantic elements (<code>h2</code>, <code>h3</code>, <code>dt</code>)
          for matching typography on real headings. The catalog below sources its CSS variables
          from <code>TAGLINE_STYLE_MAP</code> in <code>lib/designTokens.ts</code> — the same map{' '}
          <code>buildDesignTokenCSS</code> emits to <code>:root</code> from the active document
          setting — and renders each available style for side-by-side comparison.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col gap-8">
                {TAGLINE_STYLE_KEYS.map(key => {
                  const label = TAGLINE_STYLE_LABELS[key]
                  const style = TAGLINE_STYLE_MAP[key] as React.CSSProperties
                  return (
                    <div key={key} style={style}>
                      <VariantLabel>{label} — Tagline primitive + h2</VariantLabel>
                      <Tagline>Experienced</Tagline>
                      <h2 className="mt-2 text-2xl font-semibold text-foreground">Our Business Law Attorneys</h2>
                      <p className="mt-3 mb-1 text-xs text-foreground-muted">{label} — h2 with <code>tagline</code> utility class</p>
                      <h2 className="tagline">Section heading using utility class</h2>
                    </div>
                  )
                })}
              </div>
            </LightSurface>
          </div>

          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-col gap-8">
                {TAGLINE_STYLE_KEYS.map(key => {
                  const label = TAGLINE_STYLE_LABELS[key]
                  const style = TAGLINE_STYLE_MAP[key] as React.CSSProperties
                  return (
                    <div key={key} style={style}>
                      <VariantLabel>{label} — Tagline primitive + h2</VariantLabel>
                      <Tagline>Experienced</Tagline>
                      <h2 className="mt-2 text-2xl font-semibold text-foreground">Our Business Law Attorneys</h2>
                      <p className="mt-3 mb-1 text-xs text-foreground-muted">{label} — h2 with <code>tagline</code> utility class</p>
                      <h2 className="tagline">Section heading using utility class</h2>
                    </div>
                  )
                })}
              </div>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li><strong>Tagline primitive:</strong> section taglines above section h2s (CtaSection, FeaturedTestimonial, BadgesSection, etc.)</li>
          <li><strong>Tagline primitive:</strong> hero section labels above headings (NOT InternalHero — that&rsquo;s the page h1 only)</li>
          <li><strong>Tagline primitive:</strong> decorative-only labels with no semantic role</li>
          <li><strong>Utility class on h2/h3/dt:</strong> footer column titles (h3.tagline)</li>
          <li><strong>Utility class on h2/h3/dt:</strong> footer firm names (h2.tagline)</li>
          <li><strong>Utility class on h2/h3/dt:</strong> definition list terms (dt.tagline) — event detail, attorney &ldquo;Year Admitted to Bar&rdquo;</li>
          <li><strong>Utility class on h2/h3/dt:</strong> semantic headings that need eyebrow visual treatment</li>
        </UsedOn>
      </div>
    </section>
  )
}

// Small placeholder card for a primitive that doesn't have a Studio surface
// yet. Used in Atoms / Molecules / Organisms / Layouts tabs to enumerate
// every component the platform supports — the surface is visually complete
// even when most cells are stubs.
function StubCard({
  name,
  description,
  populates,
}: {
  name: string
  description: string
  populates: string
}) {
  return (
    <li className="rounded-ui border border-border bg-muted p-4">
      <p className="text-sm font-semibold text-foreground">{name}</p>
      <p className="mt-1 text-xs text-foreground-muted">{description}</p>
      <p className="mt-2 text-xs italic text-foreground-subtle">{populates}</p>
    </li>
  )
}

function AtomsPanel() {
  return (
    <>
      {/* ── Tags ─────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Tags</Heading>
        <Note>
          The canonical Tag pattern: <code>{'<Button variant="secondary" size="small" href="...">'}</code>.
          Interactive (renders <code>{'<a>'}</code>). Used for filters, categories, clickable taxonomy.
        </Note>
        <Note>
          <strong>Chevron usage (Rule 1):</strong> chevron present when the Tag is a directory entry or drill-in affordance; absent when the Tag is a label that happens to render as a Tag (click is utility, not the primary purpose). Practice area Tags on attorney profiles use the chevron — they&rsquo;re navigation. Blog category Tags on cards omit it — they&rsquo;re labels first.
        </Note>
        <Note>
          <strong>Tag vs Chip in mixed lists (Rule 2):</strong> when a list mixes linkable and non-linkable items, render linkable as Tag (filled pill, with chevron per Rule 1) and non-linkable as <code>{'<Chip>'}</code> (outlined with leading icon — see <em>Chips</em> section below). The visual distinction tells users at a glance which items are interactive.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col gap-6">
                <div>
                  <VariantLabel>Tag — clickable category (text only)</VariantLabel>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" size="small" href="#">Estate Planning</Button>
                    <Button variant="secondary" size="small" href="#">Family Law</Button>
                    <Button variant="secondary" size="small" href="#">Business Law</Button>
                  </div>
                </div>

                <div>
                  <VariantLabel>Tag with trailing chevron — affords drill-in</VariantLabel>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" size="small" href="#">
                      Estate Planning
                      <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                    </Button>
                    <Button variant="secondary" size="small" href="#">
                      Family Law
                      <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            </LightSurface>
          </div>

          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-col gap-6">
                <div>
                  <VariantLabel>Tag — clickable category (text only)</VariantLabel>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" context="dark" size="small" href="#">Estate Planning</Button>
                    <Button variant="secondary" context="dark" size="small" href="#">Family Law</Button>
                    <Button variant="secondary" context="dark" size="small" href="#">Business Law</Button>
                  </div>
                </div>

                <div>
                  <VariantLabel>Tag with trailing chevron — affords drill-in</VariantLabel>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" context="dark" size="small" href="#">
                      Estate Planning
                      <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                    </Button>
                    <Button variant="secondary" context="dark" size="small" href="#">
                      Family Law
                      <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>Blog cards — category Tag (links to <code>/blog/category/[slug]/</code>)</li>
          <li>Attorney profile pages — practice areas list (linkable Tags only; non-linkable areas render as Chips — see Chips section)</li>
          <li>Staff profile pages — practice areas list (same pattern as attorney)</li>
          <li>Any clickable category/filter context</li>
        </UsedOn>
      </section>

      {/* ── Chips ────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Chips</Heading>
        <Note>
          Decorative metadata with required leading icon. Renders <code>{'<span>'}</code> (non-interactive).
          Used for scannable categorical metadata.
        </Note>
        <Note>
          <strong>Companion to Tag in mixed lists:</strong> Chip is the canonical non-linkable counterpart to Tag. When PracticeAreaList (or any similar list) mixes interactive and non-interactive items, the non-interactive ones render as Chips so users can distinguish them at a glance. Linkable items in the same list render as Tags — see <em>Tags</em> section above.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-3">
                {CHIP_DEMOS.map(({icon, label}) => (
                  <Chip key={icon} icon={icon}>{label}</Chip>
                ))}
              </div>
            </LightSurface>
          </div>

          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-wrap items-center gap-3">
                {CHIP_DEMOS.map(({icon, label}) => (
                  <Chip key={icon} icon={icon}>{label}</Chip>
                ))}
              </div>
            </DarkSurface>
          </div>
        </div>

        <p className="mt-4 text-xs text-foreground-muted">
          Icons (left → right): calendar, clock, map-pin, phone, mail, video, link, users, bookmark.
        </p>

        <UsedOn>
          <li>Event cards — event type, location type, status (e.g. &ldquo;Past Event&rdquo;)</li>
          <li>Attorney/staff profile pages — practice area fallback when no slug (visually distinct from linkable Tag siblings)</li>
          <li>Other categorical decorative metadata</li>
        </UsedOn>
      </section>

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Input</Heading>
        <Note>
          Form text input primitive (<code>components/ui/Input.tsx</code>).
          Cascade-aware text + border + hover + focus-visible ring contract.
          Optional <code>leadingIcon</code> + <code>trailingSlot</code> slots.
          Renders <code>&lt;input&gt;</code> directly when both slots are
          unused; wraps in a relative <code>&lt;div&gt;</code> when either
          is present.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Default — placeholder + Tab here for focus ring</VariantLabel>
                  <Input placeholder="Search articles…" />
                </div>
                <div>
                  <VariantLabel>Leading icon variant — pl-10 auto applied</VariantLabel>
                  <Input
                    leadingIcon={<MapPinIcon className="size-4" />}
                    placeholder="Filter by city"
                  />
                </div>
                <div>
                  <VariantLabel>Disabled state — opacity-40 + cursor-not-allowed</VariantLabel>
                  <Input placeholder="Read-only field" disabled value="Sample Firm" readOnly />
                </div>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Default — cascade-aware text + ring-focus-on-dark</VariantLabel>
                  <Input placeholder="Search articles…" />
                </div>
                <div>
                  <VariantLabel>Leading icon variant</VariantLabel>
                  <Input
                    leadingIcon={<MapPinIcon className="size-4" />}
                    placeholder="Filter by city"
                  />
                </div>
                <div>
                  <VariantLabel>Disabled state</VariantLabel>
                  <Input placeholder="Read-only field" disabled value="Sample Firm" readOnly />
                </div>
              </div>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>Search inputs (blog index search, attorney directory filter)</li>
          <li>Form fields (consumed via <code>&lt;FormField&gt;</code> wrapper — see Molecules tab)</li>
          <li>Any standalone text-entry surface needing the cascade-aware ring-focus contract</li>
        </UsedOn>
      </section>

      {/* ── Select ─────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Select</Heading>
        <Note>
          Native <code>&lt;select&gt;</code> with platform tokens and an inline
          chevron (<code>components/ui/Select.tsx</code>). The chevron is
          decorative (<code>aria-hidden</code>); the native select widget
          remains the source of truth for assistive tech. Same surface
          contract as Input — cascade-aware text + border + hover + ring-focus.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Default — Tab here for focus ring</VariantLabel>
                  <Select defaultValue="">
                    <option value="" disabled>Select a practice area…</option>
                    <option value="estate-planning">Estate Planning</option>
                    <option value="family-law">Family Law</option>
                    <option value="business-law">Business Law</option>
                  </Select>
                </div>
                <div>
                  <VariantLabel>Disabled state</VariantLabel>
                  <Select disabled defaultValue="estate-planning">
                    <option value="estate-planning">Estate Planning</option>
                  </Select>
                </div>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Default — cascade-aware text + ring</VariantLabel>
                  <Select defaultValue="">
                    <option value="" disabled>Select a practice area…</option>
                    <option value="estate-planning">Estate Planning</option>
                    <option value="family-law">Family Law</option>
                    <option value="business-law">Business Law</option>
                  </Select>
                </div>
                <div>
                  <VariantLabel>Disabled state</VariantLabel>
                  <Select disabled defaultValue="estate-planning">
                    <option value="estate-planning">Estate Planning</option>
                  </Select>
                </div>
              </div>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>Practice-area filters on the attorney directory</li>
          <li>Location selectors on multi-office firms</li>
          <li>Form fields (consumed via <code>&lt;FormField&gt;</code>)</li>
        </UsedOn>
      </section>

      {/* ── IconButton ─────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>IconButton</Heading>
        <Note>
          Icon-only button primitive (<code>components/ui/IconButton.tsx</code>).
          Cascade-aware text color + hover wash + per-surface ring offset.
          Required <code>aria-label</code> for assistive tech (icon-only
          buttons have no visible text). Optional visible label rendered
          before the icon. 44×44 hit area locked per BI-PRINCIPLES.md →
          Touch targets.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Icon only — 44×44 hit area; Tab for ring</VariantLabel>
                  <div className="flex gap-3">
                    <IconButton
                      icon={<MdChevronRight aria-hidden="true" />}
                      aria-label="Next page"
                      surface="light"
                    />
                    <IconButton
                      icon={<MdClose aria-hidden="true" />}
                      aria-label="Close panel"
                      surface="light"
                    />
                  </div>
                </div>
                <div>
                  <VariantLabel>With visible label — h-11 + gap-1.5</VariantLabel>
                  <IconButton
                    icon={<MdClose aria-hidden="true" />}
                    aria-label="Close drawer"
                    surface="light"
                  >
                    Close
                  </IconButton>
                </div>
                <div>
                  <VariantLabel>Disabled state</VariantLabel>
                  <IconButton
                    icon={<MdChevronRight aria-hidden="true" />}
                    aria-label="Next page"
                    surface="light"
                    disabled
                  />
                </div>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Icon only — ring-offset-brand-dark on dark</VariantLabel>
                  <div className="flex gap-3">
                    <IconButton
                      icon={<MdChevronRight aria-hidden="true" />}
                      aria-label="Next page"
                      surface="dark"
                    />
                    <IconButton
                      icon={<MdClose aria-hidden="true" />}
                      aria-label="Close panel"
                      surface="dark"
                    />
                  </div>
                </div>
                <div>
                  <VariantLabel>With visible label</VariantLabel>
                  <IconButton
                    icon={<MdClose aria-hidden="true" />}
                    aria-label="Close drawer"
                    surface="dark"
                  >
                    Close
                  </IconButton>
                </div>
                <div>
                  <VariantLabel>Disabled state</VariantLabel>
                  <IconButton
                    icon={<MdChevronRight aria-hidden="true" />}
                    aria-label="Next page"
                    surface="dark"
                    disabled
                  />
                </div>
              </div>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>Modal close buttons (FormModal, DialogPanel)</li>
          <li>Mobile drawer close button (MobileDrawer)</li>
          <li>FeedbackModal close button</li>
          <li>Any icon-only interactive control needing 44×44 hit area + cascade-aware ring</li>
        </UsedOn>
      </section>

      {/* ── Breadcrumbs ────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Breadcrumbs</Heading>
        <Note>
          Navigation primitive (<code>components/ui/Breadcrumbs.tsx</code>).
          Wrapped in <code>&lt;nav aria-label=&quot;Breadcrumb&quot;&gt;</code>
          landmark; current item carries <code>aria-current=&quot;page&quot;</code>;
          JSON-LD BreadcrumbList rendered into the DOM for search-engine
          consumption. Hidden on homePage and landingPage per BI-PRINCIPLES
          → SEO foundations. The <code>buildBreadcrumbs()</code> helper
          assembles the chain from a page&rsquo;s parent-page hierarchy.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <Breadcrumbs
                items={[
                  {label: 'Home',         href: '/'},
                  {label: 'Family Law',   href: '/family-law/'},
                  {label: 'Adoption',     href: '/family-law/adoption/'},
                ]}
                domain="example.com"
              />
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <Breadcrumbs
                items={[
                  {label: 'Home',         href: '/'},
                  {label: 'Family Law',   href: '/family-law/'},
                  {label: 'Adoption',     href: '/family-law/adoption/'},
                ]}
                domain="example.com"
              />
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>Every internal page (practice areas, attorneys, blog post detail, etc.) except homePage and landingPage</li>
          <li>Auto-generated from page slug + parentPage chain via <code>buildBreadcrumbs()</code> helper</li>
          <li>JSON-LD BreadcrumbList schema baked in for SEO</li>
        </UsedOn>
      </section>

      {/* ── TertiaryArrow ──────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>TertiaryArrow</Heading>
        <Note>
          Standard tertiary-CTA arrow (<code>components/ui/TertiaryArrow.tsx</code>).
          Color inherited from parent via <code>currentColor</code> — callers
          set the color via <code>text-*</code> utilities on the surrounding
          element. Nudge distance comes from{' '}
          <code>--tertiary-arrow-dx</code> (driven by{' '}
          <code>designSettings.tertiaryStyle</code>). Pair with a parent
          element carrying the <code>group</code> class so the arrow nudges
          on <code>group-hover</code>. The <code>position</code> prop is
          accepted for API symmetry with Button&rsquo;s <code>arrowPosition</code>;
          the glyph and nudge direction are identical regardless — placement
          around the label is the caller&rsquo;s responsibility.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Trailing arrow (default) — hover to nudge</VariantLabel>
                  <span className="group inline-flex cursor-default items-center gap-2 text-action-text">
                    View profile
                    <TertiaryArrow />
                  </span>
                </div>
                <div>
                  <VariantLabel>Leading position — same glyph, caller orders children</VariantLabel>
                  <span className="group inline-flex cursor-default items-center gap-2 text-action-text">
                    <TertiaryArrow position="leading" />
                    Back to articles
                  </span>
                </div>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Trailing arrow — text-action-text resolves to raw action on dark</VariantLabel>
                  <span className="group inline-flex cursor-default items-center gap-2 text-action-text">
                    View profile
                    <TertiaryArrow />
                  </span>
                </div>
                <div>
                  <VariantLabel>Leading position</VariantLabel>
                  <span className="group inline-flex cursor-default items-center gap-2 text-action-text">
                    <TertiaryArrow position="leading" />
                    Back to articles
                  </span>
                </div>
              </div>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>Button tertiary variant — Button.tsx composes TertiaryArrow internally per <code>arrowPosition</code></li>
          <li>CardLink decorative patterns (attorney/staff &ldquo;View profile&rdquo;, blog &ldquo;Read more&rdquo;)</li>
          <li>Sidebar nav rows when the entire row is a Link parent — see <code>skill-button-system</code> tertiary decision tree</li>
        </UsedOn>
      </section>

      {/* ── Icon registry ──────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Icon registry</Heading>
        <Note>
          Inline-SVG icon registry (<code>components/ui/icons/index.tsx</code>).
          9 named exports — all 24×24 viewBox, <code>currentColor</code> stroke,
          <code> strokeWidth 1.5</code>, <code>aria-hidden</code> by default.
          Inherits color from parent via <code>currentColor</code> — same
          cascade pattern as TertiaryArrow. Sourced from Lucide (ISC license);
          ships inline (no external runtime dependency).
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <ul role="list" aria-label="Icon registry — light surface" className="grid grid-cols-3 gap-4 text-foreground">
                <li className="flex flex-col items-center gap-2"><CalendarIcon className="size-6" /><code className="text-xs text-foreground-muted">calendar</code></li>
                <li className="flex flex-col items-center gap-2"><ClockIcon    className="size-6" /><code className="text-xs text-foreground-muted">clock</code></li>
                <li className="flex flex-col items-center gap-2"><MapPinIcon   className="size-6" /><code className="text-xs text-foreground-muted">map-pin</code></li>
                <li className="flex flex-col items-center gap-2"><PhoneIcon    className="size-6" /><code className="text-xs text-foreground-muted">phone</code></li>
                <li className="flex flex-col items-center gap-2"><MailIcon     className="size-6" /><code className="text-xs text-foreground-muted">mail</code></li>
                <li className="flex flex-col items-center gap-2"><VideoIcon    className="size-6" /><code className="text-xs text-foreground-muted">video</code></li>
                <li className="flex flex-col items-center gap-2"><LinkIcon     className="size-6" /><code className="text-xs text-foreground-muted">link</code></li>
                <li className="flex flex-col items-center gap-2"><UsersIcon    className="size-6" /><code className="text-xs text-foreground-muted">users</code></li>
                <li className="flex flex-col items-center gap-2"><BookmarkIcon className="size-6" /><code className="text-xs text-foreground-muted">bookmark</code></li>
              </ul>
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <ul role="list" aria-label="Icon registry — dark surface" className="grid grid-cols-3 gap-4 text-foreground">
                <li className="flex flex-col items-center gap-2"><CalendarIcon className="size-6" /><code className="text-xs text-foreground-muted">calendar</code></li>
                <li className="flex flex-col items-center gap-2"><ClockIcon    className="size-6" /><code className="text-xs text-foreground-muted">clock</code></li>
                <li className="flex flex-col items-center gap-2"><MapPinIcon   className="size-6" /><code className="text-xs text-foreground-muted">map-pin</code></li>
                <li className="flex flex-col items-center gap-2"><PhoneIcon    className="size-6" /><code className="text-xs text-foreground-muted">phone</code></li>
                <li className="flex flex-col items-center gap-2"><MailIcon     className="size-6" /><code className="text-xs text-foreground-muted">mail</code></li>
                <li className="flex flex-col items-center gap-2"><VideoIcon    className="size-6" /><code className="text-xs text-foreground-muted">video</code></li>
                <li className="flex flex-col items-center gap-2"><LinkIcon     className="size-6" /><code className="text-xs text-foreground-muted">link</code></li>
                <li className="flex flex-col items-center gap-2"><UsersIcon    className="size-6" /><code className="text-xs text-foreground-muted">users</code></li>
                <li className="flex flex-col items-center gap-2"><BookmarkIcon className="size-6" /><code className="text-xs text-foreground-muted">bookmark</code></li>
              </ul>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>Chip primitive — every Chip carries a leading icon from this registry</li>
          <li>Metadata patterns (Molecules tab) — read-time / date / address inline icons</li>
          <li>Any inline-flex span pairing an icon with body text via <code>currentColor</code></li>
        </UsedOn>
      </section>
    </>
  )
}

function MoleculesPanel() {
  return (
    <>
      {/* ── Tags + Chips in mixed list ───────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Tags + Chips in mixed list</Heading>
        <Note>
          Rule 2 visualization. A single list interleaves linkable items (rendered as Tag with trailing chevron — see <em>Tags</em> in the Atoms tab) and non-linkable items (rendered as <code>{'<Chip>'}</code> with leading icon — see <em>Chips</em> in the Atoms tab). The visual distinction — filled-pill-with-chevron vs outlined-pill-with-icon — tells users at a glance which items are interactive. Reference implementation: <code>components/ui/PracticeAreaList.tsx</code>, used on attorney and staff profile pages where some practice areas have a dedicated page (linkable Tag) and others are sub-specialties without one (non-linkable Chip).
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="small" href="#">
                  Family Law
                  <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                </Button>
                <Chip icon="bookmark">Adoption</Chip>
                <Button variant="secondary" size="small" href="#">
                  Estate Planning
                  <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                </Button>
                <Chip icon="bookmark">Special Needs Planning</Chip>
                <Button variant="secondary" size="small" href="#">
                  Business Law
                  <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                </Button>
              </div>
            </LightSurface>
          </div>

          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" context="dark" size="small" href="#">
                  Family Law
                  <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                </Button>
                <Chip icon="bookmark">Adoption</Chip>
                <Button variant="secondary" context="dark" size="small" href="#">
                  Estate Planning
                  <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                </Button>
                <Chip icon="bookmark">Special Needs Planning</Chip>
                <Button variant="secondary" context="dark" size="small" href="#">
                  Business Law
                  <MdChevronRight className="size-3 shrink-0" aria-hidden="true" />
                </Button>
              </div>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>Attorney profile pages — <code>PracticeAreaList</code> renders linkable practice areas (with <code>slug</code>) as Tags, non-linkable sub-specialties as Chips</li>
          <li>Staff profile pages — same pattern</li>
          <li>Any list rendering a collection of items with mixed interactivity (some links, some labels)</li>
        </UsedOn>
      </section>

      {/* ── Metadata ─────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Metadata</Heading>
        <Note>
          Plain text + icon pattern. The third pattern alongside Tag and Chip — for metadata that&rsquo;s neither
          categorical (Chip) nor interactive (Tag). Hand-rolled inline-flex span with leading icon.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Read-time — small text, clock icon</VariantLabel>
                  <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                    <ClockIcon className="size-3.5 text-accent" />
                    4 min read
                  </span>
                </div>

                <div>
                  <VariantLabel>Date and time — body text, calendar icon</VariantLabel>
                  <span className="inline-flex items-center gap-1.5 text-sm text-foreground-muted">
                    <CalendarIcon className="size-3.5 text-accent" />
                    Mar 15, 2026 · 2:00 PM
                  </span>
                </div>

                <div>
                  <VariantLabel>Address — body text, map-pin icon (multiline-safe)</VariantLabel>
                  <span className="inline-flex items-start gap-1.5 text-sm text-foreground-muted">
                    <MapPinIcon className="size-3.5 mt-0.5 text-accent shrink-0" />
                    123 Example St, Springfield, IL
                  </span>
                </div>
              </div>
            </LightSurface>
          </div>

          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <VariantLabel>Read-time — small text, clock icon</VariantLabel>
                  <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                    <ClockIcon className="size-3.5 text-accent" />
                    4 min read
                  </span>
                </div>

                <div>
                  <VariantLabel>Date and time — body text, calendar icon</VariantLabel>
                  <span className="inline-flex items-center gap-1.5 text-sm text-foreground-muted">
                    <CalendarIcon className="size-3.5 text-accent" />
                    Mar 15, 2026 · 2:00 PM
                  </span>
                </div>

                <div>
                  <VariantLabel>Address — body text, map-pin icon (multiline-safe)</VariantLabel>
                  <span className="inline-flex items-start gap-1.5 text-sm text-foreground-muted">
                    <MapPinIcon className="size-3.5 mt-0.5 text-accent shrink-0" />
                    123 Example St, Springfield, IL
                  </span>
                </div>
              </div>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>Blog card read-time</li>
          <li>Event card date and address</li>
          <li>Any &ldquo;info with icon, not categorical, not interactive&rdquo; pattern</li>
        </UsedOn>
      </section>

      {/* ── ButtonGroup ────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>ButtonGroup</Heading>
        <Note>
          Renders 1-N Button instances from a <code>CtaItem[]</code> array
          (<code>components/ui/ButtonGroup.tsx</code>). Group-level{' '}
          <code>context</code> / <code>size</code> / <code>align</code> /{' '}
          <code>fullWidth</code> dispatch; per-item <code>variant</code>{' '}
          field honored by default (override via{' '}
          <code>respectVariantField={'{false}'}</code>). Empty-array and
          missing-label/url items are filtered. Companion{' '}
          <code>toCtaItems()</code> helper translates Sanity{' '}
          <code>ctaButton[]</code> arrays to <code>CtaItem[]</code>.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col gap-6">
                <div>
                  <VariantLabel>Single primary CTA</VariantLabel>
                  <ButtonGroup
                    items={[{label: 'Schedule a consultation', url: '/contact/', variant: 'primary'}]}
                    context="light"
                  />
                </div>
                <div>
                  <VariantLabel>Primary + secondary pair (gap-4)</VariantLabel>
                  <ButtonGroup
                    items={[
                      {label: 'Schedule a consultation', url: '/contact/',    variant: 'primary'},
                      {label: 'Read our story',           url: '/about/',     variant: 'secondary'},
                    ]}
                    context="light"
                  />
                </div>
                <div>
                  <VariantLabel>Primary + tertiary pair</VariantLabel>
                  <ButtonGroup
                    items={[
                      {label: 'Schedule a consultation', url: '/contact/',    variant: 'primary'},
                      {label: 'Meet our attorneys',       url: '/attorneys/', variant: 'tertiary'},
                    ]}
                    context="light"
                  />
                </div>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-col gap-6">
                <div>
                  <VariantLabel>Single primary CTA — context=&quot;dark&quot;</VariantLabel>
                  <ButtonGroup
                    items={[{label: 'Schedule a consultation', url: '/contact/', variant: 'primary'}]}
                    context="dark"
                  />
                </div>
                <div>
                  <VariantLabel>Primary + secondary pair</VariantLabel>
                  <ButtonGroup
                    items={[
                      {label: 'Schedule a consultation', url: '/contact/',    variant: 'primary'},
                      {label: 'Read our story',           url: '/about/',     variant: 'secondary'},
                    ]}
                    context="dark"
                  />
                </div>
                <div>
                  <VariantLabel>Primary + tertiary pair</VariantLabel>
                  <ButtonGroup
                    items={[
                      {label: 'Schedule a consultation', url: '/contact/',    variant: 'primary'},
                      {label: 'Meet our attorneys',       url: '/attorneys/', variant: 'tertiary'},
                    ]}
                    context="dark"
                  />
                </div>
              </div>
            </DarkSurface>
          </div>
        </div>

        <UsedOn>
          <li>InternalHero CTA stack (primary + optional secondary)</li>
          <li>Section CTAs in CtaSection variants — Centered / Split / Background</li>
          <li>GlobalCta — always-on bottom-of-page CTA composition</li>
          <li>BadgesSection optional CTA stack</li>
          <li>Header CTA group (<code>&lt;CtaButtons&gt;</code> composes ButtonGroup with <code>!flex-nowrap !gap-2</code> override for tight-container fit)</li>
          <li>Footer ActionButtons</li>
        </UsedOn>
      </section>

      {/* ── FormField ──────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>FormField</Heading>
        <Note>
          Vertical-label form composition (<code>components/ui/FormField.tsx</code>):
          label + input + optional help-text / error. Auto-wires{' '}
          <code>id</code> + <code>aria-describedby</code> + <code>aria-invalid</code>{' '}
          onto the child input via React.cloneElement, so any control accepting
          those props (Input / Select / native input) works without manual
          plumbing. <code>hideLabel</code> renders the label visually-hidden
          (still available to assistive tech).
        </Note>

        <LightSurface>
          <div className="flex flex-col gap-6">
            <FormField label="Full name">
              <Input placeholder="Jane Doe" />
            </FormField>

            <FormField label="Email address" helpText="We respond within one business day.">
              <Input type="email" placeholder="jane@example.com" />
            </FormField>

            <FormField label="Phone number" error="Please enter a valid 10-digit phone number.">
              <Input type="tel" placeholder="(763) 555-0100" defaultValue="763 555" />
            </FormField>

            <FormField label="Practice area of interest" hideLabel>
              <Select defaultValue="">
                <option value="" disabled>Select a practice area (label visually hidden)…</option>
                <option value="estate-planning">Estate Planning</option>
                <option value="family-law">Family Law</option>
                <option value="business-law">Business Law</option>
              </Select>
            </FormField>
          </div>
        </LightSurface>

        <UsedOn>
          <li>Contact form fields (when a forms workstream surfaces — see Organisms tab)</li>
          <li>Consultation form fields</li>
          <li>Newsletter signup form</li>
          <li>Any Sanity-wired form composition needing label + help-text + error UX</li>
        </UsedOn>
      </section>

      {/* ── DialogPanel ────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>DialogPanel</Heading>
        <Note>
          Platform modal scaffold (<code>components/ui/DialogPanel.tsx</code>) —
          Radix Dialog wrapped with canonical surface, animation, and chrome:
          {' '}<code>bg-brand-dark/40</code> overlay scrim with{' '}
          <code>structural-fast</code> fade, <code>bg-background</code> panel
          with <code>shadow-elevation-lg</code>, mobile sheet-from-bottom →
          desktop centered transitions at <code>structural-slow</code>{' '}
          duration, drag handle (mobile only), IconButton close, and
          <code> font-heading</code> title. Click the trigger below to see
          the modal in production form — it mounts at the body level via
          Radix Portal.
        </Note>

        <LightSurface>
          <DialogPanel
            trigger={
              <Button variant="primary" context="light">
                Open dialog (Radix-driven)
              </Button>
            }
            title="Sample modal heading"
            description="DialogPanel composes the platform's canonical modal surface — overlay scrim, sheet/centered transitions, drag handle, IconButton close. Press Escape, click the overlay, or use the close button to dismiss."
          >
            <p className="text-base text-foreground">
              Body content goes here. The modal supports any children — form
              embeds (FormModal consumes DialogPanel internally), messages,
              attorney-bio overlays. Use this scaffold when you need a
              cascade-aware, accessibility-correct modal surface.
            </p>
            <p className="mt-4 text-sm text-foreground-muted">
              Focus is trapped within the panel; Escape and overlay-click
              dismiss. Radix owns the focus trap, accessibility tree, and
              keyboard handling — this wrapper trusts upstream per{' '}
              <code>BI-TESTING.md → Anchor 5 (Trust-upstream)</code>.
            </p>
          </DialogPanel>
        </LightSurface>

        <UsedOn>
          <li>FormModal — wraps any HTML form embed (HubSpot, Reviews) in DialogPanel</li>
          <li>FeedbackModal — site-wide feedback collection trigger</li>
          <li>Any modal flow that needs the canonical platform surface (overlay + animation + close button)</li>
        </UsedOn>
      </section>

      {/* ── Cards (composed patterns) ─────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Card patterns (Blog / Attorney / PracticeArea / Event)</Heading>
        <Note>
          The platform renders cards as inline compositions of{' '}
          <code>&lt;CardLink&gt;</code> + content (no discrete BlogCard /
          AttorneyCard / etc. primitives ship today). Each card pattern is
          a whole-card-link surface — CardLink bakes the platform chrome
          (bg-background + border-border + rounded-ui + shadow-card-rest +
          hover lift + ring-focus) and consumer code controls the layout
          (flex direction, padding, overflow) via className. The patterns
          below show the canonical compositions; when a future workstream
          extracts a discrete primitive, the Studio cell swaps to import it.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Blog card */}
          <div>
            <Subheading>Blog card</Subheading>
            <LightSurface>
              <CardLink href="#blog-card-demo" className="flex flex-col overflow-hidden">
                <div aria-hidden="true" className="aspect-[16/9] w-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">image — 16:9</span>
                </div>
                <div className="flex flex-col gap-2 p-5">
                  <Chip icon="bookmark">Estate Planning</Chip>
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    What to expect from your first estate-planning consultation
                  </h3>
                  <p className="text-sm text-foreground-muted">
                    A walkthrough of the documents you should bring, the questions
                    you&rsquo;ll be asked, and the outcomes most clients leave with.
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                    <ClockIcon className="size-3.5" />
                    6 min read
                  </span>
                </div>
              </CardLink>
            </LightSurface>
          </div>

          {/* Attorney card */}
          <div>
            <Subheading>Attorney card</Subheading>
            <LightSurface>
              <CardLink href="#attorney-card-demo" className="flex flex-col overflow-hidden">
                <div aria-hidden="true" className="aspect-[4/5] w-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">headshot — 4:5</span>
                </div>
                <div className="flex flex-col gap-2 p-5">
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    Jane Doe
                  </h3>
                  <p className="text-sm text-foreground-muted">Senior Partner</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip icon="bookmark">Estate Planning</Chip>
                    <Chip icon="bookmark">Probate</Chip>
                    <Chip icon="bookmark">Trusts</Chip>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-action-text font-medium">
                    View profile <TertiaryArrow />
                  </span>
                </div>
              </CardLink>
            </LightSurface>
          </div>

          {/* Practice area card */}
          <div>
            <Subheading>Practice-area card</Subheading>
            <LightSurface>
              <CardLink href="#practice-area-card-demo" className="flex flex-col p-6">
                <div aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-ui bg-muted text-foreground">
                  <BookmarkIcon className="size-6" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  Family Law
                </h3>
                <p className="mt-2 text-sm text-foreground-muted">
                  Divorce, custody, adoption, post-decree modifications — and the
                  guidance to navigate them with deliberate care.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-action-text font-medium">
                  Explore Family Law <TertiaryArrow />
                </span>
              </CardLink>
            </LightSurface>
          </div>

          {/* Event card */}
          <div>
            <Subheading>Event card</Subheading>
            <LightSurface>
              <CardLink href="#event-card-demo" className="flex flex-col overflow-hidden">
                <div aria-hidden="true" className="aspect-[16/9] w-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">image — 16:9</span>
                </div>
                <div className="flex flex-col gap-2 p-5">
                  <div className="flex flex-wrap gap-2">
                    <Chip icon="calendar">March 15, 2026</Chip>
                    <Chip icon="map-pin">Springfield, IL</Chip>
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    Estate planning workshop — protecting your family
                  </h3>
                  <p className="text-sm text-foreground-muted">
                    Free 90-minute session covering wills, trusts, and
                    healthcare directives. Refreshments provided.
                  </p>
                </div>
              </CardLink>
            </LightSurface>
          </div>

        </div>

        <p className="mt-3 text-xs text-foreground-muted">
          Production usage: blog cards live inline in <code>BlogIndexClient</code>;
          attorney cards live inline in <code>AttorneySectionBlock</code>;
          practice-area cards in homepage compositions; event cards in{' '}
          <code>app/(site)/events/page.tsx</code>. Each composes CardLink with the
          shape shown above. The Studio renders the patterns; future workstreams
          may extract discrete primitives, at which point the Studio cells swap
          to import them.
        </p>
      </section>

      {/* ── SectionHeader primitive (Tagline + h2 + description) ─────────── */}
      <section className="mb-12">
        <Heading>SectionHeader</Heading>
        <Note>
          The canonical Tagline + h2 + description primitive. Three scale
          tiers (md / lg / xl) map to the rhythm system in
          <code> skill-typography → Section vertical rhythm</code>: Standard
          (text-3xl md:text-4xl + mb-4), Larger (text-3xl..lg:text-5xl +
          mb-5), Largest (text-4xl..lg:text-6xl + mb-5 md:mb-6). Two
          alignments (center / left). Consumes the
          <code> &lt;Tagline&gt;</code> primitive for the eyebrow label;
          h2 + description use cascade-aware tokens (<code>text-foreground</code>,
          <code> text-foreground-muted</code>) so the same primitive renders
          correctly on light and dark surfaces. Locked in v0.23.0.
        </Note>

        <Subheading>{`Scale catalog — alignment="center"`}</Subheading>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <VariantLabel>{`scale="md" — Standard`}</VariantLabel>
            <LightSurface>
              <SectionHeader
                scale="md"
                tagline="Practice areas"
                heading="Standard section heading"
                description="The dominant rhythm tier — used by attorney, badges, FAQ, reviews, testimonials, and video sections."
              />
            </LightSurface>
          </div>
          <div>
            <VariantLabel>{`scale="lg" — Larger`}</VariantLabel>
            <LightSurface>
              <SectionHeader
                scale="lg"
                tagline="Schedule a consultation"
                heading="Mid-prominence CTA heading"
                description="The CtaSection split + background variants use this tier — bigger heading, looser h2 trailing gap."
              />
            </LightSurface>
          </div>
          <div>
            <VariantLabel>{`scale="xl" — Largest`}</VariantLabel>
            <LightSurface>
              <SectionHeader
                scale="xl"
                tagline="Get in touch"
                heading="Marquee bottom-of-page CTA"
                description="GlobalCta uses this tier — display-scale heading with responsive gap (mb-5 mobile → mb-6 md+)."
              />
            </LightSurface>
          </div>
        </div>

        <div className="mt-6"><Subheading>{`Alignment — scale="md"`}</Subheading></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <VariantLabel>{`alignment="center" (default)`}</VariantLabel>
            <LightSurface>
              <SectionHeader
                tagline="Centered example"
                heading="Section heading"
                description="Used by AttorneySection, ReviewsSection, TestimonialsGrid, and centered Badges layouts."
              />
            </LightSurface>
          </div>
          <div>
            <VariantLabel>{`alignment="left"`}</VariantLabel>
            <LightSurface>
              <SectionHeader
                alignment="left"
                tagline="Left-aligned example"
                heading="Section heading"
                description="Used by FAQ, attorneys index page, and Badges inline / split layouts."
              />
            </LightSurface>
          </div>
        </div>

        <div className="mt-6"><Subheading>{`Cascade-aware on dark surface — scale="lg"`}</Subheading></div>
        <DarkSurface>
          <SectionHeader
            scale="lg"
            tagline="Dark surface example"
            heading="Cascade-aware rendering"
            description={`The same primitive on a dark surface — Tagline's text-accent, h2's text-foreground, and the description's text-foreground-muted auto-swap via the [data-ring-context="dark"] cascade rule. No per-instance overrides needed.`}
          />
        </DarkSurface>

        <UsedOn>
          <li>AttorneySectionBlock, BadgesSectionBlock (3 of 4 variants), FaqSectionBlock, ReviewsSectionBlock, TestimonialsGridSection, VideoSectionBlock (Standard tier)</li>
          <li>CtaSectionBlock SplitCta (full) + BackgroundCta (partial — description hand-rolled for dark-scrim contrast) — Larger tier</li>
          <li>GlobalCta (partial — description hand-rolled for desktop body-copy bump <code>md:text-md</code>) — Largest tier</li>
          <li><code>app/(site)/attorneys/page.tsx</code> intro band — Standard tier</li>
        </UsedOn>
      </section>

      {/* ── Awaiting Studio surfaces (1 remaining — by design) ────────── */}
      <section className="mb-12">
        <Heading>Other molecular compositions — awaiting Studio surfaces</Heading>
        <Note>
          One remaining stub — kept by design. No discrete primitive ships
          today (the pattern lives inline at the index-page consumer); the
          stub stays until a future workstream surfaces a consolidation.
        </Note>

        <ul role="list" aria-label="Molecular compositions awaiting Studio surfaces" className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <StubCard
            name="Pagination"
            description="No discrete Pagination primitive exists in components/ui/. BlogIndexClient + ServiceAreaIndexClient handle pagination inline via filter / letter chips, not as a composed primitive."
            populates="Stays as stub — populates when a future workstream extracts a discrete Pagination primitive. Tracked in OUTSTANDING.md as deferred."
          />
        </ul>
      </section>
    </>
  )
}

// ─── Sample data fixtures for Organisms population ───────────────────────────

const SAMPLE_CTA_CENTERED: CtaSectionBlockData = {
  _type: 'ctaSection',
  layout: 'centered',
  tagline: 'Ready to start?',
  heading: 'Schedule your initial consultation',
  description: 'A 30-minute conversation with an attorney about your goals, constraints, and the documents we recommend bringing.',
  buttons: [
    {title: 'Schedule a consultation', url: '/contact/', variant: 'primary'},
    {title: 'Read our story',          url: '/about/',   variant: 'secondary'},
  ],
}

const SAMPLE_CTA_SPLIT: CtaSectionBlockData = {
  _type: 'ctaSection',
  layout: 'split',
  tagline: 'Estate planning',
  heading: 'Protect what you have built',
  description: 'Wills, trusts, healthcare directives, and the conversations that turn a vague intention into a clear plan for your family.',
  buttons: [
    {title: 'Explore estate planning', url: '/estate-planning/', variant: 'primary'},
  ],
  image: null,
}

const SAMPLE_CTA_BACKGROUND: CtaSectionBlockData = {
  _type: 'ctaSection',
  layout: 'background',
  tagline: 'Family law',
  heading: 'Guidance for the moments that matter most',
  description: 'Divorce, custody, adoption, and the post-decree work that comes after. Deliberate counsel, every step.',
  buttons: [
    {title: 'Schedule a consultation', url: '/contact/', variant: 'primary'},
  ],
  image: null,
}

const SAMPLE_TESTIMONIALS: TestimonialData[] = [
  {
    _id: 't1',
    quote: 'They walked us through every decision with patience and care. We left with a plan we actually understood — and that mattered.',
    name: 'Sarah K.',
    caseType: 'Estate Planning',
    numberOfStars: 5,
    avatar: null,
  },
  {
    _id: 't2',
    quote: 'Steady counsel in a difficult time. The team was responsive, deliberate, and honest about what we could expect.',
    name: 'Michael R.',
    caseType: 'Family Law',
    numberOfStars: 5,
    avatar: null,
  },
  {
    _id: 't3',
    quote: 'For a small business owner, having an attorney who actually listens makes all the difference. They asked questions no one else had.',
    name: 'Priya N.',
    caseType: 'Business Law',
    numberOfStars: 5,
    avatar: null,
  },
]

const SAMPLE_FEATURED_TESTIMONIAL: FeaturedTestimonialSectionData = {
  _type: 'featuredTestimonial',
  testimonial: SAMPLE_TESTIMONIALS[0] ?? null,
}

const SAMPLE_TESTIMONIALS_GRID: TestimonialsGridSectionData = {
  _type: 'testimonialsGrid',
  tagline: 'Client experience',
  heading: 'Stories from those we have represented',
  description: 'Anonymized testimonials shared with permission.',
  testimonials: SAMPLE_TESTIMONIALS,
}

const SAMPLE_REVIEWS_SECTION: ReviewsSectionBlockData = {
  _type: 'reviewsSection',
  tagline: 'Reviews',
  heading: 'What clients say across the platforms they use',
  description: 'Aggregated from Google, Avvo, and Yelp.',
  reviewsEmbed: null,
}

const SAMPLE_VIDEO_SECTION: VideoSectionBlockData = {
  _type: 'videoSection',
  tagline: 'Watch',
  heading: 'What to expect in your first meeting',
  description: 'A short introduction to our consultation process and how we structure the first conversation.',
  videos: [
    {
      _id: 'v1',
      title: 'How we approach the first consultation',
      youTubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      description: 'A 90-second walkthrough.',
      videoType: 'intro',
    },
  ],
}

// Portable-Text-shaped block for sample FAQ answers. Each answer is a single
// paragraph with realistic legal-services copy.
function pt(text: string, key: string): unknown[] {
  return [
    {
      _type: 'block',
      _key: key,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: `${key}-s`, text, marks: []}],
    },
  ]
}

const SAMPLE_FAQ_SECTION: FaqSectionBlockData = {
  _type: 'faqSection',
  heading: 'Common questions before your first consultation',
  description: 'Quick answers to the questions we hear most often.',
  questions: [
    {
      question: 'What should I bring to my first meeting?',
      answer: pt('Any relevant documents — past agreements, deeds, prior wills, court filings. If you have them digitally, an emailed copy ahead of the meeting helps us prepare.', 'a1'),
    },
    {
      question: 'How long does the initial consultation last?',
      answer: pt('Roughly 30-45 minutes. Enough time to understand your goals and constraints, and to outline what comes next.', 'a2'),
    },
    {
      question: 'Is the first consultation free?',
      answer: pt('For most practice areas, yes. For specialized matters we discuss fee structure upfront so there are no surprises.', 'a3'),
    },
    {
      question: 'Can I reschedule if something comes up?',
      answer: pt('Absolutely. Email or call our office; we will find a time that works.', 'a4'),
    },
  ],
  footerHeading: 'Have a question we didn’t answer?',
  footerDescription: 'Reach out and we will get back to you within one business day.',
  footerButton: {title: 'Contact us', url: '/contact/', variant: 'primary'},
}

const SAMPLE_BADGES_SECTION: BadgesSectionBlockData = {
  _type: 'badgesSection',
  layout: 'centeredGrid',
  tagline: 'Recognition',
  heading: 'Trusted by the institutions that matter',
  description: null,
  badges: [
    {src: null, alt: 'Super Lawyers — 2024',          width: 160, height: 80},
    {src: null, alt: 'Best Lawyers — 2024',           width: 160, height: 80},
    {src: null, alt: 'Minnesota State Bar Association', width: 160, height: 80},
    {src: null, alt: 'American Bar Association',       width: 160, height: 80},
  ],
}

const SAMPLE_ATTORNEY_SECTION: AttorneySectionBlockData = {
  _type: 'attorneySection',
  layout: 'grid',
  mode: 'manual',
  tagline: 'Our team',
  heading: 'Meet the attorneys who will represent you',
  description: 'Each attorney brings specialized depth in their practice area. Click through to read their full background.',
  attorneys: [
    {_id: 'a1', title: 'Jane Doe',  slug: 'jane-doe',  h1: 'Jane Doe',  photo: null},
    {_id: 'a2', title: 'John Roe',   slug: 'john-roe',   h1: 'John Roe',   photo: null},
    {_id: 'a3', title: 'Maya Chen',        slug: 'maya-chen',        h1: 'Maya Chen',        photo: null},
  ],
  orderedAttorneyIds: null,
}

const SAMPLE_GLOBAL_CTA: GlobalCtaData = {
  layout: 'centered',
  tagline: 'Ready when you are',
  heading: 'Talk with an attorney about what comes next',
  description: 'A short conversation about your situation, the questions you have, and how we can help.',
  buttons: [
    {title: 'Schedule a consultation', url: '/contact/', variant: 'primary'},
    {title: 'Email our office',         url: '/contact/', variant: 'secondary'},
  ],
  formEmbed: null,
}

const SAMPLE_INTERNAL_HERO: InternalHeroData = {
  heading: 'Family law guidance from initial consultation through resolution',
  description: 'Divorce, custody, adoption, and the post-decree work that comes after. Deliberate counsel, every step.',
  buttons: [
    {title: 'Schedule a consultation', url: '/contact/', variant: 'primary'},
    {title: 'Meet our attorneys',       url: '/attorneys/', variant: 'secondary'},
  ],
  backgroundImage: null,
}

const SAMPLE_NAV_ITEMS: NavItem[] = [
  {label: 'About',         href: '/about/'},
  {label: 'Attorneys',     href: '/attorneys/'},
  {
    label: 'Practice areas',
    displayMode: 'mega',
    children: [
      {label: 'Estate Planning', href: '/estate-planning/'},
      {label: 'Family Law',      href: '/family-law/'},
      {label: 'Business Law',    href: '/business-law/'},
      {label: 'Probate',         href: '/probate/'},
    ],
  },
  {label: 'Blog',          href: '/blog/'},
  {label: 'Contact',       href: '/contact/'},
]

const SAMPLE_ATTORNEY: Attorney = {
  slug: 'jane-doe',
  seoTitle: null,
  metaDescription: null,
  noIndex: false,
  canonicalUrl: null,
  firstName: 'Jane',
  middleName: null,
  lastName: 'Doe',
  suffix: null,
  h1: null,
  jobTitle: 'Senior Partner — Estate Planning &amp; Probate',
  photo: null,
  email: 'jane@example.com',
  showEmail: true,
  showLocations: true,
  linkedIn: 'https://linkedin.com/in/example',
  avvo: null,
  superLawyers: null,
  findLaw: null,
  martindale: null,
  fullBiography: pt('Jane has practiced estate planning and probate law for over twenty years. She is admitted to the Minnesota bar and serves clients across the Twin Cities metro. Her practice emphasizes clear documentation, deliberate decision-making, and long relationships with the families she represents.', 'bio1'),
  practiceAreas: [
    {label: 'Estate Planning', slug: 'estate-planning'},
    {label: 'Probate',          slug: 'probate'},
    {label: 'Trust Administration', slug: 'trust-administration'},
  ],
  location: {
    address1: '123 Example St',
    city: 'Springfield',
    state: 'MN',
    zip: '55369',
    officePhone: '(763) 560-5700',
    tollFreePhone: '(800) 555-0100',
  },
  yearAdmittedToBar: '2003',
  barAdmissions: pt('Minnesota State Bar, 2003', 'b1'),
  stateBarAdmissions: null,
  educationDegrees: pt('University of Minnesota Law School, J.D., 2003 (cum laude); Carleton College, B.A. Political Science, 1999', 'e1'),
  certifiedLegalSpecialties: null,
  honors: pt('Super Lawyers, Estate Planning &amp; Probate (2018-2024)', 'h1'),
  professionalAssociations: pt('Minnesota State Bar Association, Probate &amp; Trust Section', 'p1'),
  proBonoActivities: null,
  publications: null,
  presentationsSeminars: null,
  representativeCases: null,
  pastPositions: null,
  languages: null,
  hideCtaForm: false,
  ctaFormOverride: null,
}

const SAMPLE_FOOTER_DATA: FooterData = {
  firmName: 'Sample Firm',
  logo: null,
  address: {
    address1: '123 Example St',
    address2: null,
    address3: null,
    city: 'Springfield',
    state: 'MN',
    zip: '55369',
    officePhone: '(763) 560-5700',
    tollFreePhone: '(800) 555-0100',
    hours: {
      mondayStatus: 'open',    mondayOpen: '8:30am',    mondayClose: '5:30pm',
      tuesdayStatus: 'open',   tuesdayOpen: '8:30am',   tuesdayClose: '5:30pm',
      wednesdayStatus: 'open', wednesdayOpen: '8:30am', wednesdayClose: '5:30pm',
      thursdayStatus: 'open',  thursdayOpen: '8:30am',  thursdayClose: '5:30pm',
      fridayStatus: 'open',    fridayOpen: '8:30am',    fridayClose: '5:30pm',
      saturdayStatus: 'closed',
      sundayStatus: 'closed',
    },
    emergency24_7: false,
  },
  ctaText: 'Need a consultation?',
  ctaUrl: '/contact/',
  actionButton1Label: 'Schedule consultation',
  actionButton1Url: '/contact/',
  actionButton2Label: 'Review us',
  actionButton2Url: '/review/',
  column1: [
    {label: 'About',         href: '/about/'},
    {label: 'Attorneys',     href: '/attorneys/'},
    {label: 'Practice areas', href: '/practice-areas/'},
  ],
  column2: [
    {label: 'Blog',          href: '/blog/'},
    {label: 'Events',        href: '/events/'},
    {label: 'Contact',       href: '/contact/'},
  ],
  facebookUrl: 'https://facebook.com/example',
  instagramUrl: 'https://instagram.com/example',
  twitterUrl: null,
  linkedInUrl: 'https://linkedin.com/company/example',
  youTubeUrl: null,
  privacyPolicyUrl: '/privacy/',
  disclaimerUrl: '/disclaimer/',
  cookiesUrl: '/cookies/',
  footerLayout: null,
  formEmbed: null,
  locations: [
    {
      _id: 'loc1',
      city: 'Springfield',
      address1: '123 Example St',
      state: 'MN',
      zip: '55369',
      officePhone: '(763) 560-5700',
      tollFreePhone: '(800) 555-0100',
      pageSlug: 'maple-grove-office',
    },
  ],
}

const SAMPLE_HEADER_DATA: HeaderData = {
  firmName: 'Sample Firm',
  logoOnLight: null,
  logoOnDark: null,
  logoMarkOnLight: null,
  logoMarkOnDark: null,
  phone: '(763) 560-5700',
  tollFreePhone: '(800) 555-0100',
  headerLayout: null,
  mobileLayout: null,
  heroMerge: false,
  sticky: false,
  stickyHideSupplementary: false,
  compactStyle: null,
  defaultScheme: 'dark',
  scrolledScheme: null,
  topBarDesktop: true,
  topBarMobile: false,
  topBarPinSide: 'left',
  topBarLeft: 'Springfield, IL',
  topBarRight: 'Office hours: Mon-Fri 8:30am-5:30pm',
  topBarStyle: 'primary',
  headerPhone: '(763) 560-5700',
  headerPhone2: null,
  headerPhoneTagline: 'Call us',
  headerCtaLabel: 'Schedule consultation',
  headerCtaUrl: '/contact/',
  headerCtaLabel2: null,
  headerCtaUrl2: null,
  navItems: SAMPLE_NAV_ITEMS,
}

function OrganismsPanel() {
  return (
    <>
      {/* ── CtaSection variants ──────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>CtaSection — Centered / Split / Background variants</Heading>
        <Note>
          <code>CtaSectionBlock</code> dispatches between four layouts based
          on <code>data.layout</code>: <code>centered</code> (alternation
          surface, button stack centered), <code>split</code> (heading + body
          left, image right), <code>background</code> (image-backed dark
          scrim with cascade-aware text), and <code>textOnly</code>. All
          variants consume <code>ButtonGroup</code> + the section vertical
          rhythm system documented in Foundation. Studio shows the Centered,
          Split, and Background variants at container width — production
          renders at full page width.
        </Note>

        <div className="space-y-6">
          <div>
            <Subheading>Centered variant — bg-muted alternation surface</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <CtaSectionBlock data={SAMPLE_CTA_CENTERED} />
            </div>
          </div>

          <div>
            <Subheading>Split variant — heading left, image right (no image → text-only fallback structure)</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <CtaSectionBlock data={SAMPLE_CTA_SPLIT} />
            </div>
          </div>

          <div>
            <Subheading>Background variant — image-backed dark scrim (Studio shows no-image fallback wrapped in bg-brand-dark for cascade)</Subheading>
            <div data-ring-context="dark" className="overflow-hidden rounded-ui border border-border bg-brand-dark">
              <CtaSectionBlock data={SAMPLE_CTA_BACKGROUND} />
            </div>
            <p className="mt-2 text-xs text-foreground-muted">
              Note: production Background variant renders an Image with{' '}
              <code>bg-brand-dark/80</code> scrim above (the canonical
              image-scrim opacity per <code>skill-color-system</code>). Studio
              wraps in a <code>bg-brand-dark</code> surface so the
              cascade-aware text tokens resolve correctly without a real
              image URL.
            </p>
          </div>
        </div>
      </section>

      {/* ── FeaturedTestimonialSection ──────────────────────────────────── */}
      <section className="mb-12">
        <Heading>FeaturedTestimonialSection</Heading>
        <Note>
          Single-testimonial spotlight — production component renders a
          large pull-quote with attribution + optional <code>StarRating</code>{' '}
          + avatar. Consumes a <code>TestimonialData</code> document.
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <FeaturedTestimonialSection data={SAMPLE_FEATURED_TESTIMONIAL} />
        </div>
      </section>

      {/* ── TestimonialsGridSection ─────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>TestimonialsGridSection</Heading>
        <Note>
          Grid of <code>TestimonialCard</code> primitives. Each card: star
          rating + body + attribution. Tagline + h2 + description above.
          Sample renders 3 testimonials.
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <TestimonialsGridSection data={SAMPLE_TESTIMONIALS_GRID} />
        </div>
      </section>

      {/* ── ReviewsSectionBlock ─────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>ReviewsSectionBlock</Heading>
        <Note>
          External-reviews aggregation (Google / Avvo / Yelp). Production
          renders a <code>reviewsEmbed</code> HTML string (provider-specific
          iframe). Studio passes <code>reviewsEmbed: null</code> so the
          tagline + heading + description structure renders without the
          embed body.
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <ReviewsSectionBlock data={SAMPLE_REVIEWS_SECTION} />
        </div>
      </section>

      {/* ── VideoSectionBlock ──────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>VideoSectionBlock</Heading>
        <Note>
          Embedded video section. Production renders YouTube / Vimeo /
          Mux embeds via <code>youTubeUrl</code> field. Tagline + h2 +
          description above the video. Studio uses a sample YouTube URL;
          the iframe may not load if external network is restricted —
          structure still renders.
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <VideoSectionBlock data={SAMPLE_VIDEO_SECTION} />
        </div>
      </section>

      {/* ── BadgesSectionBlock ──────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>BadgesSectionBlock</Heading>
        <Note>
          Trust-signal badges section — production renders accreditation /
          association badges as Next.js Image components. Sample passes{' '}
          <code>badges</code> with <code>src: null</code> (image-less alt
          metadata only); section&rsquo;s tagline + heading + structural shape
          surfaces.
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <BadgesSectionBlock data={SAMPLE_BADGES_SECTION} />
        </div>
      </section>

      {/* ── AttorneySectionBlock ────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>AttorneySectionBlock</Heading>
        <Note>
          Grid of attorney cards. Production renders <code>CardLink</code>{' '}
          with photo + name + practice-area chips. Sample passes 3 attorney
          records with <code>photo: null</code> — card structure surfaces;
          headshot column shows the fallback shape.
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <AttorneySectionBlock data={SAMPLE_ATTORNEY_SECTION} />
        </div>
      </section>

      {/* ── FaqSectionBlock ─────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>FaqSectionBlock</Heading>
        <Note>
          Tagline + h2 + description above an FaqAccordion (inset-ring focus
          per skill-focus-rings exception). Sample renders 4 Q&amp;A pairs
          with Portable-Text-shaped answer blocks. Click any question to
          expand its panel.
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <FaqSectionBlock data={SAMPLE_FAQ_SECTION} />
        </div>
      </section>

      {/* ── GlobalCta ───────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>GlobalCta</Heading>
        <Note>
          Always-on bottom-of-page CTA shown above the footer on every page.
          Production uses the Largest-tier rhythm (<code>h2 mb-5 md:mb-6</code>{' '}
          paired with <code>text-4xl md:text-5xl lg:text-6xl</code>). Sample
          renders the Centered layout with primary + secondary ButtonGroup.
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <GlobalCta data={SAMPLE_GLOBAL_CTA} />
        </div>
      </section>

      {/* ── Forms (composed patterns) ──────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Forms — Contact / Consultation / Newsletter patterns</Heading>
        <Note>
          The platform doesn&rsquo;t ship discrete{' '}
          <code>ContactForm</code> / <code>ConsultationForm</code> /{' '}
          <code>NewsletterForm</code> primitives — production sites embed
          forms via FormModal + HtmlEmbed (HubSpot, Mailchimp, etc.). The
          Studio renders the canonical form-layout patterns by composing
          FormField + Input + Select + Button atoms. If a future workstream
          extracts a discrete form primitive, the Studio cells swap to
          import it.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* Contact form */}
          <div>
            <Subheading>Contact form</Subheading>
            <LightSurface>
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <FormField label="Full name">
                  <Input placeholder="Jane Doe" required />
                </FormField>
                <FormField label="Email address">
                  <Input type="email" placeholder="jane@example.com" required />
                </FormField>
                <FormField label="Phone number" helpText="Optional — for callback follow-up.">
                  <Input type="tel" placeholder="(763) 555-0100" />
                </FormField>
                <FormField label="How can we help?">
                  <Input placeholder="Brief description…" />
                </FormField>
                <Button variant="primary" type="submit">Send message</Button>
              </form>
            </LightSurface>
          </div>

          {/* Consultation form */}
          <div>
            <Subheading>Consultation form</Subheading>
            <LightSurface>
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <FormField label="Full name">
                  <Input placeholder="Jane Doe" required />
                </FormField>
                <FormField label="Email address">
                  <Input type="email" placeholder="jane@example.com" required />
                </FormField>
                <FormField label="Practice area of interest">
                  <Select defaultValue="" required>
                    <option value="" disabled>Select a practice area…</option>
                    <option value="estate-planning">Estate Planning</option>
                    <option value="family-law">Family Law</option>
                    <option value="business-law">Business Law</option>
                    <option value="probate">Probate &amp; Trust Administration</option>
                  </Select>
                </FormField>
                <FormField label="Preferred contact" helpText="We will reach out within one business day.">
                  <Select defaultValue="email">
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </Select>
                </FormField>
                <Button variant="primary" type="submit">Request a consultation</Button>
              </form>
            </LightSurface>
          </div>

          {/* Newsletter form */}
          <div>
            <Subheading>Newsletter form</Subheading>
            <LightSurface>
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <p className="text-sm text-foreground">
                  Monthly briefing — practice-area updates and seminar
                  announcements. Unsubscribe anytime.
                </p>
                <FormField label="Email address" hideLabel>
                  <Input type="email" placeholder="you@example.com" required />
                </FormField>
                <Button variant="primary" fullWidth type="submit">Subscribe</Button>
                <p className="text-xs text-foreground-muted">
                  By subscribing you agree to our privacy policy.
                </p>
              </form>
            </LightSurface>
          </div>

        </div>

        <p className="mt-3 text-xs text-foreground-muted">
          Production usage today: HubSpot embeds via <code>HtmlEmbed</code>,
          surfaced through <code>FormModal</code> on Contact + landing pages.
          The composed patterns above show the canonical FormField + Input/
          Select + Button layouts that would back native form implementations
          when a forms workstream surfaces.
        </p>
      </section>

      {/* ── Remaining stubs (2 — by design) ───────────────────────────── */}
      <section className="mb-12">
        <Heading>Other section organisms — awaiting Studio surfaces</Heading>
        <Note>
          2 remaining stubs — kept by design. No discrete primitives ship
          today (speculative future components); they populate when their
          natural workstreams surface.
        </Note>

        <ul role="list" aria-label="Section-level organisms awaiting Studio surfaces" className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <StubCard
            name="PracticeAreaSection"
            description="Grid of practice-area cards — not yet a discrete section block. Composes CardLink + practice-area-aware content; currently surfaces via custom homepage compositions."
            populates="Stays as stub — populates when a future workstream (WS-PracticeArea-Section or WS-Homepage) extracts the inline pattern into a discrete primitive at components/sections/."
          />
          <StubCard
            name="BlogPostsSection"
            description="Recent-blog-posts homepage section (3-4 latest cards) — not yet a discrete section block. The blog index renders via BlogIndexClient on /blog; a homepage variant would surface during WS-Homepage."
            populates="Stays as stub — populates when WS-Homepage extracts a discrete BlogPostsSection primitive at components/sections/."
          />
        </ul>
      </section>
    </>
  )
}

// Small Studio-internal wrapper for MobileDrawer — manages local open/close
// state + provides a trigger button + triggerRef. Doesn't extract a new
// primitive (the production MobileDrawer is unchanged); just renders an
// interactive demo for the Studio cell.
function MobileDrawerDemo() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  return (
    <>
      {/* Production trigger is the header hamburger button (IconButton in
          practice). Studio uses the production Button primitive — now
          forwardRef-wrapped (WS-Cleanup-Trivial Commit 2) so the
          triggerRef attaches cleanly. */}
      <Button
        ref={triggerRef}
        variant="primary"
        context="light"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        Open mobile drawer
      </Button>
      <MobileDrawer
        data={SAMPLE_HEADER_DATA}
        isOpen={isOpen}
        items={SAMPLE_NAV_ITEMS}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
      />
    </>
  )
}

function LayoutsPanel() {
  return (
    <>
      <section className="mb-12">
        <Heading>Layouts — page-frame structures</Heading>
        <Note>
          Page-frame components that wrap content with header, footer, and
          per-route layout structures. Production renders at full page width;
          Studio shows at container width (~1024px) for visual context.
          Production sources: <code>components/layout/</code>,{' '}
          <code>components/layout/headers/</code>,{' '}
          <code>components/layout/footers/</code>,{' '}
          <code>components/attorney/layouts/</code> (staff layouts mirror).
        </Note>
        <p className="text-xs text-foreground-muted">
          WS12 pre-flight resolutions: <strong>Headers 1-3</strong> were
          confirmed correctly stubbed at WS11 (all 7 variants present —
          false alarm in the prompt&rsquo;s open-question premise);{' '}
          <strong>TopBar</strong> added as a new cell in this workstream
          (Commit 11) per visual-contract bidirectional completeness.
          Stays-as-stub: HomepageHero (component extraction pending in
          WS-Homepage).
        </p>
      </section>

      {/* ── InternalHero — light variant ────────────────────────────────── */}
      <section className="mb-12">
        <Heading>InternalHero — light variant</Heading>
        <Note>
          Hero band when <code>designSettings.internalHeroBackground === &apos;light&apos;</code>{' '}
          AND no image. Renders <code>bg-background</code> with cascade-aware
          dark-on-light text. Includes the top-padding offset that production
          uses to clear the sticky header (<code>var(--header-height, 8rem)</code>).
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <HeroSchemeProvider scheme="light">
            <InternalHero data={SAMPLE_INTERNAL_HERO} />
          </HeroSchemeProvider>
        </div>
      </section>

      {/* ── InternalHero — dark variant ─────────────────────────────────── */}
      <section className="mb-12">
        <Heading>InternalHero — dark variant</Heading>
        <Note>
          Hero band when <code>designSettings.internalHeroBackground === &apos;dark&apos;</code>{' '}
          AND no image. Renders <code>bg-brand-dark</code> with cascade-aware
          light-on-dark text. ButtonGroup auto-resolves to <code>context=&quot;dark&quot;</code>{' '}
          via the surface inheritance.
        </Note>
        <div className="overflow-hidden rounded-ui border border-border">
          <HeroSchemeProvider scheme="dark">
            <InternalHero data={SAMPLE_INTERNAL_HERO} />
          </HeroSchemeProvider>
        </div>
      </section>

      {/* ── InternalHero — image-backed variant (note) ──────────────────── */}
      <section className="mb-12">
        <Heading>InternalHero — image-backed variant</Heading>
        <Note>
          Production renders a Next.js <code>&lt;Image&gt;</code> as the
          background with a <code>bg-brand-dark/80</code> scrim above + forced
          <code> data-ring-context=&quot;dark&quot;</code> regardless of the
          {' '}<code>internalHeroBackground</code> setting. The Studio can&rsquo;t
          render the image variant without a Sanity CDN image URL{' '}
          (<code>next.config.ts</code> allows only <code>cdn.sanity.io</code>).
          The wrapper carries <code>data-hero-image=&quot;true&quot;</code> as a
          styled placeholder so the image-backed secondary Button treatment
          (cream border + cream text + translucent brand-dark fill — see
          {' '}<code>globals.css</code> &ldquo;Image-backed Internal Hero&rdquo;
          rule) is visible against the dark surface; primary stays as the
          WS5 white-flip; light + dark (no-image) variants above are
          unchanged. See live H&amp;S pages for the full image-backed
          composition over an actual photo.
        </Note>
        <div
          data-ring-context="dark"
          data-hero-image="true"
          className="overflow-hidden rounded-ui border border-border bg-brand-dark"
        >
          <HeroSchemeProvider scheme="dark">
            <InternalHero data={SAMPLE_INTERNAL_HERO} />
          </HeroSchemeProvider>
        </div>
      </section>

      {/* ── Headers — 7 variants in Standard mode + TopBar ──────────────── */}
      <section className="mb-12">
        <Heading>Headers — 7 variants (Standard mode)</Heading>
        <Note>
          Each header variant supports 4 modes: <strong>Standard</strong>,
          {' '}<strong>Standard+Sticky</strong>, <strong>Hero Merge</strong>,
          {' '}<strong>Hero Merge+Sticky</strong>. Studio renders all 7 in
          Standard mode only (<code>sticky=false, heroMerge=false</code>)
          for visual comparison; the remaining 3 modes are functionally
          identical at rest and differ only in scroll behavior (sticky:
          pins to viewport on scroll; heroMerge: transitions from
          transparent over the hero to solid on scroll). Visual gate
          for the sticky / hero-merge behaviors lives on the live H&amp;S
          deployment.
        </Note>

        <div className="space-y-8">
          <div>
            <Subheading>ApexHeader</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <ApexHeader data={SAMPLE_HEADER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>CrestHeader</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <CrestHeader data={SAMPLE_HEADER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>LedgeHeader</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <LedgeHeader data={SAMPLE_HEADER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>MesaHeader</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <MesaHeader data={SAMPLE_HEADER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>PrismHeader</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <PrismHeader data={SAMPLE_HEADER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>RidgeHeader</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <RidgeHeader data={SAMPLE_HEADER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>SpireHeader</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <SpireHeader data={SAMPLE_HEADER_DATA} />
            </div>
          </div>
        </div>
      </section>

      {/* ── TopBar (page-frame chrome) ──────────────────────────────────── */}
      <section className="mb-12">
        <Heading>TopBar</Heading>
        <Note>
          Page-frame chrome rendered above headers when{' '}
          <code>data.topBarDesktop</code> or <code>data.topBarMobile</code> is
          {' '}true (independent breakpoint toggles). Two content slots:
          {' '}<code>left</code> (mobile + desktop) and <code>right</code>
          {' '}(desktop only). Optional <code>pinSide</code> renders an
          <code> MdLocationPin</code> glyph. Two visual styles —
          {' '}<code>primary</code> (default; bg-action) and{' '}
          <code>secondary</code> (bg-accent, light-surface only).
        </Note>

        <div className="space-y-4">
          <div>
            <Subheading>Primary style + pin left</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <TopBar
                left="Springfield, IL"
                right="Office hours: Mon-Fri 8:30am-5:30pm"
                style="primary"
                visible={true}
                pinSide="left"
              />
            </div>
          </div>
          <div>
            <Subheading>Secondary style + pin left</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <TopBar
                left="Springfield, IL"
                right="Office hours: Mon-Fri 8:30am-5:30pm"
                style="secondary"
                visible={true}
                pinSide="left"
              />
            </div>
          </div>
          <div>
            <Subheading>Dark style + pin left</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <TopBar
                left="Springfield, IL"
                right="Office hours: Mon-Fri 8:30am-5:30pm"
                style="dark"
                visible={true}
                pinSide="left"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footers — 7 variants (6 dark + 1 light) ───────────────────── */}
      <section className="mb-12">
        <Heading>Footers — 7 variants (dark/light via footerScheme)</Heading>
        <Note>
          All 7 footer variants take a shared <code>FooterData</code> prop;
          each composes the same data differently. Every layout flips dark↔light
          off <code>footerSettings.footerScheme</code> via the{' '}
          <code>footerSurface()</code> helper (dark = <code>bg-brand-dark</code> +{' '}
          <code>data-ring-context=&quot;dark&quot;</code>; light ={' '}
          <code>bg-hero-tint</code>); the cascade auto-resolves text polarity.
          Studio renders each at container width; production renders at full
          page width.
        </Note>

        <div className="space-y-8">
          <div>
            <Subheading>AnchorFooter (dark)</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <AnchorFooter data={SAMPLE_FOOTER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>BeaconFooter (dark)</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <BeaconFooter data={SAMPLE_FOOTER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>CrestFooter (dark)</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <CrestFooter data={SAMPLE_FOOTER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>DistrictsFooter (dark) — reference pattern</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <DistrictsFooter data={SAMPLE_FOOTER_DATA} />
            </div>
            <p className="mt-2 text-xs text-foreground-muted">
              Reference pattern for full role-token discipline; first dark-
              footer site to fully use role tokens for borders. See WS0-2
              layout audit Section C for context.
            </p>
          </div>
          <div>
            <Subheading>SwitchboardFooter — tabbed office selector (multi-location)</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <SwitchboardFooter data={SAMPLE_FOOTER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>MeridianFooter (dark)</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <MeridianFooter data={SAMPLE_FOOTER_DATA} />
            </div>
          </div>
          <div>
            <Subheading>PillarFooter (dark)</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <PillarFooter data={SAMPLE_FOOTER_DATA} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Sidebar — 4 typed variants ───────────────────────────────── */}
      <section className="mb-12">
        <Heading>Sidebar — 4 typed variants</Heading>
        <Note>
          The Sidebar primitive dispatches on each component&rsquo;s{' '}
          <code>_componentType</code> field. 4 production variants:{' '}
          <code>sidebarNav</code>, <code>sidebarCtaBox</code>,{' '}
          <code>sidebarFormEmbed</code>, <code>sidebarAttorneyList</code>{' '}
          (a 5th — <code>sidebarTableOfContents</code> — derives from a
          page&rsquo;s blockContent body; not surfaced in Studio without a
          body fixture). Typed Sanity shapes per variant are tracked under
          {' '}<code>OUTSTANDING.md → WS8 Decision-2 deferral</code>.
          Studio renders each variant in a narrow column to mimic the
          production ~320px sidebar width on Layout B pages.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          <div>
            <Subheading>SidebarNav — custom links mode</Subheading>
            <div className="max-w-xs">
              <Sidebar components={[{
                _componentType: 'sidebarNav',
                header: 'Family law topics',
                description: 'Quick links to related content.',
                mode: 'custom',
                links: [
                  {title: 'Divorce overview',          slug: 'family-law/divorce'},
                  {title: 'Child custody guide',       slug: 'family-law/child-custody'},
                  {title: 'Adoption process',          slug: 'family-law/adoption'},
                  {title: 'Post-decree modifications', slug: 'family-law/post-decree'},
                ],
              }]} />
            </div>
          </div>

          <div>
            <Subheading>SidebarCtaBox</Subheading>
            <div className="max-w-xs">
              <Sidebar components={[{
                _componentType: 'sidebarCtaBox',
                header: 'Ready to talk?',
                supportingText1: 'Schedule a 30-minute consultation.',
                supportingText2: 'No cost, no commitment.',
                phoneNumber: '(763) 560-5700',
                button: {title: 'Schedule online', url: '/contact/'},
                layout: 'centered',
              }]} />
            </div>
          </div>

          <div>
            <Subheading>SidebarFormEmbed — no form fallback</Subheading>
            <div className="max-w-xs">
              <Sidebar components={[{
                _componentType: 'sidebarFormEmbed',
                header: 'Request a consultation',
                description: 'Tell us about your situation and we will reach back within one business day.',
                formEmbed: null,
              }]} />
            </div>
            <p className="mt-2 text-xs text-foreground-muted">
              Production wraps a HubSpot / Mailchimp HTML embed via{' '}
              <code>FormEmbed</code>. Studio passes <code>formEmbed: null</code>{' '}
              so the &ldquo;No form selected&rdquo; fallback renders.
            </p>
          </div>

          <div>
            <Subheading>SidebarAttorneyList — non-avatar layout</Subheading>
            <div className="max-w-xs">
              <Sidebar components={[{
                _componentType: 'sidebarAttorneyList',
                header: 'Family law team',
                layout: 'list',
                mode: 'manual',
                attorneys: [
                  {_id: 'a1', title: 'Jane Doe', slug: 'jane-doe',  photo: null},
                  {_id: 'a2', title: 'John Roe',  slug: 'john-roe',   photo: null},
                  {_id: 'a3', title: 'Maya Chen',       slug: 'maya-chen',        photo: null},
                ],
              }]} />
            </div>
          </div>

        </div>
      </section>

      {/* ── Sidebar — design settings preview (WS-Sidebar Phase 2.5) ─────── */}
      <section className="mb-12">
        <Heading>Sidebar — design settings preview</Heading>
        <Note>
          Visual matrix for the three sidebar design settings shipped in
          WS-Sidebar Phase 2.1 and wired in Phase 2.5:{' '}
          <code>sidebarNavIconStyle</code> (<code>arrows</code> /{' '}
          <code>chevrons</code> / <code>none</code>),{' '}
          <code>sidebarWidgetHeaderLine</code>, and{' '}
          <code>sidebarItemSeparators</code>. Each cell renders the same
          practiceArea hierarchy fixture (Family Law expanded with one child
          auto-open — Divorce — to show grandchildren) so differences between
          cells are purely the design setting under preview. The accordion
          plus icon is fixed and never reads <code>sidebarNavIconStyle</code>
          (per <code>BI/BI-Sidebar.md §2</code>).
        </Note>

        {(() => {
          const SIDEBAR_PREVIEW_FIXTURE: SidebarComponent = {
            _componentType: 'sidebarNav',
            header: 'Practice Areas',
            mode: 'practiceArea',
            orderedAolIds: ['pa-family', 'pa-criminal', 'pa-estate'],
            areasOfLaw: [
              {
                _id: 'pa-family',
                slug: 'family-law',
                title: 'Family Law',
                children: [
                  {_id: 'pa-adoption', slug: 'family-law/adoption', title: 'Adoption', grandchildren: []},
                  {
                    _id: 'pa-divorce',
                    slug: 'family-law/divorce',
                    title: 'Divorce',
                    grandchildren: [
                      {slug: 'family-law/divorce/contested', title: 'Contested Divorce'},
                      {slug: 'family-law/divorce/uncontested', title: 'Uncontested Divorce'},
                    ],
                  },
                  {_id: 'pa-custody', slug: 'family-law/custody', title: 'Custody', grandchildren: []},
                ],
              },
              {_id: 'pa-criminal', slug: 'criminal-defense', title: 'Criminal Defense', children: []},
              {_id: 'pa-estate', slug: 'estate-planning', title: 'Estate Planning', children: []},
            ],
          }
          // Studio runs at /design-studio/, so usePathname() in Sidebar
          // resolves to Scenario 4 (flat list). The provider context can't
          // override the pathname — for the hierarchy preview to show
          // grandchildren auto-open as designed, this cell would need to
          // run on a real practice page in production. The flat-list
          // rendering is still useful for evaluating icon style + lines on
          // the bottom-list pattern.
          return (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

              <div>
                <Subheading>iconStyle = chevrons (default)</Subheading>
                <div className="max-w-xs">
                  <SidebarDesignSettingsProvider value={{
                    sidebarNavIconStyle: 'chevrons',
                    sidebarWidgetHeaderLine: true,
                    sidebarItemSeparators: true,
                  }}>
                    <Sidebar components={[SIDEBAR_PREVIEW_FIXTURE]} />
                  </SidebarDesignSettingsProvider>
                </div>
              </div>

              <div>
                <Subheading>iconStyle = arrows</Subheading>
                <div className="max-w-xs">
                  <SidebarDesignSettingsProvider value={{
                    sidebarNavIconStyle: 'arrows',
                    sidebarWidgetHeaderLine: true,
                    sidebarItemSeparators: true,
                  }}>
                    <Sidebar components={[SIDEBAR_PREVIEW_FIXTURE]} />
                  </SidebarDesignSettingsProvider>
                </div>
              </div>

              <div>
                <Subheading>iconStyle = none (bg-hover shift)</Subheading>
                <div className="max-w-xs">
                  <SidebarDesignSettingsProvider value={{
                    sidebarNavIconStyle: 'none',
                    sidebarWidgetHeaderLine: true,
                    sidebarItemSeparators: true,
                  }}>
                    <Sidebar components={[SIDEBAR_PREVIEW_FIXTURE]} />
                  </SidebarDesignSettingsProvider>
                </div>
                <p className="mt-2 text-xs text-foreground-muted">
                  No leading icon; hover swaps to background-color shift via
                  Button&rsquo;s <code>transition-colors duration-ui-fast</code>{' '}
                  (site-level button animation speed).
                </p>
              </div>

              <div>
                <Subheading>widgetHeaderLine = OFF</Subheading>
                <div className="max-w-xs">
                  <SidebarDesignSettingsProvider value={{
                    sidebarNavIconStyle: 'chevrons',
                    sidebarWidgetHeaderLine: false,
                    sidebarItemSeparators: true,
                  }}>
                    <Sidebar components={[SIDEBAR_PREVIEW_FIXTURE]} />
                  </SidebarDesignSettingsProvider>
                </div>
                <p className="mt-2 text-xs text-foreground-muted">
                  No rule beneath the &ldquo;Practice Areas&rdquo; header.
                </p>
              </div>

              <div>
                <Subheading>itemSeparators = OFF</Subheading>
                <div className="max-w-xs">
                  <SidebarDesignSettingsProvider value={{
                    sidebarNavIconStyle: 'chevrons',
                    sidebarWidgetHeaderLine: true,
                    sidebarItemSeparators: false,
                  }}>
                    <Sidebar components={[SIDEBAR_PREVIEW_FIXTURE]} />
                  </SidebarDesignSettingsProvider>
                </div>
                <p className="mt-2 text-xs text-foreground-muted">
                  No lines between sibling items at any level.
                </p>
              </div>

              <div>
                <Subheading>everything OFF</Subheading>
                <div className="max-w-xs">
                  <SidebarDesignSettingsProvider value={{
                    sidebarNavIconStyle: 'none',
                    sidebarWidgetHeaderLine: false,
                    sidebarItemSeparators: false,
                  }}>
                    <Sidebar components={[SIDEBAR_PREVIEW_FIXTURE]} />
                  </SidebarDesignSettingsProvider>
                </div>
                <p className="mt-2 text-xs text-foreground-muted">
                  Quietest possible render — no icons, no header rule, no
                  item separators. Useful baseline for editorial sites with
                  minimal chrome.
                </p>
              </div>

            </div>
          )
        })()}
      </section>

      {/* ── Profile layouts — 4 variants ────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Profile layouts — 4 variants (Attorney; Staff mirrors)</Heading>
        <Note>
          4 attorney-profile layout variants driven by{' '}
          <code>designSettings.profileLayout</code>. Staff layouts under{' '}
          <code>components/staff/layouts/</code> mirror the attorney layouts
          1-to-1. Each renders from the same <code>Attorney</code> data shape
          and adapts composition for editorial fit. Studio renders with a
          minimal sample Attorney (Jane Doe, General Practice) —
          photos are null, so headshot columns show fallback structure.
        </Note>

        <div className="space-y-8">
          <div>
            <Subheading>Slate (SplitHero) — photo left, dark info panel right</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <SplitHeroLayout attorney={SAMPLE_ATTORNEY} />
            </div>
          </div>
          <div>
            <Subheading>Pillar (ClassicSidebar) — dark banner + sticky sidebar + bio</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <ClassicSidebarLayout attorney={SAMPLE_ATTORNEY} />
            </div>
          </div>
          <div>
            <Subheading>Mosaic (FeatureGrid) — feature row + 3-col credential grid</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <FeatureGridLayout attorney={SAMPLE_ATTORNEY} />
            </div>
          </div>
          <div>
            <Subheading>Horizon (PremiumHorizontal) — editorial full-bleed split, display-scale name</Subheading>
            <div className="overflow-hidden rounded-ui border border-border">
              <PremiumHorizontalLayout attorney={SAMPLE_ATTORNEY} />
            </div>
          </div>
        </div>
      </section>

      {/* ── ContentSidebarLayout ────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>ContentSidebarLayout</Heading>
        <Note>
          Layout B primitive — main content + sidebar two-column composition.
          Polymorphic via <code>as=&quot;main&quot; | &quot;article&quot;</code>.
          Used by Layout B pages: FAQ, practice area, geo-practice-area,
          service-area, blog post detail. Wraps in the canonical body
          band <code>px-[5%] py-12 md:py-16 lg:py-20</code>; grid is
          conditional on the <code>sidebar</code> prop (single-column
          fallback when absent).
        </Note>

        <div className="overflow-hidden rounded-ui border border-border">
          <ContentSidebarLayout
            sidebar={
              <Sidebar components={[{
                _componentType: 'sidebarCtaBox',
                header: 'Ready to talk?',
                supportingText1: 'Schedule a consultation.',
                phoneNumber: '(763) 560-5700',
                button: {title: 'Contact us', url: '/contact/'},
                layout: 'centered',
              }]} />
            }
          >
            <h1 className="text-page-h1 font-heading font-bold text-foreground">Family Law</h1>
            <p className="mt-4 font-body text-base text-foreground">
              Sample Layout B body content. ContentSidebarLayout pairs the
              main column with a 320px right-rail sidebar on lg breakpoint
              and above; below lg the layout stacks (sidebar collapses below
              content per BI-PRINCIPLES.md → Sidebar [Layout B] collapses
              below content on mobile, never hidden).
            </p>
            <p className="mt-4 font-body text-base text-foreground-muted">
              Sample body continues with realistic prose so the column
              measure is visible. Lorem ipsum dolor sit amet, consectetur
              adipiscing elit. The layout&rsquo;s body element defaults to{' '}
              <code>&lt;main&gt;</code>; blog post detail uses{' '}
              <code>as=&quot;article&quot;</code> instead.
            </p>
          </ContentSidebarLayout>
        </div>
      </section>

      {/* ── MobileDrawer ────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>MobileDrawer</Heading>
        <Note>
          Mobile nav drawer (Radix Portal mount; <code>data-ring-context=&quot;dark&quot;</code>{' '}
          for dark scheme; focus management on open/close). Renders at body
          level via Portal — click the trigger below to open. Press Escape,
          tap the close button, or tap the overlay to dismiss.
        </Note>

        <LightSurface>
          <MobileDrawerDemo />
        </LightSurface>
      </section>

      {/* ── HomepageHero (stays as stub) ────────────────────────────────── */}
      <section className="mb-12">
        <Heading>HomepageHero — awaiting component extraction</Heading>
        <Note>
          The homepage hero is composed inline on the homepage page route
          today — not yet a discrete <code>&lt;HomepageHero&gt;</code>{' '}
          primitive. <code>marketing-h1</code> + tagline + ButtonGroup +
          image. Will land as a discrete primitive during WS-Homepage; the
          Studio cell swaps to import it then.
        </Note>

        <div className="rounded-ui border border-border bg-muted p-6">
          <p className="text-sm font-semibold text-foreground">
            HomepageHero — stays as stub
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Populates when WS-Homepage extracts the inline homepage hero
            into a discrete <code>HomepageHero</code> primitive in{' '}
            <code>components/layout/</code> or{' '}
            <code>components/homepage/</code>.
          </p>
        </div>
      </section>

      {/* No remaining stubs in Layouts — all 25 stubs from WS11 are now
          rendered, replaced with cross-reference cards, or refined as
          stays-as-stub per WS12 pre-flight (only HomepageHero remains). */}
    </>
  )
}

// ─── Foundation panel helpers ────────────────────────────────────────────────

// Three-column row used by the palette-token swatches: visual swatch (color
// applied via the canonical Tailwind utility), token metadata block (name,
// utility, derivation source), and any extra notes. Cascade-aware tokens
// render twice (one row per surface); anchored tokens render once.
function PaletteRow({
  swatch,
  name,
  utility,
  derivation,
  notes,
}: {
  swatch: React.ReactNode
  name: string
  utility: string
  derivation: string
  notes?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 border-b border-border py-3 last:border-b-0 md:grid-cols-[8rem_1fr]">
      <div className="flex">{swatch}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          <code>{name}</code>
        </p>
        <p className="mt-0.5 text-xs text-foreground-muted">
          Utility: <code>{utility}</code>
        </p>
        <p className="mt-0.5 text-xs text-foreground-muted">{derivation}</p>
        {notes ? <p className="mt-1 text-xs text-foreground-muted">{notes}</p> : null}
      </div>
    </div>
  )
}

// Square color swatch — opaque fill. Used by anchored tokens.
function Swatch({className, label}: {className: string; label?: string}) {
  return (
    <div className={`flex h-16 w-32 items-end justify-start rounded-ui border border-border p-2 ${className}`}>
      {label ? <span className="text-xs font-semibold opacity-80">{label}</span> : null}
    </div>
  )
}

function FoundationPanel() {
  return (
    <>
      {/* ── Colors ─────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Colors</Heading>
        <Note>
          The platform derives an entire palette — 13 role tokens, 4 light-surface neutrals,
          4 inverse-neutrals, ring-focus, shadow-rgb, plus 8 cascade-aware consumer aliases
          and 7 anchored consumer aliases — from one to four hex inputs and a chosen approach.
          Everything is OKLCH-derived, WCAG-validated, and runtime-injected. See{' '}
          <code>BI/skills/skill-color-system/SKILL.md</code> for the full system; the sections
          below render the active client&rsquo;s palette as the visual contract.
        </Note>

        {/* ── Cascade-aware consumer aliases (8) ─────────────────────────── */}
        <Subheading>Cascade-aware consumer aliases (8)</Subheading>
        <Note>
          Each token resolves to a different value depending on whether it&rsquo;s rendered
          inside a <code>.bg-brand-dark</code> or <code>[data-ring-context=&quot;dark&quot;]</code>{' '}
          ancestor. Components reach for one utility name; the cascade swap happens in
          <code> globals.css</code>. The light value renders at <code>:root</code>; the dark
          value renders inside dark containers. Tokens marked with the cascade icon
          (cascade-aware) participate in this swap; anchored tokens (next subsection) do not.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <PaletteRow
                swatch={<div className="h-16 w-32 rounded-ui bg-foreground" />}
                name="--color-foreground"
                utility="text-foreground / bg-foreground / border-foreground"
                derivation="Body text. Branded near-black L 0.20 from primaryColor; cascades to on-dark variant."
              />
              <PaletteRow
                swatch={<div className="h-16 w-32 rounded-ui bg-foreground-muted" />}
                name="--color-foreground-muted"
                utility="text-foreground-muted"
                derivation="Supporting text. L 0.45; cascades to L 0.88 on dark."
              />
              <PaletteRow
                swatch={<div className="h-16 w-32 rounded-ui bg-foreground-subtle" />}
                name="--color-foreground-subtle"
                utility="text-foreground-subtle"
                derivation="Labels, metadata. L 0.65; cascades to L 0.78 on dark."
              />
              <PaletteRow
                swatch={<div className="h-16 w-32 rounded-ui border-2 border-border bg-background" />}
                name="--color-border"
                utility="border-border / bg-border / divide-border"
                derivation="Hairline divider. L 0.92 on light; cascades to L 0.38 warm hairline on dark."
              />
              <PaletteRow
                swatch={<div className="h-16 w-32 rounded-ui bg-accent" />}
                name="--color-accent"
                utility="text-accent / bg-accent / border-accent"
                derivation="Tagline / accent emphasis. role-tagline; cascades to brightTagline() on dark."
              />
              <PaletteRow
                swatch={<div className="h-16 w-32 rounded-ui bg-action-text" />}
                name="--color-action-text"
                utility="text-action-text / border-action-text"
                derivation="Outlined-button + tertiary text. AA-safe action-on-light fallback; cascades to raw action color on dark."
              />
              <PaletteRow
                swatch={
                  <div className="flex h-16 w-32 items-center justify-center rounded-ui bg-background ring-2 ring-focus ring-offset-2 ring-offset-background">
                    <span className="text-xs text-foreground-muted">ring</span>
                  </div>
                }
                name="--color-ring-focus"
                utility="ring-focus"
                derivation="Contrast-aware: action if ≥3:1 on white & muted, else brand-dark; on dark: action if ≥3:1 on brand-dark, else accent-on-dark."
              />
              <PaletteRow
                swatch={
                  <div className="flex h-16 w-32 items-center justify-center rounded-ui bg-hover-wash">
                    <span className="text-xs text-foreground-muted">hover wash</span>
                  </div>
                }
                name="--color-hover-wash"
                utility="bg-hover-wash / hover:bg-hover-wash"
                derivation="Subtle row-link hover: rgb(var(--shadow-rgb) / 0.06) on light; color-mix on foreground-on-dark @ 8% on dark."
              />
            </LightSurface>
          </div>

          <div>
            <Subheading>Dark surface (cascade resolved)</Subheading>
            <DarkSurface>
              <div className="space-y-3">
                <div className="grid grid-cols-1 items-center gap-3 border-b border-border py-3 md:grid-cols-[8rem_1fr]">
                  <div className="h-16 w-32 rounded-ui bg-foreground" />
                  <p className="text-sm text-foreground"><code>text-foreground</code> body text on dark</p>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 border-b border-border py-3 md:grid-cols-[8rem_1fr]">
                  <div className="h-16 w-32 rounded-ui bg-foreground-muted" />
                  <p className="text-sm text-foreground-muted"><code>text-foreground-muted</code> supporting text</p>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 border-b border-border py-3 md:grid-cols-[8rem_1fr]">
                  <div className="h-16 w-32 rounded-ui bg-foreground-subtle" />
                  <p className="text-sm text-foreground-subtle"><code>text-foreground-subtle</code> labels/metadata</p>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 border-b border-border py-3 md:grid-cols-[8rem_1fr]">
                  <div className="h-16 w-32 rounded-ui border-2 border-border" />
                  <p className="text-sm text-foreground-muted"><code>border-border</code> warm hairline</p>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 border-b border-border py-3 md:grid-cols-[8rem_1fr]">
                  <div className="h-16 w-32 rounded-ui bg-accent" />
                  <p className="text-sm text-accent"><code>text-accent</code> brightened tagline</p>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 border-b border-border py-3 md:grid-cols-[8rem_1fr]">
                  <div className="h-16 w-32 rounded-ui bg-action-text" />
                  <p className="text-sm text-action-text"><code>text-action-text</code> raw action color</p>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 border-b border-border py-3 md:grid-cols-[8rem_1fr]">
                  <div className="flex h-16 w-32 items-center justify-center rounded-ui bg-brand-dark ring-2 ring-focus ring-offset-2 ring-offset-brand-dark">
                    <span className="text-xs text-foreground-muted">ring</span>
                  </div>
                  <p className="text-sm text-foreground-muted"><code>ring-focus</code> dark variant</p>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 py-3 md:grid-cols-[8rem_1fr]">
                  <div className="flex h-16 w-32 items-center justify-center rounded-ui bg-hover-wash">
                    <span className="text-xs text-foreground-muted">hover wash</span>
                  </div>
                  <p className="text-sm text-foreground-muted"><code>bg-hover-wash</code> dark variant</p>
                </div>
              </div>
            </DarkSurface>
          </div>
        </div>

        {/* ── Anchored consumer aliases (7) ──────────────────────────────── */}
        <div className="mt-12">
          <Subheading>Anchored consumer aliases (7)</Subheading>
          <Note>
            These tokens stay at <code>:root</code> regardless of surface. Use them when the
            value should NOT track surface context — solid fills, alternation surfaces, and
            luminance-paired text on accent backgrounds. Never appear in the cascade rule.
          </Note>

          <LightSurface>
            <PaletteRow
              swatch={<Swatch className="bg-action text-action-fg" label="Aa" />}
              name="--color-action"
              utility="bg-action / text-action / border-action"
              derivation="Action button fill at rest. role-action — for analogous-accent: accent2; for complementary: action; for monochromatic: primary."
            />
            <PaletteRow
              swatch={<div className="flex h-16 w-32 items-center justify-center rounded-ui bg-action"><span className="text-xs font-semibold text-action-fg">action-fg</span></div>}
              name="--color-action-fg"
              utility="text-action-fg / bg-action-fg"
              derivation="Text on action fills. Luminance-paired: white if action passes AA on white; else branded near-black at L 0.20."
            />
            <PaletteRow
              swatch={<Swatch className="bg-action-hover" />}
              name="--color-action-hover"
              utility="bg-action-hover / hover:bg-action-hover"
              derivation="Action button on hover. actionHover() — auto-direction: lightens dark-text-on-light fills, darkens light-text-on-dark fills."
            />
            <PaletteRow
              swatch={<Swatch className="bg-muted" />}
              name="--color-muted"
              utility="bg-muted"
              derivation="Warm off-white section alternation surface. role-muted — accent1.tint (analogous-accent) or primary.tint (other approaches)."
            />
            <PaletteRow
              swatch={<div className="h-16 w-32 rounded-ui border border-border bg-background" />}
              name="--color-background"
              utility="bg-background"
              derivation="Brightest fill. Cards, modals, inputs. Default #ffffff."
            />
            <PaletteRow
              swatch={<Swatch className="bg-brand-dark" />}
              name="--color-brand-dark"
              utility="bg-brand-dark / text-brand-dark / ring-offset-brand-dark"
              derivation="Dark scrim color. role-brand-dark — primary.dark (L × 0.60). Doubles as the cascade trigger selector."
            />
            <PaletteRow
              swatch={<div className="flex h-16 w-32 items-center justify-center rounded-ui bg-accent"><span className="text-xs font-semibold text-accent-fg">accent-fg</span></div>}
              name="--color-accent-fg"
              utility="text-accent-fg"
              derivation="Text on accent fills (light-surface only — TopBar secondary). Luminance-paired against light-surface accent value."
            />
          </LightSurface>
        </div>

        {/* ── Static escape hatches + shadow-rgb ─────────────────────────── */}
        <div className="mt-12">
          <Subheading>Static escape hatches + shadow tinting</Subheading>
          <Note>
            <code>--color-foreground-on-light</code> is emitted at <code>:root</code> as a
            non-cascading copy of the light foreground value. Used by the canonical
            white-flip pattern: <code>[--color-foreground:var(--color-foreground-on-light)]</code>{' '}
            resets <code>--color-foreground</code> on a single component, opting it out of
            the dark-surface cascade. Reach for it on Button primary white-flip and any
            similar pattern. <code>--shadow-rgb</code> is an <code>R G B</code> triplet
            derived from <code>color-foreground-on-light</code> — every shadow layer
            references <code>rgb(var(--shadow-rgb) / α)</code> so shadows automatically
            retune to the brand palette.
          </Note>

          <LightSurface>
            <PaletteRow
              swatch={<div className="h-16 w-32 rounded-ui bg-foreground" />}
              name="--color-foreground-on-light"
              utility="[--color-foreground:var(--color-foreground-on-light)]"
              derivation="Static (non-cascading) escape hatch. Used by Button primary-on-dark white-flip."
            />
            <PaletteRow
              swatch={<div className="h-16 w-32 rounded-ui bg-action" />}
              name="--color-action-text-on-dark"
              utility="(cascade target — components use text-action-text)"
              derivation="Dark-variant target for action-text cascade. Equals raw action color."
            />
            <PaletteRow
              swatch={<div className="h-16 w-32 rounded-ui bg-accent-on-dark" />}
              name="--color-accent-on-dark"
              utility="(cascade target — components use text-accent or border-accent)"
              derivation="Dark-variant target for accent cascade. brightTagline(taglineHex) — L 0.88, C × 0.70."
            />
            <PaletteRow
              swatch={
                <div className="flex h-16 w-32 items-end justify-start rounded-ui bg-background p-1" style={{boxShadow: '0 4px 12px rgb(var(--shadow-rgb) / 0.08), 0 2px 4px rgb(var(--shadow-rgb) / 0.04)'}}>
                  <span className="text-xs font-semibold text-foreground-muted">shadow demo</span>
                </div>
              }
              name="--shadow-rgb"
              utility="rgb(var(--shadow-rgb) / α)"
              derivation="R G B triplet from color-foreground-on-light. Used by every shadow layer (card-rest, card-hover, elevation-sm/md/lg). Tints shadows per brand."
            />
          </LightSurface>
        </div>

        {/* ── Cascade demonstration ──────────────────────────────────────── */}
        <div className="mt-12">
          <Subheading>Cascade demonstration</Subheading>
          <Note>
            The same token classnames render different values inside a dark-surface
            ancestor. Both cards below use <code>text-foreground</code> and{' '}
            <code>border-border</code> — only the outer container differs.
          </Note>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-ui border border-border bg-background p-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                Light parent (no cascade trigger)
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">Heading uses text-foreground</h2>
              <p className="mt-2 text-sm text-foreground-muted">
                Body uses text-foreground-muted. Resolved at <code>:root</code>.
              </p>
              <hr className="my-3 border-border" />
              <p className="text-xs text-foreground-subtle">
                Hairline uses border-border (warm off-white L 0.92).
              </p>
            </div>
            <div className="rounded-ui bg-brand-dark p-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                Dark parent (cascade trigger active)
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">Heading uses text-foreground</h2>
              <p className="mt-2 text-sm text-foreground-muted">
                Body uses text-foreground-muted. Cascade swaps both to on-dark variants.
              </p>
              <hr className="my-3 border-border" />
              <p className="text-xs text-foreground-subtle">
                Hairline uses border-border (warm dark hairline L 0.38, brand-tinted).
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-foreground-muted">
            Bare elements (no cascade-aware className) inherit <code>:root</code> body color
            regardless of dark ancestor — see{' '}
            <code>skill-color-system → Cascade reassignment vs. computed-color inheritance</code>
            {' '}and the <code>platform/heading-cascade-discipline</code> ESLint rule.
          </p>
        </div>

        {/* ── Legitimate text-X on bg-Y combinations ─────────────────────── */}
        <div className="mt-12">
          <Subheading>Legitimate text-X on bg-Y combinations</Subheading>
          <Note>
            Every cell below is a cascade-correct, AA-passing pair sourced from the three
            token-element-map audits at <code>audits/WS0-2/token-element-map-*-audit.md</code>{' '}
            (Section C of each — translated to the current cascade-aware tokens via the WS5
            rename). Components reach for these utilities directly; the cascade resolves
            surface-aware tokens (foreground, foreground-muted, foreground-subtle, border,
            accent, action-text, ring-focus, hover-wash) per parent context.
          </Note>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Light-surface bg-background combinations */}
            <div>
              <Subheading>bg-background</Subheading>
              <div className="rounded-ui border border-border bg-background p-6 space-y-3">
                <p className="text-foreground">
                  <code>text-foreground</code> — body text. The default body color at <code>:root</code>.
                </p>
                <p className="text-foreground-muted">
                  <code>text-foreground-muted</code> — supporting / secondary text.
                </p>
                <p className="text-foreground-subtle">
                  <code>text-foreground-subtle</code> — labels, metadata, placeholder.
                </p>
                <p className="text-action-text">
                  <code>text-action-text</code> — outlined-button + tertiary CTA accent (AA-safe fallback).
                </p>
                <p className="tagline">tagline utility (text-accent) — decorative eyebrow</p>
              </div>
            </div>

            {/* Light-surface bg-muted combinations */}
            <div>
              <Subheading>bg-muted</Subheading>
              <div className="rounded-ui border border-border bg-muted p-6 space-y-3">
                <p className="text-foreground">
                  <code>text-foreground</code> — body text on alternation surface.
                </p>
                <p className="text-foreground-muted">
                  <code>text-foreground-muted</code> — supporting text on alternation surface.
                </p>
                <p className="text-foreground-subtle">
                  <code>text-foreground-subtle</code> — labels / metadata on alternation surface.
                </p>
                <p className="text-action-text">
                  <code>text-action-text</code> — outlined-button + tertiary CTA accent. AA-safe by validateWcag.
                </p>
              </div>
            </div>

            {/* Dark-surface bg-brand-dark combinations (cascade-resolved) */}
            <div>
              <Subheading>bg-brand-dark (cascade)</Subheading>
              <div data-ring-context="dark" className="rounded-ui bg-brand-dark p-6 space-y-3">
                <p className="text-foreground">
                  <code>text-foreground</code> — body text. Resolves to on-dark variant.
                </p>
                <p className="text-foreground-muted">
                  <code>text-foreground-muted</code> — supporting text on dark.
                </p>
                <p className="text-foreground-subtle">
                  <code>text-foreground-subtle</code> — labels/metadata on dark.
                </p>
                <p className="text-action-text">
                  <code>text-action-text</code> — resolves to raw action color (≥4.5:1 on brand-dark).
                </p>
                <p className="tagline">tagline utility (text-accent) — brightened tagline on dark</p>
              </div>
            </div>

            {/* Solid-fill combinations (anchored — luminance-paired by construction) */}
            <div>
              <Subheading>Solid-fill surfaces (anchored)</Subheading>
              <div className="space-y-3">
                <div className="rounded-ui bg-action p-6">
                  <p className="font-semibold text-action-fg">
                    <code>bg-action</code> + <code>text-action-fg</code>
                  </p>
                  <p className="mt-1 text-sm text-action-fg/90">
                    Luminance-paired by construction — validateWcag blocks publish if it fails 4.5:1.
                  </p>
                </div>
                <div className="rounded-ui bg-accent p-6">
                  <p className="font-semibold text-accent-fg">
                    <code>bg-accent</code> + <code>text-accent-fg</code>
                  </p>
                  <p className="mt-1 text-sm text-accent-fg/90">
                    TopBar secondary, light-surface only. validateWcag blocks publish if it fails AA.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <p className="mt-3 text-xs text-foreground-muted">
            Hairline divider, hover wash, and ring-focus also participate in the cascade and
            are demonstrated in the cascade demonstration above. <code>data-ring-context=&quot;dark&quot;</code>{' '}
            is the escape hatch for dark surfaces created by overlays/scrims rather than{' '}
            <code>.bg-brand-dark</code> directly (modal scrims, image-backed heroes, light-island
            inside dark cascade).
          </p>
        </div>

        {/* ── Forbidden / warning combinations (per validateWcag) ─────────── */}
        <div className="mt-12">
          <Subheading>Forbidden / warning combinations</Subheading>
          <Note>
            <code>validateWcag()</code> in <code>lib/designTokens.ts</code> distinguishes
            two failure modes: <strong>blocking</strong> pairs cannot publish (the platform
            refuses to ship a palette where they fail) and <strong>warning</strong> pairs
            surface in the Studio&rsquo;s <code>ColorPreview</code> panel for awareness without
            blocking publish. The cells below are the warning-only pairs — they look
            tempting (action-color text on warm-off-white surface; brightened-tagline on
            white) but fail 4.5:1 by construction. Do not reach for these in component
            class strings; the platform provides cascade-aware safe alternatives.
          </Note>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* text-action on bg-muted (warning) — intentional anti-pattern demo */}
            <div className="relative overflow-hidden rounded-ui border-2 border-foreground-muted bg-muted p-6">
              {/* eslint-disable-next-line platform/no-text-action-raw -- intentional forbidden-cell demonstration */}
              <p className="text-action">
                <code>text-action</code> on <code>bg-muted</code>
              </p>
              {/* eslint-disable-next-line platform/no-text-action-raw -- intentional forbidden-cell demonstration */}
              <p className="mt-1 text-sm text-action">
                Sample copy at the failing pair — H&amp;S amber on warm-cream is roughly 1.82:1
                contrast (well below 4.5:1 AA). Use <code>text-action-text</code> instead — the
                cascade-aware variant carries an AA-safe brand-dark fallback on light surfaces.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-ui border border-foreground-muted bg-background px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                  Warning
                </span>
                <span className="text-xs text-foreground-muted">
                  ~1.82:1 (fails AA 4.5:1 — non-blocking)
                </span>
              </div>
            </div>

            {/* text-accent on bg-muted (warning) */}
            <div className="relative overflow-hidden rounded-ui border-2 border-foreground-muted bg-muted p-6">
              <p className="text-accent">
                <code>text-accent</code> on <code>bg-muted</code>
              </p>
              <p className="mt-1 text-sm text-accent">
                Sample copy — accent (tagline color) on warm-cream is roughly 2.27:1 contrast.
                Tagline copy belongs on <code>bg-background</code> or <code>bg-brand-dark</code>{' '}
                (cascade-resolves to brightened accent-on-dark), not on <code>bg-muted</code>.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-ui border border-foreground-muted bg-background px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                  Warning
                </span>
                <span className="text-xs text-foreground-muted">
                  ~2.27:1 (fails AA — non-blocking)
                </span>
              </div>
            </div>

            {/* text-accent-on-dark on white (the documented incompatibility tripwire) */}
            <div className="relative overflow-hidden rounded-ui border-2 border-foreground-muted bg-background p-6 md:col-span-2">
              <p style={{color: 'var(--color-accent-on-dark)'}}>
                <code>text-accent-on-dark</code> on white (light surface)
              </p>
              <p className="mt-1 text-sm" style={{color: 'var(--color-accent-on-dark)'}}>
                Sample copy at the documented incompatibility tripwire. <code>accent-on-dark</code>{' '}
                is brightened to L 0.88 by <code>brightTagline()</code> specifically for pairing
                with brand-dark; against white it fails 4.5:1 by construction for every realistic
                palette. validateWcag surfaces this as <em>warning-only</em> so palette publish
                isn&rsquo;t blocked, but a component should never reach for{' '}
                <code>text-accent-on-dark</code> on a light surface — use cascade-aware{' '}
                <code>text-accent</code> instead and let the cascade resolve correctly per surface.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-ui border border-foreground-muted bg-muted px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                  Warning (tripwire)
                </span>
                <span className="text-xs text-foreground-muted">
                  fails 4.5:1 by construction — non-blocking
                </span>
              </div>
            </div>

          </div>

          <p className="mt-3 text-xs text-foreground-muted">
            Blocking pairs (action-fg on action, accent-fg on accent, foreground on muted,
            white on brand-dark, foreground-on-dark on brand-dark, accent-on-dark on
            brand-dark, action-text on white, action-text on muted) are NOT shown — every
            client palette must pass these by construction or the WCAG validator refuses
            to publish. The legitimate-combinations matrix above demonstrates the
            blocking-pair guarantees in action.
          </p>
        </div>
      </section>

      {/* Typography moved to the Typography tab in WS11 Commit 3. */}

      {/* ── Focus rings ────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Focus rings</Heading>
        <Note>
          Brand-derived, contrast-aware focus rings. Two ring tokens (one per surface);
          the cascade rule in <code>globals.css</code> auto-swaps inside{' '}
          <code>.bg-brand-dark</code> or <code>[data-ring-context=&quot;dark&quot;]</code>{' '}
          containers. Components reach for <code>focus-visible:ring-focus</code> once;
          the value resolves correctly per surface — no per-context override needed.
          Tab through the demos below to see the rings.
        </Note>

        {/* ── Cascade-aware ring on production primitives ───────────────── */}
        <Subheading>ring-focus on production primitives</Subheading>
        <Note>
          The same primitives — <code>Button</code>, <code>Input</code>,{' '}
          <code>IconButton</code> — render on light and dark surfaces using one
          ring-focus declaration each. Light-surface ring resolves to action-or-
          brand-dark fallback (whichever passes 3:1 on white & muted); dark-surface
          ring resolves to action-or-tagline-on-dark (whichever passes 3:1 on
          brand-dark). For H&amp;S burgundy palette: amber fails 3:1 on white →
          falls back to brand-dark; amber passes ~7.6:1 on brand-dark → uses amber
          directly.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col gap-4">
                <Button variant="primary" context="light" href="/contact/">Tab here</Button>
                <Input placeholder="Tab here — input ring" />
                <div className="flex">
                  <IconButton
                    icon={<MdChevronRight aria-hidden="true" />}
                    aria-label="Demo icon button"
                    surface="light"
                  />
                </div>
                <a
                  href="#focus-demo-anchor"
                  className="self-start text-sm text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover"
                >
                  Plain link — uses default :focus-visible outline (no Tailwind ring)
                </a>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface (cascade)</Subheading>
            <DarkSurface>
              <div className="flex flex-col gap-4">
                <Button variant="primary" context="dark" href="/contact/">Tab here</Button>
                <Input placeholder="Tab here — input ring" />
                <div className="flex">
                  <IconButton
                    icon={<MdChevronRight aria-hidden="true" />}
                    aria-label="Demo icon button"
                    surface="dark"
                  />
                </div>
                <a
                  href="#focus-demo-anchor"
                  className="self-start text-sm text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover"
                >
                  Plain link — default outline auto-swaps via cascade
                </a>
              </div>
            </DarkSurface>
          </div>
        </div>

        <p className="mt-3 text-xs text-foreground-muted">
          The Button primitive applies per-context ring overrides (
          <code>focus-visible:ring-white focus-visible:ring-offset-brand-dark</code>{' '}
          on dark) for finer control over offset color on solid action-colored fills —
          a documented &quot;belt and suspenders&quot; pattern in <code>skill-focus-rings → Per-component usage on Button</code>.
        </p>

        {/* ── data-ring-context escape hatch ───────────────────────────── */}
        <div className="mt-12">
          <Subheading>data-ring-context=&quot;dark&quot; escape hatch</Subheading>
          <Note>
            For dark surfaces created by overlays / scrims / portals (
            <code>BackgroundCtaSection</code> with a <code>bg-brand-dark/80</code>{' '}
            scrim, <code>MobileDrawer</code> via Radix Portal, <code>ReviewPageContent</code>{' '}
            trust band inside an otherwise light page), the <code>data-ring-context=&quot;dark&quot;</code>{' '}
            attribute triggers the same cascade swap as <code>.bg-brand-dark</code>{' '}
            without requiring the dark background class. The Studio also uses this
            attribute on every <code>DarkSurface</code> demo wrapper above.
          </Note>

          <div data-ring-context="dark" className="rounded-ui bg-brand-dark/80 p-6 backdrop-blur">
            <p className="text-sm text-foreground">
              This panel uses <code>bg-brand-dark/80</code> (not the canonical
              <code> .bg-brand-dark</code>) so the cascade rule wouldn&rsquo;t fire on its
              own. The <code>data-ring-context=&quot;dark&quot;</code> attribute on the wrapper
              makes the cascade swap kick in anyway.
            </p>
            <div className="mt-4 flex gap-3">
              <Button variant="primary" context="dark" href="/contact/">Tab here</Button>
              <Button variant="secondary" context="dark" href="/contact/">Tab here</Button>
            </div>
          </div>
        </div>

        {/* ── Inset-ring exception ─────────────────────────────────────── */}
        <div className="mt-12">
          <Subheading>Inset-ring exception (row-based UIs)</Subheading>
          <Note>
            One documented exception to the platform-wide outset-ring pattern:
            row-based UIs with <code>divide-y divide-border</code> separators use
            <code> focus-visible:ring-inset</code> instead. An outset ring with{' '}
            <code>ring-offset-2</code> would visually overlap the divider lines on
            adjacent rows, fighting the row UI&rsquo;s clean horizontal rhythm. Inset
            rings stay within the focused row&rsquo;s own bounds. Canonical consumer:{' '}
            <code>FaqAccordion</code>. See <code>skill-focus-rings → Intentional
            inset rings on row-based UIs</code> for the rationale lock.
          </Note>

          <LightSurface>
            <ul className="divide-y divide-border" role="list">
              {['Estate planning basics', 'Family law overview', 'Business law overview'].map(label => (
                <li key={label}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-foreground transition-colors duration-ui-fast hover:bg-hover-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                  >
                    <span>{label}</span>
                    <MdChevronRight aria-hidden="true" className="size-4 text-foreground-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </LightSurface>

          <p className="mt-3 text-xs text-foreground-muted">
            Tab through the rows above to see the inset ring. Reach for{' '}
            <code>ring-inset</code> only when the focused element is a row inside a
            divided list and the outset ring would conflict with dividers; default
            elsewhere is <code>focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus</code>.
          </p>
        </div>
      </section>

      {/* ── Motion ─────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Motion</Heading>
        <Note>
          Two motion tiers. <strong>UI tokens</strong> (
          <code>duration-ui-fast / -base / -slow</code>) scale per client via{' '}
          <code>motionTempo</code> — used for hover transitions, button states,
          tertiary-arrow nudges, anything that&rsquo;s a direct response to user input
          on a single element. <strong>Structural tokens</strong> (
          <code>duration-structural-fast / -base / -slow</code>) are fixed across
          all clients — used for dropdowns, modals, drawers, subnav animations,
          anything that&rsquo;s a floating UI element materializing or dismissing.
          Hover any demo cell below to see the transition fire at the cell&rsquo;s
          duration.
        </Note>

        {/* ── motionTempo catalog ─────────────────────────────────────── */}
        <Subheading>UI tokens — motionTempo catalog</Subheading>
        <Note>
          Three tempo presets sourced from <code>MOTION_TEMPO_MAP</code> in{' '}
          <code>lib/designTokens.ts</code> — the same map{' '}
          <code>buildDesignTokenCSS</code> reads from{' '}
          <code>designSettings.motionTempo</code>. Each cell below applies inline
          CSS variable overrides for <code>--motion-ui-fast / -base / -slow</code>{' '}
          drawn from the canonical map; the children use the standard{' '}
          <code>duration-ui-*</code> Tailwind utilities.
        </Note>

        <LightSurface>
          <div className="space-y-6">
            {(['snappy', 'balanced', 'relaxed'] as const).map(tempo => {
              const tokens = MOTION_TEMPO_MAP[tempo]
              if (!tokens) return null
              const styleVars = {
                '--motion-ui-fast': tokens.uiFast,
                '--motion-ui-base': tokens.uiBase,
                '--motion-ui-slow': tokens.uiSlow,
              } as React.CSSProperties
              const labels: Record<typeof tempo, string> = {
                snappy:   'snappy — fast, contemporary feel (industry baseline)',
                balanced: 'balanced — neutral modern pace',
                relaxed:  'relaxed — deliberate, premium feel (default)',
              }
              return (
                <div key={tempo} style={styleVars}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                    {labels[tempo]}
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="cursor-default rounded-ui bg-muted p-3 text-sm text-foreground transition-colors duration-ui-fast hover:bg-action hover:text-action-fg">
                      <code>duration-ui-fast</code>
                      <span className="ml-2 text-xs text-foreground-muted">({tokens.uiFast})</span>
                    </div>
                    <div className="cursor-default rounded-ui bg-muted p-3 text-sm text-foreground transition-colors duration-ui-base hover:bg-action hover:text-action-fg">
                      <code>duration-ui-base</code>
                      <span className="ml-2 text-xs text-foreground-muted">({tokens.uiBase})</span>
                    </div>
                    <div className="cursor-default rounded-ui bg-muted p-3 text-sm text-foreground transition-colors duration-ui-slow hover:bg-action hover:text-action-fg">
                      <code>duration-ui-slow</code>
                      <span className="ml-2 text-xs text-foreground-muted">({tokens.uiSlow})</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </LightSurface>

        <p className="mt-3 text-xs text-foreground-muted">
          The active client&rsquo;s tempo is whatever <code>:root</code> emits — overrides
          above demonstrate what each preset would feel like at the editor&rsquo;s
          chosen pace.
        </p>

        {/* ── Structural durations (fixed) ────────────────────────────── */}
        <div className="mt-12">
          <Subheading>Structural tokens — fixed across clients</Subheading>
          <Note>
            Floating UI durations don&rsquo;t scale with <code>motionTempo</code> — the
            premium floating-UI feel depends on staying consistent across
            deployments. Sourced from <code>STRUCTURAL_DURATIONS</code> in{' '}
            <code>lib/designTokens.ts</code>: <code>fast={STRUCTURAL_DURATIONS.fast}</code>,{' '}
            <code>base={STRUCTURAL_DURATIONS.base}</code>,{' '}
            <code>slow={STRUCTURAL_DURATIONS.slow}</code>. Hover the cells below to
            confirm — their duration stays identical across the catalog above.
          </Note>

          <LightSurface>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="cursor-default rounded-ui bg-muted p-3 text-sm text-foreground transition-colors duration-structural-fast hover:bg-action hover:text-action-fg">
                <code>duration-structural-fast</code>
                <span className="ml-2 text-xs text-foreground-muted">({STRUCTURAL_DURATIONS.fast})</span>
              </div>
              <div className="cursor-default rounded-ui bg-muted p-3 text-sm text-foreground transition-colors duration-structural-base hover:bg-action hover:text-action-fg">
                <code>duration-structural-base</code>
                <span className="ml-2 text-xs text-foreground-muted">({STRUCTURAL_DURATIONS.base})</span>
              </div>
              <div className="cursor-default rounded-ui bg-muted p-3 text-sm text-foreground transition-colors duration-structural-slow hover:bg-action hover:text-action-fg">
                <code>duration-structural-slow</code>
                <span className="ml-2 text-xs text-foreground-muted">({STRUCTURAL_DURATIONS.slow})</span>
              </div>
            </div>
          </LightSurface>

          <p className="mt-3 text-xs text-foreground-muted">
            Framer Motion configs in <code>lib/motionConfig.ts</code> map structural
            tokens to seconds-based API (drawer = 0.4, dropdown = 0.4, subnav = 0.25,
            chevron = 0.15, crossfade = 0.15) for JS-driven animations. CSS-driven
            transitions read the variables directly via the <code>duration-structural-*</code>{' '}
            utilities.
          </p>
        </div>

        {/* ── Reduced-motion handling ─────────────────────────────────── */}
        <div className="mt-12">
          <Subheading>Reduced motion</Subheading>
          <Note>
            <code>@media (prefers-reduced-motion: reduce)</code> in{' '}
            <code>globals.css</code> clamps all six duration variables to{' '}
            <code>10ms</code> (not <code>0ms</code> — avoids jump-cut artifacts in
            max-height collapse animations) and applies{' '}
            <code>animation-duration: 10ms !important</code> +{' '}
            <code>animation-iteration-count: 1 !important</code> on the universal{' '}
            <code>*</code> selector. CSS-driven transitions and animations both
            collapse automatically — components don&rsquo;t need per-element handling.
          </Note>
          <Note>
            Framer Motion JS-driven animations respect the same preference via the{' '}
            <code>&lt;MotionRoot&gt;</code> wrapper at{' '}
            <code>components/ui/MotionRoot.tsx</code>, which applies{' '}
            <code>&lt;MotionConfig reducedMotion=&quot;user&quot;&gt;</code> at the (site) layout
            boundary. Drawer slides, dropdown fades, submenu accordion, hamburger
            morph, filter crossfade — all opt in to the OS-level preference.
          </Note>

          <LightSurface>
            <p className="text-sm text-foreground">
              Verify in macOS System Settings → Accessibility → Display → Reduce
              motion. With the preference enabled, hover-driven cells above should
              feel instant; structural drawer/dropdown animations across the site
              should also collapse to ~10ms.
            </p>
          </LightSurface>
        </div>
      </section>

      {/* ── Spacing ────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Spacing</Heading>
        <Note>
          Spacing follows Tailwind&rsquo;s native scale (no per-client tunability) — the
          discipline lives in <code>BI-PRINCIPLES.md → Tailwind / styling discipline</code>{' '}
          (&ldquo;Always use Tailwind&rsquo;s native scale steps — never arbitrary values&rdquo;).
          This section documents the platform&rsquo;s locked spacing patterns:
          <strong> section vertical rhythm</strong>, <strong>section padding scale</strong>,
          and <strong>common gap values</strong> used in Button groups, card grids, and
          tagline/heading composition.
        </Note>

        {/* ── Section vertical rhythm system ─────────────────────────── */}
        <Subheading>Section vertical rhythm — 3 tiers</Subheading>
        <Note>
          The Tagline → h2 → description rhythm pairs the h2&rsquo;s trailing margin with
          its type scale (per <code>skill-typography → Section vertical rhythm system</code>).
          Tagline-to-h2 stays constant at 12px (<code>mb-3</code>); h2-to-description
          scales up with larger headings. Three production tiers:
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Standard tier */}
          <LightSurface>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
              Standard tier
            </p>
            <Tagline>Experienced</Tagline>
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Section heading
            </h2>
            <p className="text-foreground-muted">
              Description copy at base size. Rhythm: Tagline <code>mb-3</code>{' '}
              (12px) → h2 <code>mb-4</code> (16px). Most section blocks use this
              tier — testimonials grid, video section, attorneys section, FAQ.
            </p>
          </LightSurface>

          {/* Larger tier */}
          <LightSurface>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
              Larger tier
            </p>
            <Tagline>Experienced</Tagline>
            <h2 className="mb-5 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
              Section heading
            </h2>
            <p className="text-foreground-muted">
              Rhythm: Tagline <code>mb-3</code> (12px) → h2 <code>mb-5</code>{' '}
              (20px). Used by CtaSection split + background variants where the
              h2 grows to lg:text-5xl.
            </p>
          </LightSurface>

          {/* Largest tier */}
          <LightSurface>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
              Largest tier
            </p>
            <Tagline>Experienced</Tagline>
            <h2 className="mb-5 text-4xl font-bold text-foreground md:mb-6 md:text-5xl lg:text-6xl">
              Section heading
            </h2>
            <p className="text-foreground-muted md:text-md">
              Rhythm: Tagline <code>mb-3</code> → h2 <code>mb-5 md:mb-6</code>{' '}
              (20→24px responsive). GlobalCta uses this tier — display headline
              with proportional breath before the body copy.
            </p>
          </LightSurface>
        </div>

        <p className="mt-3 text-xs text-foreground-muted">
          Ownership convention: the h2 owns its trailing gap (<code>mb-X</code> on the
          h2, never <code>mt-X</code> on the description). Conditional descriptions
          don&rsquo;t break spacing; tier consistency reads from the h2 alone. See{' '}
          <code>skill-typography → Ownership convention</code>.
        </p>

        {/* ── Section padding scale ──────────────────────────────────── */}
        <div className="mt-12">
          <Subheading>Section padding scale (mobile-first responsive)</Subheading>
          <Note>
            Mobile <code>py-8</code> (2rem) section padding is the platform&rsquo;s locked
            mobile baseline per <code>BI-PRINCIPLES.md → Mobile best practices</code>.
            Internal pages typically scale up to <code>py-12</code>{' '}
            (3rem) at md and <code>py-16</code> or <code>py-20</code> at lg
            depending on section weight. The Studio&rsquo;s own outer{' '}
            <code>&lt;main&gt;</code> uses{' '}
            <code>px-[5%] py-12 md:py-16 lg:py-20</code> — the canonical
            section gutter pattern (<code>px-[5%]</code> is documented in{' '}
            <code>skill-color-system</code> Pattern 1 examples; not arbitrary drift).
          </Note>

          <LightSurface>
            <div className="rounded-ui bg-muted py-8 px-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                py-8 (2rem) — mobile baseline
              </p>
              <p className="mt-2 text-sm text-foreground">Section content area.</p>
            </div>
            <div className="mt-3 rounded-ui bg-muted py-12 px-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                py-12 (3rem) — md scale-up
              </p>
              <p className="mt-2 text-sm text-foreground">Section content area.</p>
            </div>
            <div className="mt-3 rounded-ui bg-muted py-16 px-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                py-16 (4rem) — lg scale-up (medium-weight sections)
              </p>
              <p className="mt-2 text-sm text-foreground">Section content area.</p>
            </div>
            <div className="mt-3 rounded-ui bg-muted py-20 px-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                py-20 (5rem) — lg scale-up (heavy sections)
              </p>
              <p className="mt-2 text-sm text-foreground">Section content area.</p>
            </div>
          </LightSurface>
        </div>

        {/* ── Common gap values ────────────────────────────────────── */}
        <div className="mt-12">
          <Subheading>Common gap values</Subheading>
          <Note>
            Gap utilities (Tailwind native scale) used across platform layouts —
            ButtonGroup, card grids, chip rows, tagline composition.
          </Note>

          <LightSurface>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                  gap-2 (0.5rem) — tight chip rows, inline metadata
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip icon="calendar">Mar 15</Chip>
                  <Chip icon="clock">10am</Chip>
                  <Chip icon="map-pin">Springfield</Chip>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                  gap-3 (0.75rem) — chip + tag mixed lists, default ChipGroup
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="secondary" size="small" href="#">Estate Planning</Button>
                  <Button variant="secondary" size="small" href="#">Family Law</Button>
                  <Chip icon="bookmark">Adoption</Chip>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                  gap-4 (1rem) — ButtonGroup default; card stacks
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="primary" href="/contact/">Primary CTA</Button>
                  <Button variant="secondary" href="/contact/">Secondary CTA</Button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                  gap-6 (1.5rem) — card grids, two-column layouts
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="rounded-ui border border-border bg-background p-4">
                    <p className="text-sm text-foreground">Card column 1</p>
                  </div>
                  <div className="rounded-ui border border-border bg-background p-4">
                    <p className="text-sm text-foreground">Card column 2</p>
                  </div>
                </div>
              </div>
            </div>
          </LightSurface>
        </div>
      </section>

      {/* ── Border radius ──────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Border radius</Heading>
        <Note>
          Two independent radius systems per <code>skill-radius-system</code>.{' '}
          <strong>UI radius</strong> (<code>--radius-ui</code> →{' '}
          <code>rounded-ui</code>) applies to cards, images, form fields, panels,
          chips. <strong>Button radius</strong> (<code>--radius-btn</code> →{' '}
          <code>rounded-btn</code>) applies to buttons only. Both have an option
          named <code>rounded</code> — at different pixel values (8px UI vs 6px
          button). Independence by design: a client can pair subtle UI radius
          (4px) with pill buttons (9999px), or soft UI radius (16px) with square
          buttons (0px), without one overriding the other.
        </Note>

        {/* ── UI radius catalog ──────────────────────────────────────── */}
        <Subheading>UI radius catalog (uiRadius)</Subheading>
        <Note>
          Four presets sourced from <code>UI_RADIUS_MAP</code> in{' '}
          <code>lib/designTokens.ts</code>. Each cell applies an inline{' '}
          <code>--radius-ui</code> override drawn from the canonical map; the
          inner card uses the standard <code>rounded-ui</code> utility.
        </Note>

        <LightSurface>
          <ul role="list" aria-label="UI radius options" className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {(['sharp', 'subtle', 'rounded', 'soft'] as const).map(key => {
              const value = UI_RADIUS_MAP[key]
              return (
                <li key={key} style={{'--radius-ui': value} as React.CSSProperties}>
                  <div className="rounded-ui border border-border bg-background p-6">
                    <p className="text-sm font-semibold text-foreground">{key}</p>
                    <p className="mt-1 text-xs text-foreground-muted"><code>{value}</code></p>
                  </div>
                </li>
              )
            })}
          </ul>
        </LightSurface>

        <p className="mt-3 text-xs text-foreground-muted">
          Active uiRadius applies to all <code>rounded-ui</code> consumers
          site-wide: cards (BlogIndex, AttorneyIndex, TestimonialCard),
          images (Next.js Image with rounded-ui className), form fields
          (Input, Select), panels (SidebarPanel), chips (PracticeAreaChip),
          internal hero rounded corners.
        </p>

        {/* ── Button shape catalog ───────────────────────────────────── */}
        <div className="mt-12">
          <Subheading>Button shape catalog (buttonShape)</Subheading>
          <Note>
            Four presets sourced from <code>BUTTON_SHAPE_MAP</code> in{' '}
            <code>lib/designTokens.ts</code>. Each cell applies an inline{' '}
            <code>--radius-btn</code> override; the inner button is the real{' '}
            <code>Button</code> primitive (which uses <code>rounded-btn</code> internally).
            Same primitive, different shapes per cell.
          </Note>

          <LightSurface>
            <ul role="list" aria-label="Button shape options" className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(['square', 'rounded', 'stadium', 'pill'] as const).map(key => {
                const value = BUTTON_SHAPE_MAP[key]
                return (
                  <li key={key} style={{'--radius-btn': value} as React.CSSProperties}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
                      {key} — <code>{value}</code>
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="primary" href="/contact/">Primary</Button>
                      <Button variant="secondary" href="/contact/">Secondary</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </LightSurface>
        </div>

        {/* ── Independence demonstration ─────────────────────────────── */}
        <div className="mt-12">
          <Subheading>Independence demonstration</Subheading>
          <Note>
            UI radius and button shape are independent — a card on a page can
            render at one radius while the buttons inside it render at another.
            The pairings below combine non-matching options to show how the
            tokens stay isolated. <code>rounded-md</code>, <code>rounded-lg</code>,
            and other Tailwind built-in radius utilities are forbidden on platform
            components per <code>skill-radius-system → Anti-patterns</code> —
            they bypass the design-system tokens and won&rsquo;t tune per client.
          </Note>

          <LightSurface>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div style={{'--radius-ui': UI_RADIUS_MAP.sharp, '--radius-btn': BUTTON_SHAPE_MAP.pill} as React.CSSProperties}>
                <div className="rounded-ui border border-border bg-background p-6">
                  <p className="text-sm font-semibold text-foreground">Sharp card + pill buttons</p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    uiRadius = <code>sharp</code> (0px); buttonShape = <code>pill</code> (9999px)
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="primary" href="/contact/">Primary</Button>
                    <Button variant="secondary" href="/contact/">Secondary</Button>
                  </div>
                </div>
              </div>
              <div style={{'--radius-ui': UI_RADIUS_MAP.soft, '--radius-btn': BUTTON_SHAPE_MAP.square} as React.CSSProperties}>
                <div className="rounded-ui border border-border bg-background p-6">
                  <p className="text-sm font-semibold text-foreground">Soft card + square buttons</p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    uiRadius = <code>soft</code> (16px); buttonShape = <code>square</code> (0px)
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="primary" href="/contact/">Primary</Button>
                    <Button variant="secondary" href="/contact/">Secondary</Button>
                  </div>
                </div>
              </div>
            </div>
          </LightSurface>
        </div>
      </section>

      {/* ── Elevation ──────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Elevation</Heading>
        <Note>
          Two parallel elevation families per <code>skill-elevation-system → Two
          elevation families</code>. <strong>Card-runtime</strong> (
          <code>shadow-card-rest</code> / <code>shadow-card-hover</code> +{' '}
          <code>card-lift</code>) drives content cards (testimonials, blog cards,
          attorney cards, sidebar widgets) — tunable per client via{' '}
          <code>elevationStyle</code>. <strong>Structural-fixed</strong> (
          <code>shadow-elevation-sm/md/lg</code>) drives floating chrome (modals,
          dropdown panels, <code>&lt;BackToTop&gt;</code>) — fixed values, do not
          retune per client. Every layer references{' '}
          <code>rgb(var(--shadow-rgb) / α)</code> so shadows automatically retune
          to the brand palette&rsquo;s warm/cool character.
        </Note>

        {/* ── Card-runtime catalog (5 levels) ──────────────────────────── */}
        <Subheading>Card-runtime family — elevationStyle catalog</Subheading>
        <Note>
          Five levels (0 flat / 1 whisper / 2 soft / 4 defined / 6 bold) sourced
          from <code>ELEVATION_STYLE_MAP</code> in <code>lib/designTokens.ts</code>.
          Each cell applies inline <code>--shadow-card-rest</code>,{' '}
          <code>--shadow-card-hover</code>, and <code>--transform-card-hover</code>{' '}
          overrides drawn from the canonical map; inner cards use the standard{' '}
          <code>shadow-card-rest hover:shadow-card-hover hover:card-lift</code>{' '}
          composition. Hover any card to see the lift + shadow change at the
          level&rsquo;s pace (UI-tier motion: <code>duration-ui-slow</code>).
          Gaps at levels 3 and 5 are intentional — they leave room for future
          intermediate levels without renumbering.
        </Note>

        <LightSurface>
          <ul role="list" aria-label="Elevation levels" className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {(['0', '1', '2', '4', '6'] as const).map(level => {
              const tokens = ELEVATION_STYLE_MAP[level]
              if (!tokens) return null
              const styleVars = {
                '--shadow-card-rest':     tokens.rest,
                '--shadow-card-hover':    tokens.hover,
                '--transform-card-hover': tokens.transform,
              } as React.CSSProperties
              const labels: Record<typeof level, string> = {
                '0': 'Flat',
                '1': 'Whisper',
                '2': 'Soft',
                '4': 'Defined',
                '6': 'Bold',
              }
              return (
                <li key={level} style={styleVars}>
                  <div className="rounded-ui border border-border bg-background p-6 shadow-card-rest transition-[translate,box-shadow,border-color] duration-ui-slow ease-smooth hover:border-action hover:shadow-card-hover hover:card-lift">
                    <p className="text-sm font-semibold text-foreground">Level {level} — {labels[level]}</p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      Lift: <code>{tokens.transform}</code>
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </LightSurface>

        <p className="mt-3 text-xs text-foreground-muted">
          Level 0 = no shadow, no lift (editorial flat). Level 1 = 2-layer shadow,
          no lift (subtle separation). Levels 2/4/6 add hover lift (-1px / -2px /
          -3px) plus a deeper shadow stack on hover. Level 4 and 6 use a 3-layer
          composition (contact + primary + ambient light) for atmospheric depth.
          Card hover is UI-tier motion (<code>duration-ui-slow</code>), not
          structural — direct user feedback that scales with the client&rsquo;s{' '}
          <code>motionTempo</code>.
        </p>

        {/* ── Structural-fixed family (3 levels) ────────────────────── */}
        <div className="mt-12">
          <Subheading>Structural-fixed family — floating chrome</Subheading>
          <Note>
            Three fixed levels (<code>shadow-elevation-sm</code> /{' '}
            <code>-md</code> / <code>-lg</code>) defined in <code>globals.css</code>{' '}
            <code>@theme</code> block — NOT tunable per client. Used for floating
            UI where consistency matters more than per-brand personality: dropdowns
            (md), modals (lg), <code>&lt;BackToTop&gt;</code> rest (md) and hover (lg).
            Pair with structural-tier motion when animated.
          </Note>

          <LightSurface>
            <ul role="list" aria-label="Structural elevation levels" className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <li className="rounded-ui border border-border bg-background p-6 shadow-elevation-sm">
                <p className="text-sm font-semibold text-foreground">
                  <code>shadow-elevation-sm</code>
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Subtle light floating chrome.
                </p>
              </li>
              <li className="rounded-ui border border-border bg-background p-6 shadow-elevation-md">
                <p className="text-sm font-semibold text-foreground">
                  <code>shadow-elevation-md</code>
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Dropdown panels; BackToTop rest.
                </p>
              </li>
              <li className="rounded-ui border border-border bg-background p-6 shadow-elevation-lg">
                <p className="text-sm font-semibold text-foreground">
                  <code>shadow-elevation-lg</code>
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Modal panels; BackToTop hover.
                </p>
              </li>
            </ul>
          </LightSurface>

          <p className="mt-3 text-xs text-foreground-muted">
            Reach for <code>shadow-elevation-*</code> by role: content cards →
            card-runtime family; floating chrome → structural-fixed. Don&rsquo;t mix —
            a modal with <code>shadow-card-rest</code> would retune per client
            (wrong), a content card with <code>shadow-elevation-md</code> would
            stay fixed regardless of <code>elevationStyle</code> (also wrong).
          </p>
        </div>

        {/* ── shadow-rgb + card-lift cross-references ───────────────── */}
        <div className="mt-12">
          <Subheading>Brand-derived shadow color (shadow-rgb)</Subheading>
          <Note>
            <code>--shadow-rgb</code> is an <code>R G B</code> triplet derived
            from <code>color-foreground-on-light</code> (see Colors section for
            the swatch demo). Every shadow layer references{' '}
            <code>rgb(var(--shadow-rgb) / α)</code> so shadows pick up the
            brand&rsquo;s warm or cool character. H&amp;S burgundy → faintly warm
            shadows; navy primary → faintly cool. Alphas are all &lt; 0.10 — the
            shadows are felt rather than seen.
          </Note>
          <Note>
            <code>card-lift</code> utility translates the card up by{' '}
            <code>--transform-card-hover</code> on hover (0px / 0px / -1px / -2px
            / -3px for levels 0/1/2/4/6). Always pair with the level&rsquo;s
            hover shadow — lift without shadow change feels disconnected from
            physics; the surface should both rise and cast more shadow as it does.
            Reach for <code>&lt;CardLink&gt;</code> when the whole card surface
            is a link — it bakes the composition in.
          </Note>
        </div>
      </section>
    </>
  )
}

function ButtonsPanel() {
  return (
    <>
      {/* ── Variants × contexts ──────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Variants × contexts</Heading>
        <Note>
          Secondary is now neutral outline (was brand-colored outline). Primary on dark
          is now white-fill (was amber-fill).
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" context="light" href="/contact/">Primary CTA</Button>
                <Button variant="secondary" context="light" href="/contact/">Secondary CTA</Button>
                <Button variant="tertiary" context="light" href="/contact/">Tertiary CTA</Button>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" context="dark" href="/contact/">Primary CTA</Button>
                <Button variant="secondary" context="dark" href="/contact/">Secondary CTA</Button>
                <Button variant="tertiary" context="dark" href="/contact/">Tertiary CTA</Button>
              </div>
            </DarkSurface>
          </div>
        </div>
      </section>

      {/* ── Sizes ────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Sizes</Heading>
        <Note>
          Three sizes — small (px-4 py-1.5 text-xs), compact (px-5 py-2.5 text-sm), normal
          (px-6 py-3 text-sm). Tertiary ignores size — its typography stays text-base font-medium.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Primary</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" size="small" href="/contact/">Small</Button>
                <Button variant="primary" size="compact" href="/contact/">Compact</Button>
                <Button variant="primary" size="normal" href="/contact/">Normal</Button>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Secondary</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="secondary" size="small" href="/contact/">Small</Button>
                <Button variant="secondary" size="compact" href="/contact/">Compact</Button>
                <Button variant="secondary" size="normal" href="/contact/">Normal</Button>
              </div>
            </LightSurface>
          </div>
        </div>
      </section>

      {/* ── fullWidth ────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>fullWidth</Heading>
        <Note>
          <code>fullWidth</code> applies <code>w-full</code> on the base. Demos are
          capped at <code>max-w-sm</code> (Tailwind native step) so the fill behavior is
          visible. Tertiary ignores fullWidth.
        </Note>

        <div className="max-w-sm border border-border p-4 rounded-ui">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
            Primary fullWidth
          </p>
          <Button variant="primary" fullWidth href="/contact/">Schedule a consultation</Button>
        </div>

        <div className="max-w-sm border border-border p-4 rounded-ui mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground-muted">
            Secondary fullWidth
          </p>
          <Button variant="secondary" fullWidth href="/contact/">Email our team</Button>
        </div>
      </section>

      {/* ── Tertiary arrow position ──────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Tertiary arrow position</Heading>
        <Note>
          Default <code>trailing</code> arrow nudges right on hover; <code>leading</code> arrow
          nudges left. Use leading for sidebar nav rows where the arrow precedes the label.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Light surface</Subheading>
            <LightSurface>
              <div className="flex flex-col items-start gap-4">
                <Button variant="tertiary" context="light" href="/about/">Trailing arrow (default)</Button>
                <Button variant="tertiary" context="light" arrowPosition="leading" href="/about/">Leading arrow</Button>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Dark surface</Subheading>
            <DarkSurface>
              <div className="flex flex-col items-start gap-4">
                <Button variant="tertiary" context="dark" href="/about/">Trailing arrow (default)</Button>
                <Button variant="tertiary" context="dark" arrowPosition="leading" href="/about/">Leading arrow</Button>
              </div>
            </DarkSurface>
          </div>
        </div>
      </section>

      {/* ── States ───────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>States</Heading>
        <Note>
          Hover (mouseover), active (mousedown / touch), focus (Tab key), disabled, loading.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Subheading>Primary</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" href="/contact/">Idle</Button>
                <Button variant="primary" disabled>Disabled</Button>
                <Button variant="primary" loading>Loading</Button>
              </div>
            </LightSurface>
          </div>
          <div>
            <Subheading>Secondary</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="secondary" href="/contact/">Idle</Button>
                <Button variant="secondary" disabled>Disabled</Button>
                <Button variant="secondary" loading>Loading</Button>
              </div>
            </LightSurface>
          </div>
        </div>
      </section>

      {/* ── Animation modes ──────────────────────────────────────────────── */}
      <section className="mb-12">
        <Heading>Animation modes</Heading>
        <Note>
          <code>buttonAnimation</code> Sanity field controls site-wide hover animation
          for primary + secondary buttons. Each demo wrapper sets <code>data-button-animation</code>
          to override the document default — hover each button to see the mode. Tertiary
          is excluded from animation (hover any tertiary in the section above with any
          mode active to confirm). Each animation collapses to no-op under
          <code> prefers-reduced-motion: reduce</code>.
        </Note>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          <div data-button-animation="none">
            <Subheading>None — color hover only</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" href="/contact/">Primary</Button>
                <Button variant="secondary" href="/contact/">Secondary</Button>
              </div>
            </LightSurface>
          </div>

          <div data-button-animation="sweep">
            <Subheading>Sweep — fills left to right</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" href="/contact/">Primary</Button>
                <Button variant="secondary" href="/contact/">Secondary</Button>
              </div>
            </LightSurface>
          </div>

          <div data-button-animation="fill-center">
            <Subheading>Fill-center — fills from center outward</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" href="/contact/">Primary</Button>
                <Button variant="secondary" href="/contact/">Secondary</Button>
              </div>
            </LightSurface>
          </div>

          <div data-button-animation="inset">
            <Subheading>Inset — pressed-in shadow depth on hover</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" href="/contact/">Primary</Button>
                <Button variant="secondary" href="/contact/">Secondary</Button>
              </div>
            </LightSurface>
          </div>

          <div data-button-animation="lift">
            <Subheading>Lift — translateY + shadow on hover</Subheading>
            <LightSurface>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" href="/contact/">Primary</Button>
                <Button variant="secondary" href="/contact/">Secondary</Button>
              </div>
            </LightSurface>
          </div>

        </div>
      </section>
    </>
  )
}

// ─── Tagline style catalog ───────────────────────────────────────────────────
// Catalog mode: read from the canonical TAGLINE_STYLE_MAP in lib/designTokens.ts
// (the same map buildDesignTokenCSS emits to :root from designSettings.taglineStyle).
// Studio renders all three styles as a catalog of available options sourced
// from the canonical map — never duplicates the values inline. See
// BI-FOUNDATIONS.md → "Design Studio = visual contract" → Catalog mode vs
// active mode for the doctrine.

const TAGLINE_STYLE_LABELS: Record<TaglineStyle, string> = {
  plain:     'Plain',
  lined:     'Lined',
  titlecase: 'Title Case',
}

const TAGLINE_STYLE_KEYS = Object.keys(TAGLINE_STYLE_MAP) as ReadonlyArray<TaglineStyle>

// Small descriptive caption above each variant. Replaces the verbose CodeLabel
// pattern — keeps callouts brief and lets the visual do the talking.
function VariantLabel({children}: {children: React.ReactNode}) {
  return <p className="mb-2 text-xs text-foreground-muted">{children}</p>
}

// "Used on" documentation block — appears below each section's preview grid.
// Concise list of real platform consumer locations.
function UsedOn({children}: {children: React.ReactNode}) {
  return (
    <div className="mt-4 rounded-ui border border-border bg-muted px-4 py-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-foreground-muted">Used on</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground-muted">
        {children}
      </ul>
    </div>
  )
}

// ─── Client island ────────────────────────────────────────────────────────────

export function DesignStudioClient() {
  // Default to "foundation" — the entry point of the visual contract surface
  // (per BI-FOUNDATIONS.md → "Design Studio = visual contract"). Foundation
  // tab populated end-to-end in WS10 Phase 2 (Commits 4a-10); WS11 reorganizes
  // the surface into an atomic-design progression (Foundation → Typography
  // → Buttons → Atoms → Molecules → Organisms → Layouts). The legacy
  // /design-preview/buttons redirect rationale no longer applies — new
  // visitors land on the architectural foundation before drilling deeper.
  const [activeTab, setActiveTab] = useState<TabId>('foundation')
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    foundation: null,
    typography: null,
    buttons:    null,
    atoms:      null,
    molecules:  null,
    organisms:  null,
    layouts:    null,
  })

  // Stable id base so tab and panel ids match across renders. useId gives a
  // deterministic prefix per component instance.
  const idBase = useId()
  const tabId = (id: TabId) => `${idBase}-tab-${id}`
  const panelId = (id: TabId) => `${idBase}-panel-${id}`

  const focusTab = useCallback((id: TabId) => {
    setActiveTab(id)
    // Move focus to match selection (selection follows focus, per WAI-ARIA APG
    // automatic-activation tab pattern).
    requestAnimationFrame(() => {
      tabRefs.current[id]?.focus()
    })
  }, [])

  const onTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentId: TabId) => {
      const currentIndex = TABS.findIndex(t => t.id === currentId)
      if (currentIndex < 0) return

      let nextIndex = -1
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % TABS.length
          break
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = TABS.length - 1
          break
        default:
          return
      }
      event.preventDefault()
      const next = TABS[nextIndex]
      if (next) focusTab(next.id)
    },
    [focusTab]
  )

  return (
    <main className="px-[5%] py-12 md:py-16 lg:py-20">
      <div className="container max-w-5xl">

        <header className="mb-8">
          <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Design Studio</h1>
          <p className="text-foreground-muted">
            Design system reference + visual contract. Foundation tokens → typography
            → primitives → compositions → organisms → page layouts.
          </p>
        </header>

        {/* Tab nav */}
        <div
          role="tablist"
          aria-label="Design Studio sections"
          aria-orientation="horizontal"
          className="mb-8 flex flex-wrap gap-1 border-b border-border"
        >
          {TABS.map(tab => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                ref={el => {
                  tabRefs.current[tab.id] = el
                }}
                type="button"
                role="tab"
                id={tabId(tab.id)}
                aria-selected={isActive}
                aria-controls={panelId(tab.id)}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={e => onTabKeyDown(e, tab.id)}
                className={[
                  '-mb-px inline-flex items-center px-4 py-3 text-sm font-medium',
                  'border-b-2 transition-colors duration-ui-fast',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus',
                  isActive
                    ? 'border-action text-foreground'
                    : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab panels — conditional render keeps the DOM lean and ensures the
            active panel's first focusable child is reachable directly via Tab
            from the active trigger. */}
        {TABS.map(tab => {
          if (tab.id !== activeTab) return null
          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={panelId(tab.id)}
              aria-labelledby={tabId(tab.id)}
              tabIndex={0}
              className="focus-visible:outline-none"
            >
              {tab.id === 'foundation' && <FoundationPanel />}
              {tab.id === 'typography' && <TypographyPanel />}
              {tab.id === 'buttons'    && <ButtonsPanel />}
              {tab.id === 'atoms'      && <AtomsPanel />}
              {tab.id === 'molecules'  && <MoleculesPanel />}
              {tab.id === 'organisms'  && <OrganismsPanel />}
              {tab.id === 'layouts'    && <LayoutsPanel />}
            </div>
          )
        })}

      </div>
    </main>
  )
}
