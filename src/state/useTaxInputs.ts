import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyInputs, type TaxInputs } from '../engine'
import { todayIso } from '../lib/format'
import { CACHE_HOURS, clearInputs, loadInputs, saveInputs } from './storage'

export type Update = (change: (draft: TaxInputs) => void) => void

export function useTaxInputs() {
  const [inputs, setInputs] = useState<TaxInputs>(() => loadInputs() ?? emptyInputs(todayIso()))
  // Only save once the user has changed something, so opening the page stores nothing.
  const touched = useRef(false)

  useEffect(() => {
    if (!touched.current) return
    saveInputs(inputs)
    // Delete on time even if the tab stays open; the next change saves again.
    const expiry = setTimeout(clearInputs, CACHE_HOURS * 60 * 60 * 1000)
    return () => clearTimeout(expiry)
  }, [inputs])

  // Sections mutate a copy, which keeps their update code short.
  const update: Update = useCallback((change) => {
    touched.current = true
    setInputs((prev) => {
      const next = structuredClone(prev)
      change(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    touched.current = false
    clearInputs()
    setInputs(emptyInputs(todayIso()))
  }, [])

  return { inputs, update, reset }
}
