// Pins the plugin's rule roster as an artifact, not prose.
//
// Phase 8 (2026-09-13) cut eight design-token rules and kept the nine that
// guard correctness (monorepo WS-V1-PHASE8-DESIGN §2.4 and §7.10). Adding or
// removing a rule is a deliberate change: update this list in the same commit.

import {describe, expect, it} from 'vitest'
import plugin from '../index.js'

const TEN = [
  'collection-grid-list-semantics',
  'footer-landmark-naming',
  'h1-mobile-cap',
  'heading-cascade-discipline',
  'no-arbitrary-color',
  'no-fixed-radius',
  'no-svg-without-aria-decision',
  'no-text-accent-on-text',
  'no-text-action-raw',
  'no-use-hero-scheme-in-server',
].sort()

describe('platform plugin rule roster', () => {
  // Phase 16A added no-fixed-radius ([R-473]: corners follow the site family).
  it('exports exactly the nine Phase 8 keepers and Phase 16A\'s corner rule', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual(TEN)
  })
})
