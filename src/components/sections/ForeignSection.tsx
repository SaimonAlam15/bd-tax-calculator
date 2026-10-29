import type { TaxInputs } from '../../engine'
import { t } from '../../i18n'
import { formatTaka } from '../../lib/format'
import type { Update } from '../../state/useTaxInputs'
import { AmountField, Grid, Section } from '../ui'

export function ForeignSection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const f = inputs.foreign
  const total = f.taxable + f.exempt
  return (
    <Section title={t('foreign.title')} summary={total ? formatTaka(total) : undefined}>
      <Grid>
        <AmountField
          label={t('foreign.taxable')}
          hint={t('foreign.taxableHint')}
          value={f.taxable}
          onChange={(v) => update((d) => (d.foreign.taxable = v))}
        />
        <AmountField
          label={t('foreign.exempt')}
          hint={t('foreign.exemptHint')}
          value={f.exempt}
          onChange={(v) => update((d) => (d.foreign.exempt = v))}
        />
      </Grid>
    </Section>
  )
}
