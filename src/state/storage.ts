import { emptyInputs, type TaxInputs } from '../engine'

// SPEC §6: inputs stay in this browser only, and are deleted 3 hours after the last change.
export const STORAGE_KEY = 'bdtax.inputs'
export const CACHE_HOURS = 3
const TTL_MS = CACHE_HOURS * 60 * 60 * 1000
/** Bump when TaxInputs changes shape; older saves are then discarded rather than misread. */
const VERSION = 1

interface Saved {
  version: number
  savedAt: number
  inputs: TaxInputs
}

/** Returns saved inputs if they are fresh, otherwise deletes them and returns null. */
export function loadInputs(now = Date.now()): TaxInputs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Partial<Saved>
    if (saved.version === VERSION && typeof saved.savedAt === 'number' && now - saved.savedAt < TTL_MS && saved.inputs) {
      // Fill any missing fields from a blank form, so a partial save can't break the engine.
      const blank = emptyInputs(saved.inputs.profile?.filingDate ?? '')
      return { ...blank, ...saved.inputs, profile: { ...blank.profile, ...saved.inputs.profile } }
    }
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked or data corrupt: start blank.
  }
  return null
}

export function saveInputs(inputs: TaxInputs, now = Date.now()) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, savedAt: now, inputs } satisfies Saved))
  } catch {
    // Not saved; the calculator still works for this visit.
  }
}

export function clearInputs() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}
