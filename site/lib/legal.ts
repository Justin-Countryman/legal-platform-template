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
//
// THE WORDING, three sentences (ruled by Justin 2026-10-14; monorepo backlog 309
// and 454, WS-CASE-RESULTS-DESIGN-2026-10-13.md §5 and §11): the version that
// holds in every state the bar research read. The first carries Nevada's words
// (RPC 7.2(b)(7)), the second South Dakota's reason (RPC 7.1(c)(4)), the third
// California's context (B&P 6157(c), 6158.3). The one sentence before it held
// in Minnesota only.

export const RESULTS_DISCLAIMER_DEFAULT =
  'Past results do not guarantee, warrant, or predict the outcome of any future case. ' +
  'Every case is decided on its own facts and merits, so past success cannot assure future success. ' +
  'Each result described here depended on the facts and law of that case, and results differ when the facts differ.'

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
