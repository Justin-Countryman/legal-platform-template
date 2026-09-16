'use client'

import React from 'react'
import {useDocumentOperation, useFormValue} from 'sanity'
import {resolvePalette, validateWcag, type Acceptance, type ColourInputs} from '../../site/lib/designTokens'
import {PALETTE_PRESETS, matchPreset, presetInputs, type PalettePreset} from '../../site/lib/palettes'

// The palette field (Phase 14). It stores nothing itself. It shows the fifteen
// presets, writes a chosen preset's values into the four colour fields, and
// previews what the site RENDERS from whatever those fields hold, including any
// colour the engine had to adjust so that every pair stays readable (WCAG 2.2 AA).
// The engine is the site's own (site/lib/designTokens.ts), imported here as the
// studio has always imported it, so the preview cannot drift from the page.
//
// The active preset is derived by matching values; an edit to any colour simply
// shows "Custom". Nothing records which preset was chosen
// (WS-V1-PHASE14-DESIGN §7 amendment 9).

const ROLE_LABELS: Record<keyof Required<ColourInputs>, string> = {
  darkGround:  'Dark ground',
  lightGround: 'Light ground',
  accent:      'Accent',
  action:      'Button colour',
}

const label: React.CSSProperties = {fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', margin: '0 0 8px'}

function Chip({hex, size = 18}: {hex: string; size?: number}) {
  return <span title={hex} style={{display: 'inline-block', width: size, height: size, borderRadius: 4, background: hex, border: '1px solid rgba(0,0,0,0.15)'}} />
}

function Swatch({hex, name}: {hex: string; name: string}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 3, width: 76}}>
      <div style={{height: 34, borderRadius: 6, background: hex, border: '1px solid rgba(0,0,0,0.12)'}} title={hex} />
      <span style={{fontSize: 10, fontWeight: 600, color: '#333', lineHeight: 1.2}}>{name}</span>
      <span style={{fontSize: 9, color: '#777', fontFamily: 'monospace'}}>{hex}</span>
    </div>
  )
}

function PresetButton({preset, active, onChoose}: {preset: PalettePreset; active: boolean; onChoose: () => void}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-pressed={active}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
        background: active ? '#eef4ff' : '#fff', border: active ? '2px solid #2f6fd6' : '1px solid #ddd', textAlign: 'left',
      }}
    >
      <span style={{display: 'flex', gap: 3}}>
        <Chip hex={preset.darkGround} />
        <Chip hex={preset.lightGround ?? '#ffffff'} />
        <Chip hex={preset.accent} />
        {preset.action && <Chip hex={preset.action} />}
      </span>
      <span style={{fontSize: 12, fontWeight: 600, color: '#222'}}>{preset.name}</span>
      {preset.lightGround && <span style={{fontSize: 10, color: '#777'}}>tinted light ground</span>}
    </button>
  )
}

function AdjustedRow({role, a, onUse}: {role: string; a: Acceptance; onUse: () => void}) {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#fef9c3', borderRadius: 4, fontSize: 11, color: '#713f12'}}>
      <Chip hex={a.input} />
      <span style={{fontFamily: 'monospace'}}>{a.input}</span>
      <span>renders as</span>
      <Chip hex={a.hex} />
      <span style={{fontFamily: 'monospace'}}>{a.hex}</span>
      <span style={{flex: 1}}>
        {role}: adjusted {a.steps} step{a.steps === 1 ? '' : 's'} so text reads on it.
      </span>
      <button type="button" onClick={onUse} style={{fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #a16207', background: '#fff', cursor: 'pointer'}}>
        Use {a.hex}
      </button>
    </div>
  )
}

export function ColorPreview() {
  const documentId = (useFormValue(['_id']) as string | undefined) ?? 'designSettings'
  const {patch} = useDocumentOperation(documentId.replace(/^drafts\./, ''), 'designSettings')

  const inputs: ColourInputs = {
    darkGround:  useFormValue(['darkGround'])  as string | undefined,
    lightGround: useFormValue(['lightGround']) as string | undefined,
    accent:      useFormValue(['accent'])      as string | undefined,
    action:      useFormValue(['action'])      as string | undefined,
  }

  const palette = resolvePalette(inputs)
  const t = palette.tokens
  const results = validateWcag(palette)
  const active = matchPreset(inputs)

  const choose = (preset: PalettePreset) => {
    const values = presetInputs(preset)
    const set: Record<string, string> = {}
    const unset: string[] = []
    for (const role of Object.keys(ROLE_LABELS) as Array<keyof ColourInputs>) {
      const value = values[role]
      if (value) set[role] = value
      else unset.push(role)
    }
    patch.execute([{set}, ...(unset.length ? [{unset}] : [])])
  }
  const writeRendered = (role: keyof ColourInputs, hex: string) => patch.execute([{set: {[role]: hex}}])

  const adjusted = (Object.keys(palette.acceptance) as Array<keyof ColourInputs>)
    .filter((role) => palette.acceptance[role].adjusted && parseStored(inputs[role]))

  const warnings = results.filter((r) => !r.blocking && !r.passes)
  const blockingFails = results.filter((r) => r.blocking && !r.passes)

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 20, padding: '12px 0'}}>
      <div>
        <p style={label}>Palettes {active ? `· ${active.name}` : '· Custom'}</p>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8}}>
          {PALETTE_PRESETS.map((preset) => (
            <PresetButton key={preset.id} preset={preset} active={active?.id === preset.id} onChoose={() => choose(preset)} />
          ))}
        </div>
      </div>

      {adjusted.length > 0 && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
          {adjusted.map((role) => (
            <AdjustedRow key={role} role={ROLE_LABELS[role]} a={palette.acceptance[role]} onUse={() => writeRendered(role, palette.acceptance[role].hex)} />
          ))}
        </div>
      )}

      <div>
        <p style={label}>What the site renders</p>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
          <Swatch hex={t['--color-brand-dark']} name="dark ground" />
          <Swatch hex={t['--color-background']} name="light ground" />
          <Swatch hex={t['--color-hero-tint']} name="tint" />
          <Swatch hex={t['--color-muted']} name="muted" />
          <Swatch hex={t['--color-accent']} name="accent" />
          <Swatch hex={t['--color-accent-text']} name="accent as text" />
          <Swatch hex={t['--color-accent-on-dark']} name="accent on dark" />
          <Swatch hex={t['--color-action']} name="button" />
          <Swatch hex={t['--color-foreground']} name="text" />
          <Swatch hex={t['--color-foreground-subtle']} name="label text" />
          <Swatch hex={t['--color-border-control']} name="field border" />
        </div>
      </div>

      <div>
        <p style={label}>Page preview</p>
        <div style={{borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', fontSize: 11}}>
          <div style={{background: t['--color-brand-dark'], padding: '18px 14px'}}>
            <p style={{color: t['--color-accent-on-dark'], fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px'}}>Trusted counsel</p>
            <p style={{color: '#ffffff', fontWeight: 700, fontSize: 15, margin: '0 0 6px'}}>
              Protecting what <span style={{color: t['--color-accent-on-dark']}}>matters most</span>
            </p>
            <p style={{color: t['--color-foreground-muted-on-dark'], margin: '0 0 10px'}}>Supporting text on the dark ground.</p>
            <span style={{background: t['--color-action'], color: t['--color-action-fg'], padding: '4px 12px', borderRadius: 4, fontWeight: 600}}>Free consultation</span>
            <span style={{color: t['--color-action-text-on-dark'], marginLeft: 12, fontWeight: 600}}>Learn more →</span>
          </div>
          <div style={{background: t['--color-background'], padding: '16px 14px'}}>
            <p style={{color: t['--color-accent-text'], fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px'}}>How we can help</p>
            <p style={{color: t['--color-foreground'], fontWeight: 700, fontSize: 14, margin: '0 0 4px'}}>
              Practice <span style={{color: t['--color-accent-text']}}>areas</span>
            </p>
            <p style={{color: t['--color-foreground-muted'], margin: '0 0 8px'}}>Body text on the light ground.</p>
            <div style={{background: t['--color-muted'], borderRadius: 6, padding: '8px 10px'}}>
              <p style={{color: t['--color-foreground'], fontWeight: 600, margin: '0 0 2px'}}>A card</p>
              <p style={{color: t['--color-foreground-subtle'], margin: 0}}>Label text on the card</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p style={label}>Accessibility (WCAG 2.2 AA)</p>
        {blockingFails.length === 0 ? (
          <div style={{padding: '8px 10px', background: '#dcfce7', borderRadius: 4, fontSize: 11, color: '#166534', fontWeight: 600}}>
            ✓ All {results.filter((r) => r.blocking).length} required colour pairs pass.
          </div>
        ) : (
          <div style={{padding: '8px 10px', background: '#fee2e2', borderRadius: 4, fontSize: 11, color: '#991b1b', fontWeight: 600}}>
            {blockingFails.map((r) => `${r.pair} ${r.ratio}:1 (needs ${r.min})`).join('; ')}
          </div>
        )}
        {warnings.map((r) => (
          <div key={r.pair} style={{marginTop: 4, padding: '5px 8px', background: '#fef9c3', borderRadius: 4, fontSize: 11, color: '#854d0e'}}>
            Note: {r.pair} {r.ratio}:1 (design guide {r.min}:1, not a requirement)
          </div>
        ))}
      </div>
    </div>
  )
}

function parseStored(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}
