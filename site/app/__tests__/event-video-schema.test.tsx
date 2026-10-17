import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'

// Monorepo backlog 517, read 2026-10-16. Google's Event docs: eventStatus EventCancelled means "the event has been
// canceled", and a page that leaves it out is understood as EventScheduled; nothing there marks a past event
// cancelled. Google's video docs: uploadDate is required (ISO 8601); schema.org defines it as when the media object
// "was uploaded to this site", which the video document's creation answers.

vi.mock('@/lib/sanity/client', () => ({client: {fetch: vi.fn()}}))
vi.mock('next/navigation', () => ({notFound: () => { throw new Error('notFound') }}))

import {client} from '@/lib/sanity/client'
import * as Q from '@/lib/sanity/queries'
import EventDetailPage from '@/app/(site)/events/[slug]/page'
import VideoLibraryPage from '@/app/(site)/videos/page'

const CHROME = {nap: {firmName: 'Example Firm', locations: []}, designTokens: null, globalCta: null}

function serve(answers: Record<string, unknown>) {
  vi.mocked(client.fetch).mockImplementation((async (query: string) => {
    if (query === Q.SITE_CHROME_QUERY) return CHROME
    return query in answers ? answers[query] : null
  }) as never)
}

function jsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]))
}

beforeEach(() => vi.mocked(client.fetch).mockReset())

describe('event and video structured data', () => {
  it('a past event is not marked cancelled', async () => {
    serve({[Q.EVENT_PAGE_QUERY]: {title: 'Estate Planning Seminar', slug: 'events/seminar', eventDate: '2020-05-01T18:00:00Z',
      locationType: 'inPerson', locationAddress: '1 Main St, Springfield, IL'}})
    const html = renderToStaticMarkup(await EventDetailPage({params: Promise.resolve({slug: 'seminar'})}))
    const event = jsonLd(html).find((n) => n['@type'] === 'Event')!
    expect(event.eventStatus).toBe('https://schema.org/EventScheduled')
  })

  it('every video carries the upload date Google requires', async () => {
    const video = {id: 'v1', title: 'Our Firm', youTubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      uploadDate: '2026-03-04T15:00:00Z'}
    serve({[Q.VIDEO_INDEX_PAGE_QUERY]: {title: 'Videos', videos: [video]}})
    const html = renderToStaticMarkup(await VideoLibraryPage())
    const graph = (jsonLd(html).find((n) => n['@graph']) ?? {})['@graph'] as Record<string, unknown>[]
    expect(graph[0]).toMatchObject({'@type': 'VideoObject', uploadDate: '2026-03-04T15:00:00Z'})
  })

  it('the video query answers the upload date from each video document', async () => {
    const {evaluate, parse} = await import('groq-js')
    const dataset = [
      {_id: 'videoIndex', _type: 'videoIndex', videos: [{_type: 'reference', _ref: 'v1', _key: 'v1'}]},
      {_id: 'v1', _type: 'video', _createdAt: '2026-03-04T15:00:00Z', title: 'Our Firm', youTubeUrl: 'https://youtu.be/x'},
    ]
    const page = (await (await evaluate(parse(Q.VIDEO_INDEX_PAGE_QUERY), {dataset})).get()) as {videos: {uploadDate: string}[]}
    expect(page.videos[0].uploadDate).toBe('2026-03-04T15:00:00Z')
  })
})
