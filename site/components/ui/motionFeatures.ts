// Async-loaded Framer Motion feature bundle for <LazyMotion> (see MotionRoot).
//
// `domAnimation` (~18 KiB) is the animation + variants + exit + gesture runtime.
// Isolating it in its own module lets MotionRoot load it via a dynamic import
// so it is NOT part of initial page hydration. Every page's only motion is
// interaction-triggered (header hamburger / mobile menu / dropdowns), so the
// runtime is not needed for first paint — deferring it cuts hydration
// scriptEvaluation, which on this stack is what dominates the LCP render delay
// (measured in perf QA: LCP render delay ≈2.2s with TBT 0 and no render-blocking
// CSS/fonts → the cost was hydration JS, not resource loading).
//
// Components in the LazyMotion subtree MUST use `m.*` (not `motion.*`) so they
// bind to these async-loaded features instead of pulling the full runtime eagerly.
import {domAnimation} from 'framer-motion'

export default domAnimation
