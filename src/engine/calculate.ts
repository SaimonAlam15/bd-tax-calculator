import type {
  FilingWindow,
  InvestmentItem,
  Profile,
  RebateLimit,
  RentProperty,
  Rules,
  SlabLine,
  TaxInputs,
  TaxResult,
} from './types'

const round = Math.round
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

/** Tax-free threshold: the most favourable category the taxpayer qualifies for, plus the per-child allowance. */
export function taxFreeThreshold(profile: Profile, rules: Rules): number {
  const t = rules.thresholds
  const candidates = [t.general]
  if (profile.female || profile.aged65OrMore) candidates.push(t.femaleOrSenior)
  if (profile.disability) candidates.push(t.disability)
  if (profile.thirdGender) candidates.push(t.thirdGender)
  if (profile.warWoundedFighter) candidates.push(t.warWoundedFighter)
  return Math.max(...candidates) + t.perDisabledChild * Math.max(0, profile.disabledChildren)
}

/** Applies the slabs to total income; the first slab is the tax-free threshold. */
export function slabTax(totalIncome: number, threshold: number, rules: Rules): SlabLine[] {
  const lines: SlabLine[] = [
    { from: 0, to: threshold, rate: 0, taxedAmount: Math.min(totalIncome, threshold), tax: 0 },
  ]
  let from = threshold
  for (const slab of rules.slabs) {
    const to = slab.width === null ? null : from + slab.width
    const taxedAmount = Math.max(0, Math.min(totalIncome, to ?? Infinity) - from)
    lines.push({ from, to, rate: slab.rate, taxedAmount, tax: round(taxedAmount * slab.rate) })
    if (to === null) break
    from = to
  }
  return lines
}

export function employmentIncome(components: Record<string, number>, rules: Rules) {
  const gross = sum(Object.values(components))
  const { fraction, cap } = rules.salaryExemption
  const exemption = round(Math.min(gross * fraction, cap))
  return { gross, exemption, taxable: gross - exemption }
}

export function rentIncome(property: RentProperty, rules: Rules) {
  // s.37: gross rental value = annual value + charges paid by the tenant − vacancy allowance.
  const grossRentalValue = Math.max(
    0,
    property.annualValue + property.tenantPaidCharges - property.vacancyAllowance,
  )
  // s.39: special rent from deposits and premiums.
  const specialRent =
    round(property.securityDepositBalance * rules.rent.securityDepositSpecialRentRate) +
    property.nonRefundablePremium
  const gross = grossRentalValue + specialRent
  const repairs = round(grossRentalValue * rules.rent.repairsAllowanceRate[property.kind])
  const deductions =
    repairs +
    property.municipalTax +
    property.landRevenue +
    property.loanInterest +
    property.insurancePremium
  return { gross, deductions, net: Math.max(0, gross - deductions) }
}

export function eligibleInvestment(item: InvestmentItem, rules: Rules): number {
  const caps = rules.investmentCaps
  switch (item.kind) {
    case 'dps':
      return Math.min(item.amount, caps.dps)
    case 'lifeInsurance':
      return item.sumAssured
        ? Math.min(item.amount, round(item.sumAssured * caps.lifeInsurancePremiumOfSumAssured))
        : item.amount
    default:
      return item.amount
  }
}

/** s.78: the lowest of a share of income, a share of eligible investment, and a fixed cap. */
export function investmentRebate(rebateBase: number, investment: number, rules: Rules) {
  const byIncome = round(rebateBase * rules.rebate.incomeRate)
  const byInvestment = round(investment * rules.rebate.investmentRate)
  const cap = rules.rebate.cap
  const amount = Math.min(byIncome, byInvestment, cap)
  const limitApplied: RebateLimit =
    amount === byIncome ? 'income' : amount === byInvestment ? 'investment' : 'cap'
  return { eligibleInvestment: investment, byIncome, byInvestment, cap, amount, limitApplied }
}

export function wealthSurchargeRate(wealth: TaxInputs['wealth'], rules: Rules): number {
  if (!wealth) return 0
  const { bands, tenPercentIf } = rules.wealthSurcharge
  const band = bands.find((b) => b.upTo === null || wealth.netWealth <= b.upTo)!
  const triggersTenPercent =
    wealth.cars > tenPercentIf.carsMoreThan ||
    wealth.housePropertySqft > tenPercentIf.housePropertySqftMoreThan
  return band.rate === 0 && triggersTenPercent ? 0.1 : band.rate
}

/** s.170: rebate or extra tax depending on when the return is filed, based on the s.173 amount payable. */
export function filingAdjustment(payable: number, filingDate: string, rules: Rules) {
  const window: FilingWindow | undefined = rules.filingWindows.find(
    (w) => filingDate >= w.from && filingDate <= w.to,
  )
  if (!window) return { kind: 'outsideWindows' as const, amount: 0 }
  // Open question (SPEC §4.8): whether the extra-tax floor applies when nothing is payable.
  if (window.kind === 'none' || payable <= 0) return { kind: window.kind, amount: 0 }
  const base = round(payable * window.rate!)
  return window.kind === 'rebate'
    ? { kind: window.kind, amount: -Math.min(base, window.max!) }
    : { kind: window.kind, amount: Math.max(base, window.min!) }
}

export function calculate(inputs: TaxInputs, rules: Rules): TaxResult {
  const employment = employmentIncome(inputs.salary.components, rules)
  const rentParts = inputs.rent.map((p) => rentIncome(p, rules))
  const rent = {
    gross: sum(rentParts.map((p) => p.gross)),
    deductions: sum(rentParts.map((p) => p.deductions)),
    net: sum(rentParts.map((p) => p.net)),
  }
  const business = Math.max(0, inputs.business.netProfit)
  // From tax year 2026-27 Sanchaypatra profit is ordinary income; its TDS is advance tax (s.163 as replaced).
  const financialAssets = sum(inputs.financialAssets.map((f) => f.gross))
  const foreignTaxable = inputs.foreign.taxable
  const total = employment.taxable + rent.net + business + financialAssets + foreignTaxable

  const threshold = taxFreeThreshold(inputs.profile, rules)
  const slabs = slabTax(total, threshold, rules)
  const grossTax = sum(slabs.map((s) => s.tax))

  const investment = sum(inputs.investments.map((i) => eligibleInvestment(i, rules)))
  // No final-tax, reduced-rate or firm-share income is in scope, so the rebate base is total income.
  const rebateCalc = investmentRebate(total, investment, rules)
  const rebate = { ...rebateCalc, amount: Math.min(rebateCalc.amount, grossTax) }
  const netTaxAfterRebate = grossTax - rebate.amount

  const minimumTax =
    total > threshold
      ? inputs.profile.newTaxpayer
        ? rules.minimumTax.newTaxpayer
        : rules.minimumTax.standard
      : 0
  const taxPayable = Math.max(netTaxAfterRebate, minimumTax)

  const surchargeRate = wealthSurchargeRate(inputs.wealth, rules)
  const surcharge = { rate: surchargeRate, amount: round(taxPayable * surchargeRate) }
  const totalPayable = taxPayable + surcharge.amount

  const tds =
    inputs.salary.tds +
    sum(inputs.rent.map((p) => p.tds)) +
    inputs.business.tds +
    sum(inputs.financialAssets.map((f) => f.tds)) +
    inputs.taxPaid.otherTds
  const taxPaid = {
    tds,
    advanceTax: inputs.taxPaid.advanceTax,
    refundAdjustment: inputs.taxPaid.refundAdjustment,
    total: tds + inputs.taxPaid.advanceTax + inputs.taxPaid.refundAdjustment,
  }

  const payableBeforeFilingAdjustment = Math.max(0, totalPayable - taxPaid.total)
  const filing = filingAdjustment(payableBeforeFilingAdjustment, inputs.profile.filingDate, rules)

  return {
    rulesVersion: rules.version,
    income: { employment, rent, business, financialAssets, foreignTaxable, total },
    exemptIncome: employment.exemption + inputs.foreign.exempt,
    threshold,
    slabs,
    grossTax,
    rebate,
    netTaxAfterRebate,
    minimumTax,
    taxPayable,
    surcharge,
    totalPayable,
    taxPaid,
    payableBeforeFilingAdjustment,
    filingAdjustment: filing,
    balance: totalPayable - taxPaid.total + filing.amount,
  }
}
