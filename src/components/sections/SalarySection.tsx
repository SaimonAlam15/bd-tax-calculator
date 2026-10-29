import { useState } from 'react'
import { currentRules as rules, employmentIncome, type TaxInputs } from '../../engine'
import { formatDate, t, type MessageKey } from '../../i18n'
import { formatTaka } from '../../lib/format'
import type { Update } from '../../state/useTaxInputs'
import { AmountField, Computed, Grid, Section, Segmented } from '../ui'

const COMPONENTS: { key: string; label: MessageKey; hint?: MessageKey }[] = [
  { key: 'basic', label: 'salary.basic' },
  { key: 'houseRent', label: 'salary.houseRent' },
  { key: 'medical', label: 'salary.medical' },
  { key: 'conveyance', label: 'salary.conveyance' },
  { key: 'festivalBonus', label: 'salary.festivalBonus' },
  { key: 'otherAllowances', label: 'salary.otherAllowances', hint: 'salary.otherAllowancesHint' },
]

type Mode = 'itemised' | 'total'

export function SalarySection({ inputs, update }: { inputs: TaxInputs; update: Update }) {
  const [mode, setMode] = useState<Mode>('itemised')
  const salary = inputs.salary
  const employment = employmentIncome(salary.components, rules)

  function switchMode(next: Mode) {
    if (next === mode) return
    // Keep the total when switching; itemised mode puts it in basic salary for the user to split.
    update((d) => {
      const total = employmentIncome(d.salary.components, rules).gross
      d.salary.components = total ? (next === 'total' ? { gross: total } : { basic: total }) : {}
    })
    setMode(next)
  }

  return (
    <Section
      title={t('salary.title')}
      summary={employment.gross ? formatTaka(employment.gross) : undefined}
      intro={t('salary.intro', { start: formatDate(rules.incomeYear.start), end: formatDate(rules.incomeYear.end) })}
    >
      <Segmented
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'itemised', label: t('salary.modeItemised') },
          { value: 'total', label: t('salary.modeTotal') },
        ]}
      />
      <Grid>
        {mode === 'itemised' ? (
          COMPONENTS.map((c) => (
            <AmountField
              key={c.key}
              label={t(c.label)}
              hint={c.hint && t(c.hint)}
              value={salary.components[c.key] ?? 0}
              onChange={(v) => update((d) => (d.salary.components[c.key] = v))}
            />
          ))
        ) : (
          <AmountField
            label={t('salary.gross')}
            value={salary.components.gross ?? 0}
            onChange={(v) => update((d) => (d.salary.components = { gross: v }))}
          />
        )}
        <AmountField
          label={t('salary.tds')}
          hint={t('salary.tdsHint')}
          value={salary.tds}
          onChange={(v) => update((d) => (d.salary.tds = v))}
        />
      </Grid>
      {employment.gross > 0 && (
        <Computed>
          {t('salary.exemption', {
            amount: formatTaka(employment.exemption),
            cap: formatTaka(rules.salaryExemption.cap),
          })}
        </Computed>
      )}
    </Section>
  )
}
