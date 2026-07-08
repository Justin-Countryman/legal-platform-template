import {getEmbedUrl} from '@/lib/videoEmbed'

// Shared single-video player. Renders a privacy-enhanced (youtube-nocookie)
// lazy iframe via getEmbedUrl, with an optional title/description caption.
// Used by the homepage/general videoSection block and the attorney profile.

export type VideoItem = {
  _id: string
  title: string
  youTubeUrl: string
  description?: string | null
  videoType?: string | null
}

export function VideoEmbed({video}: {video: VideoItem}) {
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
