import { currentRules as rules, taxFreeThreshold, type TaxInputs } from '../../engine'
import { t } from '../../i18n'
import { formatTaka } from '../../lib/format'
import type { Update } from '../../state/useTaxInputs'
import { Checkbox, Computed, CountField, DateField, Section } from '../ui'

export function ProfileSection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const p = inputs.profile
  const firstWindow = rules.filingWindows[0]
  const lastWindow = rules.filingWindows[rules.filingWindows.length - 1]
  return (
    <Section title={t('profile.title')} intro={t('profile.intro')} defaultOpen>
      <div className="space-y-3">
        <Checkbox label={t('profile.female')} checked={p.female} onChange={(v) => update((d) => (d.profile.female = v))} />
        <Checkbox
          label={t('profile.aged65')}
          checked={p.aged65OrMore}
          onChange={(v) => update((d) => (d.profile.aged65OrMore = v))}
        />
        <Checkbox
          label={t('profile.disability')}
          checked={p.disability}
          onChange={(v) => update((d) => (d.profile.disability = v))}
        />
        <Checkbox
          label={t('profile.thirdGender')}
          checked={p.thirdGender}
          onChange={(v) => update((d) => (d.profile.thirdGender = v))}
        />
        <Checkbox
          label={t('profile.warWounded')}
          checked={p.warWoundedFighter}
          onChange={(v) => update((d) => (d.profile.warWoundedFighter = v))}
        />
        <Checkbox
          label={t('profile.newTaxpayer')}
          hint={t('profile.newTaxpayerHint', {
            newAmount: formatTaka(rules.minimumTax.newTaxpayer),
            amount: formatTaka(rules.minimumTax.standard),
          })}
          checked={p.newTaxpayer}
          onChange={(v) => update((d) => (d.profile.newTaxpayer = v))}
        />
      </div>
      <CountField
        label={t('profile.disabledChildren')}
        hint={t('profile.disabledChildrenHint', { amount: formatTaka(rules.thresholds.perDisabledChild) })}
        value={p.disabledChildren}
        onChange={(v) => update((d) => (d.profile.disabledChildren = v))}
      />
      <DateField
        label={t('profile.filingDate')}
        hint={t('profile.filingDateHint')}
        value={p.filingDate}
        min={firstWindow.from}
        max={lastWindow.to}
        onChange={(v) => update((d) => (d.profile.filingDate = v))}
      />
      <Computed>{t('profile.threshold', { amount: formatTaka(taxFreeThreshold(p, rules)) })}</Computed>
    </Section>
  )
}
