import type { TaxInputs } from '../../engine'
import { t } from '../../i18n'
import { formatTaka } from '../../lib/format'
import type { Update } from '../../state/useTaxInputs'
import { AmountField, Grid, Section } from '../ui'

export function TaxPaidSection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const p = inputs.taxPaid
  const total = p.advanceTax + p.otherTds + p.refundAdjustment
  return (
    <Section title={t('paid.title')} intro={t('paid.intro')} summary={total ? formatTaka(total) : undefined}>
      <Grid>
        <AmountField
          label={t('paid.advanceTax')}
          hint={t('paid.advanceTaxHint')}
          value={p.advanceTax}
          onChange={(v) => update((d) => (d.taxPaid.advanceTax = v))}
        />
        <AmountField
          label={t('paid.otherTds')}
          value={p.otherTds}
          onChange={(v) => update((d) => (d.taxPaid.otherTds = v))}
        />
        <AmountField
          label={t('paid.refundAdjustment')}
          value={p.refundAdjustment}
          onChange={(v) => update((d) => (d.taxPaid.refundAdjustment = v))}
        />
      </Grid>
    </Section>
  )
}
