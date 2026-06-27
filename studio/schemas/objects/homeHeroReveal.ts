// Wizard reveal predicates for homeHero — decide which fields show based on the
// current Layout (skeleton) + settings. Reads the document fields directly (no
// presets / no inherit cascade). Mirrors the site defaults in
// components/layout/homeHero/config.ts (KEEP DEFAULTS IN SYNC).

type Skeleton = 'overlay' | 'split'
type Cfg = {
  skeleton: Skeleton
  contentAlign: 'left' | 'center'
  backdrop: 'none' | 'image' | 'mosaic'
  foreground: boolean
  contentStrip: boolean
  splitMedia: 'image' | 'video'
  splitImageStyle: 'contained' | 'full' | 'overlap'
}

type Parent = Record<string, unknown> | undefined

function cfg(parent: Parent): Cfg {
  const p = parent ?? {}
  return {
    skeleton: p.skeleton === 'split' ? 'split' : 'overlay',
    contentAlign: (p.contentAlign as Cfg['contentAlign']) ?? 'left',
    backdrop: (p.backdrop as Cfg['backdrop']) ?? 'image',
    foreground: (p.foreground as boolean) ?? false,
    contentStrip: (p.contentStrip as boolean) ?? false,
    splitMedia: (p.splitMedia as Cfg['splitMedia']) ?? 'image',
    splitImageStyle: (p.splitImageStyle as Cfg['splitImageStyle']) ?? 'contained',
  }
}

export const show = {
  overlay: (p: Parent) => cfg(p).skeleton === 'overlay',
  split: (p: Parent) => cfg(p).skeleton === 'split',

  // The overlay foreground toggle — only when left-aligned (figure pairs with the text column).
  foregroundToggle: (p: Parent) => {
    const c = cfg(p)
    return c.skeleton === 'overlay' && c.contentAlign !== 'center'
  },
  // The foreground image fields — only when the figure is actually on.
  foreground: (p: Parent) => {
    const c = cfg(p)
    return c.skeleton === 'overlay' && c.foreground && c.contentAlign !== 'center'
  },

  // Image style (contained/full/overlap) — image media only.
  imageStyle: (p: Parent) => {
    const c = cfg(p)
    return c.skeleton === 'split' && c.splitMedia === 'image'
  },
  // Ratio — contained image panel or the video poster.
  imageRatio: (p: Parent) => {
    const c = cfg(p)
    return (
      c.skeleton === 'split' &&
      ((c.splitMedia === 'image' && c.splitImageStyle === 'contained') || c.splitMedia === 'video')
    )
  },

  // A single background/feature image — overlay image backdrop, or split image/video poster.
  bgImage: (p: Parent) => {
    const c = cfg(p)
    return (
      (c.skeleton === 'overlay' && c.backdrop === 'image') ||
      (c.skeleton === 'split' && (c.splitMedia === 'image' || c.splitMedia === 'video'))
    )
  },
  // Gallery images — Aperture mosaic backdrop, or the Split "overlap" collage.
  gallery: (p: Parent) => {
    const c = cfg(p)
    return (
      (c.skeleton === 'overlay' && c.backdrop === 'mosaic') ||
      (c.skeleton === 'split' && c.splitMedia === 'image' && c.splitImageStyle === 'overlap')
    )
  },
  video: (p: Parent) => {
    const c = cfg(p)
    return c.skeleton === 'split' && c.splitMedia === 'video'
  },
  scrim: (p: Parent) => {
    const c = cfg(p)
    return c.skeleton === 'overlay' && (c.backdrop === 'image' || c.backdrop === 'mosaic')
  },
  scheme: (p: Parent) => {
    const c = cfg(p)
    // Scheme color only matters when text is NOT over a full-bleed image/mosaic.
    return !(c.skeleton === 'overlay' && (c.backdrop === 'image' || c.backdrop === 'mosaic'))
  },
  strip: (p: Parent) => cfg(p).contentStrip,
}
