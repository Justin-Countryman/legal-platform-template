/**
 * OUTSTANDING item 100: a `contentToken` span inside an FAQ answer reaches the
 * emitted FAQPage JSON-LD resolved, not flattened to ''.
 *
 * The claim was "UNVERIFIED" in the backlog. Read off the code on 2026-09-11 it
 * was true: the flattener took `span.text ?? ''` for every child, and a token
 * child has `tokenKey` and no `text`. Struck the same day with this test.
 */
import {describe, expect, it} from 'vitest'
import {buildFaqPageSchema, faqAnswerText} from '../faqPageSchema'

const TOKENS = {'office.phone': '(555) 010-2000', firmName: 'Example Firm'} as const

const ANSWER_WITH_TOKEN = [
  {
    _type: 'block',
    children: [
      {_type: 'span', text: 'Call us at '},
      {_type: 'contentToken', tokenKey: 'office.phone'},
      {_type: 'span', text: ' to book.'},
    ],
  },
  {_type: 'image', asset: {_ref: 'image-x'}},
  {_type: 'block', children: [{_type: 'span', text: 'Second paragraph.'}]},
]

describe('item 100: FAQ answer text resolves contentToken spans', () => {
  it('renders the token value where the token sits, not an empty string', () => {
    expect(faqAnswerText(ANSWER_WITH_TOKEN, TOKENS as never)).toBe(
      'Call us at (555) 010-2000 to book. Second paragraph.',
    )
  })

  it('an unknown or unset token resolves to nothing rather than leaking its key', () => {
    const answer = [{_type: 'block', children: [{_type: 'contentToken', tokenKey: 'office.fax'}]}]
    expect(faqAnswerText(answer, TOKENS as never)).toBe('')
    expect(faqAnswerText(ANSWER_WITH_TOKEN, null)).toBe('Call us at to book. Second paragraph.')
  })

  it('emits the resolved answer in the FAQPage schema', () => {
    const schema = buildFaqPageSchema(
      [{question: 'How do I reach {{firmName}}?', answer: ANSWER_WITH_TOKEN}],
      TOKENS as never,
    )
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity[0].acceptedAnswer.text).toContain('(555) 010-2000')
    expect(schema.mainEntity[0].name).toBe('How do I reach Example Firm?')
  })
})
