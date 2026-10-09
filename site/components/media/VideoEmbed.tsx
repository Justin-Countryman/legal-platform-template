import {getEmbedUrl} from '@/lib/videoEmbed'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import {VideoPoster} from './VideoPoster'

// Shared single-video player. Renders a privacy-enhanced (youtube-nocookie)
// lazy iframe via getEmbedUrl, with an optional title/description caption.
// Used by the homepage/general videoSection block and the attorney profile.
// Where the video stores a custom thumbnail, the box shows that poster first and
// the iframe only once it is pressed (VideoPoster, monorepo
// WS-PREMIUM-PACKAGE-DESIGN §11); without one the markup is the lazy iframe.

export type VideoItem = {
  _id: string
  title: string
  youTubeUrl: string
  description?: string | null
  videoType?: string | null
  thumbnail?: SanityImageData | null
}

/** `treatment`: the site's photo treatment on a custom poster (on by default; an attorney's video turns it off, since the
 *  package never treats people). */
export function VideoEmbed({video, treatment = true}: {video: VideoItem; treatment?: boolean}) {
  const embedUrl = getEmbedUrl(video.youTubeUrl)
  if (!embedUrl) return null

  return (
    <figure>
      <div className="relative aspect-video overflow-hidden rounded-ui shadow-elevation-sm">
        {hasImage(video.thumbnail) ? (
          <VideoPoster title={video.title} href={video.youTubeUrl} embedUrl={embedUrl} thumbnail={video.thumbnail} treatment={treatment} />
        ) : (
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
          />
        )}
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
