import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock the Sanity client at the module boundary. The test contract is
// "what shape of slug argument does this page pass to STAFF_PAGE_QUERY?" —
// pure argument-shape assertion, no rendering needed.
vi.mock('@/lib/sanity/client', () => ({
  client: {fetch: vi.fn()},
}))

import {client} from '@/lib/sanity/client'
import {STAFF_PAGE_QUERY} from '@/lib/sanity/queries'
import StaffProfilePage, {generateMetadata} from '@/app/(site)/staff/[slug]/page'

beforeEach(() => {
  vi.mocked(client.fetch).mockReset()
  // Default: any query resolves to null. For STAFF_PAGE_QUERY this drives the
  // page into its notFound() path; for the other Promise.all queries
  // (NAP_TOKENS_QUERY, GLOBAL_CTA_QUERY, DESIGN_TOKENS_QUERY) it's still safe
  // because the page only consumes them after the member null-check.
  // Cast to `never` because Sanity's typed fetch generic doesn't accept null
  // directly; the mock is loose by design.
  vi.mocked(client.fetch).mockResolvedValue(null as never)
})

const findStaffCall = () =>
  vi.mocked(client.fetch).mock.calls.find(([q]) => q === STAFF_PAGE_QUERY)

describe('staff/[slug] route — slug argument shape (regression)', () => {
  it('StaffProfilePage passes the bare slug to STAFF_PAGE_QUERY (no `staff/` prefix)', async () => {
    // notFound() throws in test env when member is null — expected; the test
    // just needs the fetch argument shape, which has already been captured by
    // the time the throw happens.
    try {
      await StaffProfilePage({params: Promise.resolve({slug: 'john-doe'})})
    } catch {
      // swallow notFound() throw — orthogonal to this test's contract
    }
    const call = findStaffCall()
    expect(call).toBeTruthy()
    expect(call?.[1]).toEqual({slug: 'john-doe'})
    expect(call?.[1]).not.toEqual({slug: 'staff/john-doe'})
  })

  it('generateMetadata passes the bare slug to STAFF_PAGE_QUERY (no `staff/` prefix)', async () => {
    await generateMetadata({params: Promise.resolve({slug: 'john-doe'})})
    const call = findStaffCall()
    expect(call).toBeTruthy()
    expect(call?.[1]).toEqual({slug: 'john-doe'})
    expect(call?.[1]).not.toEqual({slug: 'staff/john-doe'})
  })

  it('generateMetadata returns a generic title fallback when member is null (does not throw)', async () => {
    const meta = await generateMetadata({params: Promise.resolve({slug: 'unknown-slug'})})
    expect(meta.title).toBe('Staff Profile')
  })
})
