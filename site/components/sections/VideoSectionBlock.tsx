import {SectionHeader} from '@/components/ui/SectionHeader'
import {SectionShell, type SectionAppearance} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {getEmbedUrl} from '@/lib/videoEmbed'
import {VideoEmbed} from '@/components/media/VideoEmbed'
import {type VideoSectionProps} from './sectionProps'
import {headingFit} from '@/lib/headingFit'

// ─── Types ────────────────────────────────────────────────────────────────────

// One props type for both renderings; no `_type`, the dispatchers own it. See
// sectionProps.ts.
export type VideoSectionBlockData = VideoSectionProps

// ─── Component ────────────────────────────────────────────────────────────────

// ─── The frame (Phase 13) ─────────────────────────────────────────────────────
// An unset band is `light`, never `pattern`, which now paints the site's section
// texture (Phase 16A). A code default, never an `initialValue` (item 308).

/** The appearance this section will actually render with, for the seam walk. */
export function resolveAppearance(data: VideoSectionBlockData): SectionAppearance {
  return {...data.appearance, surface: data.appearance?.surface ?? 'light'}
}

/** A video band IS its playable videos. The URL filter is part of the test:
 *  a section holding one video whose URL will not parse renders nothing. */
export function isEmpty(data: VideoSectionBlockData): boolean {
  return (data.videos ?? [])
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .filter((v) => getEmbedUrl(v.youTubeUrl)).length === 0
}

export function VideoSectionBlock({
  data,
  napTokens,
  seam = NO_SEAM,
}: {
  data: VideoSectionBlockData
  napTokens?: NapTokens | null
  seam?: SeamProps
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
      <SectionShell appearance={resolveAppearance(data)} innerClassName="grid grid-cols-1 items-start gap-12 md:grid-cols-2 lg:gap-20" seam={seam}>
        <>
          <div>
            {heading && (
              <SectionHeader
                tagline={tagline}
                heading={heading}
                fit={headingFit(heading, seam.site?.headingFace)}
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
        </>
      </SectionShell>
    )
  }

  // Centered (default) — heading above, video centered (grid when multiple).
  return (
    <SectionShell appearance={resolveAppearance(data)} seam={seam}>
      <>

        {heading && (
          <SectionHeader
            tagline={tagline}
            heading={heading}
            fit={headingFit(heading, seam.site?.headingFace)}
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

      </>
    </SectionShell>
  )
}
