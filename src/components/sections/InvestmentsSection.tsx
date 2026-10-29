import { currentRules as rules, eligibleInvestment, type InvestmentKind, type TaxInputs } from '../../engine'
import { formatDate, t } from '../../i18n'
import { formatPercent, formatTaka } from '../../lib/format'
import type { Update } from '../../state/useTaxInputs'
import { AddButton, AmountField, Computed, Grid, ItemCard, Section, SelectField } from '../ui'

const KINDS: InvestmentKind[] = [
  'dps',
  'lifeInsurance',
  'sanchaypatra',
  'listedShares',
  'providentFund',
  'donation',
  'other',
]

export function InvestmentsSection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const items = inputs.investments
  const total = items.reduce((a, i) => a + i.amount, 0)

  return (
    <Section
      title={t('invest.title')}
      intro={t('invest.intro', { start: formatDate(rules.incomeYear.start), end: formatDate(rules.incomeYear.end) })}
      summary={total ? formatTaka(total) : undefined}
    >
      {items.map((item, i) => {
        const eligible = eligibleInvestment(item, rules)
        return (
          <ItemCard
            key={i}
            title={t(`invest.kind.${item.kind}`)}
            removeLabel={t('common.remove')}
            onRemove={() => update((d) => d.investments.splice(i, 1))}
          >
            <SelectField
              label={t('invest.kind')}
              value={item.kind}
              onChange={(v) => update((d) => (d.investments[i].kind = v))}
              options={KINDS.map((k) => ({ value: k, label: t(`invest.kind.${k}`) }))}
            />
            <Grid>
              <AmountField
                label={t('invest.amount')}
                value={item.amount}
                onChange={(v) => update((d) => (d.investments[i].amount = v))}
              />
              {item.kind === 'lifeInsurance' && (
                <AmountField
                  label={t('invest.sumAssured')}
                  hint={t('invest.sumAssuredHint', {
                    rate: formatPercent(rules.investmentCaps.lifeInsurancePremiumOfSumAssured),
                  })}
                  value={item.sumAssured ?? 0}
                  onChange={(v) => update((d) => (d.investments[i].sumAssured = v))}
                />
              )}
            </Grid>
            {eligible < item.amount && <Computed>{t('invest.capped', { amount: formatTaka(eligible) })}</Computed>}
          </ItemCard>
        )
      })}
      <AddButton
        label={t('invest.add')}
        onClick={() => update((d) => d.investments.push({ kind: 'dps', amount: 0 }))}
      />
    </Section>
  )
}
