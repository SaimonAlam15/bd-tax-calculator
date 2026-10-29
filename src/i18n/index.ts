import { bn } from './bn'
import { en, type MessageKey } from './en'
import { getSettings, localiseDigits } from './settings'

export type { MessageKey }
export type Vars = Record<string, string | number>

const messages: Record<'en' | 'bn', Record<MessageKey, string>> = { en, bn }

/**
 * Looks up a UI string in the current language and fills in {placeholders}.
 * Messages are written with 0-9; they become ০-৯ when Bangla numerals are on.
 */
export function t(key: MessageKey, vars?: Vars): string {
  let text = messages[getSettings().language][key]
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
  }
  return localiseDigits(text)
}

/** Formats an ISO date (YYYY-MM-DD) as "1 Jul 2025" or "১ জুলাই ২০২৫". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const bangla = getSettings().language === 'bn'
  // Bangla short months ("জুল") read oddly, so Bangla uses the full name, without the comma.
  const text = new Date(y, m - 1, d).toLocaleDateString(bangla ? 'bn-BD' : 'en-GB', {
    day: 'numeric',
    month: bangla ? 'long' : 'short',
    year: 'numeric',
    numberingSystem: 'latn',
  })
  return localiseDigits(text.replace(',', ''))
}
