import type {Metadata} from 'next'
import { client } from '@/lib/sanity/client'
import { HEADER_QUERY, HOME_QUERY, NAP_TOKENS_QUERY } from '@/lib/sanity/queries'
import {Tagline} from '@/components/ui/Tagline'
import {PageSections, type PageSectionData} from '@/components/sections/PageSections'
import {type NapTokens} from '@/lib/tokens'

export const metadata: Metadata = {
  alternates: {canonical: '/'},
}

export default async function HomePage() {
  const [header, home, tokens] = await Promise.all([
    client.fetch(HEADER_QUERY),
    client.fetch<{sections?: PageSectionData[] | null}>(HOME_QUERY),
    client.fetch<NapTokens>(NAP_TOKENS_QUERY),
  ])
  const siteSettings = header?.siteSettings
  const sections = home?.sections ?? []

  return (
    <>
      {/* Placeholder hero — the unique homepage hero (with hero-merge) is a separate build. */}
      <section className="flex items-center justify-center px-[5%] py-24">
        <div className="space-y-4 text-center">
          <Tagline as="p">Sanity connection</Tagline>
          <h1 className="marketing-h1 font-heading text-brand-dark">
            {siteSettings?.firmName ?? 'Firm name not found'}
          </h1>
          <p className="text-foreground-muted">Next.js 15 + Sanity v3 foundation is ready.</p>
        </div>
      </section>

      {sections.length > 0 && <PageSections sections={sections} napTokens={tokens} />}
    </>
  )
}
