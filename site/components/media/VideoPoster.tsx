'use client'

import {useEffect, useRef, useState} from 'react'
import {SanityImage} from '@/components/ui/SanityImage'
import type {SanityImage as SanityImageData} from '@/lib/sanity/image'

// The video's own poster, then its player (monorepo WS-PREMIUM-PACKAGE-DESIGN §11, `[R-652]`): where a video stores a
// custom thumbnail, the band shows that photograph under the video library's play mark (VideoLibraryClient's Thumb, the
// same disc and triangle). It is a link to the video's own page, so it works before the page's scripts run; once they
// have, pressing it swaps in the same privacy-enhanced iframe VideoEmbed draws, asked to play, and moves focus into it.
// Desktop browsers start it; Safari and most phones do not carry the press into a new iframe, so there the player shows
// and a second tap starts it (the lite-youtube trade-off, without loading YouTube's player script). The focus mark sits
// on the layer above the photograph (a ring under it would be covered), with a transparent outline that forced colors
// paint. `treatment` puts `data-video-poster` on the link, so the site's one photo treatment (photoColor mono or tint,
// globals.css) reaches the photograph and never the play mark; an attorney's video turns it off, as the package never
// treats people.

function PlayIcon({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export function VideoPoster({title, href, embedUrl, thumbnail, treatment = true}: {
  title?: string | null
  href: string
  embedUrl: string
  thumbnail: SanityImageData
  treatment?: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (playing) frame.current?.focus()
  }, [playing])
  const name = title ? `Play video: ${title}` : 'Play video'

  if (playing) {
    return (
      <iframe
        ref={frame}
        src={`${embedUrl}&autoplay=1`}
        title={title ?? 'Video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    )
  }
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        setPlaying(true)
      }}
      aria-label={name}
      {...(treatment ? {'data-video-poster': ''} : {})}
      className="group absolute inset-0 block h-full w-full focus-visible:outline-none"
    >
      <SanityImage image={thumbnail} mode="fill" alt="" sizes="(min-width: 1280px) 45vw, 90vw" />
      <span className="pointer-events-none absolute inset-0 z-[1] grid place-items-center rounded-ui bg-brand-dark/10 transition-colors duration-ui-base group-hover:bg-brand-dark/25 group-focus-visible:bg-brand-dark/25 group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-focus group-focus-visible:outline-2 group-focus-visible:-outline-offset-2 group-focus-visible:outline-transparent">
        <span className="grid size-16 place-items-center rounded-full bg-background/90 shadow-elevation-md transition-transform duration-ui-base group-hover:scale-110 group-focus-visible:scale-110">
          <PlayIcon className="size-7 translate-x-0.5 text-brand-dark" />
        </span>
      </span>
    </a>
  )
}
