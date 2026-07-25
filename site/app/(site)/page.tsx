import type {Metadata} from 'next'
import { client } from '@/lib/sanity/client'
import {
  HEADER_QUERY,
  HOME_QUERY,
  HOME_METADATA_QUERY,
  HOME_HERO_DESIGN_QUERY,
  NAP_TOKENS_QUERY,
  GLOBAL_CTA_QUERY,
} from '@/lib/sanity/queries'
import {Tagline} from '@/components/ui/Tagline'
import {PageSections, type PageSectionData} from '@/components/sections/PageSections'
import {HomepageCanvas, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {HomepageCoda} from '@/components/layout/HomepageCoda'
import {HomepageCta, type HomepageCtaData} from '@/components/layout/HomepageCta'
import {HomepageHero} from '@/components/layout/homeHero'
import {type HomeHeroData} from '@/components/layout/homeHero/types'
import {expandNapTokens, titleFragment, type NapTokens} from '@/lib/tokens'
import {hasImage, urlForImage, type SanityImage} from '@/lib/sanity/image'

// ─── Metadata ─────────────────────────────────────────────────────────────────
//
// The homepage now does what every other page does — carries its stored
// seoTitle through — with the one homepage-specific twist item 32 anticipated:
// it renders ABSOLUTE, bypassing the root layout's "%s - <firm name>" template.
// A homepage seoTitle from Screaming Frog almost always already contains the
// firm name (Dudley's is "Dudley & Smith |"), so routing it through the
// template would render the firm name twice. (Ruled 2026-07-24; the homepage
// was deliberately left off the shared titleFragment path in f2115ce, "blocked
// on items 44 and 40", until this decision.)
export async function generateMetadata(): Promise<Metadata> {
  const [home, rawTokens] = await Promise.all([
    client.fetch<{seoTitle?: string | null; ogImage?: SanityImage | null} | null>(
      HOME_METADATA_QUERY,
    ),
    client.fetch<NapTokens>(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  // titleFragment resolves tokens + treats an empty seoTitle as absent, exactly
  // as the other fifteen routes do; the homepage has no page-name fallback
  // (its fallback is the formula below), so the second arg is null.
  const stored = titleFragment(home?.seoTitle, null, tokens)

  // Per-page social image (ruled 2026-07-25). The homepage is the ONE route
  // that does not call buildSocialMeta: with no upload it inherits the root
  // layout's untitled `/api/og`, and that must not change. So this adds
  // openGraph/twitter ONLY when the operator actually uploaded an image,
  // leaving the no-upload path byte-identical to what it was before.
  const ogImage = home?.ogImage
  const ogOverride = hasImage(ogImage)
    ? (() => {
        const url = urlForImage(ogImage).width(1200).height(630).fit('crop').url()
        return {
          openGraph: {images: [{url, width: 1200, height: 630, alt: ogImage.alt || ''}]},
          twitter: {card: 'summary_large_image' as const, images: [url]},
        }
      })()
    : {}

  if (stored) {
    // PRESENT — carry through verbatim. `absolute` bypasses the firm-name
    // template so the title is exactly the stored value, no doubling.
    return {title: {absolute: stored}, alternates: {canonical: '/'}, ...ogOverride}
  }

  // ABSENT — item 32's from-scratch homepage title formula belongs here. It has
  // two shapes: (1) lead with the firm's top-ranked area of law, or (2) lead
  // with the firm name; which shape is a per-client setup question. THE FORMULA
  // IS NOT YET BUILT — this is the seam. When it lands, compose it and return
  // `{title: {absolute: composed}, alternates: {canonical: '/'}}`. Until then
  // the route returns no title, so Next falls to the root layout's
  // `title.default` (the bare firm name) — which IS shape (2), so the deferred
  // state already renders one of the two correct shapes rather than anything
  // broken. Do NOT wire this to homepageApproach — that field has no title role
  // (item 44); the shape selector, when built, is its own input.
  // The social-image override rides both branches — it is independent of the
  // title question, and an operator who uploads one must get it either way.
  return {alternates: {canonical: '/'}, ...ogOverride}
}

// Phase 2: the homepage hero is split — CONTENT on homePage.hero, DESIGN on
// heroSettings.homepageHero — merged here. Hard cut: no fallback to the old
// homePage.hero design fields.
type HomeHeroContent = Pick<HomeHeroData, 'heading' | 'eyebrow' | 'description' | 'buttons'>
type HomeHeroDesign = Omit<HomeHeroData, 'heading' | 'eyebrow' | 'description' | 'buttons'>
type HomeData = {
  hero?: HomeHeroContent | null
  // The composed mid-page. Renders between the hero and the interior-page
  // sections, which stay on homePage for now and are a separate decision.
  canvas?: HomepageBlock[] | null
  resultsDisclaimer?: string | null
  hideCtaForm?: boolean | null
  ctaOverride?: Partial<HomepageCtaData> | null
  codaLine?: string | null
  sections?: PageSectionData[] | null
}

export default async function HomePage() {
  const [header, home, design, tokens, globalCtaData] = await Promise.all([
    client.fetch(HEADER_QUERY),
    client.fetch<HomeData>(HOME_QUERY),
    client.fetch<HomeHeroDesign | null>(HOME_HERO_DESIGN_QUERY),
    client.fetch<NapTokens>(NAP_TOKENS_QUERY),
    client.fetch<HomepageCtaData | null>(GLOBAL_CTA_QUERY),
  ])
  const siteSettings = header?.siteSettings
  const content = home?.hero
  // Render the hero only when content has a heading AND the design is
  // authored/migrated. An empty/unmigrated heroSettings.homepageHero falls through
  // to the placeholder band — the hard-cut safety net, never a crash.
  const hero: HomeHeroData | null = content?.heading && design ? {...design, ...content} : null
  const sections = home?.sections ?? []

  return (
    <>
      {hero ? (
        <HomepageHero data={hero} napTokens={tokens} />
      ) : (
        // Fallback when the homepage hero hasn't been authored yet.
        <section className="flex items-center justify-center px-[5%] py-24">
          <div className="space-y-4 text-center">
            <Tagline as="p">Sanity connection</Tagline>
            <h1 className="marketing-h1 font-heading text-brand-dark">
              {siteSettings?.firmName ?? 'Firm name not found'}
            </h1>
            <p className="text-foreground-muted">Add a Homepage Hero in Sanity to replace this placeholder.</p>
          </div>
        </section>
      )}

      <HomepageCanvas
        blocks={home?.canvas}
        napTokens={tokens}
        resultsDisclaimer={home?.resultsDisclaimer}
      />

      {sections.length > 0 && <PageSections sections={sections} napTokens={tokens} />}

      {/* Beat 9. Bookend, after the canvas and before the footer. `hideCtaForm`
          is now live; it gated nothing before this. */}
      {!home?.hideCtaForm && (
        <HomepageCta data={globalCtaData} override={home?.ctaOverride} />
      )}

      {/* The coda closes the arc after the CTA. Last thing before the footer. */}
      <HomepageCoda text={home?.codaLine} />
    </>
  )
}
