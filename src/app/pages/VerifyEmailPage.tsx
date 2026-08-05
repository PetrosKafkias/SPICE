import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CircleAlert, LoaderCircle, MailCheck } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useI18n } from '../context/I18nContext';
import { apiRequest, jsonBody } from '../lib/api';
import { authRoute, safeReturnTo } from '../lib/authRedirect';

export default function VerifyEmailPage() {
  const [params] = useSearchParams(); const { t } = useI18n();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const [state, setState] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState(''); const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return; requested.current = true;
    const token = params.get('token');
    if (!token) { setMessage('This verification link is invalid or has expired.'); setState('error'); return; }
    apiRequest<{message:string}>('/api/auth/verify-email', { method: 'POST', body: jsonBody({ token }) })
      .then((result) => { setMessage(result.message); setState('success'); })
      .catch((error: Error) => { setMessage(error.message); setState('error'); });
  }, [params]);
  return <AuthLayout><div className="py-10 text-center" aria-live="polite">
    {state === 'loading' && <><LoaderCircle size={58} className="mx-auto animate-spin text-[#ca7428]"/><h1 className="mt-5 text-[30px] font-bold">{t('auth.verifying')}</h1></>}
    {state === 'success' && <><MailCheck size={62} className="mx-auto text-[#5f7d3d]"/><h1 className="mt-5 text-[32px] font-bold">{t('auth.verifiedTitle')}</h1><p className="mt-3 text-[17px] text-[#444]">{t('auth.verified')}</p><Link to={authRoute('signin', returnTo)} className="mt-7 inline-flex bg-[#f68b2c] px-7 py-4 font-semibold text-white hover:bg-[#e07a20]">{t('auth.goToSignIn')}</Link></>}
    {state === 'error' && <><CircleAlert size={62} className="mx-auto text-red-700"/><h1 className="mt-5 text-[32px] font-bold">{t('auth.verificationFailed')}</h1><p className="mt-3 text-[17px] text-[#444]">{message}</p></>}
  </div></AuthLayout>;
}
