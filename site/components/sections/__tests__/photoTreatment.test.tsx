import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))
vi.mock('@/components/ui/SanityImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  SanityImage: ({alt, className}: {alt: string; className?: string}) => <img alt={alt} className={className} />,
}))

import {PracticeAreaNavBlock} from '../PracticeAreaNavBlock'
import {AttorneySectionBlock} from '../AttorneySectionBlock'
import {ContentSectionBlock} from '../ContentSectionBlock'

// PHOTO COLOR AND EDGE (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 16, `[R-641]`): one treatment for the site's
// photographs, set once. The rules reach feature photos and practice-card photos, never an icon, an attorney's photo or a
// cut-out; the tint sits under any text, on a practice card in place of the decorative gradient below its text block.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const GRAY = ':is([data-photo-color="mono"], [data-photo-color="tint"]) :is([data-feature-photo] img, nav [data-card] img:not([data-tile-icon] img))'
const photo = {asset: {_ref: 'image-p-1200x800-jpg'}}
const icon = {asset: {_ref: 'image-i-64x64-png'}}

describe('photo color', () => {
  it('turns practice-card and feature photos gray, and never an icon, an attorney or a cut-out', () => {
    expect(CSS).toContain(`${GRAY} {\n  filter: grayscale(1);`)
    const {container} = render(
      <div data-photo-color="mono"><main>
        <PracticeAreaNavBlock data={{heading: 'Areas', layout: 'feature', mobileDisplay: 'stacked', items: [{_key: 'a', label: 'Wills', href: '/wills/', image: photo, icon}]} as never} />
        <AttorneySectionBlock data={{heading: 'People', cardStyle: 'portrait', attorneys: [{_id: 'x', title: 'A. Lawyer', slug: 'attorneys/a', photo}]} as never} />
        <ContentSectionBlock data={{_type: 'contentSection', _id: 'c', layout: 'split', heading: 'Why', body: [], media: {kind: 'image', image: {...photo, alt: 'Office'}}} as never} disclaimer="Past results do not guarantee future outcomes." scale="marketing" />
        <ContentSectionBlock data={{_type: 'contentSection', _id: 'd', layout: 'split', heading: 'Who', body: [], media: {kind: 'cutout', image: {...photo, alt: 'Figure'}}} as never} disclaimer="Past results do not guarantee future outcomes." scale="marketing" />
      </main></div>,
    )
    const gray = [...container.querySelectorAll('img')].filter((img) => img.matches(GRAY)).map((img) => img.getAttribute('alt'))
    expect(gray).toContain('Office')
    expect(gray).not.toContain('Figure')
    expect(gray).not.toContain('A. Lawyer')
    // The practice card's photo is gray; its icon is not.
    const card = container.querySelector('nav [data-card]')!
    expect([...card.querySelectorAll('img')].map((img) => [img.closest('[data-tile-icon]') ? 'icon' : 'photo', img.matches(GRAY)])).toEqual([['photo', true], ['icon', false]])
  })

  it('the tint washes in the accent under the text, and the fade masks the edge facing the text', () => {
    expect(CSS).toMatch(/\[data-photo-color="tint"\] \[data-feature-photo\]::after \{[^}]*mix-blend-mode: color;/)
    expect(CSS).toMatch(/\[data-photo-color="tint"\] nav \[data-card\] img\.tile-photo \+ div \{[^}]*background-image: none;[^}]*mix-blend-mode: color;/)
    expect(CSS).toMatch(/\[data-photo-edge="fade"\] \.xl\\:order-first > \[data-feature-photo\] img \{ mask-image: linear-gradient\(to right/)
  })
})
