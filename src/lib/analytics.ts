// SPEC §7: GoatCounter page views plus two events with no payload. Never send form contents.
// Off unless the build sets VITE_GOATCOUNTER_CODE, and never on the dev server.

export type AnalyticsEvent = 'calculate-viewed' | 'xlsx-downloaded'

declare global {
  interface Window {
    goatcounter?: { count?: (vars: { path: string; title?: string; event?: boolean }) => void }
  }
}

const code = import.meta.env.VITE_GOATCOUNTER_CODE
const enabled = import.meta.env.PROD && Boolean(code)

/** Adds the GoatCounter script, which counts the page view once it loads. */
export function initAnalytics() {
  if (!enabled || document.querySelector('script[data-goatcounter]')) return
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://gc.zgo.at/count.js'
  script.dataset.goatcounter = `https://${code}.goatcounter.com/count`
  document.head.append(script)
}

const sent = new Set<AnalyticsEvent>()

/** Counts an event at most once per page load. */
export function track(event: AnalyticsEvent) {
  if (!enabled || sent.has(event)) return
  const count = window.goatcounter?.count
  if (!count) return // script blocked or not loaded yet
  sent.add(event)
  count({ path: event, title: event, event: true })
}
