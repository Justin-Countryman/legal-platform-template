'use client'

import {useEffect, useState} from 'react'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => setVisible(window.scrollY > 400)
    check()
    window.addEventListener('scroll', check, {passive: true})
    return () => window.removeEventListener('scroll', check)
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
      aria-label="Back to top"
      inert={!visible}
      className={[
        // Position & size
        'fixed bottom-8 right-8 z-50 flex h-11 w-11 items-center justify-center',
        // Visual
        'rounded-full bg-background border border-brand-dark text-brand-dark shadow-elevation-md',
        // Hover / focus — use the brand action color so the button stays
        // visible against any backdrop (light page sections OR dark footer).
        // Chevron inherits via currentColor → swaps to text-action-fg on
        // hover so the icon never disappears into the hover-state fill.
        'hover:bg-action hover:text-action-fg hover:border-action hover:shadow-elevation-lg hover:scale-110',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus',
        // Transition
        'transition-[opacity,transform,box-shadow] duration-ui-fast ease-smooth',
        // Show / hide
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
      ].join(' ')}
    >
      {/* Upward chevron */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  )
}
