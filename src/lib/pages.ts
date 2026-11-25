import { getSettings } from '../i18n/settings'

export type StaticPage = 'about/' | 'guides/' | 'guides/file-tax-return-online/'

/** Address of a static page (built from the HTML files listed in vite.config.ts), in the current language. */
export function pageHref(page: StaticPage): string {
  return `${import.meta.env.BASE_URL}${getSettings().language === 'bn' ? 'bn/' : ''}${page}`
}
