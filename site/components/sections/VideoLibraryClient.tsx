'use client'

import {useState} from 'react'
import Image from 'next/image'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {DialogPanel} from '@/components/ui/DialogPanel'
import {getEmbedUrl, autoThumbnails} from '@/lib/videoEmbed'

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoCardData = {
  id: string
  title: string
  youTubeUrl: string
  description?: string | null
  videoType?: string | null
  duration?: string | null
  thumbnail?: {
    src: string
    alt?: string | null
    width?: number | null
    height?: number | null
  } | null
}

// Canonical videoType order (mirrors the schema enum) — drives chip ordering.
const TYPE_ORDER = ['Firm Overview', 'Attorney Bio', 'Practice Area', 'Testimonial', 'Other'] as const
const typeOf = (v: VideoCardData) => v.videoType ?? 'Other'

// ─── Play overlay ──────────────────────────────────────────────────────────────

function PlayIcon({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

// ─── Thumbnail ─────────────────────────────────────────────────────────────────
// Custom Sanity poster → next/Image (cdn.sanity.io is whitelisted). Otherwise the
// auto YouTube poster via a plain <img> (host isn't in next.config remotePatterns),
// swapping maxresdefault → hqdefault on error. Vimeo with no custom poster falls
// back to a branded tint with the play badge.

function Thumb({video, featured}: {video: VideoCardData; featured?: boolean}) {
  const auto = autoThumbnails(video.youTubeUrl)
  const [autoSrc, setAutoSrc] = useState(auto?.primary ?? null)
  const sizes = featured
    ? '(min-width: 768px) 50vw, 100vw'
    : '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw'

  return (
    <div className="relative aspect-video overflow-hidden bg-hero-tint">
      {video.thumbnail?.src ? (
        <Image src={video.thumbnail.src} alt="" fill className="object-cover" sizes={sizes} />
      ) : autoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- external poster host not in next.config remotePatterns
        <img
          src={autoSrc}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            if (auto && autoSrc !== auto.fallback) setAutoSrc(auto.fallback)
          }}
        />
      ) : null}

      {/* Play overlay */}
      <span className="pointer-events-none absolute inset-0 grid place-items-center bg-brand-dark/10 transition-colors duration-ui-base group-hover:bg-brand-dark/25">
        <span className="grid size-14 place-items-center rounded-full bg-background/90 shadow-elevation-md transition-transform duration-ui-base group-hover:scale-110">
          <PlayIcon className="size-6 translate-x-0.5 text-brand-dark" />
        </span>
      </span>
    </div>
  )
}

// ─── Meta (type + duration) ──────────────────────────────────────────────────

function VideoMeta({video}: {video: VideoCardData}) {
  if (!video.videoType && !video.duration) return null
  return (
    <div className="mt-3 flex items-center gap-3 text-xs text-foreground-muted">
      {video.videoType && (
        <span className="inline-flex items-center rounded-ui border border-border px-2.5 py-1 text-accent">
          {video.videoType}
        </span>
      )}
      {video.duration && <span>{video.duration}</span>}
    </div>
  )
}

// ─── Card (button trigger) + modal player ──────────────────────────────────────
// The whole card is a button (it opens a modal, it doesn't navigate). It wears
// CardLink's chrome. The iframe lives in the DialogPanel children, so Radix only
// mounts it when the modal opens — a facade: no third-party request until play.

const CARD_CHROME = [
  'group block w-full overflow-hidden text-left',
  'rounded-ui border border-border bg-background shadow-card-rest',
  'transition-[translate,box-shadow,border-color] duration-ui-slow ease-smooth',
  'hover:shadow-card-hover hover:card-lift hover:border-action',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
].join(' ')

function VideoCard({video, featured}: {video: VideoCardData; featured?: boolean}) {
  const embedUrl = getEmbedUrl(video.youTubeUrl)
  if (!embedUrl) return null

  const trigger = featured ? (
    <button type="button" className={CARD_CHROME} aria-label={`Play video: ${video.title}`}>
      <div className="grid gap-0 md:grid-cols-2 md:items-stretch">
        <Thumb video={video} featured />
        <div className="flex flex-col justify-center p-6 md:p-8">
          <p className="font-heading text-2xl font-semibold leading-tight text-foreground">{video.title}</p>
          {video.description && (
            <p className="mt-3 text-foreground-muted">{video.description}</p>
          )}
          <VideoMeta video={video} />
        </div>
      </div>
    </button>
  ) : (
    <button type="button" className={CARD_CHROME} aria-label={`Play video: ${video.title}`}>
      <Thumb video={video} />
      <div className="p-5">
        <p className="font-heading font-semibold leading-snug text-foreground">{video.title}</p>
        <VideoMeta video={video} />
      </div>
    </button>
  )

  return (
    <DialogPanel
      trigger={trigger}
      title={video.title}
      description={video.description ?? undefined}
      closeAriaLabel="Close video"
      size="xl"
    >
      <div className="aspect-video w-full overflow-hidden rounded-ui bg-brand-dark">
        <iframe
          src={embedUrl}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    </DialogPanel>
  )
}

// ─── Filter chip (interactive — Chip primitive is display-only) ─────────────────

function FilterChip({active, onClick, children}: {active: boolean; onClick: () => void; children: React.ReactNode}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center rounded-ui border px-4 py-1.5 text-sm',
        'transition-colors duration-ui-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
        active
          ? 'border-action bg-action text-action-fg'
          : 'border-border bg-transparent text-foreground-muted hover:bg-hover-wash hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ─── Library ───────────────────────────────────────────────────────────────────

export function VideoLibraryClient({
  featured,
  videos,
  tagline,
  heading,
  description,
}: {
  featured?: VideoCardData | null
  videos: VideoCardData[]
  tagline?: string | null
  heading?: string | null
  description?: string | null
}) {
  // Only keep playable videos (valid YouTube/Vimeo URL).
  const playable = videos.filter((v) => getEmbedUrl(v.youTubeUrl))
  const feat = featured && getEmbedUrl(featured.youTubeUrl) ? featured : null

  // Filter chips: only types actually present, and only when there are ≥2 of them
  // (no orphan chips for a single-category library).
  const present = TYPE_ORDER.filter((t) => playable.some((v) => typeOf(v) === t))
  const showChips = present.length >= 2

  const [active, setActive] = useState<string>('all')
  const shown = active === 'all' ? playable : playable.filter((v) => typeOf(v) === active)

  const hasIntro = Boolean(heading)

  return (
    <div>
      {feat && (
        <div className="mb-12 md:mb-16">
          <VideoCard video={feat} featured />
        </div>
      )}

      {hasIntro && (
        <SectionHeader
          tagline={tagline}
          heading={heading as string}
          description={description}
          alignment="left"
          className="mb-8 max-w-2xl"
        />
      )}

      {showChips && (
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter videos by type">
          <FilterChip active={active === 'all'} onClick={() => setActive('all')}>
            All
          </FilterChip>
          {present.map((t) => (
            <FilterChip key={t} active={active === t} onClick={() => setActive(t)}>
              {t}
            </FilterChip>
          ))}
        </div>
      )}

      {shown.length > 0 && (
        <ul role="list" className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-label="Videos">
          {shown.map((video) => (
            <li key={video.id}>
              <VideoCard video={video} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
