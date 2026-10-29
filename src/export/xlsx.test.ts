import ExcelJS from 'exceljs'
import { calculate, currentRules as rules, emptyInputs, type TaxInputs } from '../engine'
import { setSettings } from '../i18n/settings'
import { createWorkbook, fileName, INPUTS_SCHEMA_VERSION, INPUTS_SHEET, returnFormLines } from './xlsx'

afterEach(() => setSettings({ language: 'en', banglaDigits: true }))

/** Salary, rent, Sanchaypatra and a DPS, filed in the no-adjustment window. */
function sampleInputs(): TaxInputs {
  const inputs = emptyInputs('2026-10-29')
  inputs.salary = { components: { basic: 600000, houseRent: 300000, medical: 60000, festivalBonus: 100000 }, tds: 30000 }
  inputs.rent = [
    {
      kind: 'residential',
      annualValue: 240000,
      tenantPaidCharges: 0,
      vacancyAllowance: 0,
      securityDepositBalance: 100000,
      nonRefundablePremium: 0,
      municipalTax: 5000,
      landRevenue: 0,
      loanInterest: 0,
      insurancePremium: 0,
      tds: 0,
    },
  ]
  inputs.financialAssets = [{ kind: 'sanchaypatra', gross: 100000, tds: 10000 }]
  inputs.foreign = { taxable: 0, exempt: 250000 }
  inputs.investments = [{ kind: 'dps', amount: 60000 }]
  return inputs
}

async function roundTrip(inputs: TaxInputs) {
  const result = calculate(inputs, rules)
  const wb = await createWorkbook(inputs, result, rules, new Date(2026, 9, 29))
  const read = new ExcelJS.Workbook()
  await read.xlsx.load(await wb.xlsx.writeBuffer())
  return { result, read }
}

/** Finds the row whose first or second cell is `label` and returns the value in `column`. */
function valueFor(sheet: ExcelJS.Worksheet, label: string, column: number) {
  let found: ExcelJS.CellValue | undefined
  sheet.eachRow((row) => {
    if (row.getCell(1).value === label || row.getCell(2).value === label) found ??= row.getCell(column).value
  })
  return found
}

describe('xlsx export', () => {
  it('names the file after the assessment year and date', () => {
    expect(fileName(rules, new Date(2026, 9, 29))).toBe('bd-tax-AY2026-27-20261029.xlsx')
  })

  it('creates the six sheets, with Inputs hidden', async () => {
    const { read } = await roundTrip(sampleInputs())
    expect(read.worksheets.map((s) => s.name)).toEqual([
      'Summary',
      'Income',
      'Tax calculation',
      'Investments & tax paid',
      'Return form lines',
      INPUTS_SHEET,
    ])
    expect(read.getWorksheet(INPUTS_SHEET)!.state).toBe('hidden')
    expect(read.getWorksheet('Summary')!.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
  })

  it('stores the raw inputs so the form can be refilled from the file', async () => {
    const inputs = sampleInputs()
    const { read } = await roundTrip(inputs)
    const sheet = read.getWorksheet(INPUTS_SHEET)!
    expect(valueFor(sheet, 'schemaVersion', 2)).toBe(INPUTS_SCHEMA_VERSION)
    expect(valueFor(sheet, 'rulesVersion', 2)).toBe(rules.version)
    expect(JSON.parse(String(valueFor(sheet, 'json', 2)))).toEqual(inputs)
  })

  it('writes amounts as numbers with lakh grouping', async () => {
    const inputs = sampleInputs()
    const result = calculate(inputs, rules)
    // Checked before writing: ExcelJS's reader drops the backslashes that make Excel group in lakhs.
    const summary = (await createWorkbook(inputs, result, rules)).getWorksheet('Summary')!
    const totalRow = summary.getRows(1, summary.rowCount)!.find((r) => r.getCell(1).value === 'Total income')!
    expect(totalRow.getCell(2).value).toBe(result.income.total)
    expect(totalRow.getCell(2).numFmt).toBe('[>=10000000]##\\,##\\,##\\,##0;[>=100000]##\\,##\\,##0;##,##0')
  })

  it('matches the calculation on the summary and return form sheets', async () => {
    const { result, read } = await roundTrip(sampleInputs())
    const summary = read.getWorksheet('Summary')!
    expect(valueFor(summary, 'Tax on total income', 2)).toBe(result.grossTax)
    expect(valueFor(summary, 'Investment rebate', 2)).toBe(result.rebate.amount)

    const form = read.getWorksheet('Return form lines')!
    expect(valueFor(form, 'Total income (add 1 to 10)', 3)).toBe(result.income.total)
    expect(valueFor(form, 'Tax-exempted or tax-free income', 3)).toBe(result.exemptIncome)
    expect(result.exemptIncome).toBeGreaterThan(250000) // salary exemption + remittance
  })

  it('shows every rebate limit and marks the one that applied', async () => {
    const { read } = await roundTrip(sampleInputs())
    const sheet = read.getWorksheet('Tax calculation')!
    expect(valueFor(sheet, '10% of eligible investment', 2)).toBe(6000)
    expect(valueFor(sheet, '10% of eligible investment', 3)).toBe('Lowest, so this applies')
    expect(valueFor(sheet, 'Maximum rebate', 3)).toBeNull()
  })

  it('follows the UI language', async () => {
    setSettings({ language: 'bn' })
    const { read } = await roundTrip(sampleInputs())
    expect(read.worksheets[0].name).toBe('সারসংক্ষেপ')
    expect(read.worksheets.at(-1)!.name).toBe(INPUTS_SHEET)
  })
})

describe('return form lines', () => {
  function lines(inputs: TaxInputs) {
    const map = new Map(returnFormLines(calculate(inputs, rules)).map((l) => [l.line, l.amount]))
    return (n: number) => map.get(n)
  }

  it('covers lines 1 to 26 in order', () => {
    expect(returnFormLines(calculate(sampleInputs(), rules)).map((l) => l.line)).toEqual(
      Array.from({ length: 26 }, (_, i) => i + 1),
    )
  })

  it('puts late-filing extra tax on line 18 and the balance on line 23', () => {
    // Paripatra example 30: business income 9 lakh, advance tax 15,000, filed 3 March 2027.
    const inputs = emptyInputs('2027-03-03')
    inputs.business.netProfit = 900000
    inputs.taxPaid.advanceTax = 15000
    const line = lines(inputs)
    expect(line(16)).toBe(60000)
    expect(line(18)).toBe(3000)
    expect(line(19)).toBe(63000)
    expect(line(23)).toBe(48000)
    expect(line(24)).toBe(63000)
    expect(line(25)).toBe(0)
  })

  it('shows a refund as excess payment on line 25', () => {
    const inputs = emptyInputs('2026-10-29')
    inputs.financialAssets = [{ kind: 'sanchaypatra', gross: 300000, tds: 30000 }]
    const line = lines(inputs)
    expect(line(19)).toBe(0)
    expect(line(23)).toBe(0)
    expect(line(25)).toBe(30000)
  })
})
