import {SectionHeader} from '@/components/ui/SectionHeader'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type VideoItem = {
  _id: string
  title: string
  youTubeUrl: string
  description?: string | null
  videoType?: string | null
}

export type VideoSectionBlockData = {
  _type: 'videoSection'
  tagline?: string | null
  heading?: string | null
  description?: string | null
  videos?: VideoItem[] | null
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)

    // YouTube: youtube.com/watch?v=ID or youtu.be/ID
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    // Vimeo: vimeo.com/ID
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace(/^\//, '')
      return id ? `https://player.vimeo.com/video/${id}` : null
    }

    return null
  } catch {
    return null
  }
}

// ─── Single video ─────────────────────────────────────────────────────────────

function VideoEmbed({video}: {video: VideoItem}) {
  const embedUrl = getEmbedUrl(video.youTubeUrl)
  if (!embedUrl) return null

  return (
    <figure>
      <div className="relative aspect-video overflow-hidden rounded-ui shadow-elevation-sm">
        <iframe
          src={embedUrl}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
        />
      </div>
      {(video.title || video.description) && (
        <figcaption className="mt-3">
          <p className="font-medium text-foreground">{video.title}</p>
          {video.description && (
            <p className="mt-1 text-sm text-foreground-muted">{video.description}</p>
          )}
        </figcaption>
      )}
    </figure>
  )
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

  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container">

        {heading && (
          <SectionHeader
            tagline={tagline}
            heading={heading}
            description={description}
            alignment={isSingle ? 'left' : 'center'}
            className={isSingle ? 'mb-12' : 'mx-auto mb-12 max-w-2xl'}
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
