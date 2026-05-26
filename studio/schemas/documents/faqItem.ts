import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'

// FAQ Item — promoted from inline object to document type in WS-FAQ-Migration (2026-05-14).
// Reference model aligns FAQs with the testimonial / attorney / video patterns: single source
// of truth, edit once and propagate across pages. Site Build Tool composes faqItem docs once
// from BI doctrine + CS-FIRM-DATA, references them from page docs where they apply.
//
// `category` options are a per-client list. For new clients the Client Provisioning Tool's
// sanitization map rewrites the list to match the new firm's top-level practice areas
// (driven by CS-FIRM-DATA.clientPracticeAreaSelections at Site Build Tool time).

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
        'Practice-area category for FAQ filtering. The list below is the platform template; the Client Provisioning Tool rewrites it per-client at Site Build Tool time.',
      options: {
        // PLATFORM TEMPLATE — default practice areas + General/Firm-Operational.
        // Sanitized + rewritten per-client by Client Provisioning Tool (see BI-SANITY.md
        // "Sanitization map" — entry: faqItem.category options list).
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
