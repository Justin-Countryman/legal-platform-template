'use client'

import React from 'react'
import {useDocumentOperation, useFormValue} from 'sanity'
import {BUTTON_SHAPE_MAP, UI_RADIUS_MAP} from '../../site/lib/designTokens'
import {CORNER_FAMILIES, cornersMismatch, matchCornerFamily, type CornerFamily} from '../../site/lib/corners'

// The Corners field (Phase 16A, [R-473]). It stores nothing itself, like the
// palette field. It offers the five corner families and writes a family's pair
// into the two fields below it (UI Corner Radius for cards, images, fields,
// panels and badges; Button Shape for buttons), in one patch. The active family is
// matched by value; a pair that is no family reads "Custom", and a pair whose
// button is rounder than its card says so, as a note and never a block ([R-162]).
// The families and the rule are the site's own (site/lib/corners.ts).

const label: React.CSSProperties = {fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', margin: '0 0 8px'}

function FamilyButton({family, active, onChoose}: {family: CornerFamily; active: boolean; onChoose: () => void}) {
  const card = UI_RADIUS_MAP[family.uiRadius]
  const button = BUTTON_SHAPE_MAP[family.buttonShape]
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-pressed={active}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
        background: active ? '#eef4ff' : '#fff', border: active ? '2px solid #2f6fd6' : '1px solid #ddd', textAlign: 'left',
      }}
    >
      <span style={{display: 'flex', alignItems: 'flex-end', gap: 8}}>
        <span style={{display: 'block', width: 46, height: 34, background: '#e5e7eb', border: '1px solid #cbd0d6', borderRadius: card}} />
        <span style={{display: 'block', width: 44, height: 16, background: '#374151', borderRadius: button}} />
      </span>
      <span style={{fontSize: 12, fontWeight: 600, color: '#222'}}>{family.name}</span>
      <span style={{fontSize: 10, color: '#777'}}>{family.feel}</span>
    </button>
  )
}

export function CornerPreview() {
  const documentId = (useFormValue(['_id']) as string | undefined) ?? 'designSettings'
  const {patch} = useDocumentOperation(documentId.replace(/^drafts\./, ''), 'designSettings')
  const uiRadius = useFormValue(['uiRadius']) as string | undefined
  const buttonShape = useFormValue(['buttonShape']) as string | undefined

  const active = matchCornerFamily(uiRadius, buttonShape)
  const mismatch = cornersMismatch(uiRadius, buttonShape)
  const choose = (family: CornerFamily) => patch.execute([{set: {uiRadius: family.uiRadius, buttonShape: family.buttonShape}}])

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0'}}>
      <p style={label}>Corners {active ? `· ${active.name}` : '· Custom'}</p>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8}}>
        {CORNER_FAMILIES.map((family) => (
          <FamilyButton key={family.id} family={family} active={active?.id === family.id} onChoose={() => choose(family)} />
        ))}
      </div>
      {mismatch && (
        <div style={{padding: '8px 10px', background: '#fef9c3', borderRadius: 4, fontSize: 11, color: '#854d0e'}}>
          The buttons are rounder than the cards, which reads as a mismatch. Choose a family above to match them, or keep
          this pair on purpose.
        </div>
      )}
    </div>
  )
}
