export const SUPPORTED_LOCALES = ['en', 'el', 'fi', 'pl', 'pt'] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];
export type ApiLocaleCode = Uppercase<LocaleCode>;

export interface LocaleDefinition {
  code: LocaleCode;
  shortLabel: ApiLocaleCode;
  displayName: string;
  nativeName: string;
  dateLocale: string;
  numberLocale: string;
}

export const LOCALES: readonly LocaleDefinition[] = [
  { code: 'en', shortLabel: 'EN', displayName: 'English', nativeName: 'English', dateLocale: 'en-GB', numberLocale: 'en-GB' },
  { code: 'el', shortLabel: 'EL', displayName: 'Greek', nativeName: 'Ελληνικά', dateLocale: 'el-GR', numberLocale: 'el-GR' },
  { code: 'fi', shortLabel: 'FI', displayName: 'Finnish', nativeName: 'Suomi', dateLocale: 'fi-FI', numberLocale: 'fi-FI' },
  { code: 'pl', shortLabel: 'PL', displayName: 'Polish', nativeName: 'Polski', dateLocale: 'pl-PL', numberLocale: 'pl-PL' },
  { code: 'pt', shortLabel: 'PT', displayName: 'Portuguese', nativeName: 'Português', dateLocale: 'pt-PT', numberLocale: 'pt-PT' },
] as const;

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value.toLowerCase() as LocaleCode);
}

export function normalizeLocale(value: unknown, fallback: LocaleCode = 'en'): LocaleCode {
  return isLocaleCode(value) ? value.toLowerCase() as LocaleCode : fallback;
}

export function toApiLocale(locale: LocaleCode): ApiLocaleCode {
  return locale.toUpperCase() as ApiLocaleCode;
}

export function localeDefinition(locale: LocaleCode): LocaleDefinition {
  return LOCALES.find((item) => item.code === locale) || LOCALES[0];
}
