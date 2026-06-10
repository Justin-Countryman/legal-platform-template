// Shared video-embed helpers — single source of truth for the Video Section and
// the Video Library. Distraction-minimizing params: YouTube via the privacy-
// enhanced youtube-nocookie host with rel=0 (restricts the end-screen "More
// videos" to the firm's own channel; modestbranding/showinfo were deprecated by
// YouTube so the logo/title link can't be fully removed); Vimeo with dnt=1 and
// title/byline/portrait hidden.

export const YT_PARAMS = 'rel=0&modestbranding=1&iv_load_policy=3&playsinline=1'
export const VIMEO_PARAMS = 'title=0&byline=0&portrait=0&dnt=1'

export type VideoProvider = 'youtube' | 'vimeo'

export function parseVideo(url: string): {provider: VideoProvider; id: string} | null {
  try {
    const u = new URL(url)
    // YouTube: youtube.com/watch?v=ID or youtu.be/ID
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      return id ? {provider: 'youtube', id} : null
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      return id ? {provider: 'youtube', id} : null
    }
    // Vimeo: vimeo.com/ID
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace(/^\//, '')
      return id ? {provider: 'vimeo', id} : null
    }
    return null
  } catch {
    return null
  }
}

export function getEmbedUrl(url: string): string | null {
  const v = parseVideo(url)
  if (!v) return null
  return v.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${v.id}?${YT_PARAMS}`
    : `https://player.vimeo.com/video/${v.id}?${VIMEO_PARAMS}`
}

// Auto poster candidates when a video has no custom thumbnail. YouTube exposes
// static poster URLs; maxresdefault is highest quality but 404s for some videos,
// so the caller swaps to `fallback` (hqdefault, which always exists) on error.
// Vimeo has no static poster URL by ID (needs an oEmbed call), so we return null
// and the caller renders a branded placeholder.
export function autoThumbnails(url: string): {primary: string; fallback: string} | null {
  const v = parseVideo(url)
  if (!v || v.provider !== 'youtube') return null
  return {
    primary: `https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`,
    fallback: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
  }
}

// "3:45" or "1:02:03" → ISO-8601 ("PT3M45S" / "PT1H2M3S") for VideoObject JSON-LD.
// Returns null for blank/invalid input so callers can omit the field.
export function toIsoDuration(display?: string | null): string | null {
  if (!display) return null
  const parts = display.trim().split(':').map((s) => Number(s))
  if (parts.length < 1 || parts.length > 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    return null
  }
  let h = 0
  let m = 0
  let s = 0
  if (parts.length === 3) [h, m, s] = parts
  else if (parts.length === 2) [m, s] = parts
  else [s] = parts
  let out = 'PT'
  if (h) out += `${h}H`
  if (m) out += `${m}M`
  if (s || (!h && !m)) out += `${s}S`
  return out
}
