import {describe, it, expect} from 'vitest'

import {withCtaOverride} from '../ctaOverride'
import type {GlobalCtaData} from '@/components/sections/GlobalCta'

// THE CLOSE'S OVERRIDE LEAVES WHAT IT LEAVES EMPTY TO THE SITE'S CLOSE.
//
// Phase 18 session 1's ledger (2026-09-30, a throwaway's render): GROQ returns an unset override field as null,
// and every page merged `{...global, ...override}`, so the null won. An override holding only a heading drew the
// close with no line and no button. The Studio's help text promises the opposite ("leave blank to use Global CTA
// defaults"; buttons "leave empty to use Global CTA defaults"), and this is the one merge every page uses.

const GLOBAL: GlobalCtaData = {
  layout: 'centered',
  tagline: 'Free consultation',
  heading: 'Talk to someone today',
  description: 'No obligation, and the call is confidential.',
  buttons: [{title: 'Speak With an Attorney', url: '/contact/', variant: 'primary'}],
  formEmbed: '<form></form>',
}

/** The override as GROQ answers it for a page whose operator filled the heading only. */
const HEADING_ONLY: Partial<GlobalCtaData> = {tagline: null, heading: 'Your plan, in one meeting', description: null, buttons: null}

describe('withCtaOverride', () => {
  it('keeps the site close for every field GROQ answers as null', () => {
    expect(withCtaOverride(GLOBAL, HEADING_ONLY)).toEqual({...GLOBAL, heading: 'Your plan, in one meeting'})
  })

  it('reads blank text and an empty list as left empty', () => {
    const merged = withCtaOverride(GLOBAL, {tagline: '   ', heading: '', description: '\n', buttons: []})
    expect(merged).toEqual(GLOBAL)
  })

  it('reads a list whose buttons all lack a label or a link as left empty, since none of them would draw', () => {
    const merged = withCtaOverride(GLOBAL, {buttons: [{title: 'Call us', url: null, variant: null}, {title: null, url: '/contact/', variant: null}]})
    expect(merged.buttons).toEqual(GLOBAL.buttons)
  })

  it('lets every filled field win, the buttons as a whole list', () => {
    const over: Partial<GlobalCtaData> = {
      tagline: 'Estate planning',
      heading: 'Start your plan',
      description: 'One meeting, a fixed price.',
      buttons: [
        {title: 'Speak With an Attorney', url: '/contact/', variant: 'primary'},
        {title: 'Call 612-555-0100', url: 'tel:6125550100', variant: 'secondary'},
      ],
    }
    expect(withCtaOverride(GLOBAL, over)).toEqual({...GLOBAL, ...over})
  })

  it('answers the site close when there is no override', () => {
    expect(withCtaOverride(GLOBAL, null)).toEqual(GLOBAL)
    expect(withCtaOverride(GLOBAL, undefined)).toEqual(GLOBAL)
  })

  it('changes neither argument', () => {
    const global = structuredClone(GLOBAL)
    const over = structuredClone(HEADING_ONLY)
    withCtaOverride(global, over)
    expect(global).toEqual(GLOBAL)
    expect(over).toEqual(HEADING_ONLY)
  })
})
