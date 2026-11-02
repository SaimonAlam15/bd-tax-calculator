import type { TaxInputs } from '../../engine'
import { t } from '../../i18n'
import { formatTaka } from '../../lib/format'
import type { Update } from '../../state/useTaxInputs'
import { AmountField, Grid, Section } from '../ui'

export function ForeignSection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const f = inputs.foreign
  return (
    <Section title={t('foreign.title')} intro={t('foreign.intro')} summary={f.exempt ? formatTaka(f.exempt) : undefined}>
      <Grid>
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
