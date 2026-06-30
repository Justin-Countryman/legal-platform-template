// Resolve raw Sanity data → a concrete HeroConfig. No presets, no cascade —
// every field is read directly with a sensible default. A fresh hero (all
// unset) resolves to an Overlay, left-aligned, over an image backdrop.

import type {HeroConfig, HomeHeroData, Skeleton} from './types'

export function resolveHeroConfig(data: HomeHeroData): HeroConfig {
  const skeleton: Skeleton = data.skeleton === 'split' ? 'split' : 'overlay'
  return {
    skeleton,
    heightMode: data.heightMode ?? 'content',
    contentAlign: data.contentAlign ?? 'left',
    backdrop: data.backdrop ?? 'image',
    foreground: data.foreground ?? false,
    contentStrip: data.contentStrip ?? false,
    siloLayout: data.siloLayout ?? 'cards',
    scrimStyle: data.scrimStyle ?? 'flat',
    scrimColor: data.scrimColor ?? 'auto',
    scrimDirection: data.scrimDirection ?? 'auto',
    splitMedia: data.splitMedia ?? 'image',
    splitImageStyle: data.splitImageStyle ?? 'contained',
    splitImageRatio: data.splitImageRatio ?? 'landscape',
    textTreatment: data.textTreatment ?? 'inline',
    mediaSide: data.mediaSide ?? 'right',
    motion: data.motion ?? 'none',
  }
}

// The background image's role for a given config — drives surface scheme
// resolution (backdrop = image behind text ⇒ forces dark; panel = image beside
// the text ⇒ scheme follows settings).
export function imageRoleFor(config: HeroConfig): 'backdrop' | 'panel' {
  if (config.skeleton === 'overlay' && (config.backdrop === 'image' || config.backdrop === 'mosaic')) {
    return 'backdrop'
  }
  return 'panel'
}
