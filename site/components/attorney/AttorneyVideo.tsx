// Attorney bio video band — full-width section inserted between the profile
// hero and the biography/credentials body across all four attorney layouts.
// Renders the "Attorney Bio" video(s) linked via attorneyPage.videos, reusing
// the shared privacy-enhanced VideoEmbed player. Returns null when the attorney
// has no playable video, so the band only appears when there is one.

import {VideoEmbed} from '@/components/media/VideoEmbed'
import {getEmbedUrl} from '@/lib/videoEmbed'
import type {Attorney} from '@/components/attorney/types'

export function AttorneyVideo({attorney}: {attorney: Attorney}) {
  const videos = (attorney.videos ?? [])
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .filter((v) => getEmbedUrl(v.youTubeUrl))
  if (videos.length === 0) return null

  const firstName = (attorney.firstName ?? '').trim()
  const heading = firstName ? `Meet ${firstName}` : 'Introduction'
  const isSingle = videos.length === 1

  return (
    <section className="bg-background px-[5%] py-14 md:py-20" aria-label="Attorney video">
      <div className="container">
        <h2 className="mb-8 text-center font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground">
          {heading}
        </h2>

        {isSingle ? (
          <div className="mx-auto max-w-3xl">
            <VideoEmbed video={videos[0]} />
          </div>
        ) : (
          <ul
            role="list"
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Attorney videos"
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
