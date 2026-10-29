import type { ReactNode } from 'react'
import { currentRules as rules, type TaxResult } from '../engine'
import { t } from '../i18n'
import { formatPercent, formatTaka } from '../lib/format'

export const E_RETURN_URL = 'https://etaxnbr.gov.bd'

function Row(props: { label: ReactNode; value: number; line?: number; strong?: boolean; muted?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-1.5 ${props.strong ? 'font-semibold' : ''} ${
        props.muted ? 'text-stone-500 dark:text-stone-400' : ''
      }`}
    >
      <span className="text-sm">
        {props.label}
        {props.line !== undefined && (
          <span className="ml-1.5 text-xs font-normal text-stone-400">{t('results.line', { n: props.line })}</span>
        )}
      </span>
      <span className="text-sm tabular-nums">{formatTaka(props.value)}</span>
    </div>
  )
}

function Group(props: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">{props.title}</h3>
      <div className="divide-y divide-stone-100 dark:divide-stone-800">{props.children}</div>
    </section>
  )
}

export function Headline({ result }: { result: TaxResult }) {
  const b = result.balance
  const label = b > 0 ? t('results.toPay') : b < 0 ? t('results.refund') : t('results.nothing')
  return (
    <div>
      <p className="text-sm text-stone-600 dark:text-stone-400">{label}</p>
      <p
        className={`text-3xl font-bold tabular-nums ${
          b < 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-900 dark:text-stone-50'
        }`}
      >
        {formatTaka(Math.abs(b))}
      </p>
    </div>
  )
}

function slabLabel(index: number, result: TaxResult): string {
  const s = result.slabs[index]
  if (index === 0) return `${t('results.slabFirst', { amount: formatTaka(s.to!) })} · ${t('results.taxFree')}`
  if (s.to === null) return `${t('results.slabRest')} @ ${formatPercent(s.rate)}`
  return `${t('results.slabNext', { amount: formatTaka(s.to - s.from) })} @ ${formatPercent(s.rate)}`
}

function rebateExplanation(result: TaxResult): string {
  const r = result.rebate
  switch (r.limitApplied) {
    case 'income':
      return t('results.rebate.income', { rate: formatPercent(rules.rebate.incomeRate) })
    case 'investment':
      return t('results.rebate.investment', {
        rate: formatPercent(rules.rebate.investmentRate),
        amount: formatTaka(r.eligibleInvestment),
      })
    case 'cap':
      return t('results.rebate.cap', { amount: formatTaka(r.cap) })
  }
}

export function Breakdown({ result }: { result: TaxResult }) {
  const inc = result.income
  const belowThreshold = inc.total <= result.threshold
  const filing = result.filingAdjustment

  return (
    <div className="space-y-6">
      <Group title={t('results.incomeHeading')}>
        <Row label={t('results.line.employment')} line={1} value={inc.employment.taxable} />
        <Row label={t('results.line.rent')} line={2} value={inc.rent.net} />
        <Row label={t('results.line.business')} line={4} value={inc.business} />
        <Row label={t('results.line.financialAssets')} line={6} value={inc.financialAssets} />
        <Row label={t('results.line.foreign')} line={10} value={inc.foreignTaxable} />
        <Row label={t('results.line.total')} line={11} value={inc.total} strong />
        {result.exemptIncome > 0 && <Row label={t('results.exempt')} value={result.exemptIncome} muted />}
      </Group>

      <Group title={t('results.taxHeading')}>
        {belowThreshold ? (
          <p className="py-1.5 text-sm text-stone-600 dark:text-stone-400">
            {t('results.belowThreshold', { amount: formatTaka(result.threshold) })}
          </p>
        ) : (
          result.slabs.map((s, i) =>
            s.taxedAmount > 0 ? <Row key={i} label={slabLabel(i, result)} value={s.tax} muted /> : null,
          )
        )}
        <Row label={t('results.grossTax')} line={12} value={result.grossTax} strong />
        {result.rebate.amount > 0 && (
          <Row
            label={
              <>
                {t('results.rebate')}
                <span className="block text-xs text-stone-500 dark:text-stone-400">{rebateExplanation(result)}</span>
              </>
            }
            line={13}
            value={-result.rebate.amount}
          />
        )}
        <Row label={t('results.netTax')} line={14} value={result.netTaxAfterRebate} />
        {result.minimumTax > 0 && (
          <Row
            label={
              <>
                {t('results.minimumTax')}
                {result.minimumTax > result.netTaxAfterRebate && (
                  <span className="block text-xs text-stone-500 dark:text-stone-400">{t('results.minimumApplies')}</span>
                )}
              </>
            }
            line={15}
            value={result.minimumTax}
          />
        )}
        <Row label={t('results.taxPayable')} line={16} value={result.taxPayable} strong />
        {result.surcharge.amount > 0 && (
          <Row
            label={t('results.surcharge', { rate: formatPercent(result.surcharge.rate) })}
            line={17}
            value={result.surcharge.amount}
          />
        )}
        <Row label={t('results.totalPayable')} line={19} value={result.totalPayable} strong />
      </Group>

      <Group title={t('results.paidHeading')}>
        <Row label={t('results.tds')} line={20} value={result.taxPaid.tds} />
        <Row label={t('results.advanceTax')} line={21} value={result.taxPaid.advanceTax} />
        {result.taxPaid.refundAdjustment > 0 && (
          <Row label={t('results.refundAdjustment')} line={22} value={result.taxPaid.refundAdjustment} />
        )}
        <Row label={t('results.totalPaid')} line={24} value={result.taxPaid.total} strong />
      </Group>

      {filing.amount !== 0 ? (
        <Row
          label={filing.amount < 0 ? t('results.filingRebate') : t('results.filingExtra')}
          value={filing.amount}
        />
      ) : (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {filing.kind === 'outsideWindows' ? t('results.filingOutside') : filing.kind === 'none' && t('results.filingNone')}
        </p>
      )}
    </div>
  )
}

export function FileOnlineLink({ className = '' }: { className?: string }) {
  return (
    <a
      href={E_RETURN_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 ${className}`}
    >
      {t('app.fileOnline')}
      <svg aria-hidden viewBox="0 0 20 20" className="size-4">
        <path
          fill="currentColor"
          d="M11 3a1 1 0 1 0 0 2h2.6l-6.3 6.3a1 1 0 1 0 1.4 1.4L15 6.4V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5ZM5 5a2 2 0 0 0-2 2v8c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5Z"
        />
      </svg>
    </a>
  )
}

/** Full results card used in the desktop sidebar and the mobile sheet. */
export function ResultsPanel({ result }: { result: TaxResult }) {
  return (
    <div className="space-y-6">
      <Headline result={result} />
      <Breakdown result={result} />
      <div className="space-y-3 border-t border-stone-100 pt-4 dark:border-stone-800">
        <p className="text-xs text-stone-500 dark:text-stone-400">{t('results.disclaimer')}</p>
        <FileOnlineLink className="w-full" />
      </div>
    </div>
  )
}
