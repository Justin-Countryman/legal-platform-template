import {describe, it, expect, vi} from 'vitest'
import {render, screen} from '@testing-library/react'

// Monorepo OUTSTANDING item 234: `BlogPostCard.publishedAt` was typed `string`
// while the query feeding it returns null for an undated post. The card never
// renders the date, so the lie was harmless until someone trusted the type.
// This renders the client component with a null date and asserts the card
// still appears; the widened type is what lets this file compile.

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/link', () => ({
  default: ({children, href, ...props}: {children: React.ReactNode; href: unknown}) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
}))

import {BlogIndexClient, type BlogPostCard} from '../BlogIndexClient'

const POSTS: BlogPostCard[] = [
  {
    slug: 'blog/dated',
    h1: 'A dated post',
    metaDescription: 'Has a date.',
    publishedAt: '2026-09-01T00:00:00Z',
    category: {title: 'Estate Planning', slug: 'blog/category/estate-planning'},
    bodyText: 'one two three',
  },
  {
    slug: 'blog/undated',
    h1: 'An undated post',
    metaDescription: null,
    publishedAt: null,
    category: null,
    bodyText: null,
  },
]

describe('BlogIndexClient with an undated post (item 234)', () => {
  it('renders the undated card beside the dated one', () => {
    render(<BlogIndexClient posts={POSTS} categories={[]} tokens={null} />)
    expect(screen.getByText('A dated post')).toBeTruthy()
    expect(screen.getByText('An undated post')).toBeTruthy()
    // A null date must not surface as the string "null" anywhere on the card.
    expect(screen.queryByText(/null/)).toBeNull()
  })
})
