import { currentRules as rules, rentIncome, type RentProperty, type TaxInputs } from '../../engine'
import { t, type MessageKey } from '../../i18n'
import { formatTaka } from '../../lib/format'
import type { Update } from '../../state/useTaxInputs'
import { AddButton, AmountField, Computed, Grid, ItemCard, Section, SelectField } from '../ui'

function newProperty(): RentProperty {
  return {
    kind: 'residential',
    annualValue: 0,
    tenantPaidCharges: 0,
    vacancyAllowance: 0,
    securityDepositBalance: 0,
    nonRefundablePremium: 0,
    municipalTax: 0,
    landRevenue: 0,
    loanInterest: 0,
    insurancePremium: 0,
    tds: 0,
  }
}

type AmountKey = Exclude<keyof RentProperty, 'kind'>

const DETAIL_FIELDS: { key: AmountKey; label: MessageKey; hint?: MessageKey }[] = [
  { key: 'securityDepositBalance', label: 'rent.securityDeposit', hint: 'rent.securityDepositHint' },
  { key: 'nonRefundablePremium', label: 'rent.premium' },
  { key: 'municipalTax', label: 'rent.municipalTax' },
  { key: 'landRevenue', label: 'rent.landRevenue' },
  { key: 'loanInterest', label: 'rent.loanInterest' },
  { key: 'insurancePremium', label: 'rent.insurance' },
  { key: 'tds', label: 'rent.tds' },
]

export function RentSection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const parts = inputs.rent.map((p) => rentIncome(p, rules))
  const totalNet = parts.reduce((a, p) => a + p.net, 0)
  const set = (i: number, key: AmountKey, v: number) => update((d) => (d.rent[i][key] = v))

  return (
    <Section
      title={t('rent.title')}
      intro={t('rent.intro')}
      summary={inputs.rent.length ? formatTaka(totalNet) : undefined}
    >
      {inputs.rent.map((p, i) => (
        <ItemCard
          key={i}
          title={t('rent.property', { n: i + 1 })}
          removeLabel={t('common.remove')}
          onRemove={() => update((d) => d.rent.splice(i, 1))}
        >
          <SelectField
            label={t('rent.kind')}
            value={p.kind}
            onChange={(v) => update((d) => (d.rent[i].kind = v))}
            options={[
              { value: 'residential', label: t('rent.residential') },
              { value: 'commercial', label: t('rent.commercial') },
            ]}
          />
          <Grid>
            <AmountField
              label={t('rent.annualValue')}
              hint={t('rent.annualValueHint')}
              value={p.annualValue}
              onChange={(v) => set(i, 'annualValue', v)}
            />
            <AmountField
              label={t('rent.tenantPaidCharges')}
              value={p.tenantPaidCharges}
              onChange={(v) => set(i, 'tenantPaidCharges', v)}
            />
            <AmountField
              label={t('rent.vacancyAllowance')}
              hint={t('rent.vacancyAllowanceHint')}
              value={p.vacancyAllowance}
              onChange={(v) => set(i, 'vacancyAllowance', v)}
            />
          </Grid>
          <details className="group/more">
            <summary className="cursor-pointer text-sm font-medium text-emerald-800 dark:text-emerald-400">
              {t('rent.moreDetails')}
            </summary>
            <div className="mt-4">
              <Grid>
                {DETAIL_FIELDS.map((f) => (
                  <AmountField
                    key={f.key}
                    label={t(f.label)}
                    hint={f.hint && t(f.hint)}
                    value={p[f.key]}
                    onChange={(v) => set(i, f.key, v)}
                  />
                ))}
              </Grid>
            </div>
          </details>
          <Computed>{t('rent.net', { amount: formatTaka(parts[i].net) })}</Computed>
        </ItemCard>
      ))}
      <AddButton label={t('rent.add')} onClick={() => update((d) => d.rent.push(newProperty()))} />
    </Section>
  )
}
