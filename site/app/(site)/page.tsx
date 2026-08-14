// THE BACKSTOP EVERY OTHER ROUTE ALREADY HAD, and this one did not.
//
// Added 2026-08-13. Every other page in this app carries `revalidate = 3600`;
// the homepage carried nothing, so it was fully static and regenerated only on
// deploy or an explicit `revalidatePath`. Combined with the webhook resolving
// `homePage.slug` (`home`) to `/home/` — a route that does not exist — the
// homepage was the ONE page with neither working webhook revalidation nor a
// time-based fallback. A live client served a stale homepage for five hours
// while every other page refreshed on the hour.
//
// The webhook is the fast path; this is the safety net. Keep both — that defect
// stayed invisible precisely because the fast path reported success.
export const revalidate = 3600

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
import {expandNapTokens, resolveTokenString, type NapTokens} from '@/lib/tokens'
import {homepageTitle, resolveTitle} from '@/lib/seoTitle'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {buildSocialMeta, SITEWIDE_OG_IMAGE_URL} from '@/lib/socialMeta'
import {hasImage, type SanityImage} from '@/lib/sanity/image'

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
//
// ─── TECH-3: the homepage is a page like the others ──────────────────────────
//
// Ruled by Justin 2026-08-10 (`BI/rules/technical-seo.md`), built here as that
// file's queue line 1, closing `OUTSTANDING.md` item 160. `metaDescription`,
// `noIndex`, `noFollow` and `canonicalUrl` are declared on the `homePage`
// schema; until this build none of them was projected and the canonical was a
// hardcoded `'/'` literal on BOTH return paths — so the canonical an operator
// typed was not merely unread, it was contradicted. The social card is ruled in
// by the same rule: this was the one route that called `buildSocialMeta` on
// neither branch.
//
// THREE CARVE-OUTS ARE RULED TO STAND and are honoured below rather than swept:
// the absolute title (above), the absent page-name rung (`resolveTitle`'s second
// argument stays null), and the no-upload image path.
export async function generateMetadata(): Promise<Metadata> {
  const [home, rawTokens] = await Promise.all([
    client.fetch<{
      seoTitle?: string | null
      metaDescription?: string | null
      ogTitle?: string | null
      ogDescription?: string | null
      noIndex?: boolean | null
      noFollow?: boolean | null
      canonicalUrl?: string | null
      ogImage?: SanityImage | null
      areasOfLaw?: string[] | null
    } | null>(HOME_METADATA_QUERY),
    client.fetch<NapTokens>(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  // Same shared resolver as every other route. The homepage has no page-name
  // rung — a page name is not a thing it has — so the second argument is null
  // and TITLE-7's formula is supplied as the complete-title argument instead.
  // See `homepageTitle` for where practice scope is read from, and why it is
  // NOT Zite's selections.
  const {title: stored, label} = resolveTitle(
    home?.seoTitle,
    null,
    tokens,
    tokens?.firmName,
    homepageTitle(home?.areasOfLaw ?? [], tokens?.firmName, tokens?.['office.city']),
  )

  // TECH-5: no formula, no fallback rung. An absent field emits no tag.
  const description = resolveTokenString(home?.metaDescription, tokens) || undefined

  // TECH-2's override rung, which the homepage did not read. `'/'` stays the
  // DEFAULT — the homepage's own address — and is now the fallback rather than
  // a literal.
  const canonical = home?.canonicalUrl ?? '/'

  // SEARCH-1/SEARCH-8 through the shared helper, exactly as the other fifteen
  // routes do it. It reads the site-wide switch itself, so a hidden site still
  // wins over these two fields.
  const robots = await buildRobotsMeta(home?.noIndex, home?.noFollow)

  // TECH-3's social card, and TECH-4's ladder underneath it. `label` is the
  // fallback title; on this route it equals the title tag's own string on both
  // branches, which is what the ruling says the ladder produces.
  //
  // THE NO-UPLOAD IMAGE IS THE RULED CARVE-OUT, and the shared builder does not
  // produce it: with no `ogImageOverride` it generates a TITLED
  // `/api/og?title=…`, while TECH-3 rules the image byte-identical to the root
  // layout's untitled card. Next REPLACES `openGraph` across segments rather
  // than merging it, so emitting a card at all means restating the image to be
  // kept — hence the swap below rather than an omission, which would drop the
  // image entirely. The strings change; the picture does not.
  const ogImage = home?.ogImage
  const social = buildSocialMeta(label, description, ogImage, {
    ogTitle: home?.ogTitle, ogDescription: home?.ogDescription, tokens,
  })
  const socialMeta = hasImage(ogImage)
    ? social
    : {
        openGraph: {
          ...social.openGraph,
          images: [
            {url: SITEWIDE_OG_IMAGE_URL, width: 1200, height: 630, alt: tokens?.firmName ?? ''},
          ],
        },
        twitter: {...social.twitter, images: [SITEWIDE_OG_IMAGE_URL]},
      }

  if (stored) {
    // PRESENT — carry through verbatim. This was the homepage's special case
    // until 2026-07-26; TITLE-1 generalised it to every page type, so it is no
    // longer special, just first.
    return {
      title: stored,
      ...(description ? {description} : {}),
      ...robots,
      alternates: {canonical},
      ...socialMeta,
    }
  }

  // NO TITLE AT ALL. Reached only when there is no cell AND TITLE-7's formula
  // could not build one — a firm with no city and no single phrased area of
  // law. Next then falls to the root layout's title, the bare firm name, which
  // is the right answer for a firm we know almost nothing about.
  //
  // Everything else rides both branches — each is independent of the title
  // question, and an operator who sets one must get it either way.
  return {
    ...(description ? {description} : {}),
    ...robots,
    alternates: {canonical},
    ...socialMeta,
  }
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
