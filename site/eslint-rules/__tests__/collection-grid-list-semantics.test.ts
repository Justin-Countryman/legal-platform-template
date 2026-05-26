// collection-grid-list-semantics (A4) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/collection-grid-list-semantics.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/collection-grid-list-semantics', rule, {
  valid: [
    // Canonical post-fix shape: <ul role="list">
    {
      code: `<ul role="list" aria-label="Posts" className="grid grid-cols-1 sm:grid-cols-2"><li>{post.title}</li></ul>`,
    },
    {
      code: `<ul role="list" className="grid grid-cols-3">{posts.map((p) => (<li key={p.id}>{p.title}</li>))}</ul>`,
    },
    // <div className="grid"> WITHOUT collection .map() — layout grid
    {
      code: `<div className="grid grid-cols-2"><div>Left</div><div>Right</div></div>`,
    },
    {
      code: `<div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr]"><Photo /><Bio /></div>`,
    },
    // Multiple substantive children — not a pure collection grid
    {
      code: `<div className="grid grid-cols-2">{header}{posts.map((p) => <Card />)}</div>`,
    },
    // Refined heuristic — Decision 2C: skip array-literal .map()
    {
      code: `<div className="grid grid-cols-3">{[0, 1, 2].map((col) => <Column key={col} />)}</div>`,
    },
    {
      code: `<div className="grid grid-cols-3">{[0, 1, 2].map((col) => { const items = data.filter((_, i) => i % 3 === col); return <Column items={items} /> })}</div>`,
    },
    // No grid className — different layout pattern
    {
      code: `<div className="flex flex-wrap gap-4">{badges.map((b) => <Badge />)}</div>`,
    },
    // Has grid but no grid-cols
    {
      code: `<div className="grid">{items.map((i) => <Item />)}</div>`,
    },
    // Other element types — out of rule scope (only div + ul matter)
    {
      code: `<section className="grid grid-cols-3">{items.map((i) => <Card />)}</section>`,
    },
    // No className
    {
      code: `<div>{items.map((i) => <Card />)}</div>`,
    },
    // Conditional rendering: cond && data.map() — STILL a collection,
    // because logical-and unwrap reaches the .map() call. Should fire.
    // (Moved to invalid below — this should fire, not pass.)
  ],
  invalid: [
    // Shape A: div with .map() collection — divToUl
    {
      code: `<div className="grid grid-cols-3">{posts.map((p) => <Card key={p.id} />)}</div>`,
      errors: [{messageId: 'divToUl'}],
    },
    {
      code: `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{events.map((e) => <EventCard event={e} />)}</div>`,
      errors: [{messageId: 'divToUl'}],
    },
    // Mirrors WS8 Commit 15 pre-fix shapes
    {
      code: `<div className="grid grid-cols-2 gap-8 sm:grid-cols-3">{badges.map((b, i) => <div key={i}><Image /></div>)}</div>`,
      errors: [{messageId: 'divToUl'}],
    },
    {
      code: `<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{events.map((e) => <EventCard key={e.slug} event={e} />)}</div>`,
      errors: [{messageId: 'divToUl'}],
    },
    // Logical-and wrapping: cond && .map() — still flag
    {
      code: `<div className="grid grid-cols-3">{cond && items.map((i) => <Card />)}</div>`,
      errors: [{messageId: 'divToUl'}],
    },
    // Optional chain: data?.map() — still flag
    {
      code: `<div className="grid grid-cols-3">{items?.map((i) => <Card />)}</div>`,
      errors: [{messageId: 'divToUl'}],
    },
    // Chained: items.filter(x).map(y) — still flag (collection)
    {
      code: `<div className="grid grid-cols-3">{items.filter(x).map((i) => <Card />)}</div>`,
      errors: [{messageId: 'divToUl'}],
    },

    // Shape B: ul with .map() collection but missing role="list"
    {
      code: `<ul className="grid grid-cols-3">{posts.map((p) => (<li key={p.id}>{p.title}</li>))}</ul>`,
      errors: [{messageId: 'ulMissingRole'}],
    },
    {
      code: `<ul aria-label="Attorneys" className="grid grid-cols-1 sm:grid-cols-2">{attorneys.map((a) => <li key={a.id}><AttorneyCard a={a} /></li>)}</ul>`,
      errors: [{messageId: 'ulMissingRole'}],
    },
    // Has role but wrong value — still flag (treat as ulMissingRole)
    {
      code: `<ul role="presentation" className="grid grid-cols-3">{items.map((i) => <li key={i.id} />)}</ul>`,
      errors: [{messageId: 'ulMissingRole'}],
    },
  ],
})
