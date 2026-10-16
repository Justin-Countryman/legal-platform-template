// no-silent-empty-alt (monorepo backlog 457) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-silent-empty-alt.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-silent-empty-alt', rule, {
  valid: [
    // Decorative: the literal decision.
    {code: `<img alt="" data-decorative="" src="/x.png" />`},
    {code: `<Image alt={''} src={src} fill />`},
    // Content: the helper, whose empty answer Verify lists.
    {code: `<Image src={src} alt={contentAlt(img.alt)} fill />`},
    {code: `<Image src={src} alt={contentAlt(logo.alt, firmName)} width={1} height={1} />`},
    // A description the renderer always has.
    {code: `<SanityImage image={photo} mode="natural" alt={photo.alt || name} />`},
    {code: `<img alt={title} src={src} />`},
    {code: `<img alt={x ?? 'Firm logo'} src={src} />`},
    // Not an image's alt.
    {code: `<a aria-label={label ?? ''} href="/" />`},
  ],
  invalid: [
    {code: `<Image src={src} alt={img.alt ?? ''} fill />`, errors: [{messageId: 'silent'}]},
    {code: `<img src={src} alt={img.alt || ''} />`, errors: [{messageId: 'silent'}]},
    {code: `<img src={src} alt={logo.alt ?? firmName ?? ''} />`, errors: [{messageId: 'silent'}]},
    {code: `<img src={src} alt={img.alt ? img.alt : ''} />`, errors: [{messageId: 'silent'}]},
    {code: `<img src={src} alt={img!.alt ?? \`\`} />`, errors: [{messageId: 'silent'}]},
    {code: `<SanityImage image={image} mode="fill" alt={image.alt ?? ''} />`, errors: [{messageId: 'silent'}]},
  ],
})
