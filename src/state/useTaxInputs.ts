import { useCallback, useState } from 'react'
import { emptyInputs, type TaxInputs } from '../engine'
import { todayIso } from '../lib/format'

export type Update = (change: (draft: TaxInputs) => void) => void

export function useTaxInputs() {
  const [inputs, setInputs] = useState<TaxInputs>(() => emptyInputs(todayIso()))

  // Sections mutate a copy, which keeps their update code short.
  const update: Update = useCallback((change) => {
    setInputs((prev) => {
      const next = structuredClone(prev)
      change(next)
      return next
    })
  }, [])

  const reset = useCallback(() => setInputs(emptyInputs(todayIso())), [])

  return { inputs, update, reset }
}
