import type { TranslationKey } from '../i18n/translations';
import { ApiError } from './api';

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

const ERROR_KEYS: Record<string, TranslationKey> = {
  AUTH_REQUIRED: 'apiError.authRequired',
  PERMISSION_DENIED: 'apiError.permissionDenied',
  VALIDATION_ERROR: 'apiError.validation',
  CONFLICT: 'apiError.conflict',
  NOT_FOUND: 'apiError.notFound',
  RATE_LIMITED: 'apiError.rateLimited',
  SERVER_ERROR: 'apiError.server',
  EMAIL_EXISTS: 'apiError.emailExists',
  VERIFICATION_EMAIL_FAILED: 'apiError.verificationEmailFailed',
  VERIFICATION_LINK_INVALID: 'apiError.verificationLinkInvalid',
  AUTH_RATE_LIMITED: 'apiError.authRateLimited',
  AUTH_INVALID_CREDENTIALS: 'apiError.invalidCredentials',
  AUTH_SUSPENDED: 'apiError.suspended',
  AUTH_EMAIL_UNVERIFIED: 'apiError.emailUnverified',
};

const FIELD_ERROR_KEYS: Record<string, TranslationKey> = {
  'Enter your full name.': 'validation.fullName',
  'Enter a valid email address.': 'validation.email',
  'Confirm your password.': 'validation.confirmPassword',
  'Passwords do not match.': 'validation.passwordMismatch',
  'Select a role.': 'validation.role',
  'Select a pilot site.': 'validation.pilotSite',
  'You must accept the Terms of Use and Privacy Policy.': 'validation.acceptTerms',
  'Email is already registered.': 'validation.emailRegistered',
  'Enter a valid comment.': 'validation.comment',
  'Enter at least 10 characters.': 'validation.minimumTenCharacters',
};

export function localizedApiError(t: Translate, caught: unknown, fallback: TranslationKey = 'common.error') {
  if (!(caught instanceof ApiError)) return t(fallback);
  return t(ERROR_KEYS[caught.code] || fallback);
}

export function localizedFieldErrors(t: Translate, errors?: Record<string, string>) {
  if (!errors) return {};
  return Object.fromEntries(Object.entries(errors).map(([field, message]) => [
    field,
    t(FIELD_ERROR_KEYS[message] || 'validation.invalidField'),
  ]));
}
