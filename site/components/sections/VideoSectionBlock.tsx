import {SectionHeader} from '@/components/ui/SectionHeader'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {getEmbedUrl} from '@/lib/videoEmbed'
import {VideoEmbed, type VideoItem} from '@/components/media/VideoEmbed'

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoSectionBlockData = {
  _type: 'videoSection'
  tagline?: string | null
  heading?: string | null
  description?: string | null
  layout?: 'centered' | 'split' | null
  videos?: VideoItem[] | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoSectionBlock({
  data,
  napTokens,
}: {
  data: VideoSectionBlockData
  napTokens?: NapTokens | null
}) {
  // Belt-and-suspenders null filter — paired with GROQ post-projection
  // [defined(_id)] (see queries.ts SECTIONS_FRAGMENT videos); guards against
  // future query regressions that bypass the canonical safe-defaults pattern.
  // Drops null entries before the YouTube URL filter (which would otherwise
  // throw on `null.youTubeUrl` access).
  const videos = (data.videos ?? [])
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .filter((v) => getEmbedUrl(v.youTubeUrl))
  if (videos.length === 0) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)

  const isSingle = videos.length === 1
  // Operator-chosen; defaults to centered so existing sections (and the common
  // single-video case) match every other section's centered header.
  const layout = data.layout === 'split' ? 'split' : 'centered'

  // Split — heading text in a left column, video(s) stacked on the right.
  if (layout === 'split') {
    return (
      <section className="px-[5%] py-16 md:py-24 lg:py-28">
        <div className="container grid grid-cols-1 items-start gap-12 md:grid-cols-2 lg:gap-20">
          <div>
            {heading && (
              <SectionHeader
                tagline={tagline}
                heading={heading}
                description={description}
                alignment="left"
              />
            )}
          </div>
          <div className="space-y-8">
            {videos.map((video) => (
              <VideoEmbed key={video._id} video={video} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Centered (default) — heading above, video centered (grid when multiple).
  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container">

        {heading && (
          <SectionHeader
            tagline={tagline}
            heading={heading}
            description={description}
            alignment="center"
            className="mx-auto mb-12 max-w-2xl"
          />
        )}

        {isSingle ? (
          <div className="mx-auto max-w-3xl">
            <VideoEmbed video={videos[0]} />
          </div>
        ) : (
          <ul
            role="list"
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Videos"
          >
            {videos.map((video) => (
              <li key={video._id}>
                <VideoEmbed video={video} />
              </li>
            ))}
          </ul>
        )}

      </div>
    </section>
  )
}
