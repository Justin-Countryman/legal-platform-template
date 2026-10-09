import {describe, expect, it, vi} from 'vitest'
import {fireEvent, render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('@/components/ui/SanityImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  SanityImage: ({alt}: {alt: string}) => <img alt={alt} />,
}))

import {VideoEmbed, type VideoItem} from '../VideoEmbed'
import {AttorneyVideo} from '@/components/attorney/AttorneyVideo'

// THE VIDEO POSTER (monorepo WS-PREMIUM-PACKAGE-DESIGN §11, `[R-652]`): a video that stores a custom thumbnail shows it
// under the library's play mark, as a link to the video named for it, and loads the player only when pressed, asked to
// play and focused. A video without one draws exactly the lazy iframe it always did. The site's one photo treatment
// reaches the poster's photograph, never its play mark, and never an attorney's poster.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const GRAY = ':is([data-photo-color="mono"], [data-photo-color="tint"]) [data-video-poster] img'
const base: VideoItem = {_id: 'v', title: 'Meet the firm', youTubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'}
const thumbnail = {asset: {_ref: 'image-t-1600x900-jpg'}, alt: 'A first conversation'}

describe('the video poster', () => {
  it('without a thumbnail (or with an alt and no image) draws the lazy iframe and nothing else', () => {
    for (const video of [base, {...base, thumbnail: {alt: 'no image'}} as VideoItem]) {
      const {container, unmount} = render(<VideoEmbed video={video} />)
      const frame = container.querySelector('iframe')!
      expect(frame.getAttribute('loading')).toBe('lazy')
      expect(frame.getAttribute('src')).not.toContain('autoplay=1')
      expect(container.querySelector('[data-video-poster], a')).toBeNull()
      unmount()
    }
  })

  it('with a thumbnail shows a link to the video named for it; pressed, the player asked to play, focused', () => {
    const {container, getByRole} = render(<VideoEmbed video={{...base, thumbnail}} />)
    expect(container.querySelector('iframe')).toBeNull()
    const link = getByRole('link', {name: 'Play video: Meet the firm'})
    expect(link.getAttribute('href')).toBe(base.youTubeUrl)
    expect(link.hasAttribute('data-video-poster')).toBe(true)
    expect(link.querySelector('img')!.getAttribute('alt')).toBe('')
    expect(link.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
    fireEvent.click(link)
    const frame = container.querySelector('iframe')!
    expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&autoplay=1')
    expect(frame.getAttribute('title')).toBe('Meet the firm')
    expect(document.activeElement).toBe(frame)
    expect(container.querySelector('a')).toBeNull()
  })

  it('names an untitled video plainly', () => {
    const {getByRole} = render(<VideoEmbed video={{...base, title: null as unknown as string, thumbnail}} />)
    expect(getByRole('link').getAttribute('aria-label')).toBe('Play video')
  })

  it('draws its focus mark on the layer above the photograph, with an outline forced colors paint', () => {
    const {getByRole} = render(<VideoEmbed video={{...base, thumbnail}} />)
    const mark = getByRole('link').querySelector('svg')!.parentElement!.parentElement!
    for (const cls of ['z-[1]', 'group-focus-visible:ring-2', 'group-focus-visible:ring-inset', 'group-focus-visible:ring-focus',
      'group-focus-visible:outline-2', 'group-focus-visible:outline-transparent']) expect(mark.className).toContain(cls)
  })

  it('takes the photo treatment on its photograph, under the play mark, and never the fade', () => {
    expect(CSS).toContain(`${GRAY} {\n  filter: grayscale(1);`)
    expect(CSS).toMatch(/\[data-photo-color="tint"\] \[data-video-poster\]::after \{[^}]*background-color: var\(--color-accent\);[^}]*mix-blend-mode: color;[^}]*opacity: 0\.6;/)
    expect(CSS).not.toMatch(/data-photo-edge[^{]*data-video-poster/)
    const {getByRole} = render(<div data-photo-color="tint"><VideoEmbed video={{...base, thumbnail}} /></div>)
    expect(getByRole('link').querySelector('img')!.matches(GRAY)).toBe(true)
  })

  it('leaves an attorney\'s poster untreated: the package never treats people', () => {
    const {container} = render(
      <div data-photo-color="tint"><AttorneyVideo attorney={{firstName: 'Miriam', videos: [{...base, thumbnail}]} as never} /></div>,
    )
    const link = container.querySelector('a')!
    expect(link.hasAttribute('data-video-poster')).toBe(false)
    expect(link.querySelector('img')!.matches(GRAY)).toBe(false)
  })
})
