import {urlForImage} from '@/lib/sanity/image'
import type {SetPhoto} from '@/lib/heroGround'

// ─── A photograph of the theme's set (Phase 17E, `[R-573]`) ────────────────────
//
// Monorepo WS-V1-PHASE17E-DESIGN §2.4. One photograph of the set, behind a section the Photo scrims
// theme filled, behind a run of them (drawn once by the canvas's wrapper), or behind the closing call
// to action: a decorative layer, then the Image section's own 80% scrim (`[R-531]`).
//
// A PLAIN SERVER `<picture>`, NOT THE IMAGE COMPONENT: no client reference (a `next/image` in a band is
// a hydrated island, ADV-17B6-B), and art direction, which Next documents with the same element: a
// phone gets its own source, a 480 px crop at the operator's focal point shaped to the phone's run head
// (4:5), and every wider screen 960 px, the size that reads identically to 1,600 under the scrim on a 2x
// laptop and a 3x phone (measured, 1.1 and 0.8 of 255). Both through Sanity's image CDN, which serves
// the asset store: grayscale at the CDN (`sat=-100`, 23 to 24% smaller on the real CDN; the CSS
// `grayscale` stays for any answer that ignored it), quality 35, `auto=format` (WebP, then AVIF once the
// CDN has made it), `fit=max` so a small upload is never enlarged. The builder applies the operator's
// crop and, for the phone's fixed shape, the focal point (`lib/sanity/image.ts`).
//
// LAZY AND LOW PRIORITY, AND WHY THAT IS NOT WHAT PROTECTS THE HERO. The set never draws without the
// hero's own photograph, which stays eager, preloaded and the page's largest paint; a run whose
// photograph sits in a phone's first screen still downloads beside the hero, on another origin, where
// `fetchPriority` cannot order the two: the small phone source is what keeps that cost to about 0.1 s
// (measured: 184 ms at 960, 88 at 480, ADV-17E-C reproduced). `dynamic-range-limit` holds an HDR
// photograph to the white the scrim's proof assumes (`set-photo`, `globals.css`).

/** The two sources' URLs, for the element and its tests. */
export function setPhotoUrls(photo: SetPhoto): {phone: string; wide: string} {
  const base = () => urlForImage(photo.image).quality(35).saturation(-100)
  return {
    phone: base().width(480).height(600).fit('crop').url(),
    wide: base().width(960).fit('max').url(),
  }
}

/** The photograph and the scrim over it. `head` draws it at the head of a run on a phone, masked into the
 *  dark ground below (`photo-run-head`): a run on a phone is 1,000 to 2,300 px tall, and a photograph
 *  cover-fitted to it shows a magnified strip of 14% of itself (delllawfirm draws a head, ADV-17E-A). */
export function SetPhotoLayer({photo, head = false, soft = false}: {photo: SetPhoto; head?: boolean; soft?: boolean}) {
  const {phone, wide} = setPhotoUrls(photo)
  const scrim = <div className="absolute inset-0 bg-scrim/80" aria-hidden="true" />
  return (
    <>
      <div aria-hidden="true" data-photo-set={photo.assetId} data-photo-fade={soft ? 'dark' : undefined} className={[head && 'photo-run-head', soft && 'photo-fade-run', 'absolute inset-0 overflow-hidden'].filter(Boolean).join(' ')}>
        <picture>
          <source media="(max-width: 767px)" srcSet={phone} />
          <img
            src={wide}
            alt=""
            loading="lazy"
            fetchPriority="low"
            decoding="async"
            className="set-photo absolute inset-0 h-full w-full object-cover grayscale"
            style={{objectPosition: focalPosition(photo.image)}}
          />
        </picture>
        {/* At a run's head the scrim fades out with the photograph (the pre-PR break pass): below the head a phone shows
            the run's own dark ground, the shade of the dark bands around it. Every point of the fade is a mix of the
            scrim over the photograph and the dark ground, each proven under the band's text, and no lighter than the
            lighter of the two. From 768 px the head is the whole run, as before. */}
        {(head || soft) && scrim}
      </div>
      {!head && !soft && scrim}
    </>
  )
}

/** A photograph of the set ghosted into a light band (the Background theme's faint photographs; monorepo
 *  WS-V1-BACKGROUND-THEME-DESIGN §7 item 8): the same sources as the layer above, greyscale, at the opacity the palette
 *  solved (`--fade-opacity-on-light`, `fadeOnLight`), under the band's content and fading out across the band from the
 *  side named. No scrim: the band's own tiers are solved against black at that opacity (`[data-fade="light"]`). */
export function GhostPhotoLayer({photo, side = 'right'}: {photo: SetPhoto; side?: 'left' | 'right'}) {
  const {phone, wide} = setPhotoUrls(photo)
  return (
    <div aria-hidden="true" data-photo-ghost={photo.assetId} className={['photo-ghost', side === 'left' && 'photo-ghost-from-left', 'pointer-events-none absolute inset-0 -z-10 overflow-hidden'].filter(Boolean).join(' ')}>
      <picture>
        <source media="(max-width: 767px)" srcSet={phone} />
        <img
          src={wide}
          alt=""
          loading="lazy"
          fetchPriority="low"
          decoding="async"
          className="set-photo absolute inset-0 h-full w-full object-cover grayscale"
          style={{objectPosition: focalPosition(photo.image)}}
        />
      </picture>
    </div>
  )
}

/** The focal point as a position in the photograph as cropped: the Studio stores it in the whole image's fractions,
 *  and the source is cut to the crop first, so an uncorrected hotspot frames a cropped photograph off its point. */
export function focalPosition(image: SetPhoto['image']): string {
  const h = image.hotspot
  if (!h || typeof h.x !== 'number' || typeof h.y !== 'number') return '50% 50%'
  const c = image.crop
  const along = (v: number, a = 0, b = 0) => Math.min(1, Math.max(0, (v - a) / Math.max(1e-6, 1 - a - b)))
  const x = c ? along(h.x, c.left, c.right) : h.x
  const y = c ? along(h.y, c.top, c.bottom) : h.y
  return `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`
}
