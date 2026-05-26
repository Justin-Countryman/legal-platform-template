'use client'

import React from 'react'
import {useFormValue} from 'sanity'
import {buildRoleMap, deriveVariants, deriveNeutrals, deriveInverseNeutrals, validateWcag, type ColorApproach, type ColorInputs} from '../../site/lib/designTokens'

// ─── Swatch ────────────────────────────────────────────────────────────────────

function Swatch({hex, label, sub}: {hex: string; label: string; sub?: string}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
      <div
        style={{
          width: 56,
          height: 40,
          borderRadius: 6,
          background: hex,
          border: '1px solid rgba(0,0,0,0.12)',
        }}
        title={hex}
      />
      <span style={{fontSize: 10, fontWeight: 600, color: '#333', lineHeight: 1.2}}>{label}</span>
      <span style={{fontSize: 9, color: '#888', fontFamily: 'monospace'}}>{hex}</span>
      {sub && <span style={{fontSize: 9, color: '#aaa'}}>{sub}</span>}
    </div>
  )
}

// ─── WCAG badge ───────────────────────────────────────────────────────────────

function WcagBadge({ratio, passes, blocking, pair}: {ratio: number; passes: boolean; blocking: boolean; pair: string}) {
  const bg = passes ? '#dcfce7' : blocking ? '#fee2e2' : '#fef9c3'
  const color = passes ? '#166534' : blocking ? '#991b1b' : '#854d0e'
  const label = passes ? '✓ Pass' : blocking ? '✗ Fail' : '⚠ Warn'
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: bg, borderRadius: 4}}>
      <span style={{fontSize: 11, fontWeight: 700, color}}>{label}</span>
      <span style={{fontSize: 11, color: '#555'}}>{pair}</span>
      <span style={{fontSize: 10, color: '#888', marginLeft: 'auto'}}>{ratio}:1</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ColorPreview() {
  const colorApproach = useFormValue(['colorApproach']) as string | undefined
  const primaryColor  = useFormValue(['primaryColor'])  as string | undefined
  const actionColor   = useFormValue(['actionColor'])   as string | undefined
  const accent1Color  = useFormValue(['accent1Color'])  as string | undefined
  const accent2Color  = useFormValue(['accent2Color'])  as string | undefined

  const approach = (colorApproach ?? 'analogous-accent') as ColorApproach
  const primary = primaryColor ?? '#444444'

  // Only run derivation when we have a valid primary
  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(primary)
  if (!isValidHex) {
    return (
      <div style={{padding: 12, color: '#888', fontSize: 12}}>
        Enter a valid primary color hex to see the preview.
      </div>
    )
  }

  const inputs: ColorInputs = {
    primary,
    action:  actionColor  ?? null,
    accent1: accent1Color ?? null,
    accent2: accent2Color ?? null,
  }

  let roles
  try {
    roles = buildRoleMap(approach, inputs)
  } catch {
    return <div style={{padding: 12, color: '#c00', fontSize: 12}}>Invalid color input — check your hex values.</div>
  }

  const neutrals        = deriveNeutrals(primary)
  const inverseNeutrals = deriveInverseNeutrals(primary)
  const wcag = validateWcag(roles, primary)
  const primaryV = deriveVariants(primary)

  const swatchGroups = [
    {
      label: 'Primary',
      swatches: [
        {hex: primaryV.base,  label: 'primary',       sub: 'raw input'},
        {hex: primaryV.tint,  label: 'primary-tint',  sub: 'bg-light derivation'},
        {hex: primaryV.dark,  label: 'primary-dark',  sub: 'dark sections / hover'},
        {hex: primaryV.fg,    label: 'primary-fg',    sub: 'text on primary'},
      ],
    },
  ]

  if (approach === 'complementary' && inputs.action) {
    const v = deriveVariants(inputs.action)
    swatchGroups.push({
      label: 'Action (Complement)',
      swatches: [
        {hex: v.base, label: 'action',       sub: 'buttons / taglines'},
        {hex: v.tint, label: 'action-tint',  sub: 'decorative'},
        {hex: v.dark, label: 'action-hover', sub: 'hover state'},
        {hex: v.fg,   label: 'action-fg',    sub: 'text on action'},
      ],
    })
  }

  if (approach === 'analogous-accent') {
    if (inputs.accent1) {
      const v = deriveVariants(inputs.accent1)
      swatchGroups.push({
        label: 'Accent 1 — Taglines',
        swatches: [
          {hex: v.base, label: 'accent1',      sub: 'eyebrow / tagline text'},
          {hex: v.tint, label: 'accent1-tint', sub: 'bg-light / decorative'},
          {hex: v.dark, label: 'accent1-dark', sub: 'hover'},
          {hex: v.fg,   label: 'accent1-fg',   sub: 'text on accent1'},
        ],
      })
    }
    if (inputs.accent2) {
      const v = deriveVariants(inputs.accent2)
      swatchGroups.push({
        label: 'Accent 2 — Buttons / CTAs',
        swatches: [
          {hex: v.base, label: 'accent2',      sub: 'buttons / CTAs'},
          {hex: v.tint, label: 'accent2-tint', sub: 'decorative'},
          {hex: v.dark, label: 'accent2-dark', sub: 'hover state'},
          {hex: v.fg,   label: 'accent2-fg',   sub: 'text on action'},
        ],
      })
    }
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 20, padding: '12px 0'}}>

      {/* Swatch groups */}
      {swatchGroups.map((group) => (
        <div key={group.label}>
          <p style={{fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', marginBottom: 10}}>
            {group.label}
          </p>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
            {group.swatches.map((s) => (
              <Swatch key={s.label} hex={s.hex} label={s.label} sub={s.sub} />
            ))}
          </div>
        </div>
      ))}

      {/* Neutral scale */}
      <div>
        <p style={{fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', marginBottom: 10}}>
          Neutral Scale — derived from primary hue
        </p>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
          {Object.entries(neutrals).map(([k, v]) => (
            <Swatch key={k} hex={v} label={k.replace('color-', '')} />
          ))}
        </div>
      </div>

      {/* Inverse neutral scale */}
      <div>
        <p style={{fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', marginBottom: 10}}>
          Inverse Neutral Scale — derived from primary hue
        </p>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
          {Object.entries(inverseNeutrals).map(([k, v]) => (
            <Swatch key={k} hex={v} label={k.replace('color-', '')} />
          ))}
        </div>
      </div>

      {/* Role assignments */}
      <div>
        <p style={{fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', marginBottom: 10}}>
          Role Assignments
        </p>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
          {Object.entries(roles).map(([role, hex]) => (
            <Swatch key={role} hex={hex} label={role.replace('role-', '')} />
          ))}
        </div>
      </div>

      {/* Mini page mockup */}
      <div>
        <p style={{fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', marginBottom: 10}}>
          Page Preview
        </p>
        <div style={{borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', fontSize: 11}}>
          {/* Nav */}
          <div style={{background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontWeight: 700, color: neutrals['color-foreground-on-light']}}>Firm Name</span>
            <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
              <span style={{color: neutrals['color-foreground-muted-on-light']}}>About</span>
              <span style={{color: neutrals['color-foreground-muted-on-light']}}>Practice Areas</span>
              <span style={{background: roles['role-action'], color: roles['role-action-fg'], padding: '3px 10px', borderRadius: 4, fontWeight: 600}}>
                Contact Us
              </span>
            </div>
          </div>
          {/* Hero — dark */}
          <div style={{background: roles['role-brand-dark'], padding: '20px 12px'}}>
            <p style={{color: roles['role-tagline-on-dark'], fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4}}>
              Experienced Legal Counsel
            </p>
            <p style={{color: '#ffffff', fontWeight: 700, fontSize: 14, marginBottom: 8}}>Fighting For Your Rights</p>
            <span style={{background: roles['role-action'], color: roles['role-action-fg'], padding: '4px 12px', borderRadius: 4, fontWeight: 600, fontSize: 10}}>
              Free Consultation
            </span>
          </div>
          {/* Light section */}
          <div style={{background: roles['role-muted'], padding: '14px 12px'}}>
            <p style={{color: roles['role-tagline'], fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4}}>
              How We Can Help
            </p>
            <p style={{color: neutrals['color-foreground-on-light'], fontWeight: 700, fontSize: 12, marginBottom: 4}}>Practice Areas</p>
            <p style={{color: neutrals['color-foreground-muted-on-light'], fontSize: 10, lineHeight: 1.4}}>
              We represent clients across a wide range of civil and criminal matters.
            </p>
          </div>
          {/* White section */}
          <div style={{background: '#ffffff', padding: '14px 12px', borderTop: `1px solid ${neutrals['color-border-light']}`}}>
            <p style={{color: neutrals['color-foreground-on-light'], fontWeight: 700, fontSize: 12, marginBottom: 4}}>About the Firm</p>
            <p style={{color: neutrals['color-foreground-muted-on-light'], fontSize: 10, lineHeight: 1.4}}>
              With decades of experience, our attorneys are ready to help you navigate the legal system.
            </p>
          </div>
          {/* Button preview — 3-context × 2-variant matrix */}
          <div style={{background: '#ffffff', padding: '14px 12px', borderTop: `1px solid ${neutrals['color-border-light']}`}}>
            <p style={{fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: neutrals['color-foreground-subtle-on-light'], marginBottom: 10}}>
              Buttons — light context
            </p>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14}}>
              <span style={{background: roles['role-action'], color: roles['role-action-fg'], padding: '4px 12px', borderRadius: 4, fontWeight: 600, fontSize: 10}}>
                Primary
              </span>
              <span style={{background: 'transparent', color: roles['role-action-on-light'], border: `1.5px solid ${roles['role-action-on-light']}`, padding: '3px 11px', borderRadius: 4, fontWeight: 600, fontSize: 10}}>
                Secondary
              </span>
            </div>
            <p style={{fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: neutrals['color-foreground-subtle-on-light'], marginBottom: 8}}>
              Buttons — dark context
            </p>
            <div style={{background: roles['role-brand-dark'], padding: '8px 10px', borderRadius: 4, display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14}}>
              <span style={{background: roles['role-action'], color: roles['role-action-fg'], padding: '4px 12px', borderRadius: 4, fontWeight: 600, fontSize: 10}}>
                Primary
              </span>
              <span style={{background: 'transparent', color: 'rgba(255,255,255,0.80)', border: '1.5px solid rgba(255,255,255,0.35)', padding: '3px 11px', borderRadius: 4, fontWeight: 600, fontSize: 10}}>
                Secondary
              </span>
            </div>
          </div>
          {/* Dark CTA footer */}
          <div style={{background: roles['role-brand-dark'], padding: '14px 12px', textAlign: 'center'}}>
            <p style={{color: '#ffffff', fontWeight: 700, fontSize: 12, marginBottom: 8}}>Ready to Get Started?</p>
            <span style={{background: roles['role-action'], color: roles['role-action-fg'], padding: '5px 16px', borderRadius: 4, fontWeight: 600, fontSize: 10}}>
              Contact Us Today
            </span>
          </div>
          {/* Dark footer column — shows inverse neutral scale in context */}
          <div style={{background: roles['role-brand-dark'], padding: '14px 12px', borderTop: `1px solid ${inverseNeutrals['color-border-on-dark']}`}}>
            <p style={{color: roles['role-tagline-on-dark'], fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6}}>
              Office Hours
            </p>
            <div style={{fontSize: 10, color: inverseNeutrals['color-foreground-muted-on-dark'], marginBottom: 2}}>
              Mon–Fri · 8:00 am – 5:00 pm
            </div>
            <div style={{fontSize: 10, color: inverseNeutrals['color-foreground-subtle-on-dark']}}>
              Sat · Closed
            </div>
            <div style={{fontSize: 10, color: inverseNeutrals['color-foreground-subtle-on-dark']}}>
              Sun · Closed
            </div>
          </div>
        </div>
      </div>

      {/* WCAG results */}
      <div>
        <p style={{fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', marginBottom: 8}}>
          Accessibility (WCAG 2.1 AA — 4.5:1 required)
        </p>
        <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
          {wcag.map((r) => (
            <WcagBadge key={r.pair} ratio={r.ratio} passes={r.passes} blocking={r.blocking} pair={r.pair} />
          ))}
        </div>
        {wcag.some(r => !r.passes && r.blocking) && (
          <div style={{marginTop: 8, padding: '8px 10px', background: '#fee2e2', borderRadius: 4, fontSize: 11, color: '#991b1b', fontWeight: 600}}>
            ⚠ One or more required contrast pairs fail. Adjust your colors before publishing.
          </div>
        )}
        {wcag.every(r => r.passes || !r.blocking) && (
          <div style={{marginTop: 8, padding: '8px 10px', background: '#dcfce7', borderRadius: 4, fontSize: 11, color: '#166534', fontWeight: 600}}>
            ✓ All required contrast checks pass.
          </div>
        )}
      </div>

    </div>
  )
}
