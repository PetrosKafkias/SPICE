import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bot, Compass, DraftingCompass, FileStack, ArrowRight } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { markFirstEntrySeen } from '../lib/firstEntry';
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
    action: '/analog-resources',
  },
  {
    icon: Bot,
    titleKey: 'process.chatbot',
    textKey: 'process.chatbotText',
    action: '/co-creation-guide',
  },
  {
    icon: DraftingCompass,
    titleKey: 'process.scenarios',
    textKey: 'process.scenariosText',
    action: '/possible-scenarios',
  },
] satisfies Array<{ icon: typeof FileStack; titleKey: TranslationKey; textKey: TranslationKey; action: string }>;

export default function CoCreationProcessPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  // Showing the page once is enough: the next visit to the hub opens the hub itself.
  useEffect(() => {
    if (user) markFirstEntrySeen(user.id);
  }, [user]);

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={DraftingCompass} eyebrow="SPICE co-creation" title={t('process.title')} description={t('process.subtitle')} />
      <div className="spice-page spice-wide-page">
        <section>
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-[34px] font-semibold text-[#444]">{t('process.question')}</h2>
            <Link to="/co-creation-hub" className="inline-flex min-h-11 items-center gap-2 font-bold text-[#a85f20] hover:underline">
              {t('process.goToHub')} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
            {OPTIONS.map(({ icon: Icon, titleKey, textKey, action }) => (
              <article key={titleKey} className="flex min-h-[350px] flex-col border-[3px] border-[#f68b2c] bg-white p-6">
                <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-[rgba(246,139,44,0.18)] text-[#ca7428]">
                  <Icon size={28} />
                </div>
                <h3 className="mt-8 text-[28px] font-bold leading-tight text-[#444]">{t(titleKey)}</h3>
                <p className="mt-6 flex-1 text-[18px] font-medium leading-snug text-[#444]">{t(textKey)}</p>
                <button
                  type="button"
                  onClick={() => navigate(action)}
                  className="mt-8 flex w-full cursor-pointer items-center justify-center gap-3 bg-[#f68b2c] px-4 py-3 text-[18px] font-bold text-white transition-colors hover:bg-[#e07a20]"
                >
                  {t('common.continue')} <ArrowRight size={22} />
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </SpicePublicShell>
  );
}
