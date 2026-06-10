import {describe, it, expect} from 'vitest'
import {parseVideo, getEmbedUrl, autoThumbnails, toIsoDuration, YT_PARAMS, VIMEO_PARAMS} from '@/lib/videoEmbed'

describe('parseVideo', () => {
  it('parses youtube watch URLs', () => {
    expect(parseVideo('https://www.youtube.com/watch?v=abc123')).toEqual({provider: 'youtube', id: 'abc123'})
  })
  it('parses youtu.be short URLs', () => {
    expect(parseVideo('https://youtu.be/abc123')).toEqual({provider: 'youtube', id: 'abc123'})
  })
  it('parses vimeo URLs', () => {
    expect(parseVideo('https://vimeo.com/76979871')).toEqual({provider: 'vimeo', id: '76979871'})
  })
  it('returns null for unsupported / invalid URLs', () => {
    expect(parseVideo('https://example.com/video')).toBeNull()
    expect(parseVideo('not a url')).toBeNull()
    expect(parseVideo('https://www.youtube.com/watch?x=nope')).toBeNull()
  })
})

describe('getEmbedUrl', () => {
  it('builds a privacy-enhanced, distraction-minimized YouTube embed', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?v=abc123')).toBe(
      `https://www.youtube-nocookie.com/embed/abc123?${YT_PARAMS}`,
    )
  })
  it('builds a Vimeo embed with DNT + hidden chrome', () => {
    expect(getEmbedUrl('https://vimeo.com/76979871')).toBe(
      `https://player.vimeo.com/video/76979871?${VIMEO_PARAMS}`,
    )
  })
  it('returns null for invalid input', () => {
    expect(getEmbedUrl('https://example.com')).toBeNull()
  })
  it('uses rel=0 (restricts end-screen to the firm channel)', () => {
    expect(getEmbedUrl('https://youtu.be/abc123')).toContain('rel=0')
  })
})

describe('autoThumbnails', () => {
  it('returns maxres + hqdefault fallback for YouTube', () => {
    expect(autoThumbnails('https://www.youtube.com/watch?v=abc123')).toEqual({
      primary: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
      fallback: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
    })
  })
  it('returns null for Vimeo (no static poster URL) and invalid input', () => {
    expect(autoThumbnails('https://vimeo.com/76979871')).toBeNull()
    expect(autoThumbnails('nope')).toBeNull()
  })
})

describe('toIsoDuration', () => {
  it('converts m:ss', () => {
    expect(toIsoDuration('3:45')).toBe('PT3M45S')
    expect(toIsoDuration('0:30')).toBe('PT30S')
    expect(toIsoDuration('10:00')).toBe('PT10M')
  })
  it('converts h:mm:ss', () => {
    expect(toIsoDuration('1:02:03')).toBe('PT1H2M3S')
    expect(toIsoDuration('1:00:00')).toBe('PT1H')
  })
  it('returns null for blank/invalid', () => {
    expect(toIsoDuration(null)).toBeNull()
    expect(toIsoDuration('')).toBeNull()
    expect(toIsoDuration('abc')).toBeNull()
    expect(toIsoDuration('1:2:3:4')).toBeNull()
  })
})
