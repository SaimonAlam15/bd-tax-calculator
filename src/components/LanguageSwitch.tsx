import { useEffect } from 'react'
import { t } from '../i18n'
import { setSettings, useDisplaySettings, type Language } from '../i18n/settings'
import { Segmented } from './ui'

// Each language is labelled in itself so people can find their own.
const options: { value: Language; label: string }[] = [
  { value: 'bn', label: 'বাংলা' },
  { value: 'en', label: 'English' },
]

export function LanguageSwitch() {
  const { language, banglaDigits } = useDisplaySettings()

  useEffect(() => {
    document.documentElement.lang = language
    document.title = t('app.title')
  }, [language])

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div role="group" aria-label={t('settings.language')}>
        <Segmented value={language} options={options} onChange={(v) => setSettings({ language: v })} />
      </div>
      {language === 'bn' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded accent-emerald-700"
            checked={banglaDigits}
            onChange={(e) => setSettings({ banglaDigits: e.target.checked })}
          />
          {t('settings.banglaDigits')}
        </label>
      )}
    </div>
  )
}
