// ─── FAQPage structured data ─────────────────────────────────────────────────
// Moved out of `app/(site)/[...slug]/page.tsx` on 2026-09-11 so it can be
// tested as the artifact it is (OUTSTANDING item 100).
//
// THE DEFECT ITEM 100 RECORDED WAS REAL. The flattener mapped every child of a
// block to `span.text ?? ''`, and a `contentToken` inline object carries a
// `tokenKey`, not a `text`, so a rendered token ("call {{office.phone}}") was
// present on the page and ABSENT from the emitted JSON-LD answer. The token is
// now resolved through the same `resolveToken` the PortableText renderer uses,
// so the answer a crawler reads is the answer a visitor reads.

import {resolveToken, resolveTokenString, type NapTokens} from '@/lib/tokens'

type Span = {_type?: string; text?: string; tokenKey?: string}
type Block = {_type?: string; children?: Span[]}

/** The plain text of a Portable Text answer, tokens resolved, blocks joined by a space. */
export function faqAnswerText(answer: unknown[] | null | undefined, tokens: NapTokens | null): string {
  return (answer ?? [])
    .flatMap((block: unknown) => {
      const b = block as Block
      if (b._type !== 'block') return []
      return (b.children ?? []).map((child) => {
        if (child._type === 'contentToken') return resolveToken(child.tokenKey, tokens)
        return child.text ?? ''
      })
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Post-WS-FAQ-Migration (2026-05-14): faqItems is a dereferenced array of
// faqItem documents (GROQ resolves the references via `[defined(@->_id)]->`).
// The dangling-ref filter at query time guarantees the array is null-free
// here. Only question + answer are needed for FAQPage structured-data
// emission; additional fields (category, slug, tags) are ignored.
export function buildFaqPageSchema(
  faqItems: Array<{question: string; answer: unknown[]}>,
  tokens: NapTokens | null,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: resolveTokenString(item.question, tokens),
      acceptedAnswer: {
        '@type': 'Answer',
        text: faqAnswerText(item.answer, tokens),
      },
    })),
  }
}
