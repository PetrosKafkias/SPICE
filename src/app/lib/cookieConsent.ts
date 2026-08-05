export type CookieConsentChoice = 'all' | 'essential' | 'managed';

export interface CookiePreferences {
  analytics: boolean;
  personalization: boolean;
}

const CHOICE_KEY = 'spice-cookie-choice';
const PREFERENCES_KEY = 'spice-cookie-preferences';

export function readCookiePreferences(): CookiePreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}') as Partial<CookiePreferences>;
    return {
      analytics: stored.analytics === true,
      personalization: stored.personalization === true,
    };
  } catch {
    return { analytics: false, personalization: false };
  }
}

export function saveCookieConsent(choice: CookieConsentChoice, managed?: CookiePreferences) {
  const preferences = choice === 'all'
    ? { analytics: true, personalization: true }
    : choice === 'essential'
      ? { analytics: false, personalization: false }
      : managed || readCookiePreferences();

  localStorage.setItem(CHOICE_KEY, choice);
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  localStorage.removeItem('cookies-accepted');
  document.documentElement.dataset.cookieConsent = choice;
  document.documentElement.dataset.cookieAnalytics = String(preferences.analytics);
  document.documentElement.dataset.cookiePersonalization = String(preferences.personalization);
  window.dispatchEvent(new CustomEvent('spice-cookie-consent-change', { detail: { choice, preferences } }));
}

export function hasCookieConsent() {
  return Boolean(localStorage.getItem(CHOICE_KEY));
}
