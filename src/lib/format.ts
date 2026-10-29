import { localiseDigits, toAsciiDigits } from '../i18n/settings'

// Bangladesh uses lakh/crore grouping (12,34,567), which matches the en-IN locale.
const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function formatNumber(n: number): string {
  return localiseDigits(grouped.format(n))
}

export function formatTaka(n: number): string {
  return n < 0 ? `−৳${formatNumber(-n)}` : `৳${formatNumber(n)}`
}

export function formatPercent(rate: number): string {
  return localiseDigits(`${Number((rate * 100).toFixed(2))}%`)
}

/** Keeps digits only, so pasted values like "1,20,000", "৳ 5000" or "১,২০,০০০" work. */
export function parseAmount(text: string): number {
  const digits = toAsciiDigits(text).replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

/** Today's date as YYYY-MM-DD in the viewer's time zone. */
export function todayIso(): string {
  return new Date().toLocaleDateString('en-CA')
}
