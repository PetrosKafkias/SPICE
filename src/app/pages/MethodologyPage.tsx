import { ArrowRight, ClipboardList, FileText, Map, MessageSquare, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

const PHASES: Array<{ number: string; titleKey: TranslationKey; textKey: TranslationKey }> = [
  {
    number: '1',
    titleKey: 'methodology.phase1',
    textKey: 'methodology.phase1Text',
  },
  {
    number: '2',
    titleKey: 'methodology.phase2',
    textKey: 'methodology.phase2Text',
  },
  {
    number: '3',
    titleKey: 'methodology.phase3',
    textKey: 'methodology.phase3Text',
  },
  {
    number: '4',
    titleKey: 'methodology.phase4',
    textKey: 'methodology.phase4Text',
  },
  {
    number: '5',
    titleKey: 'methodology.phase5',
    textKey: 'methodology.phase5Text',
  },
];

const EVIDENCE: Array<{ icon: typeof FileText; titleKey: TranslationKey; textKey: TranslationKey }> = [
  { icon: FileText, titleKey: 'methodology.toolkitDoc', textKey: 'methodology.toolkitDocText' },
  { icon: ClipboardList, titleKey: 'methodology.diagnostic', textKey: 'methodology.diagnosticText' },
  { icon: Map, titleKey: 'methodology.repository', textKey: 'methodology.repositoryText' },
];

const METHOD_USE_KEYS: TranslationKey[] = ['methodology.used1', 'methodology.used2', 'methodology.used3', 'methodology.used4'];

export default function MethodologyPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader
        icon={UsersRound}
        eyebrow={t('methodology.eyebrow')}
        title={t('methodology.title')}
        description={t('methodology.subtitle')}
        actions={<button onClick={() => navigate('/co-creation-guide')} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 whitespace-nowrap border-2 border-[#444] bg-white px-6 py-3 text-[16px] font-semibold text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]">{t('methodology.openGuide')}<ArrowRight size={19} aria-hidden="true" /></button>}
      />
      <div className="spice-page spice-wide-page">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {PHASES.map((phase) => (
            <article key={phase.number} className="border-[3px] border-[#f68b2c] bg-white p-6">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[rgba(246,139,44,0.18)] text-[22px] font-bold text-[#ca7428]">
                {phase.number}
              </span>
              <h2 className="mt-6 text-[24px] font-bold text-[#444]">{t(phase.titleKey)}</h2>
              <p className="mt-4 text-[16px] font-medium leading-snug text-[#444]">{t(phase.textKey)}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.8fr]">
          <div className="bg-white p-8 shadow-[8px_8px_28px_rgba(0,0,0,0.12)]">
            <h2 className="text-[30px] font-bold text-[#444]">{t('methodology.used')}</h2>
            <div className="mt-8 space-y-6">
              {METHOD_USE_KEYS.map((itemKey) => (
                <div key={itemKey} className="flex gap-4">
                  <MessageSquare size={22} className="mt-1 flex-shrink-0 text-[#ca7428]" />
                  <p className="text-[18px] font-medium leading-snug text-[#444]">{t(itemKey)}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="bg-white p-8 shadow-[8px_8px_28px_rgba(0,0,0,0.12)]">
            <h2 className="text-[28px] font-bold text-[#444]">{t('methodology.evidence')}</h2>
            <div className="mt-7 flex flex-col gap-5">
              {EVIDENCE.map(({ icon: Icon, titleKey, textKey }) => (
                <div key={titleKey} className="bg-[#fde8d5] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <Icon size={22} className="text-black" />
                    <p className="text-[18px] font-medium text-black">{t(titleKey)}</p>
                  </div>
                  <p className="text-[18px] font-medium leading-snug text-black">{t(textKey)}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </SpicePublicShell>
  );
}
