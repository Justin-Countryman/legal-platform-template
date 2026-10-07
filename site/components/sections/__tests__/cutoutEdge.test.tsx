import {describe, expect, it, vi} from 'vitest'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('@/components/ui/SanityImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  SanityImage: ({alt, className}: {alt: string; className?: string}) => <img alt={alt} className={className} />,
}))

import {ContentSectionBlock} from '../ContentSectionBlock'

// A CUT-OUT STANDING ON THE BAND'S BOTTOM EDGE (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 15, `[R-641]`;
// nguyenandmaliklaw, lovellfirm and lewinlawfirm stand their people on a band's edge). A split content section's cut-out
// with `cutoutEdge: 'bottom'`: the band publishes its bottom padding (`band-pb-*`) and the cut-out's column sits at the
// row's foot and reaches through it. Blank, or a photograph, draws as before.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const data = (over: Record<string, unknown> = {}) => ({
  _type: 'contentSection', _id: 'c', layout: 'split', heading: 'Our attorneys',
  body: [{_type: 'block', _key: 'a', style: 'normal', markDefs: [], children: [{_type: 'span', _key: 's', text: 'Here.', marks: []}]}],
  media: {kind: 'cutout', image: {asset: {_ref: 'image-abc-800x1000-png'}, alt: 'Attorney'}},
  ...over,
}) as never
const draw = (over?: Record<string, unknown>) => render(<ContentSectionBlock data={data(over)} disclaimer="Past results do not guarantee future outcomes." scale="marketing" />).container

describe('the cut-out on the band’s edge', () => {
  it('publishes the band’s bottom padding and sinks the cut-out’s column to the edge', () => {
    const c = draw({cutoutEdge: 'bottom'})
    expect(c.querySelector('section')!.className).toMatch(/(^|\s)band-pb-(compact|normal|spacious|tight)(\s|$)/)
    const column = c.querySelector('img')!.closest('.stacked-cutout')!.parentElement!
    expect(column.className.split(' ')).toEqual(expect.arrayContaining(['xl:self-end', 'xl:cutout-sink']))
    expect(CSS).toMatch(/@utility cutout-sink \{\s*margin-bottom: calc\(-1 \* var\(--band-pb, 0px\)\);/)
  })

  it('blank, or a photograph, draws as before', () => {
    for (const c of [draw(), draw({cutoutEdge: 'bottom', media: {kind: 'image', image: {asset: {_ref: 'image-abc-800x1000-jpg'}, alt: 'x'}}})]) {
      expect(c.querySelector('section')!.className).not.toMatch(/band-pb-/)
      expect(c.innerHTML).not.toContain('cutout-sink')
    }
  })
})
