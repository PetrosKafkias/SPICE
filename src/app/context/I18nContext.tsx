import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { languageOptions, translations, type LanguageCode, type TranslationKey } from '../i18n/translations';

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const STORAGE_KEY = 'spice-language';
const I18nContext = createContext<I18nContextValue | null>(null);

function storedLanguage(): LanguageCode | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return languageOptions.some((item) => item.code === value) ? value as LanguageCode : null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const hadStoredLanguage = useRef(storedLanguage() !== null);
  const userLocaleApplied = useRef(false);
  const [language, setLanguageState] = useState<LanguageCode>(() => storedLanguage() || 'EN');

  useEffect(() => {
    const selected = languageOptions.find((item) => item.code === language)!;
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = selected.htmlLang;
  }, [language]);

  useEffect(() => {
    if (!hadStoredLanguage.current && !userLocaleApplied.current && user?.locale) {
      userLocaleApplied.current = true;
      setLanguageState(user.locale);
    }
  }, [user]);

  const setLanguage = useCallback((next: LanguageCode) => {
    if (next === language) return;
    setLanguageState(next);
    if (user) void updateProfile({ locale: next }).catch(() => undefined);
  }, [language, updateProfile, user]);

  const t = useCallback((key: TranslationKey, values: Record<string, string | number> = {}) => {
    let value = translations[language][key] || translations.EN[key];
    for (const [name, replacement] of Object.entries(values)) {
      value = value.replaceAll(`{{${name}}}`, String(replacement));
    }
    return value;
  }, [language]);

  const formatDate = useCallback((value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const htmlLang = languageOptions.find((item) => item.code === language)?.htmlLang || 'en';
    return new Intl.DateTimeFormat(htmlLang, options || { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }, [language]);

  const contextValue = useMemo(() => ({ language, setLanguage, t, formatDate }), [formatDate, language, setLanguage, t]);
  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
