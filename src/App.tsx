import { useEffect, useMemo, useState } from 'react'
import { BusinessSection } from './components/sections/BusinessSection'
import { FinancialAssetsSection } from './components/sections/FinancialAssetsSection'
import { ForeignSection } from './components/sections/ForeignSection'
import { InvestmentsSection } from './components/sections/InvestmentsSection'
import { ProfileSection } from './components/sections/ProfileSection'
import { RentSection } from './components/sections/RentSection'
import { SalarySection } from './components/sections/SalarySection'
import { TaxPaidSection } from './components/sections/TaxPaidSection'
import { WealthSection } from './components/sections/WealthSection'
import { LanguageSwitch } from './components/LanguageSwitch'
import { FileOnlineLink, Headline, ResultsPanel } from './components/Results'
import { calculate, currentRules as rules } from './engine'
import { formatDate, t } from './i18n'
import { useDisplaySettings } from './i18n/settings'
import { useTaxInputs } from './state/useTaxInputs'

export function App() {
  // Every string comes from t(), so re-rendering from the top switches the whole page.
  useDisplaySettings()
  const { inputs, update, reset } = useTaxInputs()
  const result = useMemo(() => calculate(inputs, rules), [inputs])
  const [sheetOpen, setSheetOpen] = useState(false)

  // Lock page scroll behind the mobile results sheet.
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : ''
  }, [sheetOpen])

  const sectionProps = { inputs, update }

  return (
    <div className="min-h-dvh pb-28 lg:pb-0">
      <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold sm:text-xl">{t('app.title')}</h1>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {t('app.yearLabel', {
                start: formatDate(rules.incomeYear.start),
                end: formatDate(rules.incomeYear.end),
                ay: rules.assessmentYear,
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitch />
            <FileOnlineLink />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">{t('app.privacy')}</p>
          <ProfileSection {...sectionProps} />
          <SalarySection {...sectionProps} />
          <RentSection {...sectionProps} />
          <BusinessSection {...sectionProps} />
          <FinancialAssetsSection {...sectionProps} />
          <ForeignSection {...sectionProps} />
          <InvestmentsSection {...sectionProps} />
          <TaxPaidSection {...sectionProps} />
          <WealthSection {...sectionProps} />
          <div className="flex justify-end pt-2">
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              onClick={() => window.confirm(t('app.resetConfirm')) && reset()}
            >
              {t('app.reset')}
            </button>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="sr-only">{t('results.title')}</h2>
            <ResultsPanel inputs={inputs} result={result} />
          </div>
        </aside>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-stone-500 sm:px-6 dark:text-stone-400">
        <p>
          {t('footer.rules', { version: rules.version, date: formatDate(rules.lastChecked) })}{' '}
          {rules.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {t('footer.source')}: {s.title}
            </a>
          ))}
        </p>
        <p className="mt-1">{t('results.disclaimer')}</p>
      </footer>

      {/* Mobile: sticky bar with the headline figure, opening a full-screen breakdown. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-stone-800 dark:bg-stone-900/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Headline result={result} />
          <button
            type="button"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium dark:border-stone-700"
          >
            {t('results.seeBreakdown')}
          </button>
        </div>
      </div>

      {sheetOpen && (
        <div role="dialog" aria-modal="true" aria-label={t('results.title')} className="fixed inset-0 z-20 overflow-y-auto bg-white lg:hidden dark:bg-stone-900">
          <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-semibold">{t('results.title')}</h2>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {t('results.close')}
            </button>
          </div>
          <div className="px-4 py-5">
            <ResultsPanel inputs={inputs} result={result} />
          </div>
        </div>
      )}
    </div>
  )
}
