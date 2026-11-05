import { calculate, type Rules, type TaxInputs, type TaxResult } from '../engine'

// Filing help (SPEC §3.1). The e-return screens were mapped from screenshots of the
// assessment year 2026-27 portal; update this date when they are checked again.
export const GUIDE_CHECKED = '2026-11-04'
export const E_RETURN_URL = 'https://etaxnbr.gov.bd'
export const CALL_CENTRE = '09643717171'

export type DocId =
  | 'tin'
  | 'nid'
  | 'lastReturn'
  | 'salary'
  | 'bankTds'
  | 'sanchaypatra'
  | 'dividend'
  | 'rent'
  | 'business'
  | 'investments'
  | 'remittance'
  | 'taxPaid'
  | 'wealth'

/** Documents to have ready, based on what the user entered. */
export function documentChecklist(inputs: TaxInputs): DocId[] {
  const docs: DocId[] = ['tin', 'nid', 'lastReturn']
  const assets = inputs.financialAssets.filter((f) => f.gross > 0)
  const has = (cond: boolean, id: DocId) => cond && docs.push(id)
  has(Object.values(inputs.salary.components).some((v) => v > 0), 'salary')
  has(assets.some((f) => f.kind === 'bank' || f.kind === 'fdr' || f.kind === 'securities'), 'bankTds')
  has(
    assets.some((f) => f.kind === 'sanchaypatra') || inputs.investments.some((i) => i.kind === 'sanchaypatra'),
    'sanchaypatra',
  )
  has(assets.some((f) => f.kind === 'dividend'), 'dividend')
  has(inputs.rent.length > 0, 'rent')
  has(inputs.business.netProfit > 0, 'business')
  has(inputs.investments.some((i) => i.kind !== 'sanchaypatra' && i.amount > 0), 'investments')
  has(inputs.foreign.exempt > 0, 'remittance')
  has(inputs.taxPaid.advanceTax > 0 || inputs.taxPaid.otherTds > 0, 'taxPaid')
  docs.push('wealth')
  return docs
}

/** Paper filing is open to people aged 65+ and people with a disability; the profile covers only those. */
export function mayFileOnPaper(inputs: TaxInputs): boolean {
  return inputs.profile.aged65OrMore || inputs.profile.disability
}

export interface DeadlineStatus {
  daysLeft: number // to the return deadline; negative once it has passed
  /** What filing today does: the same rules as the planned filing date, applied to today. */
  today: TaxResult['filingAdjustment']
}

export function deadlineStatus(inputs: TaxInputs, rules: Rules, today: string): DeadlineStatus {
  const day = 24 * 60 * 60 * 1000
  const daysLeft = Math.round((Date.parse(rules.returnDeadline) - Date.parse(today)) / day)
  const asIfToday = { ...inputs, profile: { ...inputs.profile, filingDate: today } }
  return { daysLeft, today: calculate(asIfToday, rules).filingAdjustment }
}

/** One figure on an e-return screen. Labels are the portal's own English wording, kept as-is in both languages. */
export interface PortalLine {
  label: string
  value: number
  strong?: boolean
}

/** The Tax & Payment tab, in the portal's order. The portal works these out itself; they are for checking. */
export function taxAndPayment(result: TaxResult) {
  const inc = result.income
  const filing = result.filingAdjustment.amount
  const income: PortalLine[] = [
    { label: 'Income from Employment', value: inc.employment.taxable },
    { label: 'Income from Financial Assets', value: inc.financialAssets },
    { label: 'Income from Rent', value: inc.rent.net },
    { label: 'Income from Business or Profession', value: inc.business },
    { label: 'Net Total Income', value: inc.total, strong: true },
    { label: 'Tax Exempted Income', value: result.exemptIncome },
  ]
  const computation: PortalLine[] = [
    { label: 'Gross Tax before Rebate', value: result.grossTax },
    { label: 'Tax Rebate (On Investment)', value: result.rebate.amount },
    { label: 'Tax after Rebate', value: result.netTaxAfterRebate },
    { label: 'Minimum Payable Tax (For Taxable Income)', value: result.minimumTax },
    { label: 'Net Tax after Rebate', value: result.taxPayable },
    { label: 'Surcharge (Wealth surcharge)', value: result.surcharge.amount },
    { label: 'Total Amount Payable', value: result.totalPayable, strong: true },
  ]
  const payment: PortalLine[] = [
    { label: 'Source Tax', value: result.taxPaid.tds },
    { label: 'Advance Income Tax', value: result.taxPaid.advanceTax },
    { label: 'Adjustment of Tax Refund', value: result.taxPaid.refundAdjustment },
    { label: 'Total Payment & Adjustments', value: result.taxPaid.total, strong: true },
  ]
  const final: PortalLine[] = [
    { label: 'Incentive (For 1st quarter submission)', value: filing < 0 ? -filing : 0 },
    { label: 'Refundable', value: Math.max(0, -result.balance) },
    { label: 'Net Payable', value: Math.max(0, result.balance), strong: true },
  ]
  return { income, computation, payment, final, lateFilingExtra: filing > 0 ? filing : 0 }
}
