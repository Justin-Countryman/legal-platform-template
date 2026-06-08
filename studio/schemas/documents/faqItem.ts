import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'

// FAQ Item — promoted from inline object to document type in WS-FAQ-Migration (2026-05-14).
// Reference model aligns FAQs with the testimonial / attorney / video patterns: single source
// of truth, edit once and propagate across pages. Site Build Tool composes faqItem docs once
// from BI doctrine + CS-FIRM-DATA, references them from page docs where they apply.
//
// `category` options are the GENERIC platform list below — NOT per-client. The
// Client Provisioning Tool does not rewrite this enum (no such logic exists).
// SBT FAQ auto-wiring matches a faqItem's stored `category` value against the
// page slug and never reads this enum, so generic values that don't equal a
// client's practice-area slugs break auto-wiring. Per-client alignment is the
// deferred reference-based SBT-wiring workstream (faqItem → practiceArea
// reference; SBT wires by ref), pre-client-#2 — see BI/OUTSTANDING.md.

export const faqItem = defineType({
  name: 'faqItem',
  title: 'FAQ',
  type: 'document',
  fields: [
    {
      name: 'question',
      title: 'Question',
      type: 'string',
      components: {input: TokenStringInput},
      validation: (Rule) =>
        Rule.required().min(6).warning('Question is required (min 6 characters)'),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Auto-generated from the question. Click Generate after authoring.',
      options: {source: 'question', maxLength: 96},
      validation: (Rule) => Rule.required().error('Slug is required'),
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      description:
        'Practice-area category for FAQ filtering. This is the generic platform list — it is NOT customized per client. Pick the closest value; if none matches your practice-area slug, FAQ auto-wiring may not attach (per-client alignment is a deferred workstream).',
      options: {
        // GENERIC PLATFORM LIST — default practice areas + General/Firm-Operational.
        // NOT rewritten per-client (the Provisioning Tool has no such logic).
        // Per-client alignment = deferred reference-based SBT-wiring workstream;
        // see BI/OUTSTANDING.md and BI-SANITY.md sanitization-map row 31.
        list: [
          {title: 'General / Firm-Operational', value: 'general'},
          {title: 'Family Law', value: 'family-law'},
          {title: 'Estate Planning', value: 'estate-planning'},
          {title: 'Probate', value: 'probate'},
          {title: 'Business Law', value: 'business-law'},
          {title: 'Real Estate Law', value: 'real-estate-law'},
          {title: 'Construction Law', value: 'construction-law'},
          {title: 'Employment Law', value: 'employment-law'},
          {title: 'Personal Injury', value: 'personal-injury'},
          {title: "Workers' Compensation", value: 'workers-compensation'},
          {title: 'Litigation', value: 'litigation'},
        ],
      },
      validation: (Rule) => Rule.required().warning('Category is required'),
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      description: 'Optional free-text tags for additional filtering (e.g. "fees", "timeline").',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
    },
    {
      name: 'answer',
      title: 'Answer',
      type: 'blockContent',
      validation: (Rule) => Rule.required().min(1).warning('Answer is required'),
    },
  ],
  preview: {
    select: {title: 'question', subtitle: 'category'},
    prepare({title, subtitle}) {
      return {title: title ?? 'FAQ', subtitle: subtitle ?? '(uncategorized)'}
    },
  },
})
