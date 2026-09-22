import {describe, it, expect} from 'vitest'
import {analyticsOff} from '../analytics'

// Preview visits are not the firm's traffic (Phase 17A, monorepo
// WS-V1-PHASE17A-DESIGN §2.5). The fixture site carries no analytics, so this is where
// the switch is exercised.

describe('analyticsOff', () => {
  it('switches off every GA4 id in the operator\'s snippet, once each', () => {
    const snippet = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script>
      <script>gtag('config', 'G-ABC123XYZ'); gtag('config', 'G-SECOND99');</script>`
    expect(analyticsOff(snippet)).toBe("window['ga-disable-G-ABC123XYZ']=true;window['ga-disable-G-SECOND99']=true;")
  })

  it('writes nothing when there is no GA4 id, or no scripts', () => {
    expect(analyticsOff('<script>/* a chat widget */</script>')).toBe('')
    expect(analyticsOff(null)).toBe('')
  })
})
