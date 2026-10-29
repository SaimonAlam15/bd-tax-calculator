import { useId, useState, type ReactNode } from 'react'
import { localiseDigits, toAsciiDigits } from '../i18n/settings'
import { formatNumber, parseAmount } from '../lib/format'

export function Section(props: {
  title: string
  summary?: string
  intro?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details
      open={props.defaultOpen}
      className="group rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 select-none sm:px-5">
        <span className="flex-1 font-semibold">{props.title}</span>
        {props.summary && (
          <span className="text-sm tabular-nums text-stone-500 dark:text-stone-400">{props.summary}</span>
        )}
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="size-5 shrink-0 text-stone-400 transition-transform group-open:rotate-180"
        >
          <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </summary>
      <div className="space-y-4 border-t border-stone-100 px-4 pt-4 pb-5 sm:px-5 dark:border-stone-800">
        {props.intro && <p className="text-sm text-stone-600 dark:text-stone-400">{props.intro}</p>}
        {props.children}
      </div>
    </details>
  )
}

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base tabular-nums shadow-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-stone-700 dark:bg-stone-950'

function FieldShell(props: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={props.id} className="block text-sm font-medium">
        {props.label}
      </label>
      {props.children}
      {props.hint && <p className="text-xs text-stone-500 dark:text-stone-400">{props.hint}</p>}
    </div>
  )
}

/** Taka amount input. Shows lakh grouping when not being edited. */
export function AmountField(props: {
  label: string
  hint?: string
  value: number
  onChange: (value: number) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft !== null ? localiseDigits(draft) : props.value ? formatNumber(props.value) : ''
  return (
    <FieldShell id={id} label={props.label} hint={props.hint}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">৳</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={localiseDigits('0')}
          className={`${inputClass} pl-7`}
          value={shown}
          onFocus={(e) => {
            setDraft(props.value ? String(props.value) : '')
            // Select the whole amount so typing replaces it rather than appending.
            const input = e.currentTarget
            requestAnimationFrame(() => input.select())
          }}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            // 12 digits is up to ৳99,999 crore, more than any personal return needs.
            const digits = toAsciiDigits(e.target.value).replace(/\D/g, '').slice(0, 12)
            setDraft(digits)
            props.onChange(parseAmount(digits))
          }}
        />
      </div>
    </FieldShell>
  )
}

export function CountField(props: { label: string; hint?: string; value: number; onChange: (value: number) => void }) {
  const id = useId()
  return (
    <FieldShell id={id} label={props.label} hint={props.hint}>
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        className={`${inputClass} max-w-32`}
        value={props.value || ''}
        placeholder={localiseDigits('0')}
        onChange={(e) => props.onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
      />
    </FieldShell>
  )
}

export function DateField(props: {
  label: string
  hint?: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={props.label} hint={props.hint}>
      <input
        id={id}
        type="date"
        className={`${inputClass} max-w-48`}
        value={props.value}
        min={props.min}
        max={props.max}
        onChange={(e) => e.target.value && props.onChange(e.target.value)}
      />
    </FieldShell>
  )
}

export function SelectField<T extends string>(props: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={props.label}>
      <select
        id={id}
        className={inputClass}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function Checkbox(props: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 rounded accent-emerald-700"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <div>
        <label htmlFor={id} className="text-sm">
          {props.label}
        </label>
        {props.hint && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{props.hint}</p>}
      </div>
    </div>
  )
}

export function Segmented<T extends string>(props: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={props.value === o.value}
          onClick={() => props.onChange(o.value)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 aria-checked:bg-white aria-checked:text-stone-900 aria-checked:shadow-sm dark:text-stone-300 dark:aria-checked:bg-stone-950 dark:aria-checked:text-stone-100"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A bordered group for one item in a repeatable list, with a remove button. */
export function ItemCard(props: { title: string; removeLabel: string; onRemove: () => void; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-lg border border-stone-200 p-3 sm:p-4 dark:border-stone-700">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">{props.title}</span>
        <button
          type="button"
          onClick={props.onRemove}
          className="rounded-md px-2 py-1 text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        >
          {props.removeLabel}
        </button>
      </div>
      {props.children}
    </div>
  )
}

export function AddButton(props: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="w-full rounded-lg border border-dashed border-stone-300 px-3 py-2.5 text-sm font-medium text-emerald-800 hover:border-emerald-600 hover:bg-emerald-50 dark:border-stone-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
    >
      + {props.label}
    </button>
  )
}

export function Note(props: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      {props.children}
    </p>
  )
}

export function Computed(props: { children: ReactNode }) {
  return <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">{props.children}</p>
}

export function Grid(props: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{props.children}</div>
}
