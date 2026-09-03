import { ArrowRight, BookOpenCheck, CheckCircle2, Grid3X3, LogIn, MapPinned, MessageSquareText, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import RoleHubDashboard from '../components/RoleHubDashboard';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

const PUBLIC_HUB_OPTIONS: Array<{
  icon: typeof Grid3X3;
  labelKey: TranslationKey;
  textKey: TranslationKey;
  path: string;
}> = [
  { icon: Grid3X3, labelKey: 'hub.publicToolkit', textKey: 'hub.publicToolkitText', path: '/explore-toolkit' },
  { icon: BookOpenCheck, labelKey: 'hub.publicMethodology', textKey: 'hub.publicMethodologyText', path: '/methodology' },
  { icon: MessageSquareText, labelKey: 'hub.publicForum', textKey: 'hub.publicForumText', path: '/forum-voting' },
  { icon: MapPinned, labelKey: 'hub.publicPilots', textKey: 'hub.publicPilotsText', path: '/pilot-sites' },
];

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  if (user) {
    return (
      <SpicePublicShell variant="public">
        <div className="spice-page spice-wide-page" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <RoleHubDashboard />
        </div>
      </SpicePublicShell>
    );
  }

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={Grid3X3} eyebrow={t('hub.eyebrow')} title={t('hub.title')} description={t('hub.subtitle')} />
      <div className="spice-page spice-wide-page" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {!user && (
          <>
            <section aria-label={t('hub.publicTitle')}>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {PUBLIC_HUB_OPTIONS.map(({ icon: Icon, labelKey, textKey, path }) => (
                  <button
                    key={labelKey}
                    type="button"
                    onClick={() => navigate(path)}
                    className="group flex min-h-[240px] cursor-pointer flex-col border-2 border-[#d7d8dc] bg-white p-6 text-left transition-[border-color,box-shadow,background-color] duration-300 hover:border-[#f68b2c] hover:bg-[#fffdfa] hover:shadow-[0_12px_28px_rgba(202,116,40,0.2)] focus-visible:border-[#f68b2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ca7428] active:bg-[#fff3e8]"
                  >
                    <span className="spice-interactive-icon grid h-12 w-12 place-items-center rounded-full">
                      <Icon size={23} aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 text-[19px] font-bold leading-tight text-[#444]">{t(labelKey)}</h3>
                    <p className="mt-3 flex-1 text-[13px] font-medium leading-relaxed text-[#666]">{t(textKey)}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-[#a85f20]">
                      {t('hub.publicExplore')} <ArrowRight size={16} aria-hidden="true" />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-12 grid gap-8 border-2 border-[#f68b2c] bg-[#fff7ef] p-6 md:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center" aria-labelledby="hub-account-title">
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f68b2c] text-white">
                  <UserPlus size={23} aria-hidden="true" />
                </span>
                <h2 id="hub-account-title" className="mt-5 text-[26px] font-bold leading-tight text-[#444] md:text-[30px]">
                  {t('hub.accountTitle')}
                </h2>
                <p className="mt-3 max-w-2xl text-[15px] font-medium leading-relaxed text-[#666]">{t('hub.accountText')}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/signin?returnTo=%2Fco-creation-hub')}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 border-2 border-[#444] bg-white px-6 py-3 text-[14px] font-bold text-[#444] transition-colors hover:border-[#ca7428] hover:bg-[#fff0e1] hover:text-[#a85f20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]"
                  >
                    <LogIn size={17} aria-hidden="true" /> {t('nav.signIn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/register?returnTo=%2Fco-creation-hub')}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-6 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#df771d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]"
                  >
                    <UserPlus size={17} aria-hidden="true" /> {t('auth.register')}
                  </button>
                </div>
              </div>

              <div className="border-l-0 border-[#efc79f] lg:border-l-2 lg:pl-8">
                <h3 className="text-[16px] font-bold text-[#444]">{t('hub.accountBenefitsTitle')}</h3>
                <ul className="mt-4 grid gap-3" role="list">
                  {(['hub.accountBenefit1', 'hub.accountBenefit2', 'hub.accountBenefit3', 'hub.accountBenefit4'] as TranslationKey[]).map((key) => (
                    <li key={key} className="flex items-start gap-3 text-[14px] font-medium leading-relaxed text-[#555]">
                      <CheckCircle2 className="mt-0.5 flex-none text-[#ca7428]" size={18} aria-hidden="true" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}
      </div>
    </SpicePublicShell>
  );
}
