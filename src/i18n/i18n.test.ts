import { formatPercent, formatTaka, parseAmount } from '../lib/format'
import { bn } from './bn'
import { en } from './en'
import { formatDate, t } from './index'
import { setSettings } from './settings'

afterEach(() => setSettings({ language: 'en', banglaDigits: true }))

describe('i18n', () => {
  it('has a Bangla string for every English key and no extras', () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort())
  })

  it('keeps the same placeholders in both languages', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
      expect(vars(bn[key]), key).toEqual(vars(en[key]))
    }
  })

  it('uses Western digits in English', () => {
    expect(formatTaka(1234567)).toBe('৳12,34,567')
    expect(t('results.line', { n: 12 })).toBe('Line 12')
  })

  it('uses Bangla digits in Bangla, keeping lakh grouping', () => {
    setSettings({ language: 'bn' })
    expect(formatTaka(1234567)).toBe('৳১২,৩৪,৫৬৭')
    expect(formatTaka(-500)).toBe('−৳৫০০')
    expect(formatPercent(0.075)).toBe('৭.৫%')
    expect(t('results.line', { n: 12 })).toBe('ক্রমিক ১২')
    expect(formatDate('2025-07-01')).toBe("১ জুলাই ২০২৫")
  })

  it('can show Bangla text with Western digits', () => {
    setSettings({ language: 'bn', banglaDigits: false })
    expect(formatTaka(1234567)).toBe('৳12,34,567')
    expect(t('results.line', { n: 12 })).toBe('ক্রমিক 12')
  })

  it('parses amounts typed in Bangla digits', () => {
    expect(parseAmount('১,২০,০০০')).toBe(120000)
    expect(parseAmount('৳ 5,000')).toBe(5000)
  })
})
