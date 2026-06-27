// WS8 Platform Rules — ESLint plugin entry
//
// This plugin packages the Legal Platform's locked-posture lint rules.
// Each rule cites its canonical BI / skill source in its error message and
// in `meta.docs.description`.
//
// Phase 2 plan: rules ship one-per-commit (or in small thematic batches)
// after Commit 3 lands the scaffold. See the WS8 Phase 1 audit
// (`audits/ws8-eslint-enforcement-audit.md` in the platform audit history)
// for the full rule roster and `eslint-rules/README.md` for the
// rule-authoring contract.

'use strict'

const noArbitraryColor = require('./rules/no-arbitrary-color')
const noManualCascadeOverride = require('./rules/no-manual-cascade-override')
const noTransitionAll = require('./rules/no-transition-all')
const noRawWhiteBlack = require('./rules/no-raw-white-black')
const noTaglineClassNameMb = require('./rules/no-tagline-classname-mb')
const noFooterH3Tagline = require('./rules/no-footer-h3-tagline')
const noSvgWithoutAriaDecision = require('./rules/no-svg-without-aria-decision')
const h1MobileCap = require('./rules/h1-mobile-cap')
const noBgMuted = require('./rules/no-bg-muted')
const noUseHeroSchemeInServer = require('./rules/no-use-hero-scheme-in-server')
const footerLandmarkNaming = require('./rules/footer-landmark-naming')
const collectionGridListSemantics = require('./rules/collection-grid-list-semantics')
const headingCascadeDiscipline = require('./rules/heading-cascade-discipline')
const noTextActionRaw = require('./rules/no-text-action-raw')
const noTextAccentOnBgMuted = require('./rules/no-text-accent-on-bg-muted')

const rules = {
  'no-arbitrary-color':              noArbitraryColor,                // T1
  'no-manual-cascade-override':      noManualCascadeOverride,         // T2
  'no-transition-all':               noTransitionAll,                 // B1
  'no-raw-white-black':              noRawWhiteBlack,                 // B2
  'no-tagline-classname-mb':         noTaglineClassNameMb,            // C1
  'no-footer-h3-tagline':            noFooterH3Tagline,               // C2
  'no-svg-without-aria-decision':    noSvgWithoutAriaDecision,        // A6
  'h1-mobile-cap':                   h1MobileCap,                     // A8
  'no-bg-muted':                     noBgMuted,                       // T4
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
