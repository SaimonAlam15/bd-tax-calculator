// SPEC §7: page views from GoatCounter and/or Cloudflare Web Analytics, plus two GoatCounter events
// with no payload. Never send form contents. Each is off unless the build sets its code, and never on the dev server.

export type AnalyticsEvent = 'calculate-viewed' | 'xlsx-downloaded'

declare global {
  interface Window {
    goatcounter?: { count?: (vars: { path: string; title?: string; event?: boolean }) => void }
  }
}

const code = import.meta.env.VITE_GOATCOUNTER_CODE
const enabled = import.meta.env.PROD && Boolean(code)
const cfToken = import.meta.env.VITE_CF_ANALYTICS_TOKEN

/** Adds the analytics scripts, which count the page view once they load. */
export function initAnalytics() {
  if (!import.meta.env.PROD) return
  if (enabled && !document.querySelector('script[data-goatcounter]')) {
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://gc.zgo.at/count.js'
    script.dataset.goatcounter = `https://${code}.goatcounter.com/count`
    document.head.append(script)
  }
  if (cfToken && !document.querySelector('script[data-cf-beacon]')) {
    const script = document.createElement('script')
    script.defer = true
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
    script.dataset.cfBeacon = JSON.stringify({ token: cfToken })
    document.head.append(script)
  }
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
