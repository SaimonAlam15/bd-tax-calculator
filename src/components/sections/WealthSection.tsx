import type { TaxInputs } from '../../engine'
import { t } from '../../i18n'
import type { Update } from '../../state/useTaxInputs'
import { AmountField, Checkbox, CountField, Grid, Section } from '../ui'

export function WealthSection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const w = inputs.wealth
  return (
    <Section title={t('wealth.title')} intro={t('wealth.intro')}>
      <Checkbox
        label={t('wealth.toggle')}
        checked={w !== null}
        onChange={(on) => update((d) => (d.wealth = on ? { netWealth: 0, cars: 0, housePropertySqft: 0 } : null))}
      />
      {w && (
        <Grid>
          <AmountField
            label={t('wealth.netWealth')}
            value={w.netWealth}
            onChange={(v) => update((d) => (d.wealth!.netWealth = v))}
          />
          <CountField label={t('wealth.cars')} value={w.cars} onChange={(v) => update((d) => (d.wealth!.cars = v))} />
          <CountField
            label={t('wealth.sqft')}
            value={w.housePropertySqft}
            onChange={(v) => update((d) => (d.wealth!.housePropertySqft = v))}
          />
        </Grid>
      )}
    </Section>
  )
}
