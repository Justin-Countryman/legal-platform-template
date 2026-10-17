import {describe, it, expect} from 'vitest'
import {analyticsOff} from '../analytics'
import {PREVIEW_OFF_JS} from '../../inlineScripts'

// Preview visits are not the firm's traffic (Phase 17A, monorepo
// WS-V1-PHASE17A-DESIGN §2.5). The fixture site carries no analytics, so this is where
// the switch is exercised. Since monorepo [R-785] the ids ride on one fixed script's
// `data-ga-off`, which the Content Security Policy names by hash.

function runPreviewOff(ids: string) {
  const el = document.createElement('script')
  el.setAttribute('data-ga-off', ids)
  Object.defineProperty(document, 'currentScript', {configurable: true, get: () => el})
  try {
    new Function(PREVIEW_OFF_JS)()
  } finally {
    delete (document as unknown as Record<string, unknown>).currentScript
  }
}

describe('analyticsOff', () => {
  it('finds every GA4 id in the operator\'s snippet, once each', () => {
    const snippet = `<script async src="https://tags.example/gtag/js?id=G-ABC123XYZ"></script>
      <script>gtag('config', 'G-ABC123XYZ'); gtag('config', 'G-SECOND99');</script>`
    expect(analyticsOff(snippet)).toEqual(['G-ABC123XYZ', 'G-SECOND99'])
  })

  it('finds nothing when there is no GA4 id, or no scripts', () => {
    expect(analyticsOff('<script>/* a chat widget */</script>')).toEqual([])
    expect(analyticsOff(null)).toEqual([])
  })

  it('the preview script switches each id off and nothing else, and turns the banner off', () => {
    const w = window as unknown as Record<string, unknown>
    runPreviewOff(analyticsOff(`<script>gtag('config', 'G-ABC123XYZ'); gtag('config', 'G-SECOND99');</script>`).join(' '))
    expect(w['ga-disable-G-ABC123XYZ']).toBe(true)
    expect(w['ga-disable-G-SECOND99']).toBe(true)
    expect(document.documentElement.getAttribute('data-consent')).toBe('off')
    runPreviewOff('x"]=1;alert(1)//  G-')
    expect(Object.keys(w).filter((k) => k.startsWith('ga-disable-')).sort()).toEqual(['ga-disable-G-ABC123XYZ', 'ga-disable-G-SECOND99'])
  })
})
