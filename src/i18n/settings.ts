import { useSyncExternalStore } from 'react'

export type Language = 'en' | 'bn'
export interface DisplaySettings {
  language: Language
  /** Show ০-৯ instead of 0-9. Only used when the language is Bangla. */
  banglaDigits: boolean
}

// A display preference, not tax data, so it is kept without the 3-hour expiry.
const STORAGE_KEY = 'bdtax.display'
const defaults: DisplaySettings = { language: 'en', banglaDigits: true }

// The Bangla page has its own address, so search engines can index it (see vite.config.ts).
const BANGLA_PATH = `${import.meta.env.BASE_URL}bn/`

function load(): DisplaySettings {
  let settings = defaults
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<DisplaySettings> | null
    if (saved && (saved.language === 'en' || saved.language === 'bn')) settings = { ...defaults, ...saved }
  } catch {
    // Storage blocked or corrupt: fall through to defaults.
  }
  // A link to the Bangla page opens in Bangla, whatever was saved.
  if (typeof location !== 'undefined' && location.pathname.startsWith(BANGLA_PATH)) {
    settings = { ...settings, language: 'bn' }
  }
  return settings
}

/** Puts the address in step with the language, without a new history entry. */
export function syncLanguagePath(language: Language) {
  const path = language === 'bn' ? BANGLA_PATH : import.meta.env.BASE_URL
  if (location.pathname !== path) history.replaceState(history.state, '', path + location.search + location.hash)
}

let current = load()
const listeners = new Set<() => void>()

export function getSettings(): DisplaySettings {
  return current
}

export function setSettings(change: Partial<DisplaySettings>) {
  current = { ...current, ...change }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Not remembered, but still applied for this visit.
  }
  listeners.forEach((l) => l())
}

/** Re-renders the caller when the language or numeral setting changes. */
export function useDisplaySettings(): DisplaySettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSettings,
  )
}

export function usesBanglaDigits(): boolean {
  return current.language === 'bn' && current.banglaDigits
}

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯'

/** Swaps 0-9 for Bangla digits when the Bangla numeral setting is on. */
export function localiseDigits(text: string): string {
  return usesBanglaDigits() ? text.replace(/[0-9]/g, (d) => BANGLA_DIGITS[Number(d)]) : text
}

/** Turns Bangla digits back into 0-9, so typed or pasted Bangla numbers parse. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)))
}
