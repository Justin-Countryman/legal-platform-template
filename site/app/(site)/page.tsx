import type {Metadata} from 'next'
import { client } from '@/lib/sanity/client'
import { HEADER_QUERY, HOME_QUERY, HOME_HERO_DESIGN_QUERY, NAP_TOKENS_QUERY } from '@/lib/sanity/queries'
import {Tagline} from '@/components/ui/Tagline'
import {PageSections, type PageSectionData} from '@/components/sections/PageSections'
import {HomepageCanvas, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {HomepageHero} from '@/components/layout/homeHero'
import {type HomeHeroData} from '@/components/layout/homeHero/types'
import {type NapTokens} from '@/lib/tokens'

export const metadata: Metadata = {
  alternates: {canonical: '/'},
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
  sections?: PageSectionData[] | null
}

export default async function HomePage() {
  const [header, home, design, tokens] = await Promise.all([
    client.fetch(HEADER_QUERY),
    client.fetch<HomeData>(HOME_QUERY),
    client.fetch<HomeHeroDesign | null>(HOME_HERO_DESIGN_QUERY),
    client.fetch<NapTokens>(NAP_TOKENS_QUERY),
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

      <HomepageCanvas blocks={home?.canvas} />

      {sections.length > 0 && <PageSections sections={sections} napTokens={tokens} />}
    </>
  )
}
