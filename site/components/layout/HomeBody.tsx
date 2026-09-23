import {type getHomePage} from '@/lib/sanity/fetchers'
import {ghostSource} from '@/lib/brandMark'
import {siteLookOf} from '@/components/sections/sectionFrame'
import {firstBandRises} from '@/components/layout/HomepageCanvas'
import {heroGround} from '@/lib/heroGround'
import {closeSurface} from '@/lib/flows'
import {HomepageCanvas, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {HomepageCta, type HomepageCtaData} from '@/components/layout/HomepageCta'
import {HomepageHero} from '@/components/layout/homeHero'
import {type HomeHeroData} from '@/components/layout/homeHero/types'
import {type NapTokens} from '@/lib/tokens'
import {type SiteChrome} from '@/components/layout/SiteShell'

// ─── The homepage's body ──────────────────────────────────────────────────────
//
// The hero, the homepage list and the closing call to action, drawn from the chrome
// and the homepage data. It was the body of `app/(site)/page.tsx`'s default export
// until Phase 17A, which moved it here unchanged so the preview address can draw the
// same homepage over a chrome carrying the operator's design choices (monorepo
// WS-V1-PHASE17A-DESIGN §2.2). The page fetches and hands both over; nothing here
// fetches, so both callers draw from exactly what they were given.

// Phase 2: the homepage hero is split — CONTENT on homePage.hero, DESIGN on
// heroSettings.homepageHero — merged here. Hard cut: no fallback to the old
// homePage.hero design fields.
type HomeHeroContent = Pick<HomeHeroData, 'heading' | 'eyebrow' | 'description' | 'buttons'>
type HomeHeroDesign = Omit<HomeHeroData, 'heading' | 'eyebrow' | 'description' | 'buttons'>
type HomeData = {
  hero?: HomeHeroContent | null
  // The composed mid-page, between the hero and the closing CTA.
  canvas?: HomepageBlock[] | null
  resultsDisclaimer?: string | null
  hideCtaForm?: boolean | null
  ctaOverride?: Partial<HomepageCtaData> | null
}

/** The homepage's `getHomePage()` answer: the page, its metadata and the hero's design half. */
export type HomePageData = Awaited<ReturnType<typeof getHomePage>>

export function HomeBody({chrome, all}: {chrome: SiteChrome; all: HomePageData}) {
  const header = chrome?.header ?? null
  const tokens = (chrome?.nap ?? null) as NapTokens
  const globalCtaData = (chrome?.globalCta ?? null) as HomepageCtaData | null
  const home = (all?.page ?? null) as HomeData | null
  const design = (all?.heroDesign ?? null) as HomeHeroDesign | null
  const siteSettings = header?.siteSettings
  const content = home?.hero
  // Render the hero only when content has a heading AND the design is
  // authored/migrated. An empty/unmigrated heroSettings.homepageHero falls through
  // to the minimal band below — the hard-cut safety net, never a crash.
  const hero: HomeHeroData | null = content?.heading && design ? {...design, ...content} : null
  // Phase 16C: the first band rises into the hero when the theme's divider is shaped and
  // the grounds differ, so the hero makes room for it and the walk knows what it meets.
  // Phase 16D: the ghost's initials ride the site look, as the photo frame and the
  // divider already do, so they reach every band through the walk and no section
  // gains a prop. Derived from the firm's name, never stored (`[R-492]`).
  // Phase 17B: the theme (`look.flow`, from the stored `flow`, the compat bridge or the
  // platform default) says whether the ghost draws and what ground the close takes.
  const look = siteLookOf(chrome?.designTokens)
  const site = {
    ...look,
    ghost: ghostSource(header?.siteSettings?.firmName, look.flow?.ghost === 'once'),
  }
  const ground = heroGround(hero)
  const edgeBelow = firstBandRises(home?.canvas, site, ground)

  return (
    <>
      {hero ? (
        <HomepageHero data={hero} napTokens={tokens} edgeBelow={edgeBelow} />
      ) : (
        // Fallback when the homepage hero hasn't been authored yet.
        //
        // IT TALKS TO THE READER, NOT TO WHOEVER BUILT THE SITE. This band used
        // to render a vendor name as an eyebrow over the firm name and, under
        // it, a line of setup instructions naming the CMS. That URL is the one
        // handed to the client for review, so a firm reading its own new
        // homepage was told to go configure a product it has never heard of
        // (`OUTSTANDING.md` item 239). The band itself is right — it is the
        // hard-cut safety net and never crashing is correct — and what was wrong
        // was its audience. The exact retired strings are quoted once, in
        // `app/__tests__/home-unauthored-hero-band.test.ts`, which is what keeps
        // them out of this file.
        //
        // So: the firm's name, and nothing else. An unauthored homepage now
        // reads as unfinished rather than broken. The operator's signal moved to
        // where operators actually look — the build composes
        // `heroSettings.homepageHero` since 2026-08-14, so reaching this branch
        // at all now means a dataset that never had a build run against it.
        <section className="flex items-center justify-center px-[5%] py-24">
          <div className="space-y-4 text-center">
            <h1 className="marketing-h1 font-heading text-brand-dark">
              {siteSettings?.firmName ?? ''}
            </h1>
          </div>
        </section>
      )}

      <HomepageCanvas
        site={site}
        hero={ground}
        blocks={home?.canvas}
        napTokens={tokens}
        resultsDisclaimer={home?.resultsDisclaimer}
      />

      {/* Beat 9. Bookend, after the canvas and before the footer. `hideCtaForm`
          is now live; it gated nothing before this. Its ground is the theme's
          (Phase 17B, `dark.close`), with the saturated fill gated on the palette. */}
      {!home?.hideCtaForm && (
        <HomepageCta data={globalCtaData} override={home?.ctaOverride} surface={closeSurface(look.flow, !!look.saturated)} />
      )}
    </>
  )
}
