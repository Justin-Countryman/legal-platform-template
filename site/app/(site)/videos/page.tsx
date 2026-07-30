export const revalidate = 3600

import type {Metadata} from 'next'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {client} from '@/lib/sanity/client'
import {VIDEO_INDEX_PAGE_QUERY, GLOBAL_CTA_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString} from '@/lib/tokens'
import {resolveTitle} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {type SanityImage} from '@/lib/sanity/image'
import {getEmbedUrl, autoThumbnails, toIsoDuration} from '@/lib/videoEmbed'
import {InternalHero, type InternalHeroData} from '@/components/layout/InternalHero'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {INDEX_PAGE_PRESETS, resolvePageLabel} from '@/lib/pageLabel'
import {siteHost} from '@/lib/siteHost'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {VideoLibraryClient, type VideoCardData} from '@/components/sections/VideoLibraryClient'
import {urlForImage, hasImage} from '@/lib/sanity/image'

type VideoIndexData = {
  slug?: string | null
  seoTitle?: string | null
  ogImage?: SanityImage | null
  metaDescription?: string | null
  noIndex?: boolean | null
  noFollow?: boolean | null
  canonicalUrl?: string | null
  hero?: InternalHeroData | null
  title?: string | null
  tagline?: string | null
  heading?: string | null
  description?: string | null
  featuredVideo?: VideoCardData | null
  videos?: VideoCardData[] | null
  hideCtaForm?: boolean | null
  ctaOverride?: Record<string, unknown> | null
}

export async function generateMetadata(): Promise<Metadata> {
  const [indexPage, rawTokens] = await Promise.all([
    client.fetch<VideoIndexData | null>(VIDEO_INDEX_PAGE_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  if (!indexPage) return {title: INDEX_PAGE_PRESETS.videoIndex}
  const tokens = expandNapTokens(rawTokens)
  const {title, label} = resolveTitle(indexPage.seoTitle, resolvePageLabel(indexPage, 'videoIndex') ?? '', tokens, tokens?.firmName)
  const description = resolveTokenString(indexPage.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(indexPage.noIndex, indexPage.noFollow)),
    alternates: {canonical: indexPage.canonicalUrl ?? '/videos'},
    ...buildSocialMeta(label, description, indexPage?.ogImage),
  }
}

// VideoObject JSON-LD for each playable video (helps video rich results).
function videoJsonLd(videos: VideoCardData[]) {
  const graph = videos
    .map((v) => {
      const embedUrl = getEmbedUrl(v.youTubeUrl)
      if (!embedUrl) return null
      const thumbnailUrl = hasImage(v.thumbnail)
        ? urlForImage(v.thumbnail).width(1280).height(720).fit('crop').url()
        : autoThumbnails(v.youTubeUrl)?.primary
      const iso = toIsoDuration(v.duration)
      return {
        '@type': 'VideoObject',
        name: v.title,
        description: v.description || v.title,
        ...(thumbnailUrl ? {thumbnailUrl} : {}),
        ...(iso ? {duration: iso} : {}),
        embedUrl,
      }
    })
    .filter(Boolean)
  if (graph.length === 0) return null
  return {'@context': 'https://schema.org', '@graph': graph}
}

export default async function VideoLibraryPage() {
  const [indexPage, globalCtaData, rawTokens] = await Promise.all([
    client.fetch<VideoIndexData | null>(VIDEO_INDEX_PAGE_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  // NAME-3: one resolver, and this route names nothing itself.
  const pageLabel = resolvePageLabel(indexPage, 'videoIndex') ?? ''

  const featured = indexPage?.featuredVideo ?? null
  // Featured video is excluded from the grid (no duplicate).
  const gridVideos = (indexPage?.videos ?? []).filter((v) => v && v.id !== featured?.id)

  const tagline = resolveTokenString(indexPage?.tagline, tokens)
  const heading = resolveTokenString(indexPage?.heading, tokens)
  const description = resolveTokenString(indexPage?.description, tokens)

  const jsonLd = videoJsonLd([...(featured ? [featured] : []), ...gridVideos])

  return (
    <>
      {indexPage?.hero ? (
        <InternalHero data={indexPage.hero} napTokens={tokens} />
      ) : (
        <InternalPageHeader title={indexPage?.hero?.heading ?? pageLabel} />
      )}

      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: pageLabel, href: '/videos/'}]} domain={siteHost()} />
        </div>
      </div>

      <section className="px-[5%] pt-8 pb-16 md:pt-10 md:pb-24 lg:pb-28">
        <div className="container">
          <VideoLibraryClient
            featured={featured}
            videos={gridVideos}
            tagline={tagline}
            heading={heading}
            description={description}
          />
        </div>
      </section>

      {!indexPage?.hideCtaForm && globalCtaData && (
        <GlobalCta
          data={indexPage?.ctaOverride ? {...globalCtaData, ...indexPage.ctaOverride} : globalCtaData}
          napTokens={tokens}
        />
      )}

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
        />
      )}
    </>
  )
}
