import {type getHomePage} from '@/lib/sanity/fetchers'
import {ghostSource} from '@/lib/brandMark'
import {closeFrame, closeGround, walkPage} from '@/components/sections/sectionFrame'
import {siteLookWithHeadingFace} from '@/lib/headingAdvances'
import {firstBandRises, frameOf} from '@/components/layout/HomepageCanvas'
import {heroGround, heroPhotoOf, photoSetOf} from '@/lib/heroGround'
import {chromeSchemes, closeOf, flowOf} from '@/lib/flows'
import {withCtaOverride} from '@/lib/ctaOverride'
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

/** The homepage hero as `HomeBody` renders it: content with a heading over an authored
 *  design, else none. The preview's switcher reads its ground the same way (Phase 17B session 5). */
export function homeHeroOf(all: HomePageData | null | undefined): HomeHeroData | null {
  const home = (all?.page ?? null) as HomeData | null
  const design = (all?.heroDesign ?? null) as HomeHeroDesign | null
  const content = home?.hero
  return content?.heading && design ? {...design, ...content} : null
}

/** Whether the homepage's closing call to action renders: the site's, with the homepage's own words over it, and a
 *  heading. The preview's switcher reads the same answer (Phase 17E), so it counts the photographs the page places. */
export function closeShownOf(globalCta: HomepageCtaData | null | undefined, home: Pick<HomeData, 'hideCtaForm' | 'ctaOverride'> | null | undefined): boolean {
  return !!globalCta && !home?.hideCtaForm && !!withCtaOverride(globalCta, home?.ctaOverride).heading
}

export function HomeBody({chrome, all}: {chrome: SiteChrome; all: HomePageData}) {
  const header = chrome?.header ?? null
  const tokens = (chrome?.nap ?? null) as NapTokens
  const globalCtaData = (chrome?.globalCta ?? null) as HomepageCtaData | null
  const home = (all?.page ?? null) as HomeData | null
  const siteSettings = header?.siteSettings
  // Render the hero only when content has a heading AND the design is
  // authored/migrated. An empty/unmigrated heroSettings.homepageHero falls through
  // to the minimal band below — the hard-cut safety net, never a crash.
  const hero = homeHeroOf(all)
  // Phase 16C: the first band rises into the hero when the theme's divider is shaped and
  // the grounds differ, so the hero makes room for it and the walk knows what it meets.
  // Phase 16D: the ghost's initials ride the site look, as the photo frame and the
  // divider already do, so they reach every band through the walk and no section
  // gains a prop. Derived from the firm's name, never stored (`[R-492]`).
  // Phase 17B: the theme (`look.flow`, from the stored `flow`, the compat bridge or the
  // platform default) says whether the ghost draws and what ground the close takes.
  // Phase 17C session 3: with the heading face's widths, which only a server page may read.
  const look = siteLookWithHeadingFace(chrome?.designTokens)
  // Phase 17B session 6 (`[R-530]`, `[R-532]`): the hero's photograph the theme may lay in windows
  // down the page, only while it is the photograph the theme was approved with (`flowPhoto`, which
  // the preview sets to the live one when the operator chooses the theme); and whether the close
  // renders, so a photo close counts as the last band's neighbour.
  const photo = heroPhotoOf(hero)
  const approved = (chrome?.designTokens as {flowPhoto?: unknown} | null | undefined)?.flowPhoto
  const heroPhoto = photo?.assetId && photo.assetId === approved ? photo : null
  const site = {
    ...look,
    ghost: ghostSource(header?.siteSettings?.firmName, look.flow?.ghost === 'once'),
    heroPhoto,
    // Phase 17E (`[R-573]`, `[R-574]`): the theme's set of photographs, beside the approved hero photograph only, each
    // photograph only while approved.
    photoSet: heroPhoto ? photoSetOf(chrome?.designTokens as Record<string, unknown> | null, heroPhoto.assetId) : null,
    closeShown: closeShownOf(globalCtaData, home),
  }
  const ground = heroGround(hero)
  const edgeBelow = firstBandRises(home?.canvas, site, ground)
  // Phase 17D session 2: the close is the ground below the last band, so an inset last band between a dark run and a dark
  // close adopts the run (`[R-501]`) and a run Gradient bloom lights runs on into a dark close. The canvas walks the same
  // list with the same inputs (`HomepageCanvas`, `close`), so both read one walk.
  //
  // Phase 18 session B (`[R-597]`, `[R-603]`): the close never takes the footer's color. It reads the footer's scheme as
  // the shell renders it (the theme's, a stored one winning) and the ground of the band above it, from a walk without the
  // close. The close then joins the walk (a run Gradient bloom lights; an inset last band between a strong ground and a
  // strong close adopts it, `[R-501]`, as it did before this session).
  const footer = chromeSchemes(flowOf(chrome?.designTokens as Record<string, unknown> | null), header?.mainNavigation, chrome?.footer?.footerSettings, {
    onLight: header?.designSettings?.logoOnLight,
    onDark: header?.designSettings?.logoOnDark,
  }).footer
  const above = walkPage(home?.canvas ?? [], frameOf, site, ground, null).last ?? ground
  const closeSurf = closeOf(look.flow, {footer, above, heroPhoto: !!site.heroPhoto, colors: chrome?.designTokens as Record<string, unknown> | null})
  const closeG = home?.hideCtaForm ? null : closeGround(closeSurf, site.closeShown)
  const walkSite = {...site, close: closeSurf}
  const close = closeFrame(closeSurf, walkSite, walkPage(home?.canvas ?? [], frameOf, walkSite, ground, closeG).close)

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
        site={walkSite}
        hero={ground}
        close={closeG}
        blocks={home?.canvas}
        napTokens={tokens}
        resultsDisclaimer={home?.resultsDisclaimer}
      />

      {/* Beat 9. Bookend, after the canvas and before the footer. `hideCtaForm`
          is now live; it gated nothing before this. Its ground is the theme's
          (Phase 17B, `dark.close`), with the saturated fill gated on the palette. */}
      {!home?.hideCtaForm && (
        <HomepageCta
          data={globalCtaData}
          override={home?.ctaOverride}
          surface={close.surface}
          headingFace={site.headingFace}
          // A photo close is an Image section like one built by hand (`[R-531]`); a wash close is
          // painted as the theme paints a band (`[R-551]`): `closeFrame`.
          seam={close.seam}
        />
      )}
    </>
  )
}
