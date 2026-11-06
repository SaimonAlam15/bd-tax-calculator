import { useEffect, useRef } from 'react'
import { t } from '../i18n'

// SPEC §7: AdSense display units. Off unless the build sets the publisher ID and the unit's slot ID.
// Units sit only between page sections, never inside the form or beside copy buttons.

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

const client = import.meta.env.VITE_ADSENSE_CLIENT
export const adsEnabled = import.meta.env.PROD && Boolean(client)

export function AdSlot({ slot }: { slot?: string }) {
  const ref = useRef<HTMLModElement>(null)
  const show = adsEnabled && Boolean(slot)

  useEffect(() => {
    const ins = ref.current
    // AdSense marks a filled unit; pushing twice for one unit throws.
    if (!show || !ins || ins.dataset.adsbygoogleStatus) return
    try {
      ;(window.adsbygoogle ??= []).push({})
    } catch {
      // Blocked by an ad blocker or not loaded: the reserved space stays empty.
    }
  }, [show])

  // The dev server shows where units go; a production build without IDs shows nothing.
  if (!show && !import.meta.env.DEV) return null

  return (
    <aside aria-label={t('ads.label')} className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
      <p className="mb-1 text-xs text-stone-500 dark:text-stone-400">{t('ads.label')}</p>
      {/* Reserved height, so the page doesn't jump when the ad loads. */}
      <div className="min-h-[250px]">
        {show ? (
          <ins
            ref={ref}
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <div className="flex h-[250px] items-center justify-center rounded-xl border border-dashed border-stone-300 text-sm text-stone-500 dark:border-stone-700">
            Ad unit {slot ? '' : '(no slot ID set) '}— dev preview only
          </div>
        )}
      </div>
    </aside>
  )
}
