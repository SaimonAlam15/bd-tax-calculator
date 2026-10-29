import type { Workbook, Worksheet } from 'exceljs'
import {
  eligibleInvestment,
  rentIncome,
  type Rules,
  type TaxInputs,
  type TaxResult,
} from '../engine'
import { formatDate, t, type MessageKey } from '../i18n'
import { localiseDigits } from '../i18n/settings'
import { formatPercent, formatTaka } from '../lib/format'

/** Bumped when the hidden Inputs sheet changes shape, so v2 prefill can tell old files apart. */
export const INPUTS_SCHEMA_VERSION = 1
/** Fixed in every language so a future upload can find it. */
export const INPUTS_SHEET = 'Inputs'

// Lakh/crore grouping (12,34,567). Excel has no locale for it, so it is done with conditions.
const TAKA = '[>=10000000]##\\,##\\,##\\,##0;[>=100000]##\\,##\\,##0;##,##0'
const PERCENT = '0.##%'

type Cell = string | number | null
type Style = 'heading' | 'header' | 'total' | 'note'

/** Writes rows top to bottom and applies the house style. */
class SheetWriter {
  constructor(
    readonly sheet: Worksheet,
    /** Columns (1-based) that hold taka amounts. */
    private amountColumns: number[],
  ) {}

  row(cells: Cell[], style?: Style) {
    const row = this.sheet.addRow(cells)
    for (const c of this.amountColumns) row.getCell(c).numFmt = TAKA
    if (style === 'heading') row.font = { bold: true, size: 13 }
    if (style === 'header') {
      row.font = { bold: true }
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E5E4' } }
      })
    }
    if (style === 'total') row.font = { bold: true }
    if (style === 'note') row.font = { italic: true, color: { argb: 'FF57534E' } }
    return row
  }

  gap() {
    this.sheet.addRow([])
  }
}

function newSheet(wb: Workbook, name: string, widths: number[], amountColumns: number[], header: Cell[]) {
  const sheet = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] })
  sheet.columns = widths.map((width) => ({ width }))
  const w = new SheetWriter(sheet, amountColumns)
  w.row(header, 'header')
  return w
}

function categoryText(inputs: TaxInputs): string {
  const p = inputs.profile
  const parts: string[] = []
  if (p.female) parts.push(t('xlsx.category.female'))
  if (p.aged65OrMore) parts.push(t('xlsx.category.aged65'))
  if (p.disability) parts.push(t('xlsx.category.disability'))
  if (p.thirdGender) parts.push(t('xlsx.category.thirdGender'))
  if (p.warWoundedFighter) parts.push(t('xlsx.category.warWounded'))
  if (p.disabledChildren) parts.push(t('xlsx.category.disabledChildren', { n: p.disabledChildren }))
  if (p.newTaxpayer) parts.push(t('xlsx.category.newTaxpayer'))
  return parts.length ? parts.join('; ') : t('xlsx.category.general')
}

function balanceLabel(result: TaxResult): string {
  return result.balance > 0 ? t('results.toPay') : result.balance < 0 ? t('results.refund') : t('results.nothing')
}

function filingLabel(result: TaxResult): string {
  const f = result.filingAdjustment
  if (f.amount < 0) return t('results.filingRebate')
  if (f.amount > 0) return t('results.filingExtra')
  return f.kind === 'outsideWindows' ? t('results.filingOutside') : t('results.filingNone')
}

function summarySheet(wb: Workbook, inputs: TaxInputs, result: TaxResult, rules: Rules, now: Date) {
  const w = newSheet(wb, t('xlsx.sheet.summary'), [44, 22, 50], [2], [t('xlsx.col.item'), t('xlsx.col.amount'), t('xlsx.col.note')])
  const f = result.filingAdjustment
  w.row([t('xlsx.summary.incomeYear'), null, `${formatDate(rules.incomeYear.start)} – ${formatDate(rules.incomeYear.end)}`])
  w.row([t('xlsx.summary.assessmentYear'), null, localiseDigits(rules.assessmentYear)])
  w.row([t('xlsx.summary.category'), null, categoryText(inputs)])
  w.row([t('xlsx.summary.threshold'), result.threshold])
  w.gap()
  w.row([t('results.line.total'), result.income.total], 'total')
  w.row([t('results.grossTax'), result.grossTax])
  w.row([t('results.rebate'), result.rebate.amount])
  w.row([t('results.minimumTax'), result.minimumTax])
  w.row([t('results.taxPayable'), result.taxPayable])
  const surchargeLabel = result.surcharge.rate
    ? t('results.surcharge', { rate: formatPercent(result.surcharge.rate) })
    : t('wealth.title')
  w.row([surchargeLabel, result.surcharge.amount])
  w.row([t('results.totalPayable'), result.totalPayable], 'total')
  w.row([t('results.totalPaid'), result.taxPaid.total])
  w.row([t('xlsx.summary.filingDate'), null, formatDate(inputs.profile.filingDate)])
  w.row([t('xlsx.summary.filingAdjustment'), Math.abs(f.amount), filingLabel(result)])
  w.row([balanceLabel(result), Math.abs(result.balance)], 'total')
  w.gap()
  w.row([t('xlsx.summary.rules'), null, localiseDigits(rules.version)])
  for (const s of rules.sources) w.row([t('footer.source'), null, s.title]).getCell(3).value = { text: s.title, hyperlink: s.url }
  w.row([t('xlsx.summary.created'), null, formatDate(now.toLocaleDateString('en-CA'))])
  w.gap()
  w.row([t('results.disclaimer')], 'note')
}

function incomeSheet(wb: Workbook, inputs: TaxInputs, result: TaxResult, rules: Rules) {
  const w = newSheet(wb, t('xlsx.sheet.income'), [48, 18, 40], [2], [t('xlsx.col.item'), t('xlsx.col.amount'), t('xlsx.col.note')])
  const lineNote = (n: number) => t('results.line', { n })

  // Salary
  const employment = result.income.employment
  w.row([t('results.line.employment'), null, lineNote(1)], 'heading')
  const components = Object.entries(inputs.salary.components).filter(([, v]) => v)
  if (!components.length) w.row([t('xlsx.none'), 0])
  for (const [key, value] of components) w.row([t(`salary.${key}` as MessageKey), value])
  if (employment.exemption) {
    const item = t('xlsx.income.salaryExempt', { cap: formatTaka(rules.salaryExemption.cap) })
    w.row([t('xlsx.less', { item }), employment.exemption])
  }
  w.row([t('xlsx.subtotal'), employment.taxable], 'total')
  w.gap()

  // Rent
  w.row([t('results.line.rent'), null, lineNote(2)], 'heading')
  if (!inputs.rent.length) w.row([t('xlsx.none'), 0])
  inputs.rent.forEach((p, i) => {
    const r = rentIncome(p, rules)
    const repairsRate = rules.rent.repairsAllowanceRate[p.kind]
    const depositRent = Math.round(p.securityDepositBalance * rules.rent.securityDepositSpecialRentRate)
    w.row([`${t('rent.property', { n: i + 1 })} (${t(p.kind === 'residential' ? 'rent.residential' : 'rent.commercial')})`]).font = { bold: true }
    w.row([t('rent.annualValue'), p.annualValue])
    if (p.tenantPaidCharges) w.row([t('rent.tenantPaidCharges'), p.tenantPaidCharges])
    if (p.vacancyAllowance) w.row([t('xlsx.less', { item: t('rent.vacancyAllowance') }), p.vacancyAllowance])
    if (depositRent) w.row([t('xlsx.income.depositRent', { rate: formatPercent(rules.rent.securityDepositSpecialRentRate) }), depositRent])
    if (p.nonRefundablePremium) w.row([t('rent.premium'), p.nonRefundablePremium])
    const repairs = r.deductions - p.municipalTax - p.landRevenue - p.loanInterest - p.insurancePremium
    if (repairs) w.row([t('xlsx.less', { item: t('xlsx.income.repairs', { rate: formatPercent(repairsRate) }) }), repairs])
    for (const [key, value] of [
      ['rent.municipalTax', p.municipalTax],
      ['rent.landRevenue', p.landRevenue],
      ['rent.loanInterest', p.loanInterest],
      ['rent.insurance', p.insurancePremium],
    ] as const) {
      if (value) w.row([t('xlsx.less', { item: t(key) }), value])
    }
    w.row([t('xlsx.subtotal'), r.net], 'total')
  })
  w.gap()

  // Business
  w.row([t('results.line.business'), null, lineNote(4)], 'heading')
  w.row([t('business.netProfit'), inputs.business.netProfit], 'total')
  w.gap()

  // Financial assets
  w.row([t('results.line.financialAssets'), null, lineNote(6)], 'heading')
  if (!inputs.financialAssets.length) w.row([t('xlsx.none'), 0])
  for (const a of inputs.financialAssets) w.row([t(`assets.kind.${a.kind}`), a.gross])
  w.row([t('xlsx.subtotal'), result.income.financialAssets], 'total')
  w.gap()

  // Abroad
  w.row([t('foreign.title'), null, lineNote(10)], 'heading')
  w.row([t('foreign.taxable'), inputs.foreign.taxable], 'total')
  w.row([t('foreign.exempt'), inputs.foreign.exempt, t('xlsx.income.exemptNote')])
  w.gap()

  w.row([t('results.line.total'), result.income.total, lineNote(11)], 'total')
  w.row([t('results.exempt'), result.exemptIncome])
}

function taxSheet(wb: Workbook, inputs: TaxInputs, result: TaxResult, rules: Rules) {
  const w = newSheet(
    wb,
    t('xlsx.sheet.tax'),
    [44, 18, 18, 10, 18, 18],
    [2, 3, 5, 6],
    [t('xlsx.tax.slabs'), t('xlsx.col.from'), t('xlsx.col.to'), t('xlsx.col.rate'), t('xlsx.col.taxed'), t('xlsx.col.tax')],
  )

  // Slab table first; the workings below use columns 1-3 only.
  result.slabs.forEach((s, i) => {
    const label = i === 0 ? `${t('results.slabFirst', { amount: formatTaka(s.to!) })} · ${t('results.taxFree')}` : s.to === null ? t('results.slabRest') : t('results.slabNext', { amount: formatTaka(s.to - s.from) })
    w.row([label, s.from, s.to, s.rate, s.taxedAmount, s.tax]).getCell(4).numFmt = PERCENT
  })
  w.row([t('results.grossTax'), null, null, null, null, result.grossTax], 'total')
  w.gap()

  // Rebate working: show all three limits and mark the one that applied.
  const r = result.rebate
  w.row([t('xlsx.tax.rebateWorking')], 'heading')
  w.row([t('xlsx.tax.eligibleInvestment'), r.eligibleInvestment])
  const limits = [
    ['income', t('xlsx.tax.byIncome', { rate: formatPercent(rules.rebate.incomeRate) }), r.byIncome],
    ['investment', t('xlsx.tax.byInvestment', { rate: formatPercent(rules.rebate.investmentRate) }), r.byInvestment],
    ['cap', t('xlsx.tax.cap'), r.cap],
  ] as const
  for (const [kind, label, value] of limits) {
    const row = w.row([label, value])
    if (kind === r.limitApplied) row.getCell(3).value = t('xlsx.tax.applied')
  }
  w.row([t('xlsx.tax.rebate'), r.amount], 'total')
  w.gap()

  // Minimum tax check
  w.row([t('xlsx.tax.minimumCheck')], 'heading')
  w.row([t('results.netTax'), result.netTaxAfterRebate])
  const minRow = w.row([t('results.minimumTax'), result.minimumTax])
  if (!result.minimumTax) minRow.getCell(3).value = t('xlsx.tax.minimumNotDue')
  else if (result.minimumTax > result.netTaxAfterRebate) minRow.getCell(3).value = t('results.minimumApplies')
  w.row([t('results.taxPayable'), result.taxPayable], 'total')
  w.gap()

  // Surcharge
  w.row([t('wealth.title')], 'heading')
  if (inputs.wealth) {
    w.row([t('wealth.netWealth'), inputs.wealth.netWealth])
    w.row([t('wealth.cars'), null, String(inputs.wealth.cars)])
    w.row([t('wealth.sqft'), null, String(inputs.wealth.housePropertySqft)])
    const rateRow = w.row([t('xlsx.tax.surchargeRate')])
    rateRow.getCell(2).value = result.surcharge.rate
    rateRow.getCell(2).numFmt = PERCENT
    w.row([t('xlsx.tax.surchargeAmount'), result.surcharge.amount], 'total')
  } else {
    w.row([t('xlsx.tax.notApplicable'), 0])
  }
  w.gap()

  w.row([t('results.totalPayable'), result.totalPayable], 'total')
  w.row([t('xlsx.summary.filingAdjustment'), Math.abs(result.filingAdjustment.amount), filingLabel(result)])
}

function investmentsSheet(wb: Workbook, inputs: TaxInputs, result: TaxResult, rules: Rules) {
  const w = newSheet(
    wb,
    t('xlsx.sheet.investments'),
    [44, 18, 18, 22],
    [2, 3, 4],
    [t('invest.title'), t('xlsx.col.amount'), t('xlsx.col.sumAssured'), t('xlsx.col.counts')],
  )
  if (!inputs.investments.length) w.row([t('xlsx.none'), 0, null, 0])
  for (const item of inputs.investments) {
    w.row([t(`invest.kind.${item.kind}`), item.amount, item.sumAssured ?? null, eligibleInvestment(item, rules)])
  }
  w.row([t('xlsx.tax.eligibleInvestment'), null, null, result.rebate.eligibleInvestment], 'total')
  w.gap()

  w.row([t('results.paidHeading'), t('xlsx.col.amount')], 'header')
  const paid: [string, number][] = [
    [t('salary.tds'), inputs.salary.tds],
    ...inputs.rent.map((p, i): [string, number] => [t('xlsx.paid.rent', { n: i + 1 }), p.tds]),
    [t('business.tds'), inputs.business.tds],
    ...inputs.financialAssets.map((a): [string, number] => [t('xlsx.paid.asset', { kind: t(`assets.kind.${a.kind}`) }), a.tds]),
    [t('paid.otherTds'), inputs.taxPaid.otherTds],
    [t('paid.advanceTax'), inputs.taxPaid.advanceTax],
    [t('paid.refundAdjustment'), inputs.taxPaid.refundAdjustment],
  ]
  for (const [label, value] of paid) if (value) w.row([label, value])
  w.row([t('results.totalPaid'), result.taxPaid.total], 'total')
}

/** IT-11GA lines 1-26 with our figures. */
export function returnFormLines(result: TaxResult): { line: number; amount: number; note?: MessageKey; noteVars?: Record<string, string> }[] {
  const inc = result.income
  const f = result.filingAdjustment
  const extra = Math.max(0, f.amount) // late filing, s.174
  const payable = result.totalPayable + extra
  const paidWithReturn = Math.max(0, result.balance)
  const totalPaid = result.taxPaid.total + paidWithReturn
  const notCovered = 'xlsx.form.notCovered' as const
  return [
    { line: 1, amount: inc.employment.taxable },
    { line: 2, amount: inc.rent.net },
    { line: 3, amount: 0, note: notCovered },
    { line: 4, amount: inc.business },
    { line: 5, amount: 0, note: notCovered },
    { line: 6, amount: inc.financialAssets },
    { line: 7, amount: 0, note: notCovered },
    { line: 8, amount: 0, note: notCovered },
    { line: 9, amount: 0, note: notCovered },
    { line: 10, amount: inc.foreignTaxable },
    { line: 11, amount: inc.total },
    { line: 12, amount: result.grossTax },
    { line: 13, amount: result.rebate.amount },
    { line: 14, amount: result.netTaxAfterRebate },
    { line: 15, amount: result.minimumTax },
    { line: 16, amount: result.taxPayable },
    { line: 17, amount: result.surcharge.amount },
    { line: 18, amount: extra, note: extra ? 'xlsx.form.lateFiling' : undefined },
    { line: 19, amount: payable },
    { line: 20, amount: result.taxPaid.tds },
    { line: 21, amount: result.taxPaid.advanceTax },
    { line: 22, amount: result.taxPaid.refundAdjustment },
    {
      line: 23,
      amount: paidWithReturn,
      note: f.amount < 0 && paidWithReturn ? 'xlsx.form.earlyFiling' : undefined,
      noteVars: { amount: formatTaka(-f.amount) },
    },
    { line: 24, amount: totalPaid },
    { line: 25, amount: Math.max(0, totalPaid - payable) },
    { line: 26, amount: result.exemptIncome },
  ]
}

function returnFormSheet(wb: Workbook, result: TaxResult) {
  const w = newSheet(wb, t('xlsx.sheet.returnForm'), [8, 52, 18, 40], [3], [t('xlsx.col.line'), t('xlsx.col.item'), t('xlsx.col.amount'), t('xlsx.col.note')])
  for (const l of returnFormLines(result)) {
    w.row(
      [localiseDigits(String(l.line)), t(`xlsx.form.${l.line}` as MessageKey), l.amount, l.note ? t(l.note, l.noteVars) : null],
      [11, 19, 24].includes(l.line) ? 'total' : undefined,
    )
  }
  w.gap()
  w.row([null, t('xlsx.form.intro')], 'note')
}

/** Raw inputs for prefilling the form from this file later (SPEC §10). */
function inputsSheet(wb: Workbook, inputs: TaxInputs, rules: Rules) {
  const sheet = wb.addWorksheet(INPUTS_SHEET, { state: 'hidden' })
  sheet.addRow(['format', 'bd-tax-calculator/inputs'])
  sheet.addRow(['schemaVersion', INPUTS_SCHEMA_VERSION])
  sheet.addRow(['rulesVersion', rules.version])
  sheet.addRow(['json', JSON.stringify(inputs)])
}

export async function createWorkbook(inputs: TaxInputs, result: TaxResult, rules: Rules, now = new Date()): Promise<Workbook> {
  // ExcelJS is large, so it only loads when someone downloads.
  const mod = await import('exceljs')
  // The browser build arrives as a default export, Node's as named exports.
  const ExcelJS = mod.default ?? mod
  const wb = new ExcelJS.Workbook()
  wb.creator = t('app.title')
  wb.created = now
  summarySheet(wb, inputs, result, rules, now)
  incomeSheet(wb, inputs, result, rules)
  taxSheet(wb, inputs, result, rules)
  investmentsSheet(wb, inputs, result, rules)
  returnFormSheet(wb, result)
  inputsSheet(wb, inputs, rules)
  return wb
}

export function fileName(rules: Rules, now = new Date()): string {
  const ymd = now.toLocaleDateString('en-CA').replaceAll('-', '')
  return `bd-tax-AY${rules.assessmentYear}-${ymd}.xlsx`
}

export async function downloadXlsx(inputs: TaxInputs, result: TaxResult, rules: Rules) {
  const now = new Date()
  const wb = await createWorkbook(inputs, result, rules, now)
  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = fileName(rules, now)
  a.click()
  // Give the browser a moment to start the download before freeing the file.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
