import rules202526 from '../rules/2025-26.json'
import type { Profile, Rules, TaxInputs } from './types'

export * from './calculate'
export * from './types'

export const currentRules = rules202526 as Rules

export function emptyProfile(filingDate: string): Profile {
  return {
    female: false,
    aged65OrMore: false,
    disability: false,
    thirdGender: false,
    warWoundedFighter: false,
    disabledChildren: 0,
    newTaxpayer: false,
    filingDate,
  }
}

export function emptyInputs(filingDate: string): TaxInputs {
  return {
    profile: emptyProfile(filingDate),
    salary: { components: {}, tds: 0 },
    rent: [],
    business: { netProfit: 0, tds: 0 },
    financialAssets: [],
    foreign: { taxable: 0, exempt: 0 },
    investments: [],
    taxPaid: { advanceTax: 0, otherTds: 0, refundAdjustment: 0 },
    wealth: null,
  }
}
