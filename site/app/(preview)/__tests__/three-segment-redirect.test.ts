import {describe, it, expect, vi, beforeEach} from 'vitest'

// The three-segment address of the old pin (Phase 17B session 3, record §2.10,
// amendment 16): inside a session it is sent to the four-segment address with the
// theme as the site is; without one it is a 404 like every other preview address.

const session = vi.hoisted(() => ({state: 'none' as 'none' | 'live' | 'ended'}))
vi.mock('@/lib/preview/session', () => ({getPreviewSession: async () => (session.state === 'live' ? {state: 'live', grant: {v: 1, role: 'operator', exp: 2_000_000_000}} : {state: session.state})}))
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NOT_FOUND') },
  redirect: (path: string) => { throw new Error(`REDIRECT ${path}`) },
}))

import ThreeSegmentPreview from '../site-preview/[styleSet]/[palette]/[flow]/page'

const open = (styleSet: string, palette: string, third: string) =>
  ThreeSegmentPreview({params: Promise.resolve({styleSet, palette, flow: third})})

describe('the three-segment preview address', () => {
  beforeEach(() => { session.state = 'live' })

  it('inside a session, sends the old address to the four-segment one with the theme as the site is', async () => {
    await expect(open('graphite', 'navy-brass', 'design')).rejects.toThrow('REDIRECT /site-preview/graphite/navy-brass/site/design')
    await expect(open('site', 'site', 'grey')).rejects.toThrow('REDIRECT /site-preview/site/site/site/grey')
  })

  it('is a 404 without a session, whatever the address', async () => {
    session.state = 'none'
    await expect(open('graphite', 'navy-brass', 'design')).rejects.toThrow('NOT_FOUND')
  })

  it('is a 404 when the third slot is not a view, so a theme id in the old position reaches nothing', async () => {
    await expect(open('graphite', 'navy-brass', 'alternating.balanced')).rejects.toThrow('NOT_FOUND')
    await expect(open('nope', 'site', 'design')).rejects.toThrow('NOT_FOUND')
  })

  it('an ended session is sent on, and the four-segment layout says the preview has ended', async () => {
    session.state = 'ended'
    await expect(open('site', 'site', 'design')).rejects.toThrow('REDIRECT /site-preview/site/site/site/design')
  })
})
