import {describe, it, expect, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import {readFileSync} from 'node:fs'
import path from 'node:path'

// ─── Shared-component accessibility invariants ────────────────────────────────
//
// These are the fleet-wide a11y contracts for the shared blog collection
// components. A regression here ships to every client site built from this
// template at once, so it must fail CI, not a per-client QA pass.
//
// Two invariants are asserted, both live in RelatedPosts, BlogIndexFallback and
// BlogIndexClient (the "and their kin" set):
//
//   1. Collection list semantics — the card grid renders as `<ul role="list">`.
//      The explicit role is required because Safari + VoiceOver strip implicit
//      list semantics when `list-style: none` is applied, so without it screen
//      reader users lose the "list, N items" affordance. (See
//      skill-component-patterns → collection-rendering pattern.)
//
//   2. Unique, descriptive link names — each repeated "Read More" CTA carries an
//      aria-label that includes the post's resolved title, so its accessible
//      name is "Read More: <title>", not a bare "Read More". A page full of
//      identically-named "Read More" links is a WCAG 2.4.4 (Link Purpose)
//      failure: screen-reader link menus become a wall of indistinguishable
//      entries. This is the defect the guard exists to catch.
//
// The two server components are rendered and asserted through the REAL <Button>,
// so the accessible name is verified end-to-end (Button forwards aria-label onto
// the anchor). BlogIndexClient is a 'use client' component (framer-motion +
// next/navigation); rather than drag its full runtime into a render, its copy of
// both invariants is covered by the source-text scan at the bottom — the same
// mixed behavior + source-meta shape used in lib/sanity/__tests__/queries.test.ts.

vi.mock('next/link', () => ({
  default: ({children, href, ...props}: {children: React.ReactNode; href: unknown}) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/SectionHeader', () => ({
  SectionHeader: ({heading}: {heading?: string}) => <div>{heading}</div>,
}))

vi.mock('@/components/ui/icons', () => ({
  ClockIcon: () => <svg data-testid="clock-icon" aria-hidden="true" />,
}))

import {RelatedPosts, type RelatedPostsData} from '../RelatedPosts'
import {BlogIndexFallback} from '../BlogIndexFallback'
import type {BlogPostCard} from '../BlogIndexClient'

// Two posts: one with a category, one without — mirrors the real card variance.
const POSTS: BlogPostCard[] = [
  {
    slug: 'estate-planning-basics',
    h1: 'Estate Planning Basics',
    metaDescription: 'What every family should know.',
    bodyText: 'word '.repeat(240),
    publishedAt: '2026-01-01',
    category: {title: 'Estate Planning', slug: 'estate-planning'},
  },
  {
    slug: 'probate-timeline',
    h1: 'The Probate Timeline',
    metaDescription: 'How long probate really takes.',
    bodyText: 'word '.repeat(120),
    publishedAt: '2026-02-01',
    category: null,
  },
]

const RELATED_DATA: RelatedPostsData = {
  byCategory: POSTS,
  fallback: [],
}

describe('shared blog components — accessibility invariants', () => {
  describe('RelatedPosts', () => {
    it('renders the card collection as an explicit role="list"', () => {
      render(<RelatedPosts data={RELATED_DATA} tokens={null} />)
      expect(screen.getByRole('list')).toBeTruthy()
    })

    it('gives every "Read More" CTA a unique accessible name that includes the post title', () => {
      render(<RelatedPosts data={RELATED_DATA} tokens={null} />)
      // The CTA's accessible name is a "Read …" prefix followed by the post
      // title, so each repeated link is distinguishable (WCAG 2.4.4). The regex
      // is prefix-agnostic on purpose — "Read More:" and "Read article:" both
      // satisfy the invariant; what matters is that the title is present.
      expect(
        screen.getByRole('link', {name: /^Read .*Estate Planning Basics$/}),
      ).toBeTruthy()
      expect(
        screen.getByRole('link', {name: /^Read .*The Probate Timeline$/}),
      ).toBeTruthy()
      // And no CTA collapses to a bare, title-less "Read More" (the failure mode
      // when the aria-label is dropped — the visible text becomes the whole name).
      expect(screen.queryByRole('link', {name: 'Read More'})).toBeNull()
    })
  })

  describe('BlogIndexFallback', () => {
    it('renders the card collection as an explicit role="list"', () => {
      render(<BlogIndexFallback posts={POSTS} tokens={null} />)
      expect(screen.getByRole('list', {name: 'Blog posts'})).toBeTruthy()
    })

    it('gives every "Read More" CTA a unique accessible name that includes the post title', () => {
      render(<BlogIndexFallback posts={POSTS} tokens={null} />)
      expect(
        screen.getByRole('link', {name: /^Read .*Estate Planning Basics$/}),
      ).toBeTruthy()
      expect(
        screen.getByRole('link', {name: /^Read .*The Probate Timeline$/}),
      ).toBeTruthy()
      expect(screen.queryByRole('link', {name: 'Read More'})).toBeNull()
    })
  })

  // ─── Source-text invariant scan (fleet coverage incl. the client component) ──
  // Behavior tests above prove the invariants end-to-end on the two server
  // components; this scan extends the same two contracts to all three shared
  // components — including BlogIndexClient, whose 'use client' runtime is not
  // rendered here — so a regression in any of them fails CI at the source layer.
  describe('source-text invariants across all shared blog components', () => {
    const COMPONENTS = ['BlogIndexClient.tsx', 'BlogIndexFallback.tsx', 'RelatedPosts.tsx']

    for (const file of COMPONENTS) {
      const src = readFileSync(path.resolve(__dirname, '..', file), 'utf-8')

      it(`${file}: renders its collection as role="list"`, () => {
        expect(src).toMatch(/role="list"/)
      })

      it(`${file}: labels each "Read More" CTA with the resolved post title`, () => {
        // The tertiary CTA's aria-label must incorporate the resolved post
        // title, not stand as a bare "Read More". Prefix-agnostic: both
        // `Read More: ${…}` and `Read article: ${…}` satisfy the invariant.
        expect(src).toMatch(
          /aria-label=\{`Read [^`]*\$\{resolveTokenString\(post\.h1/,
        )
      })
    }
  })
})
