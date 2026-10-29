import { emptyInputs } from '../engine'
import { clearInputs, loadInputs, saveInputs, STORAGE_KEY } from './storage'

const HOUR = 60 * 60 * 1000

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  }
}

describe('input cache', () => {
  let storage: ReturnType<typeof memoryStorage>
  beforeEach(() => {
    storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
  })
  afterEach(() => vi.unstubAllGlobals())

  const inputs = () => {
    const i = emptyInputs('2026-10-29')
    i.salary.components = { basic: 1060000 }
    return i
  }

  it('restores inputs saved less than 3 hours ago', () => {
    saveInputs(inputs(), 0)
    expect(loadInputs(3 * HOUR - 1)).toEqual(inputs())
  })

  it('deletes inputs once 3 hours have passed', () => {
    saveInputs(inputs(), 0)
    expect(loadInputs(3 * HOUR)).toBeNull()
    expect(storage.data.has(STORAGE_KEY)).toBe(false)
  })

  it('discards saves from another version or corrupt data', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 0, savedAt: 0, inputs: inputs() }))
    expect(loadInputs(1)).toBeNull()
    storage.setItem(STORAGE_KEY, '{not json')
    expect(loadInputs(1)).toBeNull()
  })

  it('fills fields missing from an older save', () => {
    const partial = { salary: { components: { basic: 5 }, tds: 0 }, profile: { filingDate: '2026-10-29' } }
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, savedAt: 0, inputs: partial }))
    const loaded = loadInputs(1)!
    expect(loaded.salary.components.basic).toBe(5)
    expect(loaded.rent).toEqual([])
    expect(loaded.profile.female).toBe(false)
  })

  it('clears on request', () => {
    saveInputs(inputs(), 0)
    clearInputs()
    expect(loadInputs(1)).toBeNull()
  })

  it('works when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() => saveInputs(inputs())).not.toThrow()
    expect(loadInputs()).toBeNull()
    expect(() => clearInputs()).not.toThrow()
  })
})
