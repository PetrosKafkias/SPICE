import { useState } from 'react';
import { ArrowRight, Bot, Box, Check, MapPinned, RefreshCw, Target, UsersRound } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useI18n } from '../context/I18nContext';
import { PROCESS_PHASES, type DigitalToolId } from '../data/processFramework';

const DIGITAL_TOOL_ICONS: Record<DigitalToolId, typeof MapPinned> = {
  citivoice: MapPinned,
  chatbot: Bot,
  scene: Box,
};

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
            {PROCESS_PHASES.flatMap((phase, index) => {
              const isSelected = phase.number === selectedPhaseNumber;
              const card = (
                <button
                  key={phase.number}
                  type="button"
                  onClick={() => setSelectedPhaseNumber(phase.number)}
                  aria-pressed={isSelected}
                  aria-controls="methodology-phase-details"
                  className={`spice-interactive-card group flex min-h-[285px] cursor-pointer flex-col p-6 text-left xl:row-start-2 ${isSelected ? 'border-[#f68b2c] bg-[#fff8f1] shadow-[0_12px_28px_rgba(202,116,40,0.2)]' : ''}`}
                >
                  <span className={`spice-interactive-icon grid h-12 w-12 place-items-center rounded-full text-[20px] font-bold transition-colors duration-300 ${isSelected ? 'bg-[#f68b2c] text-white' : 'bg-[rgba(246,139,44,0.18)] text-[#ca7428]'}`}>
                    {isSelected ? <Check size={23} strokeWidth={2.5} aria-hidden="true" /> : phase.number}
                  </span>
                  <span className="mt-5 text-[12px] font-bold uppercase text-[#a85f20]">
                    {t('resources.objectiveNumber', { objective: phase.number })}
                  </span>
                  <h2 className="mt-2 text-[21px] font-bold leading-snug text-[#444]">{t(phase.objectiveKey)}</h2>
                  <p className="mt-3 line-clamp-4 text-[14px] font-medium leading-relaxed text-[#555]">{t(phase.fullDescriptionKey)}</p>
                  <span className="mt-auto flex items-center gap-2 pt-5 text-[13px] font-bold text-[#a85f20]">
                    {t(phase.questionKey)}
                    <ArrowRight size={16} className="flex-none transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                  </span>
                </button>
              );
              if (index !== 2) return [card];
              return [
                <div key="iteration-loop" className="flex items-center justify-center gap-3 border-2 border-[#e4c9a4] bg-[#fff8f1] px-5 py-3 text-center md:col-span-2 xl:col-span-2 xl:col-start-3 xl:row-start-1">
                  <RefreshCw size={18} className="flex-none text-[#ca7428]" aria-hidden="true" />
                  <p className="text-[13px] font-bold uppercase tracking-wide text-[#a85f20]">{t('methodology.iterationLoop')}</p>
                </div>,
                card,
              ];
            })}
          </div>

          <article id="methodology-phase-details" className="mt-6 border-2 border-[#f68b2c] bg-white shadow-[0_14px_32px_rgba(44,44,44,0.12)]" aria-live="polite">
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#f68b2c] text-[19px] font-bold text-white">{selectedPhase.number}</span>
                <div>
                  <p className="text-[12px] font-bold uppercase text-[#a85f20]">{t('resources.objectiveNumber', { objective: selectedPhase.number })}</p>
                  <h2 className="mt-1 text-[26px] font-bold leading-tight text-[#444] md:text-[30px]">{t(selectedPhase.titleKey)}</h2>
                </div>
              </div>

              <div className="mt-7 flex items-start gap-4 border-l-4 border-[#f68b2c] bg-[#fff8f1] p-5">
                <Target size={24} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                <p className="text-[18px] font-semibold leading-relaxed text-[#444]">{t(selectedPhase.questionKey)}</p>
              </div>

              <p className="mt-6 max-w-3xl text-[16px] font-medium leading-relaxed text-[#555]">{t(selectedPhase.fullDescriptionKey)}</p>

              {selectedPhase.actionsIntroKey ? (
                <p className="mt-5 max-w-3xl text-[15px] font-bold leading-relaxed text-[#444]">{t(selectedPhase.actionsIntroKey)}</p>
              ) : null}
              <ul className="mt-4 max-w-3xl space-y-3">
                {selectedPhase.actionKeys.map((actionKey) => (
                  <li key={actionKey} className="flex items-start gap-3 text-[14px] font-medium leading-relaxed text-[#555]">
                    <Check size={16} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                    <span>{t(actionKey)}</span>
                  </li>
                ))}
              </ul>

              {selectedPhase.digitalTools && selectedPhase.digitalTools.length > 0 && (
                <div className="mt-8 border-t-2 border-[#eee] pt-6">
                  <h3 className="text-[16px] font-bold text-[#444]">{t('methodology.digitalToolsTitle')}</h3>
                  <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[#777]">{t('methodology.digitalToolsSubtitle')}</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {selectedPhase.digitalTools.map((tool) => {
                      const Icon = DIGITAL_TOOL_ICONS[tool.toolId];
                      return (
                        <div key={tool.toolId} className="flex flex-col gap-2 border-2 border-[#e4e4e4] bg-[#fafafa] p-4">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]" aria-hidden="true"><Icon size={17} /></span>
                            <h4 className="text-[14px] font-bold leading-tight text-[#444]">{t(tool.nameKey)}</h4>
                          </div>
                          {tool.scopeKey && <p className="text-[11px] font-bold uppercase tracking-wide text-[#a85f20]">{t(tool.scopeKey)}</p>}
                          <p className="text-[13px] leading-relaxed text-[#666]">{t(tool.useKey)}</p>
                          <Link to={tool.route} className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[12px] font-bold text-[#ca7428] hover:underline">
                            {t('methodology.openTool')} <ArrowRight size={13} aria-hidden="true" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </SpicePublicShell>
  );
}
