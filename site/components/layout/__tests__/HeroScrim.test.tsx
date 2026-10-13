import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'
import {
  HeroScrim, MIN_LIGHT_SCRIM_OPACITY, MIN_TEXT_SCRIM_OPACITY,
  type HeroScrimAlign, type HeroScrimColor, type HeroScrimDirection, type HeroScrimStyle, type HeroScrimTone,
} from '../HeroScrim'

// Text over a photo meets WCAG 2.2 AA for any photo (monorepo backlog 321, `[R-462]`, `[R-466]`; monorepo
// WS-V1-ACCESSIBILITY-DESIGN-2026-10-13.md §7). The engine holds every text tier over the photo floor: the dark scrim at
// MIN_TEXT_SCRIM_OPACITY over a white pixel (designTokens.ts photoFloor), and on a light band the page background at
// MIN_LIGHT_SCRIM_OPACITY over a black one (colorGuarantee.test.ts). So no point of any scrim may be lighter than its
// floor: a gradient deepens from the floor, never fades below it, and the action color never sits under text.

const STYLES: HeroScrimStyle[] = ['flat', 'gradient']
const TONES: HeroScrimTone[] = ['dark', 'light']
const COLORS: HeroScrimColor[] = ['auto', 'action', 'black']
const ALIGNS: HeroScrimAlign[] = ['left', 'center']
const DIRECTIONS: HeroScrimDirection[] = ['auto', 'to-right', 'to-left', 'to-top', 'to-bottom', 'to-top-right', 'to-top-left', 'to-bottom-right', 'to-bottom-left']
const OPACITIES = [0, 25, 40, 79, 80, 90, 100]

function drawn(props: Parameters<typeof HeroScrim>[0]) {
  const el = render(<HeroScrim {...props} />).container.firstElementChild as HTMLElement
  const image = el.style.backgroundImage
  if (!image) return {stops: [Math.round(Number(el.style.opacity) * 100)], bases: [el.className]}
  const stops = [...image.matchAll(/color-mix\(in srgb, (.+?) (\d+)%, transparent\)/g)]
  return {stops: stops.map((m) => Number(m[2])), bases: stops.map((m) => m[1])}
}

describe('no point of a hero scrim is lighter than its floor (backlog 321)', () => {
  it('the floors are the ones the engine proves', () => {
    expect(MIN_TEXT_SCRIM_OPACITY).toBe(80)
    expect(MIN_LIGHT_SCRIM_OPACITY).toBe(97)
  })

  it('every style, tone, color, direction, alignment and stored opacity draws at or above its tone\'s floor', () => {
    const below: string[] = []
    for (const style of STYLES) for (const tone of TONES) for (const color of COLORS) for (const align of ALIGNS)
      for (const direction of DIRECTIONS) for (const opacity of OPACITIES) {
        const floor = tone === 'dark' ? MIN_TEXT_SCRIM_OPACITY : MIN_LIGHT_SCRIM_OPACITY
        const {stops} = drawn({style, tone, color, align, direction, opacity})
        if (Math.min(...stops) < floor) below.push(`${style}/${tone}/${color}/${align}/${direction}/${opacity}: ${stops.join(' to ')}`)
      }
    expect(below).toEqual([])
  })

  it('a gradient deepens from the floor to the stored opacity, and draws flat at the default', () => {
    expect(drawn({style: 'gradient', opacity: 95}).stops).toEqual([95, 80])
    expect(drawn({style: 'gradient', opacity: 80}).stops).toEqual([80, 80])
    expect(drawn({style: 'gradient', opacity: 40}).stops).toEqual([80, 80])
    expect(drawn({style: 'gradient', tone: 'light', opacity: 100}).stops).toEqual([100, 97])
  })

  it('the action color never sits under text: a stored action gradient draws the scrim color', () => {
    expect(drawn({style: 'gradient', color: 'action', opacity: 90}).bases).toEqual(['var(--color-scrim)', 'var(--color-scrim)'])
    expect(drawn({style: 'gradient', color: 'black', opacity: 90}).bases).toEqual(['rgb(0, 0, 0)', 'rgb(0, 0, 0)'])
    // On a light band dark text sits on the scrim, so black is never its color.
    expect(drawn({style: 'gradient', tone: 'light', color: 'black', opacity: 100}).bases).toEqual(['var(--color-background)', 'var(--color-background)'])
  })

  it('the direction still follows the text, so the deeper end sits behind it', () => {
    const dir = (props: Parameters<typeof HeroScrim>[0]) =>
      (render(<HeroScrim {...props} />).container.firstElementChild as HTMLElement).style.backgroundImage.match(/^linear-gradient\((to [a-z ]+),/)![1]
    expect(dir({style: 'gradient', opacity: 95})).toBe('to right')
    expect(dir({style: 'gradient', opacity: 95, align: 'center'})).toBe('to top')
    expect(dir({style: 'gradient', opacity: 95, direction: 'to-bottom-left'})).toBe('to bottom left')
  })
})
