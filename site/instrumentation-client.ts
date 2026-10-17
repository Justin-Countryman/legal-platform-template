// Runs from Next's own client bundle on every page, before hydration (Next's `instrumentation-client` file convention).
// Its one job: the relay's second copy (lib/relay.ts, monorepo [R-785]), for Next's bare 404 document, which the
// layout's inline relay is not in. On every other page the inline relay has already claimed the page and this does
// nothing.
import {startRelay, type RelayWindow} from '@/lib/relay'

startRelay(document, self as unknown as RelayWindow, true)
