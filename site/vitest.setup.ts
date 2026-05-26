import {afterEach} from 'vitest'
import {cleanup} from '@testing-library/react'

// Vitest doesn't auto-cleanup React Testing Library renders between tests
// (unlike Jest with @testing-library/react v9+ default cleanup). Without this,
// `screen.getByRole(...)` finds elements from previous renders and throws.
afterEach(() => {
  cleanup()
})
