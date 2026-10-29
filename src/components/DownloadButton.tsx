import { useState } from 'react'
import { currentRules as rules, type TaxInputs, type TaxResult } from '../engine'
import { t } from '../i18n'
import { track } from '../lib/analytics'

export function DownloadButton(props: { inputs: TaxInputs; result: TaxResult }) {
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle')

  async function download() {
    setState('busy')
    try {
      // Loaded on demand: ExcelJS is several times the size of the rest of the app.
      const { downloadXlsx } = await import('../export/xlsx')
      await downloadXlsx(props.inputs, props.result, rules)
      track('xlsx-downloaded')
      setState('idle')
    } catch (error) {
      console.error(error)
      setState('failed')
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={download}
        disabled={state === 'busy'}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-4">
          <path
            fill="currentColor"
            d="M10 3a1 1 0 0 1 1 1v6.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.4L9 10.6V4a1 1 0 0 1 1-1ZM4 15a1 1 0 0 1 1 1h10a1 1 0 1 1 0 2H5a2 2 0 0 1-2-2 1 1 0 0 1 1-1Z"
          />
        </svg>
        {state === 'busy' ? t('xlsx.preparing') : t('xlsx.download')}
      </button>
      {state === 'failed' && (
        <p role="alert" className="text-xs text-red-700 dark:text-red-400">
          {t('xlsx.failed')}
        </p>
      )}
    </div>
  )
}
