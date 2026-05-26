import {describe, it, expect} from 'vitest'

// ─── MIRROR of pure helpers from the migration script ────────────────────────
// Source of truth: Clients/henningson-snoxell-ltd/studio/migrations/faq-inline-to-reference.ts
// (the studio workspace doesn't host vitest, so the helpers are mirrored here
// for coverage. If the helpers change in the migration script, update this
// mirror in lockstep — the tests below verify the mirrored shape against the
// behaviors the migration depends on.)

type InlineFaqItem = {
  _type: 'faqItem'
  _key: string
  question?: string | null
  answer?: unknown[] | null
}

type FaqItemRef = {
  _type: 'reference'
  _key: string
  _ref: string
}

function slugifyQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 96)
    .replace(/-+$/, '')
}

function isInlineFaqItem(item: unknown): item is InlineFaqItem {
  if (!item || typeof item !== 'object') return false
  const i = item as {_type?: string; _ref?: unknown}
  return i._type === 'faqItem' && typeof i._ref !== 'string'
}

function isFaqItemRef(item: unknown): item is FaqItemRef {
  if (!item || typeof item !== 'object') return false
  const i = item as {_type?: string; _ref?: unknown}
  return i._type === 'reference' && typeof i._ref === 'string'
}

class SlugAllocator {
  private used = new Set<string>()
  allocate(question: string, fallback: string = 'faq'): string {
    const base = slugifyQuestion(question) || fallback
    if (!this.used.has(base)) {
      this.used.add(base)
      return base
    }
    let counter = 2
    while (this.used.has(`${base}-${counter}`)) counter++
    const candidate = `${base}-${counter}`
    this.used.add(candidate)
    return candidate
  }
  has(slug: string): boolean {
    return this.used.has(slug)
  }
}

// ─── slugifyQuestion ─────────────────────────────────────────────────────────

describe('slugifyQuestion', () => {
  it('lowercases + dash-separates ASCII questions', () => {
    expect(slugifyQuestion('What is your fee structure?')).toBe('what-is-your-fee-structure')
  })

  it('strips punctuation other than dashes', () => {
    expect(slugifyQuestion('Do you offer free consultations, in-person and virtual?')).toBe(
      'do-you-offer-free-consultations-in-person-and-virtual',
    )
  })

  it('collapses internal whitespace runs to a single dash', () => {
    expect(slugifyQuestion('How   long    does     this take')).toBe('how-long-does-this-take')
  })

  it('collapses multiple dashes', () => {
    expect(slugifyQuestion('What -- about -- this?')).toBe('what-about-this')
  })

  it('truncates at 96 chars and trims trailing dashes', () => {
    const long = 'a '.repeat(60) // produces 'a-a-a-...' way over 96 once slugified
    const result = slugifyQuestion(long)
    expect(result.length).toBeLessThanOrEqual(96)
    expect(result.endsWith('-')).toBe(false)
  })

  it('returns empty string on pure-punctuation input', () => {
    expect(slugifyQuestion('?!!?')).toBe('')
  })
})

// ─── Type guards ──────────────────────────────────────────────────────────────

describe('isInlineFaqItem / isFaqItemRef', () => {
  it('identifies an inline faqItem object', () => {
    expect(isInlineFaqItem({_type: 'faqItem', _key: 'k1', question: 'Q', answer: []})).toBe(true)
  })

  it('rejects a reference object (has _ref)', () => {
    expect(isInlineFaqItem({_type: 'reference', _key: 'k1', _ref: 'doc-1'})).toBe(false)
  })

  it('rejects a non-faqItem object', () => {
    expect(isInlineFaqItem({_type: 'block', _key: 'k1'})).toBe(false)
  })

  it('rejects null + non-objects', () => {
    expect(isInlineFaqItem(null)).toBe(false)
    expect(isInlineFaqItem(undefined)).toBe(false)
    expect(isInlineFaqItem('string')).toBe(false)
    expect(isInlineFaqItem(42)).toBe(false)
  })

  it('identifies a faqItem reference', () => {
    expect(isFaqItemRef({_type: 'reference', _key: 'k1', _ref: 'doc-1'})).toBe(true)
  })

  it('rejects a reference without _ref string', () => {
    expect(isFaqItemRef({_type: 'reference', _key: 'k1'})).toBe(false)
    expect(isFaqItemRef({_type: 'reference', _key: 'k1', _ref: 42})).toBe(false)
  })
})

// ─── SlugAllocator (uniqueness) ──────────────────────────────────────────────

describe('SlugAllocator', () => {
  it('returns the base slug for a unique question', () => {
    const a = new SlugAllocator()
    expect(a.allocate('What is your fee structure?')).toBe('what-is-your-fee-structure')
  })

  it('counter-suffixes duplicate questions', () => {
    const a = new SlugAllocator()
    expect(a.allocate('Do you offer free consultations?')).toBe(
      'do-you-offer-free-consultations',
    )
    expect(a.allocate('Do you offer free consultations?')).toBe(
      'do-you-offer-free-consultations-2',
    )
    expect(a.allocate('Do you offer free consultations?')).toBe(
      'do-you-offer-free-consultations-3',
    )
  })

  it('uses the provided fallback when the slugified result is empty', () => {
    const a = new SlugAllocator()
    expect(a.allocate('???', 'faq-abc123')).toBe('faq-abc123')
  })

  it('counter-suffixes the fallback too', () => {
    const a = new SlugAllocator()
    expect(a.allocate('???', 'faq-abc123')).toBe('faq-abc123')
    expect(a.allocate('!!!', 'faq-abc123')).toBe('faq-abc123-2')
  })
})

// ─── Migration plan behaviors (idempotency + mixed arrays) ────────────────────
// These verify the high-level migration semantics by simulating a host-doc's
// array against the type guards + allocator. They mirror the inline planning
// logic in the migration script's main() forward branch.

describe('Migration plan — inline-to-reference logic', () => {
  it('handles a single inline faqItem on a host doc', () => {
    const items = [
      {_type: 'faqItem', _key: 'k1', question: 'Q1', answer: []},
    ]
    const inline = items.filter(isInlineFaqItem)
    const refs = items.filter(isFaqItemRef)
    expect(inline).toHaveLength(1)
    expect(refs).toHaveLength(0)
  })

  it('handles multiple inline faqItems on a single host doc', () => {
    const items = [
      {_type: 'faqItem', _key: 'k1', question: 'Q1', answer: []},
      {_type: 'faqItem', _key: 'k2', question: 'Q2', answer: []},
      {_type: 'faqItem', _key: 'k3', question: 'Q3', answer: []},
    ]
    const inline = items.filter(isInlineFaqItem)
    expect(inline).toHaveLength(3)
    expect(inline.map((i) => i.question)).toEqual(['Q1', 'Q2', 'Q3'])
  })

  it('handles an empty faqItems array (skip on idempotency)', () => {
    const items: Array<InlineFaqItem | FaqItemRef> = []
    const inline = items.filter(isInlineFaqItem)
    expect(inline).toHaveLength(0)
  })

  it('idempotency: an array of pure refs has zero inline items (skip target)', () => {
    const items = [
      {_type: 'reference', _key: 'k1', _ref: 'doc-1'},
      {_type: 'reference', _key: 'k2', _ref: 'doc-2'},
    ]
    const inline = items.filter(isInlineFaqItem)
    const refs = items.filter(isFaqItemRef)
    expect(inline).toHaveLength(0)
    expect(refs).toHaveLength(2)
  })

  it('preserves existing refs in mixed arrays (refs survive, inlines migrate)', () => {
    const items: Array<InlineFaqItem | FaqItemRef> = [
      {_type: 'reference', _key: 'k1', _ref: 'doc-1'},
      {_type: 'faqItem', _key: 'k2', question: 'Q', answer: []},
      {_type: 'reference', _key: 'k3', _ref: 'doc-2'},
    ]
    // Plan: simulate migrating only the inline; ref positions preserved.
    const allocator = new SlugAllocator()
    let planIndex = 0
    const plan = items.filter(isInlineFaqItem).map((i) => ({
      slug: allocator.allocate(i.question ?? ''),
      newDocId: 'new-doc-1',
    }))
    const newArray = items.map((item) => {
      if (isInlineFaqItem(item)) {
        const entry = plan[planIndex++]
        return {_type: 'reference' as const, _key: item._key, _ref: entry.newDocId}
      }
      return item
    })
    expect(newArray).toHaveLength(3)
    expect((newArray[0] as FaqItemRef)._ref).toBe('doc-1') // preserved
    expect((newArray[1] as FaqItemRef)._ref).toBe('new-doc-1') // newly minted
    expect((newArray[2] as FaqItemRef)._ref).toBe('doc-2') // preserved
    expect(newArray.every(isFaqItemRef)).toBe(true)
  })

  it('slug uniqueness handles duplicate questions across the dataset', () => {
    // Simulate two host docs both with a "Do you offer free consultations?" entry.
    const allocator = new SlugAllocator()
    const slug1 = allocator.allocate('Do you offer free consultations?')
    const slug2 = allocator.allocate('Do you offer free consultations?')
    expect(slug1).toBe('do-you-offer-free-consultations')
    expect(slug2).toBe('do-you-offer-free-consultations-2')
    expect(slug1).not.toBe(slug2)
  })
})
