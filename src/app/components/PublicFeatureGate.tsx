import type { ElementType, ReactNode } from 'react';
import { ArrowRight, Info, LockKeyhole } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import SpicePublicShell from './SpicePublicShell';
import StandardPageHeader from './StandardPageHeader';
import LoadingState from './LoadingState';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

interface Props {
  children: ReactNode;
  icon: ElementType;
  eyebrowKey: TranslationKey;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  capabilityKeys: TranslationKey[];
}

export default function PublicFeatureGate({ children, icon, eyebrowKey, titleKey, descriptionKey, capabilityKeys }: Props) {
  const { user, status } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <SpicePublicShell>
        <LoadingState message={t('gate.checkingAccount')} minHeight="60vh" size="lg" />
      </SpicePublicShell>
    );
  }

  if (user) return children;

  const signIn = () => navigate(`/signin?returnTo=${encodeURIComponent(location.pathname + location.search)}`);

  return (
    <SpicePublicShell>
      <StandardPageHeader icon={icon} eyebrow={t(eyebrowKey)} title={t(titleKey)} description={t(descriptionKey)} />
      <div className="spice-page spice-wide-page">
        <section className="grid gap-5 md:grid-cols-3" aria-label={t('gate.overview', { title: t(titleKey) })}>
          {capabilityKeys.map((capabilityKey) => (
            <article key={capabilityKey} className="border-2 border-[#d7d8dc] bg-white p-6">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]"><Info size={22} /></span>
              <p className="mt-5 text-[16px] font-semibold leading-relaxed text-[#444]">{t(capabilityKey)}</p>
            </article>
          ))}
        </section>
        <section className="mt-8 flex flex-col gap-5 border-2 border-[#f68b2c] bg-[#fff8f2] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-[22px] font-bold text-[#444]"><LockKeyhole size={23} className="text-[#ca7428]" />{t('gate.signInTitle')}</h2>
            <p className="mt-2 max-w-[720px] text-[14px] leading-relaxed text-[#555]">{t('gate.signInText')}</p>
          </div>
          <button type="button" onClick={signIn} className="inline-flex min-h-12 flex-none cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-6 py-3 font-bold text-white hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#444]">
            {t('gate.signInAction')} <ArrowRight size={18} />
          </button>
        </section>
      </div>
    </SpicePublicShell>
  );
}
