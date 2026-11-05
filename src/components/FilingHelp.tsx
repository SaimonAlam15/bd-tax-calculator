import { useState, type ReactNode } from 'react'
import { currentRules as rules, type TaxInputs, type TaxResult } from '../engine'
import {
  CALL_CENTRE,
  deadlineStatus,
  documentChecklist,
  E_RETURN_URL,
  GUIDE_CHECKED,
  mayFileOnPaper,
  taxAndPayment,
  type PortalLine,
} from '../filing/guide'
import { formatDate, t, type MessageKey } from '../i18n'
import { formatTaka, todayIso } from '../lib/format'
import { loadTicks, saveTicks } from '../state/storage'
import { Section } from './ui'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // In-app browsers (Facebook, Messenger) often block the Clipboard API; the old way still works there.
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

/** One-tap copy of a figure as plain digits (no commas or ৳), so it pastes cleanly into the e-return. */
function CopyButton({ value, label }: { value: number; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={t('filing.copyLabel', { label })}
      onClick={async () => {
        if (!(await copyText(String(value)))) return // the figure is still on screen to type
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="shrink-0 rounded-md border border-stone-300 px-2 py-0.5 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
    >
      {copied ? t('filing.copied') : t('filing.copy')}
    </button>
  )
}

/** A figure to type into the portal, with a copy button. */
function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm tabular-nums">{formatTaka(value)}</span>
        <CopyButton value={value} label={label} />
      </span>
    </div>
  )
}

/** A figure the portal works out itself, shown for checking. */
function CheckLine({ line }: { line: PortalLine }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 text-sm ${line.strong ? 'font-semibold' : ''}`}>
      <span>{line.label}</span>
      <span className="tabular-nums">{formatTaka(line.value)}</span>
    </div>
  )
}

/** One e-return tab. Titles are the portal's own tab names, so they are not translated. */
function Screen(props: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border border-stone-200 p-3 sm:p-4 dark:border-stone-700">
      <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">{props.title}</h4>
      <div className="space-y-2 text-sm text-stone-700 dark:text-stone-300">{props.children}</div>
    </section>
  )
}

function Figures(props: { children: ReactNode }) {
  return <div className="divide-y divide-stone-100 dark:divide-stone-800">{props.children}</div>
}

function Muted(props: { children: ReactNode }) {
  return <p className="text-xs text-stone-500 dark:text-stone-400">{props.children}</p>
}

const ExternalLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="font-medium text-emerald-800 underline underline-offset-2 dark:text-emerald-400">
    {children}
  </a>
)

/** Days to the return deadline and what filing today would do (SPEC §3.1 item 6). */
export function DeadlineBanner({ inputs }: { inputs: TaxInputs }) {
  const today = todayIso()
  const { daysLeft, today: effect } = deadlineStatus(inputs, rules, today)
  if (effect.kind === 'outsideWindows') return null
  const deadline = formatDate(rules.returnDeadline)
  const noExtraUntil = rules.filingWindows.find((w) => w.kind === 'none')!.to
  const parts = [
    daysLeft > 0
      ? t('filing.deadline.left', { days: daysLeft, date: deadline })
      : daysLeft === 0
        ? t('filing.deadline.today', { date: deadline })
        : t('filing.deadline.passed', { date: deadline }),
    effect.kind === 'rebate' && effect.amount < 0
      ? t('filing.deadline.rebate', { amount: formatTaka(-effect.amount) })
      : effect.kind === 'none'
        ? t('filing.deadline.none', { date: formatDate(noExtraUntil) })
        : effect.kind === 'extra'
          ? t('filing.deadline.extra', { amount: formatTaka(effect.amount) })
          : '',
  ]
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
      <p>
        {parts.filter(Boolean).join(' ')} <a href="#file-online" className="font-medium underline underline-offset-2">{t('filing.title')}</a>
      </p>
      <p className="mt-0.5 text-xs opacity-80">{t('filing.deadline.extended')}</p>
    </div>
  )
}

function Checklist({ inputs, ticks, onTicksChange }: Pick<FilingHelpProps, 'inputs' | 'ticks' | 'onTicksChange'>) {
  const docs = documentChecklist(inputs)
  const done = docs.filter((id) => ticks.includes(id)).length
  return (
    <Section title={t('filing.docs.title')} summary={t('filing.docs.progress', { done, total: docs.length })} intro={t('filing.docs.intro')}>
      <ul className="space-y-3">
        {docs.map((id) => (
          <li key={id} className="flex gap-3">
            <input
              id={`doc-${id}`}
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 rounded accent-emerald-700"
              checked={ticks.includes(id)}
              onChange={(e) => onTicksChange(e.target.checked ? [...ticks, id] : ticks.filter((x) => x !== id))}
            />
            <div>
              <label htmlFor={`doc-${id}`} className="text-sm font-medium">
                {t(`filing.doc.${id}`)}
              </label>
              <Muted>{t(`filing.doc.${id}.where`)}</Muted>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function PortalGuide({ inputs, result }: { inputs: TaxInputs; result: TaxResult }) {
  const inc = result.income
  const salaryGross = inc.employment.gross
  const heads: string[] = [
    salaryGross > 0 && 'Income from Employment',
    inputs.rent.length > 0 && 'Income from Rent',
    inputs.business.netProfit > 0 && 'Income from Business or Profession',
    inputs.financialAssets.some((f) => f.gross > 0) && 'Income from Financial Assets',
  ].filter((h): h is string => !!h)
  const tab = taxAndPayment(result)
  const cars = inputs.wealth?.cars ?? 0

  return (
    <Section title={t('filing.portal.title')} intro={t('filing.portal.intro')}>
      <Screen title="Assessment">
        <p>{t('filing.portal.resident')}</p>
        {heads.length > 0 ? (
          <>
            <p>{t('filing.portal.taxableYes')}</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {heads.map((h) => (
                <li key={h}>“{h}”</li>
              ))}
            </ul>
          </>
        ) : (
          <p>{t('filing.portal.taxableNo')}</p>
        )}
        {inputs.foreign.exempt > 0 && <p>{t('filing.portal.abroad')}</p>}
        <p>{inputs.foreign.exempt > 0 ? t('filing.portal.exemptYes') : t('filing.portal.exemptNo')}</p>
      </Screen>

      <Screen title="IT10B Requirements">
        <p>{t('filing.portal.it10bText')}</p>
        {cars > 0 && <p>{t('filing.portal.it10bCar', { n: cars })}</p>}
      </Screen>

      <Screen title="Income">
        {heads.length > 0 && <Muted>{t('filing.portal.incomeIntro')}</Muted>}
        <Figures>
          {salaryGross > 0 && (
            <>
              <Figure label={t('filing.portal.salaryTotal')} value={salaryGross} />
              <Figure label={t('filing.portal.salaryTds')} value={inputs.salary.tds} />
            </>
          )}
          {inputs.rent.map((p, i) => (
            <div key={i}>
              <Figure label={t('filing.portal.rentReceived', { n: i + 1 })} value={p.annualValue} />
              <Figure label={t('filing.portal.rentTds', { n: i + 1 })} value={p.tds} />
            </div>
          ))}
          {inputs.business.netProfit > 0 && (
            <>
              <Figure label={t('filing.portal.businessProfit')} value={inputs.business.netProfit} />
              <Figure label={t('filing.portal.businessTds')} value={inputs.business.tds} />
            </>
          )}
          {inputs.financialAssets
            .filter((f) => f.gross > 0)
            .map((f, i) => {
              const kind = t(`assets.kind.${f.kind}` as MessageKey)
              return (
                <div key={i}>
                  <Figure label={t('filing.portal.assetGross', { kind })} value={f.gross} />
                  <Figure label={t('filing.portal.assetTds', { kind })} value={f.tds} />
                </div>
              )
            })}
        </Figures>
        {inputs.foreign.exempt > 0 && (
          <>
            <p className="pt-2">{t('filing.portal.remittance')}</p>
            <Figures>
              <Figure label={t('filing.portal.remitted')} value={inputs.foreign.exempt} />
            </Figures>
            <p>{t('filing.portal.remitMode')}</p>
          </>
        )}
      </Screen>

      <Screen title="Expenditure (IT10BB)">
        <p>{t('filing.portal.expenditureText')}</p>
      </Screen>

      <Screen title="Assets & Liabilities (IT10B)">
        <p>{t('filing.portal.assetsImport')}</p>
        <p>{t('filing.portal.assetsRule')}</p>
        <Figures>
          <CheckLine line={{ label: t('filing.portal.assetsIncome'), value: inc.total }} />
          <CheckLine line={{ label: t('filing.portal.assetsExempt'), value: result.exemptIncome }} />
          {inputs.wealth && inputs.wealth.netWealth > 0 && (
            <Figure label={t('filing.portal.assetsNetWealth')} value={inputs.wealth.netWealth} />
          )}
        </Figures>
        <Muted>{t('filing.portal.assetsPrevious')}</Muted>
      </Screen>

      <Screen title="Tax & Payment">
        <p>{t('filing.portal.taxIntro')}</p>
        <h5 className="pt-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('filing.portal.taxIncome')}</h5>
        <Figures>
          {tab.income.map((l) => (
            <CheckLine key={l.label} line={l} />
          ))}
        </Figures>
        <h5 className="pt-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('filing.portal.taxComputation')}</h5>
        <Figures>
          {tab.computation.map((l) => (
            <CheckLine key={l.label} line={l} />
          ))}
        </Figures>
        <p className="pt-1">{t('filing.portal.payments')}</p>
        <Figures>
          {tab.payment.map((l) =>
            l.strong ? <CheckLine key={l.label} line={l} /> : <Figure key={l.label} label={l.label} value={l.value} />,
          )}
        </Figures>
        <h5 className="pt-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('filing.portal.final')}</h5>
        <Figures>
          {tab.final.map((l) => (
            <CheckLine key={l.label} line={l} />
          ))}
        </Figures>
        {tab.lateFilingExtra > 0 && <Muted>{t('filing.portal.lateExtra', { amount: formatTaka(tab.lateFilingExtra) })}</Muted>}
      </Screen>
    </Section>
  )
}

interface FilingHelpProps {
  inputs: TaxInputs
  result: TaxResult
  ticks: string[]
  onTicksChange: (ticks: string[]) => void
}

/** Step-by-step help for filing on NBR's e-return site (SPEC §3.1). */
export function FilingHelp({ inputs, result, ticks, onTicksChange }: FilingHelpProps) {
  const paper = mayFileOnPaper(inputs)
  const balance = result.balance

  return (
    <section id="file-online" className="mx-auto max-w-6xl scroll-mt-4 space-y-3 px-4 pb-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">{t('filing.title')}</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {t('filing.intro')} {t('filing.checked', { date: formatDate(GUIDE_CHECKED) })}
        </p>
      </div>

      <Section title={t('filing.online.title')} summary={paper ? t('filing.online.optional') : t('filing.online.yes')}>
        <p className="text-sm">{paper ? t('filing.online.paper') : t('filing.online.must')}</p>
        <Muted>{t('filing.online.exceptions')}</Muted>
      </Section>

      <Section title={t('filing.register.title')}>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>
            <ExternalLink href={E_RETURN_URL}>{t('filing.register.step1', { site: 'etaxnbr.gov.bd' })}</ExternalLink>
          </li>
          <li>{t('filing.register.step2')}</li>
          <li>{t('filing.register.step3')}</li>
          <li>{t('filing.register.step4')}</li>
        </ol>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">{t('filing.register.problems')}</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700 dark:text-stone-300">
            <li>{t('filing.register.problem1')}</li>
            <li>{t('filing.register.problem2')}</li>
            <li>{t('filing.register.problem3')}</li>
          </ul>
          <p className="text-sm">
            <ExternalLink href={`tel:${CALL_CENTRE}`}>{t('filing.register.help', { phone: CALL_CENTRE })}</ExternalLink>
          </p>
        </div>
      </Section>

      <Checklist inputs={inputs} ticks={ticks} onTicksChange={onTicksChange} />

      <PortalGuide inputs={inputs} result={result} />

      <Section title={t('filing.pay.title')}>
        <p className="text-sm">
          {balance > 0
            ? t('filing.pay.owe', { amount: formatTaka(balance) })
            : balance < 0
              ? t('filing.pay.refund', { amount: formatTaka(-balance) })
              : t('filing.pay.nothing')}
        </p>
        {balance < 0 && <p className="text-sm">{t('filing.pay.nothing')}</p>}
        <p className="text-sm">{t('filing.pay.submit')}</p>
      </Section>

      <Section title={t('filing.after.title')}>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{t('filing.after.slip')}</li>
          <li>{t('filing.after.xlsx')}</li>
          <li>{t('filing.after.keep')}</li>
        </ul>
      </Section>
    </section>
  )
}

export function useChecklistTicks() {
  const [ticks, setTicks] = useState<string[]>(() => loadTicks())
  const update = (next: string[]) => {
    setTicks(next)
    saveTicks(next)
  }
  return { ticks, setTicks: update, clear: () => setTicks([]) }
}
