import { currentRules as rules, type FinancialAssetKind, type TaxInputs } from '../../engine'
import { t } from '../../i18n'
import { formatPercent, formatTaka } from '../../lib/format'
import type { Update } from '../../state/useTaxInputs'
import { AddButton, AmountField, Grid, ItemCard, Note, Section, SelectField } from '../ui'

const KINDS: FinancialAssetKind[] = ['bank', 'fdr', 'sanchaypatra', 'dividend', 'securities']

function defaultTdsRate(kind: FinancialAssetKind): number {
  const r = rules.defaultTdsRates
  if (kind === 'sanchaypatra') return r.sanchaypatra
  if (kind === 'dividend') return r.dividend
  return r.bankInterest
}

export function FinancialAssetsSection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const items = inputs.financialAssets
  const total = items.reduce((a, f) => a + f.gross, 0)
  const hasSanchaypatra = items.some((f) => f.kind === 'sanchaypatra')

  return (
    <Section title={t('assets.title')} intro={t('assets.intro')} summary={total ? formatTaka(total) : undefined}>
      {items.map((item, i) => {
        const rate = defaultTdsRate(item.kind)
        const suggested = Math.round(item.gross * rate)
        return (
          <ItemCard
            key={i}
            title={t(`assets.kind.${item.kind}`)}
            removeLabel={t('common.remove')}
            onRemove={() => update((d) => d.financialAssets.splice(i, 1))}
          >
            <SelectField
              label={t('assets.kind')}
              value={item.kind}
              onChange={(v) => update((d) => (d.financialAssets[i].kind = v))}
              options={KINDS.map((k) => ({ value: k, label: t(`assets.kind.${k}`) }))}
            />
            <Grid>
              <AmountField
                label={t('assets.gross')}
                value={item.gross}
                onChange={(v) => update((d) => (d.financialAssets[i].gross = v))}
              />
              <div className="space-y-1.5">
                <AmountField
                  label={t('assets.tds')}
                  value={item.tds}
                  onChange={(v) => update((d) => (d.financialAssets[i].tds = v))}
                />
                {item.gross > 0 && item.tds !== suggested && (
                  <button
                    type="button"
                    className="text-xs font-medium text-emerald-800 underline underline-offset-2 dark:text-emerald-400"
                    onClick={() => update((d) => (d.financialAssets[i].tds = suggested))}
                  >
                    {t('assets.useDefault', { rate: formatPercent(rate) })} ({formatTaka(suggested)})
                  </button>
                )}
              </div>
            </Grid>
          </ItemCard>
        )
      })}
      {hasSanchaypatra && <Note>{t('assets.sanchaypatraNote')}</Note>}
      <AddButton
        label={t('assets.add')}
        onClick={() => update((d) => d.financialAssets.push({ kind: 'bank', gross: 0, tds: 0 }))}
      />
    </Section>
  )
}
