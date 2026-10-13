import { Link, Navigate, useNavigate } from 'react-router';
import { Bot, Clock, Compass, DraftingCompass, FileStack, ArrowRight, RefreshCw } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import ObjectiveCoverage from '../components/ObjectiveCoverage';
import { useI18n } from '../context/I18nContext';
import { usePermissions } from '../auth/usePermissions';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../context/AuthContext';
import { selectionsComplete, useObjectiveResources } from '../lib/objectiveResources';
import type { TranslationKey } from '../i18n/translations';

const OPTIONS = [
  {
    icon: FileStack,
    titleKey: 'process.setup',
    textKey: 'process.setupText',
    action: '/setup-questionnaire',
  },
  {
    icon: Compass,
    titleKey: 'process.explore',
    textKey: 'process.exploreText',
    action: '/setup-tools?mode=explore',
  },
  {
    icon: Bot,
    titleKey: 'process.chatbot',
    textKey: 'process.chatbotText',
    action: '/co-creation-guide',
  },
  {
    icon: RefreshCw,
    titleKey: 'process.scenarios',
    textKey: 'process.scenariosText',
    action: null,
  },
] satisfies Array<{ icon: typeof FileStack; titleKey: TranslationKey; textKey: TranslationKey; action: string | null }>;

export default function CoCreationProcessPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { role } = usePermissions();
  const isMunicipality = role === 'municipality';
  const { status } = useAuth();
  const { initiative, selections, loading } = useObjectiveResources(isMunicipality);

  // The page is the Municipality's starting point only until every Objective has a resource;
  // everyone else, and a Municipality whose process is set up, goes straight to the hub.
  if (status === 'loading' || (isMunicipality && loading)) {
    return (
      <SpicePublicShell variant="public">
        <div className="spice-page spice-wide-page"><LoadingState message={t('common.loading')} minHeight="256px" size="lg" /></div>
      </SpicePublicShell>
    );
  }
  if (!isMunicipality || (initiative && selectionsComplete(selections))) return <Navigate to="/co-creation-hub" replace />;

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={DraftingCompass} eyebrow="SPICE co-creation" title={t('process.title')} description={t('process.subtitle')} />
      <div className="spice-page spice-wide-page">
        <section>
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-[34px] font-semibold text-[#444]">{t('process.question')}</h2>
            <Link to="/co-creation-hub?view=hub" className="inline-flex min-h-11 items-center gap-2 font-bold text-[#a85f20] hover:underline">
              {t('process.goToHub')} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          {initiative && <div className="mb-9"><ObjectiveCoverage selections={selections} /></div>}
          <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
            {OPTIONS.map(({ icon: Icon, titleKey, textKey, action }) => {
              // Possible scenarios are published later, so the option is shown but not yet available.
              const available = action !== null;
              return (
                <article key={titleKey} aria-disabled={!available} className={`flex min-h-[350px] flex-col border-[3px] bg-white p-6 ${available ? 'border-[#f68b2c]' : 'border-[#d0d0d0]'}`}>
                  <div className={`grid h-[58px] w-[58px] place-items-center rounded-full text-[#ca7428] ${available ? 'bg-[rgba(246,139,44,0.18)]' : 'bg-[#d6d6d6]'}`}>
                    <Icon size={28} aria-hidden="true" />
                  </div>
                  <h3 className="mt-8 text-[28px] font-bold leading-tight text-[#444]">{t(titleKey)}</h3>
                  <p className="mt-6 flex-1 text-[18px] font-medium leading-snug text-[#444]">{t(textKey)}</p>
                  {available ? (
                    <button
                      type="button"
                      onClick={() => navigate(action)}
                      className="mt-8 flex w-full cursor-pointer items-center justify-center gap-3 bg-[#f68b2c] px-4 py-3 text-[18px] font-bold text-white transition-colors hover:bg-[#e07a20]"
                    >
                      {t('common.continue')} <ArrowRight size={22} />
                    </button>
                  ) : (
                    <button type="button" disabled className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-3 bg-[#8c8c8c] px-4 py-3 text-[18px] font-bold text-white">
                      {t('process.comingSoon')} <Clock size={22} aria-hidden="true" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </SpicePublicShell>
  );
}
