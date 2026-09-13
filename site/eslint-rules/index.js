// WS8 Platform Rules — ESLint plugin entry
//
// This plugin packages the Legal Platform's locked-posture lint rules.
// Each rule cites its canonical BI / skill source in its error message and
// in `meta.docs.description`.
//
// Roster: nine rules. Eight design-token rules were cut 2026-09-13
// (monorepo WS-V1-PLAN Phase 8, WS-V1-PHASE8-DESIGN §2.4 and §7.10); the
// skills carry those postures. The roster is pinned by
// `__tests__/rule-roster.test.ts`. See `eslint-rules/README.md` for the
// rule-authoring contract.

'use strict'

const noArbitraryColor = require('./rules/no-arbitrary-color')
const noSvgWithoutAriaDecision = require('./rules/no-svg-without-aria-decision')
const h1MobileCap = require('./rules/h1-mobile-cap')
const noUseHeroSchemeInServer = require('./rules/no-use-hero-scheme-in-server')
const footerLandmarkNaming = require('./rules/footer-landmark-naming')
const collectionGridListSemantics = require('./rules/collection-grid-list-semantics')
const headingCascadeDiscipline = require('./rules/heading-cascade-discipline')
const noTextActionRaw = require('./rules/no-text-action-raw')
const noTextAccentOnBgMuted = require('./rules/no-text-accent-on-bg-muted')

const rules = {
  'no-arbitrary-color':              noArbitraryColor,                // T1
  'no-svg-without-aria-decision':    noSvgWithoutAriaDecision,        // A6
  'h1-mobile-cap':                   h1MobileCap,                     // A8
  'no-use-hero-scheme-in-server':    noUseHeroSchemeInServer,         // C4
  'footer-landmark-naming':          footerLandmarkNaming,            // A3
  'collection-grid-list-semantics':  collectionGridListSemantics,     // A4
  'heading-cascade-discipline':      headingCascadeDiscipline,        // A2
  'no-text-action-raw':              noTextActionRaw,                 // T5a
  'no-text-accent-on-bg-muted':      noTextAccentOnBgMuted,           // T5b
}

module.exports = {
  meta: {
    name: 'eslint-plugin-platform',
    version: '0.0.1',
  },
  rules,
}
