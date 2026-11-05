import { calculate, currentRules as rules, emptyInputs, type TaxInputs } from '../engine'
import { deadlineStatus, documentChecklist, mayFileOnPaper, taxAndPayment } from './guide'

function inputs(change: (i: TaxInputs) => void = () => {}): TaxInputs {
  const i = emptyInputs('2026-10-29')
  change(i)
  return i
}

describe('document checklist', () => {
  it('always asks for the TIN, NID, last return and a wealth statement', () => {
    expect(documentChecklist(inputs())).toEqual(['tin', 'nid', 'lastReturn', 'wealth'])
  })

  it('adds documents for what was entered', () => {
    const docs = documentChecklist(
      inputs((i) => {
        i.salary.components = { gross: 900000 }
        i.financialAssets = [
          { kind: 'fdr', gross: 10000, tds: 1000 },
          { kind: 'dividend', gross: 5000, tds: 500 },
        ]
        i.investments = [{ kind: 'sanchaypatra', amount: 100000 }, { kind: 'dps', amount: 60000 }]
        i.foreign.exempt = 300000
        i.taxPaid.advanceTax = 2000
      }),
    )
    expect(docs).toEqual([
      'tin',
      'nid',
      'lastReturn',
      'salary',
      'bankTds',
      'sanchaypatra',
      'dividend',
      'investments',
      'remittance',
      'taxPaid',
      'wealth',
    ])
  })
})

describe('online filing check', () => {
  it('lets people aged 65+ or with a disability file on paper', () => {
    expect(mayFileOnPaper(inputs())).toBe(false)
    expect(mayFileOnPaper(inputs((i) => (i.profile.aged65OrMore = true)))).toBe(true)
    expect(mayFileOnPaper(inputs((i) => (i.profile.disability = true)))).toBe(true)
  })
})

describe('deadline status', () => {
  const owing = inputs((i) => (i.business.netProfit = 900000))

  it('counts days to the deadline and applies today’s filing window', () => {
    expect(deadlineStatus(owing, rules, '2026-11-04')).toEqual({ daysLeft: 26, today: { kind: 'none', amount: 0 } })
    expect(deadlineStatus(owing, rules, '2026-09-01').today).toEqual({ kind: 'rebate', amount: -3000 })
    expect(deadlineStatus(owing, rules, '2027-01-10')).toMatchObject({ daysLeft: -41, today: { kind: 'extra' } })
  })

  it('ignores the planned filing date', () => {
    const planned = { ...owing, profile: { ...owing.profile, filingDate: '2027-02-01' } }
    expect(deadlineStatus(planned, rules, '2026-11-04').today.kind).toBe('none')
  })
})

describe('Tax & Payment tab', () => {
  it('splits the early-filing rebate and the balance as the portal does', () => {
    const r = calculate(
      inputs((i) => {
        i.business.netProfit = 900000
        i.taxPaid.advanceTax = 15000
        i.profile.filingDate = '2026-08-10'
      }),
      rules,
    )
    const tab = taxAndPayment(r)
    expect(tab.final.map((l) => l.value)).toEqual([2250, 0, 42750])
    expect(tab.lateFilingExtra).toBe(0)
  })

  it('shows a refund as Refundable', () => {
    const r = calculate(inputs((i) => (i.financialAssets = [{ kind: 'sanchaypatra', gross: 250000, tds: 25000 }])), rules)
    expect(taxAndPayment(r).final.map((l) => l.value)).toEqual([0, 25000, 0])
  })
})
