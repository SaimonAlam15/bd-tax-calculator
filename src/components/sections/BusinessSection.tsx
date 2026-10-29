import type { TaxInputs } from '../../engine'
import { t } from '../../i18n'
import { formatTaka } from '../../lib/format'
import type { Update } from '../../state/useTaxInputs'
import { AmountField, Grid, Note, Section } from '../ui'

export function BusinessSection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const b = inputs.business
  return (
    <Section
      title={t('business.title')}
      intro={t('business.intro')}
      summary={b.netProfit ? formatTaka(b.netProfit) : undefined}
    >
      <Grid>
        <AmountField
          label={t('business.netProfit')}
          value={b.netProfit}
          onChange={(v) => update((d) => (d.business.netProfit = v))}
        />
        <AmountField label={t('business.tds')} value={b.tds} onChange={(v) => update((d) => (d.business.tds = v))} />
      </Grid>
      <Note>{t('business.turnoverNote')}</Note>
    </Section>
  )
}
