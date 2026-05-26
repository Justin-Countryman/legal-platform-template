// no-use-hero-scheme-in-server (C4) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-use-hero-scheme-in-server.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}, sourceType: 'module'},
  },
})

tester.run('platform/no-use-hero-scheme-in-server', rule, {
  valid: [
    // 'use client' file using the hook — canonical client component
    {
      code: `'use client'
import {useHeroScheme} from '@/lib/heroSchemeContext'
export default function Page() {
  const scheme = useHeroScheme()
  return null
}`,
    },
    // 'use client' with async default (rare but possible — bail on directive)
    {
      code: `'use client'
import {useHeroScheme} from '@/lib/heroSchemeContext'
export default async function Page() {
  const scheme = useHeroScheme()
  return null
}`,
    },
    // No 'use client', sync default export — not an async server component;
    // doesn't qualify, rule doesn't fire
    {
      code: `import {useHeroScheme} from '@/lib/heroSchemeContext'
export default function Page() {
  const scheme = useHeroScheme()
  return null
}`,
    },
    // Async server component (no 'use client', async default) but does
    // NOT call useHeroScheme — rule needs the identifier to fire
    {
      code: `import {client} from '@/lib/sanity/client'
export default async function Page() {
  const data = await client.fetch('*[]')
  return null
}`,
    },
    // Async server component using server-side fetch (the canonical
    // pattern from skill-sanity-schema)
    {
      code: `import {client} from '@/lib/sanity/client'
import {DESIGN_TOKENS_QUERY} from '@/lib/sanity/queries'
export default async function Page({params}) {
  const tokens = await client.fetch(DESIGN_TOKENS_QUERY)
  const isDark = tokens?.internalHeroBackground !== 'light'
  return <header className={isDark ? 'bg-brand-dark' : 'bg-background'} />
}`,
    },
    // Default export is not a function — qualifies neither
    {
      code: `export default 42`,
    },
    // Named (non-default) async export — doesn't qualify
    {
      code: `import {useHeroScheme} from '@/lib/heroSchemeContext'
export async function helper() { return useHeroScheme }`,
    },
    // useHeroScheme defined but file is the hook source itself — file is
    // a 'use client'-wrapped context provider, OR a non-async-default
    // file like lib/heroSchemeContext.tsx (sync default export of a
    // Provider component). Either case is valid.
    {
      code: `'use client'
import {createContext, useContext} from 'react'
const HeroSchemeContext = createContext(null)
export const useHeroScheme = () => useContext(HeroSchemeContext)
export default function HeroSchemeProvider({children}) { return children }`,
    },
    // Documented limitation: variable-assigned async function with named
    // default export. The rule only inspects ExportDefaultDeclaration's
    // direct `declaration` field; here `export default Page` references
    // an Identifier, so the rule cannot see the asyncness. False
    // negative — but a rare pattern; leaving as documented limitation
    // (canonical platform pattern is `export default async function ...`).
    {
      code: `import {useHeroScheme} from '@/lib/heroSchemeContext'
const Page = async () => {
  const scheme = useHeroScheme()
  return null
}
export default Page`,
    },
  ],
  invalid: [
    // Canonical violation — async server component calling useHeroScheme
    {
      code: `import {useHeroScheme} from '@/lib/heroSchemeContext'
export default async function Page() {
  const scheme = useHeroScheme()
  return null
}`,
      // Two errors: the import Identifier + the call Identifier
      errors: [
        {messageId: 'inServer'},
        {messageId: 'inServer'},
      ],
    },
    // Direct async arrow function default export
    {
      code: `import {useHeroScheme} from '@/lib/heroSchemeContext'
export default async (props) => {
  const scheme = useHeroScheme()
  return null
}`,
      errors: [
        {messageId: 'inServer'},
        {messageId: 'inServer'},
      ],
    },
    // Just an import, no call yet — still flagged (the import IS the
    // commitment; the call is presumed to follow)
    {
      code: `import {useHeroScheme} from '@/lib/heroSchemeContext'
export default async function Page() {
  return null
}`,
      errors: [{messageId: 'inServer'}],
    },
    // Mirrors the structural shape of WS7.7 Commit 2 BlogPostPage
    // BEFORE the fix (hypothetical reintroduction)
    {
      code: `import {notFound} from 'next/navigation'
import {client} from '@/lib/sanity/client'
import {useHeroScheme} from '@/lib/heroSchemeContext'
export default async function BlogPostPage({params}) {
  const {slug} = await params
  const post = await client.fetch('*[]', {slug})
  if (!post) notFound()
  const scheme = useHeroScheme()
  return null
}`,
      errors: [
        {messageId: 'inServer'},
        {messageId: 'inServer'},
      ],
    },
  ],
})
