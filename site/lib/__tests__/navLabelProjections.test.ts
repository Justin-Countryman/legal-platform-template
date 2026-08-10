/**
 * NAME-2's Hazard, made mechanical: **a rule cannot bind a field a projection
 * omits.**
 *
 * That sentence was written for `reviewPage`, whose ruled fallback to the Name
 * could not happen because its query never projected the field. The same shape
 * then survived undetected on four nav surfaces at once: the header's practice
 * area menu, the footer's areas-of-law column, the silo nav block and the
 * sidebar tree all read bare `title`, so an operator's Nav Label — a field the
 * Studio describes to them as "the label for menus, breadcrumbs, index cards and
 * link text" — could not reach any of them. `OUTSTANDING.md` item 101.
 *
 * WHY NOTHING CAUGHT IT, which is the reason this file exists. Every check on
 * this platform was blind to it by construction. `tsc` is green because both
 * fields are `string`. The resolver's own unit tests (`pageLabel.test.ts`) pass
 * because `resolvePageLabel` was never wrong — it was never CALLED. The
 * literals detector (`routeLabelLiterals.test.ts`) passes because a projection
 * reading a real stored field is not a literal. And the post-deploy check reads
 * the served HTML for a TRUNCATED label (NAME-8), not for the wrong one, so a
 * complete label from the wrong field reads as a pass. **A projection that reads
 * the wrong stored field is invisible to all of them**, and that is the gap this
 * closes.
 *
 * WHY IT READS THE AST AND NOT THE SOURCE TEXT. The queries are built by
 * template interpolation — fragments inside fragments, and a shared nav-label
 * expression — so the text in the file is not the GROQ that gets sent. This
 * imports the module and parses the EVALUATED strings with `groq-js`, the same
 * parser Sanity ships, so what is asserted is what the query actually asks for.
 *
 * WHY IT IS NOT A ROSTER OF THE FOUR. A guard fitted to the defects already
 * found catches nothing new. This one FAILS CLOSED: it derives every projection
 * that emits a page label next to a link target, and any such projection that
 * does not make `navLabel` reachable must appear in EXEMPT below with a reason.
 * A new one goes red on arrival, and an EXEMPT entry that gets fixed also goes
 * red — so the roster cannot rot in either direction.
 */

import {parse} from 'groq-js'
import {describe, expect, it} from 'vitest'

import * as queries from '../sanity/queries'

type Node = Record<string, unknown>

/** Every node in a groq-js AST, depth-first. Shape-agnostic on purpose: the AST
 *  node types are groq-js's, not ours, and a version bump that adds a node kind
 *  should widen what this reads rather than silently skip it. */
function walk(node: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (!node || typeof node !== 'object') return
  const n = node as Node
  if (typeof n.type === 'string') visit(n)
  for (const value of Object.values(n)) walk(value, visit)
}

/**
 * Does this expression read the named document attribute, WITHOUT crossing into
 * a nested projection?
 *
 * The stop condition is the whole point and it was found by the red proof rather
 * than by reasoning. The sidebar's areas-of-law tree nests three deep, so a
 * plain subtree search let the grandchildren level's `navLabel` answer for the
 * children level: reverting the children level to bare `title` left the test
 * GREEN, because the fixed grandchildren sat inside the reverted parent's own
 * `"grandchildren"` attribute. A guard that reads a rung's descendants is
 * answering about the wrong rung.
 */
function reads(node: unknown, attribute: string): boolean {
  let found = false
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const child of n) visit(child)
      return
    }
    if (!n || typeof n !== 'object') return
    const current = n as Node
    if (current.type === 'Object') return // a nested projection answers for itself
    if (current.type === 'AccessAttribute' && current.name === attribute) found = true
    for (const value of Object.values(current)) visit(value)
  }
  visit(node)
  return found
}

/**
 * What a projection is projecting FROM, in one short string.
 *
 * The signature alone is not a key. The sidebar tree's deepest rung projects
 * `{slug, title}` and so does the blog-category chip on a post card — identical
 * signatures, one a nav surface and one not, so an exemption written for the
 * chip silently covered the sidebar. Found by the red proof, not by reading.
 */
function describeSource(node: unknown, inherited: string): string {
  if (!node || typeof node !== 'object') return inherited
  const n = node as Node
  switch (n.type) {
    case 'Filter': {
      // FIRST `_type == "X"`, not last. A filter can carry a whole subquery —
      // BLOG_CATEGORIES_QUERY selects blogCategory documents having at least one
      // blogPost — and taking the last match named the inner type, which reads
      // as a different surface than the one being projected.
      let docType = ''
      walk(n.expr, (m) => {
        if (docType || m.type !== 'OpCall' || m.op !== '==') return
        const left = m.left as Node | undefined
        const right = m.right as Node | undefined
        if (left?.type === 'AccessAttribute' && left.name === '_type' && right?.type === 'Value') {
          docType = String(right.value)
        }
      })
      return docType ? `*[_type=="${docType}"]` : describeSource(n.base, inherited)
    }
    case 'Deref':
      return `${describeSource(n.base, inherited)}->`
    case 'AccessAttribute':
      return String(n.name)
    case 'Everything':
      return '*'
    case 'This':
      return inherited
    default:
      return 'base' in n ? describeSource(n.base, inherited) : String(n.type ?? inherited)
  }
}

/**
 * Every `Object` node in the AST, paired with the source its projection reads
 * from. `Map`/`Projection` are where a new source begins, so they are the only
 * nodes that change what gets handed down.
 */
function eachProjection(
  node: unknown,
  source: string,
  record: (object: Node, source: string) => void,
): void {
  if (Array.isArray(node)) {
    for (const child of node) eachProjection(child, source, record)
    return
  }
  if (!node || typeof node !== 'object') return
  const n = node as Node
  if (n.type === 'Map' || n.type === 'FlatMap') {
    eachProjection(n.base, source, record)
    eachProjection(n.expr, describeSource(n.base, source), record)
    return
  }
  if (n.type === 'Projection') {
    eachProjection(n.base, source, record)
    eachProjection(n.expr, describeSource(n.base, source), record)
    return
  }
  if (n.type === 'Object') record(n, source)
  for (const value of Object.values(n)) eachProjection(value, source, record)
}

type Site = {
  /** Source plus the sorted attribute names of the projection. Stable under
   *  attribute reordering, and the key EXEMPT is written against — a line number
   *  would rot on the first edit, which is the lesson `OUTSTANDING.md` items
   *  111, 112 and 119 all reached from different directions. */
  signature: string
  /** Which exported queries carry it. One fragment reaches many queries. */
  exports: string[]
}

/**
 * Every projection that emits a page's `title` as a rendered label AND emits a
 * link target beside it — the structural signature of a surface a visitor
 * clicks through. The link target is what separates a page label from a button
 * title or an office-hours heading, both of which project `title` and neither of
 * which names a page.
 */
function labelProjections(): {satisfied: Site[]; missing: Site[]} {
  const seen = new Map<string, {hasNav: boolean; exports: Set<string>}>()

  for (const [exportName, query] of Object.entries(queries)) {
    if (typeof query !== 'string') continue
    let ast: unknown
    try {
      ast = parse(query)
    } catch {
      // A partial fragment that is not valid GROQ on its own; it is asserted
      // through the queries that interpolate it. INTERNAL_HERO_OVERRIDE_FIELDS
      // is the only one today, and CI's typegen job records the same fact.
      continue
    }
    eachProjection(ast, 'anon', (node, source) => {
      const attributes = ((node.attributes as Node[] | undefined) ?? []).filter(
        (a) => a.type === 'ObjectAttributeValue',
      )
      const names = attributes.map((a) => String(a.name))

      const labelAttribute = attributes.find(
        (a) => (a.name === 'label' || a.name === 'title') && reads(a.value, 'title'),
      )
      if (!labelAttribute) return
      const hasLinkTarget = names.includes('href') || names.includes('slug')
      if (!hasLinkTarget) return

      const signature = `${source} {${[...names].sort().join(',')}}`
      // Two ways to satisfy the rule, and only two. Either the label expression
      // resolves navLabel itself, or the projection hands navLabel to the page
      // alongside the Name for `resolvePageLabel` to resolve downstream (NAME-3).
      const hasNav = names.includes('navLabel') || reads(labelAttribute.value, 'navLabel')

      const entry = seen.get(signature) ?? {hasNav, exports: new Set<string>()}
      // One signature can occur in several places. It counts as satisfied only
      // if EVERY occurrence projects navLabel, so a fixed copy cannot cover an
      // unfixed twin — which is exactly how the sidebar tree's inline copy in
      // the blog-post query would otherwise have hidden.
      entry.hasNav = entry.hasNav && hasNav
      entry.exports.add(exportName)
      seen.set(signature, entry)
    })
  }

  const satisfied: Site[] = []
  const missing: Site[] = []
  for (const [signature, {hasNav, exports}] of seen) {
    const site = {signature, exports: [...exports].sort()}
    ;(hasNav ? satisfied : missing).push(site)
  }
  return {satisfied, missing}
}

/**
 * Projections that emit a page label and a link target and DO NOT project
 * `navLabel`, each with the reason it is allowed to.
 *
 * **This is a record of what is not covered, not a list of things that are
 * fine.** It held twelve entries when this guard landed: one ruled the other
 * way, and eleven the 2026-08-07 nav ruling had not named, carried here so the
 * unruled set was visible in code rather than absent from the derivation.
 *
 * **Pass D.2, ruled 2026-08-07 by Justin, ruled those eleven IN** — the sidebar
 * related-links widget, the sidebar attorney widget, attorney cards in a page
 * section, attorneys listed on an event, the event index card, the blog-category
 * chip on a post card and the blog category index. NAME-1's "index cards and
 * link text" wording governs them, every one now resolves the label in the
 * projection, and every one moved out of this roster and into enforcement. What
 * is left is a ruled exemption, which is the only kind this roster may hold.
 */
const RULED_THE_OTHER_WAY =
  'RULED, and ruled the other way. NAME-7: a reviewPage shows no nav label ' +
  'because it is hidden from search and linked from nowhere, so the field ' +
  'going unread here is the rule being obeyed rather than a gap. Re-read ' +
  '2026-08-07 against the Pass D.2 ruling and unaffected by it: that ruling ' +
  'reached index cards and link text, and a reviewPage is neither.'

// The signature lost `seoTitle` on 2026-08-10 with `BI/rules/technical-seo.md`
// queue line 11: `reviewPage` does not declare that field and the query
// projected it anyway. It GAINED `metaDescription` the same way when the last
// half of that queue line landed. The exemption is unchanged in substance and
// its reason is untouched — this roster keys on the projected SET, so it moves
// whenever the projection does, and the stale-exemption case going red on a
// projection edit is that mechanism working rather than a second finding. It
// has now fired twice on the same query for that reason, both times correctly.
const EXEMPT: Record<string, string> = {
  '*[_type=="reviewPage"] {blurb,feedbackFormEmbed,h1,metaDescription,noFollow,noIndex,reviewLinks,slug,title}':
    RULED_THE_OTHER_WAY,
}

describe('every nav projection that renders a label projects navLabel (NAME-1, NAME-2)', () => {
  const {satisfied, missing} = labelProjections()

  it('finds label projections at all, so a silent zero cannot pass', () => {
    // Guards the guard. Every assertion below is trivially true against an empty
    // set, which is what a renamed export or a groq-js AST change would produce.
    expect(satisfied.length + missing.length).toBeGreaterThan(10)
    expect(satisfied.length).toBeGreaterThan(0)
  })

  it('leaves no label projection unaccounted for', () => {
    const unexplained = missing
      .filter((site) => !(site.signature in EXEMPT))
      .map((site) => `  ${site.signature}\n    in: ${site.exports.join(', ')}`)

    expect(
      unexplained,
      'A projection emits a page label beside a link target and never projects ' +
        'navLabel, so an authored Nav Label cannot reach it (NAME-2: a rule ' +
        'cannot bind a field a projection omits). Either project navLabel — ' +
        'lib/sanity/queries.ts carries the shared expression — or add the ' +
        'signature to EXEMPT in this file with the reason it is not a nav ' +
        'surface.\n' +
        unexplained.join('\n'),
    ).toEqual([])
  })

  it('carries no stale exemption', () => {
    const missingSignatures = new Set(missing.map((s) => s.signature))
    const stale = Object.keys(EXEMPT).filter((sig) => !missingSignatures.has(sig))

    expect(
      stale,
      'An EXEMPT entry no longer matches any unfixed projection. It was either ' +
        'fixed — delete the entry — or the projection changed shape, in which ' +
        'case re-read it before re-keying the exemption.\n  ' +
        stale.join('\n  '),
    ).toEqual([])
  })
})
