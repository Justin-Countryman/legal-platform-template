import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'

// ─── Attorney Highlight block ─────────────────────────────────────────────────
//
// Beat 6. Law firms sell people. Fields per BI-Library Layer 3: `heading`,
// optional `tagline`, `mode`, `attorneys[]` (manual mode only).
//
// ─── `mode` IS CONTENT, AND IT PASSES THE FIELD TEST ──────────────────────────
//
// It looks like the `layout` control dropped from `badgesBlock` and it is not.
// Every value changes WHICH PEOPLE APPEAR, which is what the visitor reads. It
// is the same category as "which badges are selected", expressed as a switch
// rather than as a list.
//
// ─── THE SPEC LISTS THREE MODES AND THIS SHIPS TWO ────────────────────────────
//
// BI-Library lists `all / manual / practiceArea`. `practiceArea` is NOT here,
// deliberately.
//
// On the interior `attorneySection`, that mode works because the section also
// carries a `practiceAreaPage` reference field, hidden unless the mode is
// selected and warned on when empty; the GROQ filters attorneys by
// `references(^.practiceAreaPage._ref)`. The homepage spec lists the mode and
// NOT the field it depends on. Shipping the mode without the field means an
// operator selects "Practice Area", the filter matches nothing, and the block
// renders empty: a control that appears to work and does nothing, which is
// exactly the failure the field test exists to prevent.
//
// So the choice was to add the missing reference field or to cut the mode, and
// the platform's standing posture decides it: one consumer does not justify the
// abstraction, and a second is the trigger (BI-Library cites this twice, at
// OUTSTANDING items 14 and 15). There is currently ZERO consumer for a
// practice-area-filtered attorney row on a homepage. BI-Homepage Beat 6
// describes the beat by firm size (solo, small firm, larger) and never by
// practice area, because the homepage attorney beat shows the firm's people
// rather than a practice-specific subset.
//
// THE TRIGGER TO ADD IT is a real firm that wants "our personal injury team" on
// the homepage. Adding the mode plus its reference field later is additive and
// invalidates no existing data. Shipping it now and removing it later would
// orphan a selection an operator had already made.

export const attorneyHighlightBlock = defineType({
  name: 'attorneyHighlightBlock',
  title: 'Attorney Highlight',
  type: 'object',
  fields: [
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Optional short label above the heading.',
      components: {input: TokenStringInput},
    },
    {
      name: 'heading',
      title: 'Heading',
      type: 'string',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'mode',
      title: 'Which Attorneys',
      type: 'string',
      options: {
        list: [
          {title: 'All — every attorney, in the order set on the Attorney Index', value: 'all'},
          {title: 'Selected — choose specific attorneys below', value: 'manual'},
        ],
        layout: 'radio',
      },
      initialValue: 'all',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'attorneys',
      title: 'Attorneys',
      type: 'array',
      description:
        'Used only in Selected mode. Drag to order. In All mode the order comes from the Attorney Index instead, so it stays consistent with the rest of the site.',
      hidden: ({parent}) => parent?.mode !== 'manual',
      validation: (Rule) =>
        Rule.custom((value: unknown[] | undefined, context) => {
          const parent = context.parent as {mode?: string} | undefined
          if (parent?.mode === 'manual' && (!value || value.length === 0)) {
            return {message: 'Select at least one attorney, or switch to All', level: 'warning' as const}
          }
          return true
        }),
      of: [{type: 'reference', to: [{type: 'attorneyPage'}]}],
    },
  ],

  preview: {
    select: {heading: 'heading', mode: 'mode', attorneys: 'attorneys'},
    prepare({heading, mode, attorneys}: {heading?: string; mode?: string; attorneys?: unknown[]}) {
      const count = attorneys?.length ?? 0
      return {
        title: heading || 'Attorney Highlight',
        subtitle:
          mode === 'manual'
            ? `Attorney Highlight block — ${count} selected`
            : 'Attorney Highlight block — all attorneys',
      }
    },
  },
})
