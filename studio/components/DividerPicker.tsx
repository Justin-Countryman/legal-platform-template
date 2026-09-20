'use client'

import React from 'react'
import {set, unset, type StringInputProps} from 'sanity'
import {DIVIDERS, DIVIDER_SHAPES, type Divider} from '../../site/lib/dividers'

// The Section Divider field (Phase 16C, `[R-482]`). Each shape is drawn from the same
// boundary the site paints (`site/lib/dividers.ts`), as two bands meeting: one source, so
// the picker cannot drift from the render. The shapes the research rates restrained come
// first, as they do in the schema's list.
//
// WHERE IT IS DRAWN is not a choice (`[R-481]`): under the hero, and wherever the page
// enters a dark or saturated section. The help text under the field says so.

const DARK = '#1f2937'
const LIGHT = '#f3f4f6'

function points(id: Exclude<Divider, 'straight'>, w: number, h: number): string {
  const shape = DIVIDER_SHAPES[id]
  return shape.boundary
    .map(([x, y]) => {
      // `calc(50% ± 1.25rem)` is the notch's fixed width; at this size it is a sixth.
      const px = x.startsWith('calc')
        ? w / 2 + (x.includes('-') ? -w / 6 : w / 6)
        : (parseFloat(x) / 100) * w
      return `${+px.toFixed(1)},${+(y * h).toFixed(1)}`
    })
    .join(' ')
}

function Specimen({id}: {id: Divider}) {
  const w = 132
  const h = 56
  const depth = 14
  if (id === 'straight') {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <rect width={w} height={h / 2} fill={DARK} />
        <rect y={h / 2} width={w} height={h / 2} fill={LIGHT} />
      </svg>
    )
  }
  const top = h / 2 - depth / 2
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <rect width={w} height={h} fill={LIGHT} />
      <polygon points={`0,0 ${w},0 ${points(id, w, depth).split(' ').reverse().map((p) => {
        const [x, y] = p.split(',')
        return `${x},${Number(y) + top}`
      }).join(' ')}`} fill={DARK} />
    </svg>
  )
}

export function DividerPicker(props: StringInputProps) {
  const {value, onChange} = props
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0'}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8}}>
        {DIVIDERS.map((id) => {
          const active = (value ?? 'straight') === id
          const label = id === 'straight' ? 'Straight' : DIVIDER_SHAPES[id].label
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(id === 'straight' ? unset() : set(id))}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', padding: '10px 12px',
                borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                background: active ? '#eef4ff' : '#fff', border: active ? '2px solid #2f6fd6' : '1px solid #ddd',
              }}
            >
              <Specimen id={id} />
              <span style={{fontSize: 12, color: '#222'}}>{label}</span>
            </button>
          )
        })}
      </div>
      <p style={{fontSize: 11, color: '#666', margin: 0}}>
        A divider is drawn under the hero and wherever the page enters a dark or saturated section. The section below
        gains the space it takes. Phones draw it smaller, at the same angle.
      </p>
    </div>
  )
}
