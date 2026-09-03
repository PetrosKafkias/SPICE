import { useState } from 'react';
import { ArrowRight, Check, ClipboardList, FileText, Flag, Map, MessageSquare, Target, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useI18n } from '../context/I18nContext';
import { PROCESS_PHASES } from '../data/processFramework';
import type { TranslationKey } from '../i18n/translations';

const EVIDENCE: Array<{ icon: typeof FileText; titleKey: TranslationKey; textKey: TranslationKey }> = [
  { icon: FileText, titleKey: 'methodology.toolkitDoc', textKey: 'methodology.toolkitDocText' },
  { icon: ClipboardList, titleKey: 'methodology.diagnostic', textKey: 'methodology.diagnosticText' },
  { icon: Map, titleKey: 'methodology.repository', textKey: 'methodology.repositoryText' },
];

const METHOD_USE_KEYS: TranslationKey[] = ['methodology.used1', 'methodology.used2', 'methodology.used3', 'methodology.used4'];

export default function MethodologyPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [selectedPhaseNumber, setSelectedPhaseNumber] = useState(PROCESS_PHASES[0].number);
  const selectedPhase = PROCESS_PHASES.find((phase) => phase.number === selectedPhaseNumber) || PROCESS_PHASES[0];

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader
        icon={UsersRound}
        eyebrow={t('methodology.eyebrow')}
        title={t('methodology.title')}
        description={t('methodology.subtitle')}
        actions={<button onClick={() => navigate('/co-creation-guide')} className="inline-flex min-h-12 w-full min-w-0 cursor-pointer items-center justify-center gap-3 border-2 border-[#444] bg-white px-6 py-3 text-center text-[16px] font-semibold leading-snug text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428] sm:w-auto">{t('methodology.openGuide')}<ArrowRight size={19} className="flex-none" aria-hidden="true" /></button>}
      />
      <div className="spice-page spice-wide-page">
        <section aria-label={t('methodology.eyebrow')}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {PROCESS_PHASES.map((phase) => {
              const isSelected = phase.number === selectedPhaseNumber;
              return (
                <button
                  key={phase.number}
                  type="button"
                  onClick={() => setSelectedPhaseNumber(phase.number)}
                  aria-pressed={isSelected}
                  aria-controls="methodology-phase-details"
                  className={`spice-interactive-card group flex min-h-[285px] cursor-pointer flex-col p-6 text-left ${isSelected ? 'border-[#f68b2c] bg-[#fff8f1] shadow-[0_12px_28px_rgba(202,116,40,0.2)]' : ''}`}
                >
                  <span className={`spice-interactive-icon grid h-12 w-12 place-items-center rounded-full text-[20px] font-bold transition-colors duration-300 ${isSelected ? 'bg-[#f68b2c] text-white' : 'bg-[rgba(246,139,44,0.18)] text-[#ca7428]'}`}>
                    {isSelected ? <Check size={23} strokeWidth={2.5} aria-hidden="true" /> : phase.number}
                  </span>
                  <span className="mt-5 text-[12px] font-bold uppercase text-[#a85f20]">
                    {t('hub.phaseNumber', { phase: phase.number })}
                  </span>
                  <h2 className="mt-2 text-[21px] font-bold leading-snug text-[#444]">{t(phase.titleKey)}</h2>
                  <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#555]">{t(phase.summaryKey)}</p>
                  <span className="mt-auto flex items-center gap-2 pt-5 text-[13px] font-bold text-[#a85f20]">
                    {t(phase.questionKey)}
                    <ArrowRight size={16} className="flex-none transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>

          <article id="methodology-phase-details" className="mt-6 border-2 border-[#f68b2c] bg-white shadow-[0_14px_32px_rgba(44,44,44,0.12)]" aria-live="polite">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#f68b2c] text-[19px] font-bold text-white">{selectedPhase.number}</span>
                  <div>
                    <p className="text-[12px] font-bold uppercase text-[#a85f20]">{t('hub.phaseNumber', { phase: selectedPhase.number })}</p>
                    <h2 className="mt-1 text-[26px] font-bold leading-tight text-[#444] md:text-[30px]">{t(selectedPhase.titleKey)}</h2>
                  </div>
                </div>

                <div className="mt-7 flex items-start gap-4 border-l-4 border-[#f68b2c] bg-[#fff8f1] p-5">
                  <Target size={24} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                  <p className="text-[18px] font-semibold leading-relaxed text-[#444]">{t(selectedPhase.questionKey)}</p>
                </div>

                <p className="mt-6 max-w-3xl text-[16px] font-medium leading-relaxed text-[#555]">{t(selectedPhase.summaryKey)}</p>

                <button
                  type="button"
                  onClick={() => navigate(`/analogue-tools#phase-${selectedPhase.number}`)}
                  className="mt-7 inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 bg-[#f68b2c] px-6 py-3 text-[15px] font-bold text-white transition-colors duration-300 hover:bg-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]"
                >
                  {t('process.explore')}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="border-t-2 border-[#eee] bg-[#fafafa] p-6 md:p-8 lg:border-l-2 lg:border-t-0">
                <div className="flex items-start gap-4">
                  <Flag size={23} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                  <div>
                    <h3 className="text-[18px] font-bold text-[#444]">{t('pilots.expectedResult')}</h3>
                    <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#555]">{t(selectedPhase.expectedOutcomeKey)}</p>
                  </div>
                </div>

                <div className="mt-7 border-t-2 border-[#ddd] pt-6">
                  <h3 className="text-[18px] font-bold text-[#444]">{t('phaseDetail.activities')}</h3>
                  <ul className="mt-4 space-y-3">
                    {selectedPhase.eventTypeKeys.map((eventKey) => (
                      <li key={eventKey} className="flex items-start gap-3 text-[14px] font-medium leading-relaxed text-[#555]">
                        <Check size={18} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                        <span>{t(eventKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.8fr]">
          <div className="spice-card p-8">
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

          <aside className="spice-card p-8">
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
