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

function load(): DisplaySettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<DisplaySettings> | null
    if (saved && (saved.language === 'en' || saved.language === 'bn')) return { ...defaults, ...saved }
  } catch {
    // Storage blocked or corrupt: fall through to defaults.
  }
  return defaults
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
