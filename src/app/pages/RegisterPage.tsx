import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, CircleAlert, Lock, Mail, MailCheck, MapPin, UserCircle2, Users2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import FormDropdown from '../components/FormDropdown';
import { FieldGroup, FieldMessage, FormField, FormGrid } from '../components/FormLayout';
import { useAuth, type RegistrationResult } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { ApiError } from '../lib/api';
import { authRoute, safeReturnTo } from '../lib/authRedirect';

const PILOT_SITES = ['Thessaloniki', 'Rovaniemi', 'Bielsko-Biala', 'Cuba'];
const ROLES = ['Citizen', 'Facilitator', 'Municipality Staff', 'Researcher'];

export default function RegisterPage() {
  const navigate = useNavigate(); const [searchParams] = useSearchParams();
  const { user, register } = useAuth(); const { language, t } = useI18n();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', pilotSite: '', role: '' });
  const [agreed, setAgreed] = useState(false); const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(''); const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationAttempted, setValidationAttempted] = useState(false); const [shake, setShake] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  useEffect(() => { if (user) navigate(returnTo, { replace: true }); }, [navigate, returnTo, user]);
  const setValue = (field: keyof typeof form, value: string) => { setForm((current) => ({ ...current, [field]: value })); setFieldErrors((current) => ({ ...current, [field]: '' })); setError(''); };
  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setValue(field, event.target.value);
  const fieldClass = (field: string) => `flex min-h-[52px] items-center gap-3 border-2 px-4 ${fieldErrors[field] ? 'border-red-600 bg-red-50/40' : 'border-[#444] focus-within:border-[#ca7428]'}`;
  const errorText = (field: string) => fieldErrors[field] && <FieldMessage id={`${field}-error`} tone="error">{fieldErrors[field]}</FieldMessage>;
  const requiredLabel = (label: string) => <span>{label} <span className="text-[#b42318]" aria-hidden="true">*</span><span className="sr-only"> ({t('common.required')})</span></span>;
  const formComplete = Boolean(form.fullName.trim() && form.email.trim() && form.password && form.confirmPassword && form.password === form.confirmPassword && form.pilotSite && form.role && agreed);
  const requiredError = (label: string) => `${label}: ${t('common.required')}.`;

  const showValidationFailure = (errors: Record<string, string>) => {
    setFieldErrors(errors); setValidationAttempted(true); setError(t('auth.completeRequired')); setShake(false);
    window.requestAnimationFrame(() => {
      setShake(true);
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      window.setTimeout(() => setShake(false), 300);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = requiredError(t('auth.fullName'));
    if (!form.email.trim()) errors.email = requiredError(t('auth.email'));
    if (!form.password) errors.password = requiredError(t('auth.password'));
    if (form.password !== form.confirmPassword) errors.confirmPassword = t('auth.passwordMismatch');
    if (!form.confirmPassword) errors.confirmPassword = t('auth.confirmPasswordRequired');
    if (!form.pilotSite) errors.pilotSite = t('auth.pilotRequired');
    if (!form.role) errors.role = t('auth.roleRequired');
    if (!agreed) errors.acceptedTerms = requiredError(t('auth.privacy'));
    if (Object.keys(errors).length) { showValidationFailure(errors); return; }
    setValidationAttempted(false);
    setSubmitting(true); setFieldErrors({});
    try { setResult(await register({ ...form, locale: language, acceptedTerms: agreed, returnTo })); }
    catch (caught) { const apiError = caught as ApiError; setError(apiError.message || t('common.error')); setFieldErrors(apiError.fieldErrors || {}); }
    finally { setSubmitting(false); }
  };

  if (result) return <AuthLayout><div className="py-6 text-center" role="status" aria-live="polite">
    <MailCheck size={58} className="mx-auto text-[#ca7428]" />
    <h1 className="mt-5 text-[32px] font-bold text-black">{t('auth.accountCreatedTitle')}</h1>
    <p className="mx-auto mt-3 max-w-lg text-[17px] leading-relaxed text-[#444]">{t('auth.accountCreated')}</p>
    <p className="mt-2 font-semibold text-black">{result.email}</p>
    {result.verificationPreviewUrl && <a href={result.verificationPreviewUrl} className="mt-5 inline-flex cursor-pointer border-2 border-[#ca7428] px-5 py-3 font-semibold text-[#ca7428] hover:bg-[#fff4e9]">{t('auth.previewVerification')}</a>}
    <Link to={authRoute('signin', returnTo)} className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] py-4 text-[18px] font-semibold text-white hover:bg-[#e07a20]">{t('auth.goToSignIn')}<ArrowRight size={20} /></Link>
  </div></AuthLayout>;

  return <AuthLayout>
    <div><h1 className="text-[34px] font-bold text-black sm:text-[36px]">{t('auth.welcome')}</h1><p className="mt-1 text-[16px] font-semibold text-black sm:text-[18px]">{t('auth.subtitle')}</p></div>
    <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-[#e9e9e9] p-2"><Link to={authRoute('signin', returnTo)} className="cursor-pointer rounded-md py-2.5 text-center text-[17px] font-semibold hover:bg-white/60">{t('auth.signIn')}</Link><span className="rounded-md bg-white py-2.5 text-center text-[17px] font-semibold" aria-current="page">{t('nav.signUp')}</span></div>
    {error && <div id="register-form-error" className="mt-5 flex items-start gap-2 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-800" role="alert" aria-live="assertive"><CircleAlert size={18} className="mt-px flex-none" aria-hidden="true" />{error}</div>}
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate aria-describedby={validationAttempted ? 'register-form-error' : undefined}>
      <FormField className="gap-2 text-[16px] font-semibold">{requiredLabel(t('auth.fullName'))}<span data-field-control className={fieldClass('fullName')}><UserCircle2 size={20}/><input required className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none" type="text" autoComplete="name" placeholder={t('auth.fullNamePlaceholder')} value={form.fullName} onChange={update('fullName')} aria-invalid={!!fieldErrors.fullName} aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}/></span>{errorText('fullName')}</FormField>
      <FormField className="gap-2 text-[16px] font-semibold">{requiredLabel(t('auth.email'))}<span data-field-control className={fieldClass('email')}><Mail size={20}/><input required className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} value={form.email} onChange={update('email')} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'email-error' : undefined}/></span>{errorText('email')}</FormField>
      <FormGrid className="gap-4 sm:grid-cols-2">
        <FormField className="gap-2 text-[16px] font-semibold">{requiredLabel(t('auth.password'))}<span data-field-control className={fieldClass('password')}><Lock size={20}/><input required className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none" type="password" autoComplete="new-password" placeholder={t('auth.passwordPlaceholder')} value={form.password} onChange={update('password')} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'password-error' : undefined}/></span>{errorText('password')}</FormField>
        <FormField className="gap-2 text-[16px] font-semibold">{requiredLabel(t('auth.confirmPassword'))}<span data-field-control className={fieldClass('confirmPassword')}><Lock size={20}/><input required className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none" type="password" autoComplete="new-password" placeholder={t('auth.confirmPasswordPlaceholder')} value={form.confirmPassword} onChange={update('confirmPassword')} aria-invalid={!!fieldErrors.confirmPassword} aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}/></span>{errorText('confirmPassword')}</FormField>
      </FormGrid>
      <FormGrid className="gap-4 sm:grid-cols-2">
        <FormField className="gap-2 text-[16px] font-semibold">{requiredLabel(t('auth.pilotSite'))}<FormDropdown required id="pilot-site" value={form.pilotSite} placeholder={t('auth.pilotPlaceholder')} options={PILOT_SITES.map((value) => ({value,label:value}))} icon={<MapPin size={20}/>} invalid={!!fieldErrors.pilotSite} onChange={(value) => setValue('pilotSite', value)}/>{errorText('pilotSite')}</FormField>
        <FormField className="gap-2 text-[16px] font-semibold">{requiredLabel(t('auth.role'))}<FormDropdown required id="role" value={form.role} placeholder={t('auth.rolePlaceholder')} options={ROLES.map((value) => ({value,label:t(`role.${value.replace(' ','')}` as Parameters<typeof t>[0])}))} icon={<Users2 size={20}/>} invalid={!!fieldErrors.role} onChange={(value) => setValue('role', value)}/>{errorText('role')}</FormField>
      </FormGrid>
      <FieldGroup className="mt-1 gap-2"><label className="flex cursor-pointer items-start gap-3 text-[14px] font-semibold"><input required type="checkbox" checked={agreed} onChange={(event) => { setAgreed(event.target.checked); setFieldErrors((current) => ({ ...current, acceptedTerms: '' })); }} className="mt-0.5 h-5 w-5 flex-none cursor-pointer accent-[#ca7428]" aria-invalid={!!fieldErrors.acceptedTerms} aria-describedby={fieldErrors.acceptedTerms ? 'acceptedTerms-error' : undefined}/><span>{t('auth.termsPrefix')} <Link to="/privacy-policy" className="text-[#ca7428] underline">{t('auth.privacy')}</Link> <span className="text-[#b42318]" aria-hidden="true">*</span><span className="sr-only"> ({t('common.required')})</span></span></label>{errorText('acceptedTerms')}</FieldGroup>
      <button type="submit" disabled={submitting} className={`mt-1 flex w-full cursor-pointer items-center justify-center gap-3 py-4 text-[19px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444] ${formComplete ? 'bg-[#f68b2c] text-white hover:bg-[#e07a20]' : 'bg-[#d5d5d5] text-[#737373] hover:bg-[#c9c9c9]'} ${shake ? 'spice-form-shake' : ''} disabled:cursor-wait disabled:opacity-70`}>{submitting ? t('auth.creating') : t('auth.createAccount')}{!submitting && <ArrowRight size={22}/>}</button>
    </form>
  </AuthLayout>;
}
