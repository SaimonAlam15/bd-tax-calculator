// All money values are whole taka.

export interface Slab {
  width: number | null // null = the rest of the income
  rate: number
}

export interface FilingWindow {
  from: string // ISO date, inclusive
  to: string
  kind: 'rebate' | 'none' | 'extra'
  rate?: number
  max?: number // rebate cap
  min?: number // extra-tax floor
}

export interface Rules {
  id: string
  version: string
  incomeYear: { label: string; start: string; end: string }
  assessmentYear: string
  returnDeadline: string
  lastChecked: string
  sources: { title: string; url: string }[]
  thresholds: {
    general: number
    femaleOrSenior: number
    disability: number
    thirdGender: number
    warWoundedFighter: number
    perDisabledChild: number
  }
  seniorAge: number
  slabs: Slab[]
  minimumTax: { standard: number; newTaxpayer: number }
  salaryExemption: { fraction: number; cap: number }
  rent: {
    repairsAllowanceRate: { residential: number; commercial: number }
    securityDepositSpecialRentRate: number
  }
  rebate: { incomeRate: number; investmentRate: number; cap: number }
  investmentCaps: { dps: number; lifeInsurancePremiumOfSumAssured: number }
  defaultTdsRates: { sanchaypatra: number; bankInterest: number; dividend: number }
  wealthSurcharge: {
    bands: { upTo: number | null; rate: number }[]
    tenPercentIf: { carsMoreThan: number; housePropertySqftMoreThan: number }
  }
  filingWindows: FilingWindow[]
}

export interface Profile {
  female: boolean
  aged65OrMore: boolean
  disability: boolean
  thirdGender: boolean
  warWoundedFighter: boolean
  disabledChildren: number // dependants with a disability (one parent claims)
  newTaxpayer: boolean
  filingDate: string // ISO date the return will be filed
}

export interface RentProperty {
  kind: 'residential' | 'commercial'
  annualValue: number
  tenantPaidCharges: number // service, repair and maintenance charges paid by the tenant
  vacancyAllowance: number
  securityDepositBalance: number // refundable deposits held at year end
  nonRefundablePremium: number // salami / premium received this year
  municipalTax: number
  landRevenue: number
  loanInterest: number
  insurancePremium: number
  tds: number
}

export type FinancialAssetKind = 'bank' | 'fdr' | 'sanchaypatra' | 'dividend' | 'securities'

export interface FinancialAssetItem {
  kind: FinancialAssetKind
  gross: number
  tds: number
}

export type InvestmentKind =
  | 'dps'
  | 'lifeInsurance'
  | 'sanchaypatra'
  | 'listedShares'
  | 'providentFund'
  | 'donation'
  | 'other'

export interface InvestmentItem {
  kind: InvestmentKind
  amount: number
  sumAssured?: number // life insurance only
}

export interface TaxInputs {
  profile: Profile
  salary: { components: Record<string, number>; tds: number }
  rent: RentProperty[]
  business: { netProfit: number; tds: number }
  financialAssets: FinancialAssetItem[]
  foreign: { taxable: number; exempt: number }
  investments: InvestmentItem[]
  taxPaid: { advanceTax: number; otherTds: number; refundAdjustment: number }
  wealth: { netWealth: number; cars: number; housePropertySqft: number } | null
}

export interface SlabLine {
  from: number
  to: number | null
  rate: number
  taxedAmount: number
  tax: number
}

export type RebateLimit = 'income' | 'investment' | 'cap'

export interface TaxResult {
  rulesVersion: string
  income: {
    employment: { gross: number; exemption: number; taxable: number }
    rent: { gross: number; deductions: number; net: number }
    business: number
    financialAssets: number
    foreignTaxable: number
    total: number // IT-11GA line 11
  }
  exemptIncome: number // IT-11GA line 26
  threshold: number
  slabs: SlabLine[]
  grossTax: number // line 12
  rebate: {
    eligibleInvestment: number
    byIncome: number
    byInvestment: number
    cap: number
    amount: number // line 13
    limitApplied: RebateLimit
  }
  netTaxAfterRebate: number // line 14
  minimumTax: number // line 15 (0 when income is under the threshold)
  taxPayable: number // line 16
  surcharge: { rate: number; amount: number } // line 17(a)
  totalPayable: number // line 19
  taxPaid: { tds: number; advanceTax: number; refundAdjustment: number; total: number }
  payableBeforeFilingAdjustment: number // s.173 amount, never negative
  filingAdjustment: { kind: FilingWindow['kind'] | 'outsideWindows'; amount: number } // negative = rebate
  balance: number // positive = still to pay with the return, negative = refundable
}
