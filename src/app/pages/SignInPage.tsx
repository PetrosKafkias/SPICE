import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, CircleAlert, Lock, Mail } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { FieldMessage, FormField } from '../components/FormLayout';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { localizedApiError, localizedFieldErrors } from '../lib/localizedApiError';
import { authRoute, safeReturnTo } from '../lib/authRedirect';
import { roleKey, type Role } from '../auth/permissions';

export default function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, demoSignIn } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [shake, setShake] = useState(false);
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const requiresAuthentication = searchParams.get('reason') === 'auth';
  const authNoticeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const formComplete = Boolean(email.trim() && password);
  const requiredLabel = (label: string) => <span>{label} <span className="text-[#b42318]" aria-hidden="true">*</span><span className="sr-only"> ({t('common.required')})</span></span>;
  const fieldError = (field: string, id: string) => fieldErrors[field] && <FieldMessage id={id} tone="error">{fieldErrors[field]}</FieldMessage>;

  useEffect(() => {
    if (user) navigate(returnTo, { replace: true });
  }, [navigate, returnTo, user]);

  useEffect(() => {
    if (requiresAuthentication) authNoticeRef.current?.focus();
  }, [requiresAuthentication]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = `${t('auth.email')}: ${t('common.required')}.`;
    if (!password) nextErrors.password = `${t('auth.password')}: ${t('common.required')}.`;
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setValidationAttempted(true);
      setError(t('auth.signInCompleteRequired'));
      setShake(false);
      window.requestAnimationFrame(() => {
        setShake(true);
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        window.setTimeout(() => setShake(false), 300);
      });
      return;
    }
    setValidationAttempted(false);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signIn(email, password, rememberMe);
      navigate(returnTo, { replace: true });
    } catch (caught) {
      setError(localizedApiError(t, caught));
      setFieldErrors(localizedFieldErrors(t, (caught as { fieldErrors?: Record<string, string> }).fieldErrors));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async (role: 'citizen' | 'facilitator' | 'municipality' | 'admin') => {
    setSubmitting(true);
    setError('');
    try {
      await demoSignIn(role);
      navigate(returnTo, { replace: true });
    } catch {
      setError(t('auth.demoUnavailable'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div>
        <h1 className="text-[34px] font-bold text-black sm:text-[36px]">{t('auth.welcome')}</h1>
        <p className="mt-1 text-[16px] font-semibold text-black sm:text-[18px]">{t('auth.subtitle')}</p>
      </div>

      {requiresAuthentication && (
        <div
          ref={authNoticeRef}
          className="mt-6 flex items-start gap-3 border-l-4 border-[#ca7428] bg-[#fff4e9] px-4 py-4 text-[#444] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]"
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
        >
          <CircleAlert size={22} className="mt-0.5 flex-shrink-0 text-[#ca7428]" aria-hidden="true" />
          <div>
            <p className="text-[15px] font-bold">{t('common.signInRequired')}</p>
            <p className="mt-1 text-[14px] font-medium leading-relaxed">{t('auth.requiredMessage')}</p>
          </div>
        </div>
      )}

      <div className={`${requiresAuthentication ? 'mt-5' : 'mt-7'} grid grid-cols-2 gap-2 rounded bg-[#e9e9e9] p-2`}>
        <span className="rounded bg-white py-2.5 text-center text-[17px] font-semibold text-black" aria-current="page">{t('auth.signIn')}</span>
        <Link to={authRoute('register', returnTo)} className="cursor-pointer rounded py-2.5 text-center text-[17px] font-semibold text-black transition-colors hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428]">{t('auth.register')}</Link>
      </div>

      {error && <div id="signin-form-error" className="mt-5 flex items-start gap-2 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-800" role="alert" aria-live="assertive"><CircleAlert size={18} className="mt-px flex-none" aria-hidden="true" />{error}</div>}

      <form ref={formRef} onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5" noValidate aria-describedby={validationAttempted ? 'signin-form-error' : undefined}>
        <FormField className="w-full gap-2 text-[17px] font-semibold text-black">
          {requiredLabel(t('auth.email'))}
          <span data-field-control className={`flex items-center gap-3 border-2 px-4 py-3 ${fieldErrors.email ? 'border-red-600 bg-red-50/40' : 'border-[#bfc0c5] focus-within:border-[#ca7428]'}`}>
            <Mail size={20} className="flex-shrink-0 text-[#444]" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: '' })); setError(''); }}
              required
              className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-[#444] outline-none placeholder:text-[#888]"
              placeholder="name@example.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'signin-email-error' : undefined}
            />
          </span>
          {fieldError('email', 'signin-email-error')}
        </FormField>

        <FormField className="w-full gap-2 text-[17px] font-semibold text-black">
          {requiredLabel(t('auth.password'))}
          <span data-field-control className={`flex items-center gap-3 border-2 px-4 py-3 ${fieldErrors.password ? 'border-red-600 bg-red-50/40' : 'border-[#bfc0c5] focus-within:border-[#ca7428]'}`}>
            <Lock size={20} className="flex-shrink-0 text-[#444]" />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: '' })); setError(''); }}
              required
              className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-[#444] outline-none placeholder:text-[#888]"
              placeholder={t('auth.password')}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'signin-password-error' : undefined}
            />
          </span>
          {fieldError('password', 'signin-password-error')}
        </FormField>

        <label className="flex cursor-pointer items-center gap-3 text-[16px] font-semibold text-black">
          <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-5 w-5 cursor-pointer accent-[#ca7428]" />
          {t('auth.remember')}
        </label>

        <button
          type="submit"
          disabled={submitting}
          className={`flex w-full cursor-pointer items-center justify-center gap-3 py-4 text-[20px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444] ${formComplete ? 'bg-[#f68b2c] text-white hover:bg-[#e07a20]' : 'bg-[#d5d5d5] text-[#737373] hover:bg-[#c9c9c9]'} ${shake ? 'spice-form-shake' : ''} disabled:cursor-wait disabled:opacity-70`}
        >
          {submitting ? t('auth.signingIn') : t('auth.signIn')}
          {!submitting && <ArrowRight size={22} />}
        </button>
      </form>

      {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN !== 'false' && (
        <section className="mt-7 border-t-2 border-[#e4e4e4] pt-6" aria-labelledby="demo-access-title">
          <h2 id="demo-access-title" className="text-[16px] font-bold text-[#444]">{t('auth.devAccess')}</h2>
          <p className="mt-1 text-[13px] font-semibold text-[#555]">{t('auth.devControls')}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#666]">{t('auth.devControlsText')}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(['citizen', 'facilitator', 'municipality', 'admin'] as const).map((role) => (
              <button key={role} type="button" disabled={submitting} onClick={() => void handleDemoSignIn(role)} className="min-h-11 cursor-pointer border-2 border-[#bfc0c5] bg-white px-3 text-sm font-bold capitalize text-[#444] transition-colors hover:border-[#f68b2c] hover:bg-[#fff4e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] disabled:cursor-wait disabled:opacity-60">
                {t('auth.continueAsRole', { role: t(roleKey(role as Role)) })}
              </button>
            ))}
          </div>
        </section>
      )}
    </AuthLayout>
  );
}
