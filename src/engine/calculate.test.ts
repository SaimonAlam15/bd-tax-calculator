import {
  calculate,
  currentRules as rules,
  emptyInputs,
  employmentIncome,
  investmentRebate,
  rentIncome,
  taxFreeThreshold,
  type TaxInputs,
} from '.'

// A date in the 1 Oct – 31 Dec window, which has no filing adjustment.
const NEUTRAL_DATE = '2026-10-29'

function inputs(overrides: (i: TaxInputs) => void, filingDate = NEUTRAL_DATE): TaxInputs {
  const i = emptyInputs(filingDate)
  overrides(i)
  return i
}

describe('NBR Paripatra 2026-27 worked examples', () => {
  it('example 29: ৳9,00,000 income, ৳15,000 advance tax, filed 10 Aug 2026 gets the 5% rebate', () => {
    const r = calculate(
      inputs((i) => {
        i.business.netProfit = 900000
        i.taxPaid.advanceTax = 15000
      }, '2026-08-10'),
      rules,
    )
    expect(r.grossTax).toBe(60000)
    expect(r.payableBeforeFilingAdjustment).toBe(45000)
    expect(r.filingAdjustment).toEqual({ kind: 'rebate', amount: -2250 })
    expect(r.balance).toBe(42750)
  })

  it('example 30: same figures filed 3 Mar 2027 pays the ৳3,000 minimum extra tax', () => {
    const r = calculate(
      inputs((i) => {
        i.business.netProfit = 900000
        i.taxPaid.advanceTax = 15000
      }, '2027-03-03'),
      rules,
    )
    expect(r.filingAdjustment).toEqual({ kind: 'extra', amount: 3000 })
    expect(r.balance).toBe(48000)
  })

  it('example 27: ৳26 lakh business income gives ৳4,40,000 tax', () => {
    const r = calculate(inputs((i) => (i.business.netProfit = 2600000)), rules)
    expect(r.grossTax).toBe(440000)
  })

  it('example 23: rebate on ৳5 crore income and ৳1 crore investment is capped at ৳7,50,000', () => {
    const r = investmentRebate(50000000, 10000000, rules)
    expect(r).toMatchObject({ byIncome: 1500000, byInvestment: 1000000, amount: 750000, limitApplied: 'cap' })
  })

  it('example 24: rebate on ৳2 crore income and ৳40 lakh investment is 10% of investment', () => {
    const r = investmentRebate(20000000, 4000000, rules)
    expect(r).toMatchObject({ byIncome: 600000, byInvestment: 400000, amount: 400000, limitApplied: 'investment' })
  })
})

describe('tax-free threshold', () => {
  const base = emptyInputs(NEUTRAL_DATE).profile

  it.each([
    ['general', {}, 400000],
    ['female', { female: true }, 450000],
    ['aged 65+', { aged65OrMore: true }, 450000],
    ['third gender', { thirdGender: true }, 525000],
    ['female with a disability takes the higher limit', { female: true, disability: true }, 525000],
    ['war-wounded freedom fighter', { warWoundedFighter: true }, 550000],
    ['parent of two children with a disability', { disabledChildren: 2 }, 500000],
  ])('%s', (_, profile, expected) => {
    expect(taxFreeThreshold({ ...base, ...profile }, rules)).toBe(expected)
  })
})

describe('minimum tax', () => {
  it('does not apply at exactly the threshold', () => {
    const r = calculate(inputs((i) => (i.business.netProfit = 400000)), rules)
    expect(r.taxPayable).toBe(0)
    expect(r.minimumTax).toBe(0)
  })

  it('applies ৳5,000 just above the threshold', () => {
    const r = calculate(inputs((i) => (i.business.netProfit = 400001)), rules)
    expect(r.grossTax).toBe(0)
    expect(r.taxPayable).toBe(5000)
  })

  it('is ৳1,000 for a new taxpayer', () => {
    const r = calculate(
      inputs((i) => {
        i.business.netProfit = 410000
        i.profile.newTaxpayer = true
      }),
      rules,
    )
    expect(r.taxPayable).toBe(1000)
  })

  it('still applies when the rebate wipes out the tax', () => {
    const r = calculate(
      inputs((i) => {
        i.business.netProfit = 410000
        i.investments = [{ kind: 'listedShares', amount: 1000000 }]
      }),
      rules,
    )
    expect(r.grossTax).toBe(1000)
    expect(r.rebate.amount).toBe(1000) // capped at gross tax
    expect(r.netTaxAfterRebate).toBe(0)
    expect(r.taxPayable).toBe(5000)
  })
})

describe('salary exemption', () => {
  it('exempts one third of salary', () => {
    expect(employmentIncome({ basic: 800000, houseRent: 400000 }, rules)).toEqual({
      gross: 1200000,
      exemption: 400000,
      taxable: 800000,
    })
  })

  it('caps the exemption at ৳5 lakh', () => {
    expect(employmentIncome({ gross: 1800000 }, rules).exemption).toBe(500000)
  })

  it('reports the exemption as tax-exempt income', () => {
    const r = calculate(inputs((i) => (i.salary.components = { gross: 1200000 })), rules)
    expect(r.income.total).toBe(800000)
    expect(r.exemptIncome).toBe(400000)
  })
})

describe('Sanchaypatra profit (advance tax from tax year 2026-27)', () => {
  it('is taxed at slab rates with its TDS credited', () => {
    const r = calculate(
      inputs((i) => {
        i.business.netProfit = 700000
        i.financialAssets = [{ kind: 'sanchaypatra', gross: 200000, tds: 20000 }]
      }),
      rules,
    )
    // ৳9 lakh total: ৳30,000 at 10% + ৳30,000 at 15%
    expect(r.grossTax).toBe(60000)
    expect(r.taxPaid.tds).toBe(20000)
    expect(r.balance).toBe(40000)
  })

  it('makes excess TDS refundable when income is under the threshold', () => {
    const r = calculate(
      inputs((i) => (i.financialAssets = [{ kind: 'sanchaypatra', gross: 250000, tds: 25000 }])),
      rules,
    )
    expect(r.taxPayable).toBe(0)
    expect(r.balance).toBe(-25000)
  })
})

describe('rent', () => {
  it('applies the repairs allowance and deductions', () => {
    const r = rentIncome(
      {
        kind: 'residential',
        annualValue: 600000,
        tenantPaidCharges: 0,
        vacancyAllowance: 0,
        securityDepositBalance: 100000,
        nonRefundablePremium: 0,
        municipalTax: 10000,
        landRevenue: 0,
        loanInterest: 50000,
        insurancePremium: 0,
        tds: 0,
      },
      rules,
    )
    // gross = 6,00,000 + 10% of the ৳1 lakh deposit; repairs = 25% of 6,00,000
    expect(r).toEqual({ gross: 610000, deductions: 210000, net: 400000 })
  })
})

describe('investment caps', () => {
  it('limits DPS and life insurance premiums', () => {
    const r = calculate(
      inputs((i) => {
        i.business.netProfit = 3000000
        i.investments = [
          { kind: 'dps', amount: 200000 },
          { kind: 'lifeInsurance', amount: 100000, sumAssured: 500000 },
        ]
      }),
      rules,
    )
    expect(r.rebate.eligibleInvestment).toBe(170000) // 1,20,000 + 50,000
    expect(r.rebate.amount).toBe(17000)
  })
})

describe('wealth surcharge', () => {
  it('is 10% of tax for net wealth between ৳4 and ৳10 crore', () => {
    const r = calculate(
      inputs((i) => {
        i.business.netProfit = 2600000
        i.wealth = { netWealth: 50000000, cars: 1, housePropertySqft: 0 }
      }),
      rules,
    )
    expect(r.surcharge).toEqual({ rate: 0.1, amount: 44000 })
    expect(r.totalPayable).toBe(484000)
  })

  it('is 10% below ৳4 crore when the taxpayer owns more than one car', () => {
    const r = calculate(
      inputs((i) => {
        i.business.netProfit = 2600000
        i.wealth = { netWealth: 30000000, cars: 2, housePropertySqft: 0 }
      }),
      rules,
    )
    expect(r.surcharge.rate).toBe(0.1)
  })
})

describe('filing windows', () => {
  it('has no adjustment between October and December', () => {
    const r = calculate(inputs((i) => (i.business.netProfit = 900000)), rules)
    expect(r.filingAdjustment).toEqual({ kind: 'none', amount: 0 })
  })

  it('caps the early-filing rebate at ৳25,000', () => {
    const r = calculate(inputs((i) => (i.business.netProfit = 5000000), '2026-09-01'), rules)
    expect(r.filingAdjustment.amount).toBe(-25000)
  })
})
