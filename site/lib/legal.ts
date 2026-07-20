// Bar-compliance legal text. Single source of truth for the results disclaimer.
//
// WHY THIS IS A CODE CONSTANT AND NOT JUST A SANITY FIELD
//
// Bar advertising rules require that past results are ALWAYS paired with a
// disclaimer (BI-Content → Bar Advertising Compliance). "Always" has to survive
// every reachable state of the data, and a Sanity-only field does not:
//
//   `siteSettings` is one of the six documents Site Build writes CREATE-ONLY
//   (`BE/_shared/sanity_singletons.py`). On a dataset where it already exists —
//   i.e. every existing client — Site Build preserves the existing document and
//   discards its composed version. Sanity's `initialValue` only fires when an
//   operator creates a NEW document in Studio; it never backfills an existing
//   one. So `resultsDisclaimer` is `undefined` on every client provisioned
//   before this field existed, until someone opens Site Settings and saves.
//
// A renderer reading only from Sanity would therefore render case results with
// no disclaimer at all on those clients — a compliance exposure created by an
// empty field, which is the `listedOnWebsite` failure shape at site level.
//
// So the constant is the source of truth and the Studio field is an OVERRIDE.
// The operator can change the wording; there is no value they can enter that
// switches the disclaimer off. Undefined, empty string, and whitespace all fall
// through to the constant.
//
// Ruled 2026-07-20. Recorded in BI-Library.md, Case Result item.

export const RESULTS_DISCLAIMER_DEFAULT =
  'Past results do not guarantee a similar outcome. Every case is different and must be evaluated on its own facts.'

/**
 * Resolves the results disclaimer for a site.
 *
 * Any surface that renders case results renders this alongside them. Returns a
 * non-empty string for every possible input — there is no reachable state that
 * yields nothing to render.
 */
export function resolveResultsDisclaimer(value?: string | null): string {
  return value?.trim() || RESULTS_DISCLAIMER_DEFAULT
}
