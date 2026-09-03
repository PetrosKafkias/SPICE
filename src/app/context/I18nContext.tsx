import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { translations, type LanguageCode, type TranslationKey } from '../i18n/translations';
import { LOCALES, localeDefinition, normalizeLocale, toApiLocale } from '../i18n/config';

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  tp: (count: number, keys: Partial<Record<Intl.LDMLPluralRule, TranslationKey>> & { other: TranslationKey }, values?: Record<string, string | number>) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
}

const STORAGE_KEY = 'spice-language';
const I18nContext = createContext<I18nContextValue | null>(null);

function storedLanguage(): LanguageCode | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value && LOCALES.some((item) => item.code === value.toLowerCase()) ? normalizeLocale(value) : null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const hadStoredLanguage = useRef(storedLanguage() !== null);
  const userLocaleApplied = useRef(false);
  const [language, setLanguageState] = useState<LanguageCode>(() => storedLanguage() || 'en');

  useEffect(() => {
    const selected = localeDefinition(language);
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = selected.code;
  }, [language]);

  useEffect(() => {
    if (!hadStoredLanguage.current && !userLocaleApplied.current && user?.locale) {
      userLocaleApplied.current = true;
      setLanguageState(normalizeLocale(user.locale));
    }
  }, [user]);

  const setLanguage = useCallback((next: LanguageCode) => {
    if (next === language) return;
    setLanguageState(next);
    if (user) void updateProfile({ locale: toApiLocale(next) }).catch(() => undefined);
  }, [language, updateProfile, user]);

  const t = useCallback((key: TranslationKey, values: Record<string, string | number> = {}) => {
    let value = translations[language][key];
    if (!value && import.meta.env.DEV) throw new Error(`Missing translation: ${language}.${key}`);
    value ||= translations.en[key];
    for (const [name, replacement] of Object.entries(values)) {
      value = value.replaceAll(`{{${name}}}`, String(replacement));
    }
    return value;
  }, [language]);

  const formatDate = useCallback((value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(localeDefinition(language).dateLocale, options || { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }, [language]);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => (
    new Intl.NumberFormat(localeDefinition(language).numberLocale, options).format(value)
  ), [language]);

  const tp = useCallback((count: number, keys: Partial<Record<Intl.LDMLPluralRule, TranslationKey>> & { other: TranslationKey }, values: Record<string, string | number> = {}) => {
    const rule = new Intl.PluralRules(localeDefinition(language).numberLocale).select(count);
    return t(keys[rule] || keys.other, { ...values, count: formatNumber(count) });
  }, [formatNumber, language, t]);

  const formatRelativeTime = useCallback((value: number, unit: Intl.RelativeTimeFormatUnit) => (
    new Intl.RelativeTimeFormat(localeDefinition(language).dateLocale, { numeric: 'auto' }).format(value, unit)
  ), [language]);

  const contextValue = useMemo(() => ({ language, setLanguage, t, tp, formatDate, formatNumber, formatRelativeTime }), [formatDate, formatNumber, formatRelativeTime, language, setLanguage, t, tp]);
  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
