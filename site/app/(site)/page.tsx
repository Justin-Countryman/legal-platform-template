import type {Metadata} from 'next'
import { client } from '@/lib/sanity/client'
import { HEADER_QUERY } from '@/lib/sanity/queries'
import {Tagline} from '@/components/ui/Tagline'

export const metadata: Metadata = {
  alternates: {canonical: '/'},
}

export default async function HomePage() {
  const data = await client.fetch(HEADER_QUERY)
  const siteSettings = data?.siteSettings

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <Tagline as="p">
          Sanity connection
        </Tagline>
        <h1 className="marketing-h1 font-heading text-brand-dark">
          {siteSettings?.firmName ?? 'Firm name not found'}
        </h1>
        <p className="text-foreground-muted">
          Next.js 15 + Sanity v3 foundation is ready.
        </p>
      </div>
    </div>
  )
}
