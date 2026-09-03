import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, CircleAlert, Save } from 'lucide-react';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import LoadingState from '../components/LoadingState';
import { getTools, type Mode } from '../data/tools';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest, jsonBody } from '../lib/api';
import { DEFAULT_PROCESS_SETUP, processSetupFromInitiative, processSetupToPatchBody, type ProcessSetupState } from '../lib/processSetup';

interface Initiative {
  id: number;
  version: number;
  setupStage: string | null;
  setupObjectives: string[];
  setupParticipationLevel: string | null;
  setupGoal: string | null;
  setupGroupSize: string | null;
  setupDuration: string | null;
  setupFacilitator: string | null;
  setupMode: string | null;
  setupSelectedTools: string[];
  lifecycleStatus: 'setup_required' | 'ready_to_activate' | 'active' | 'completed';
}

const STAGES: { id: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { id: 'proposal', labelKey: 'setup.stage.proposal', descKey: 'setup.stage.proposalDesc' },
  { id: 'setup', labelKey: 'setup.stage.setup', descKey: 'setup.stage.setupDesc' },
  { id: 'underway', labelKey: 'setup.stage.underway', descKey: 'setup.stage.underwayDesc' },
];

const OBJECTIVES: { id: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { id: 'framing', labelKey: 'setup.objective.framing', descKey: 'setup.objective.framingDesc' },
  { id: 'collective', labelKey: 'setup.objective.collective', descKey: 'setup.objective.collectiveDesc' },
  { id: 'codesign', labelKey: 'setup.objective.codesign', descKey: 'setup.objective.codesignDesc' },
  { id: 'prototype', labelKey: 'setup.objective.prototype', descKey: 'setup.objective.prototypeDesc' },
  { id: 'consolidation', labelKey: 'setup.objective.consolidation', descKey: 'setup.objective.consolidationDesc' },
];

const PARTICIPATION_LEVELS: { id: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { id: 'inform', labelKey: 'setup.participation.inform', descKey: 'setup.participation.informDesc' },
  { id: 'consult', labelKey: 'setup.participation.consult', descKey: 'setup.participation.consultDesc' },
  { id: 'cocreate', labelKey: 'setup.participation.cocreate', descKey: 'setup.participation.cocreateDesc' },
];

const GOALS: { id: string; labelKey: TranslationKey }[] = [
  { id: 'physical', labelKey: 'setup.goal.physical' },
  { id: 'intangible', labelKey: 'setup.goal.intangible' },
  { id: 'undefined', labelKey: 'setup.goal.undefined' },
];

const GROUP_SIZES: { value: string; labelKey: TranslationKey }[] = [
  { value: '< 10 people', labelKey: 'setup.group.lt10' }, { value: '10-25 people', labelKey: 'setup.group.10to25' },
  { value: '25-50 people', labelKey: 'setup.group.25to50' }, { value: '50+ people', labelKey: 'setup.group.50plus' },
];
const DURATIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: '< 5 minutes', labelKey: 'setup.duration.lt5' }, { value: '5-30 minutes', labelKey: 'setup.duration.5to30' },
  { value: '30 min - 2 hours', labelKey: 'setup.duration.30to120' }, { value: 'Half day', labelKey: 'setup.duration.halfDay' },
  { value: 'Full day', labelKey: 'setup.duration.fullDay' }, { value: 'Multi-day', labelKey: 'setup.duration.multiDay' },
];
const FACILITATORS: { value: string; labelKey: TranslationKey }[] = [
  { value: '1 person', labelKey: 'setup.facilitator.one' }, { value: '2-3 people', labelKey: 'setup.facilitator.twoThree' },
  { value: '4+ people', labelKey: 'setup.facilitator.fourPlus' },
];
const MODES: Mode[] = ['Online', 'Offline', 'Hybrid'];

function FieldError({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return <p className="mt-2 text-[12px] font-semibold text-[#c0392b]">{children}</p>;
}

function SectionHelper({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[12px] font-medium text-[#888]">{children}</p>;
}

function ChoiceCard({ label, desc, selected, onClick, multi = false, error = false }: {
  label: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
  error?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex w-full items-start gap-3 border bg-white px-4 py-4 text-left transition-colors hover:border-[#f68b2c]"
      style={{
        borderColor: error ? '#c0392b' : selected ? '#f68b2c' : '#bfc0c5',
        backgroundColor: selected ? '#fff8f2' : 'white',
      }}
    >
      <span
        className={`mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center border-2 ${
          multi ? 'rounded' : 'rounded-full'
        }`}
        style={{ borderColor: selected ? '#f68b2c' : error ? '#c0392b' : '#bfc0c5', backgroundColor: selected ? '#f68b2c' : 'white' }}
      >
        {selected && (multi ? <Check size={13} className="text-white" /> : <span className="h-2.5 w-2.5 rounded-full bg-white" />)}
      </span>
      <span>
        <span className="block text-[14px] font-semibold text-[#444]">{label}</span>
        {desc && <span className="mt-1 block text-[12px] leading-relaxed text-[#777]">{desc}</span>}
      </span>
    </button>
  );
}

function FilterSelect({ label, value, options, onChange, error, selectLabel, requiredMessage }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  error: boolean;
  selectLabel: string;
  requiredMessage: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-[#888]">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none border bg-white px-3 py-2.5 pr-8 text-[13px] text-[#444] outline-none transition-colors hover:border-[#f68b2c]"
          style={{ borderColor: error ? '#c0392b' : '#bfc0c5' }}
        >
          <option value="">{selectLabel}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888]" />
      </div>
      <FieldError show={error}>{requiredMessage}</FieldError>
    </div>
  );
}

export default function SetUpProcessQuestionnairePage() {
  const navigate = useNavigate();
  const { language, t, tp } = useI18n();
  const tools = useMemo(() => getTools(language), [language]);
  const [initiativeId, setInitiativeId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [processSetup, setProcessSetup] = useState<ProcessSetupState>(DEFAULT_PROCESS_SETUP);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [objectiveError, setObjectiveError] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [step, setStep] = useState(1);
  const [editingActiveProcess, setEditingActiveProcess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const result = await apiRequest<{ initiatives: Initiative[] }>('/api/hub/initiatives');
        const initiative = result.initiatives[0];
        if (cancelled) return;
        if (!initiative) {
          setLoadError(t('setup.noPilot'));
          return;
        }
        setInitiativeId(initiative.id);
        setVersion(initiative.version);
        setProcessSetup(processSetupFromInitiative(initiative));
        setEditingActiveProcess(initiative.lifecycleStatus === 'active');
      } catch {
        if (!cancelled) setLoadError(t('setup.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  const updateProcessSetup = (patch: Partial<ProcessSetupState>) => {
    setProcessSetup((prev) => ({ ...prev, ...patch }));
  };

  const persistSetup = useCallback(async () => {
    if (!initiativeId) throw new Error(t('setup.pilotNotFound'));
    const result = await apiRequest<{ initiative: Initiative }>(`/api/hub/initiatives/${initiativeId}`, {
      method: 'PATCH', body: jsonBody({ ...processSetupToPatchBody(processSetup), version }),
    });
    setVersion(result.initiative.version);
  }, [initiativeId, processSetup, t, version]);

  const getError = (key: keyof typeof processSetup) => submitted && (
    Array.isArray(processSetup[key]) ? (processSetup[key] as string[]).length === 0 : !processSetup[key]
  );

  const toggleObjective = (id: string) => {
    setObjectiveError('');
    const exists = processSetup.objectives.includes(id);
    if (!exists && processSetup.objectives.length >= 2) {
      setObjectiveError(t('setup.selectTwo'));
      return;
    }
    updateProcessSetup({
      objectives: exists
        ? processSetup.objectives.filter((objective) => objective !== id)
        : [...processSetup.objectives, id],
    });
  };

  const translatedOption = useCallback((value: string, options: { value: string; labelKey: TranslationKey }[]) => (
    options.find((option) => option.value === value) ? t(options.find((option) => option.value === value)!.labelKey) : value
  ), [t]);

  const selections = useMemo(() => [
    processSetup.stage && t('setup.summaryStage', { value: t(STAGES.find((item) => item.id === processSetup.stage)?.labelKey || 'setup.stage.proposal') }),
    processSetup.objectives.length > 0 && t('setup.summaryObjectives', { value: processSetup.objectives.map((id) => t(OBJECTIVES.find((item) => item.id === id)?.labelKey || 'setup.objective.framing')).join(', ') }),
    processSetup.level && t('setup.summaryParticipation', { value: t(PARTICIPATION_LEVELS.find((item) => item.id === processSetup.level)?.labelKey || 'setup.participation.inform') }),
    processSetup.goal && t('setup.summaryGoal', { value: t(GOALS.find((item) => item.id === processSetup.goal)?.labelKey || 'setup.goal.undefined') }),
    processSetup.groupSize && t('setup.summaryGroup', { value: translatedOption(processSetup.groupSize, GROUP_SIZES) }),
    processSetup.duration && t('setup.summaryDuration', { value: translatedOption(processSetup.duration, DURATIONS) }),
    processSetup.facilitator && t('setup.summaryFacilitation', { value: translatedOption(processSetup.facilitator, FACILITATORS) }),
    processSetup.mode && t('setup.summaryMode', { value: t(`analogue.${processSetup.mode.toLowerCase()}` as 'analogue.online' | 'analogue.offline' | 'analogue.hybrid') }),
  ].filter(Boolean), [processSetup, t, translatedOption]);

  const matchingCount = useMemo(() => {
    const phaseMap: Record<string, number[]> = {
      framing: [1],
      collective: [2],
      codesign: [3],
      prototype: [4],
      consolidation: [5],
    };
    const selectedPhases = processSetup.objectives.flatMap((id) => phaseMap[id] || []);
    return tools.filter((tool) => {
      const phaseMatch = selectedPhases.length === 0 || selectedPhases.includes(tool.phase);
      const modeMatch = !processSetup.mode || tool.mode === processSetup.mode || tool.mode === 'Hybrid';
      return phaseMatch && modeMatch;
    }).length;
  }, [processSetup, tools]);
  const localizedOptions = useCallback((options: { value: string; labelKey: TranslationKey }[]) => (
    options.map((option) => ({ value: option.value, label: t(option.labelKey) }))
  ), [t]);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      await persistSetup();
      setDraftMessage(t('setup.draftSaved'));
      toast.success(t('setup.draftSaved'));
    } catch {
      toast.error(t('setup.draftFailed'));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleContinue = async () => {
    setSubmitted(true);
    setObjectiveError('');
    const requiredMissing = step === 1
      ? !processSetup.stage
      : step === 2
        ? processSetup.objectives.length === 0
        : step === 3
          ? !processSetup.level || !processSetup.goal
          : !processSetup.groupSize || !processSetup.duration || !processSetup.facilitator || !processSetup.mode;

    if (requiredMissing) {
      toast.error(t('setup.completeRequired'));
      return;
    }

    try {
      await persistSetup();
      setSubmitted(false);
      if (step < 4) setStep((current) => current + 1);
      else navigate('/setup-tools');
    } catch {
      toast.error(t('setup.saveFailed'));
    }
  };

  const handleBack = async () => {
    if (step === 1) {
      navigate('/co-creation-hub');
      return;
    }
    try {
      await persistSetup();
      setSubmitted(false);
      setStep((current) => Math.max(1, current - 1));
    } catch {
      toast.error(t('setup.saveFailed'));
    }
  };

  if (loading) {
    return (
      <SpicePublicShell variant="public">
        <div className="spice-page spice-wide-page"><LoadingState message={t('setup.loading')} minHeight="256px" size="lg" /></div>
      </SpicePublicShell>
    );
  }

  if (loadError) {
    return (
      <SpicePublicShell variant="public">
        <div className="spice-page spice-wide-page">
          <div className="flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 font-semibold text-red-800" role="alert"><CircleAlert size={20} />{loadError}</div>
        </div>
      </SpicePublicShell>
    );
  }

  return (
    <SpicePublicShell variant="public">
      <div className="spice-page spice-wide-page" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="mb-6">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[#ca7428]">{t('setup.stepOfFour', { step })}</p>
          <h1 className="mt-2 text-[32px] font-bold text-[#444]">{t('setup.title')}</h1>
          <p className="mt-2 max-w-[760px] text-[15px] font-medium leading-relaxed text-[#666]">
            {t('setup.intro')}
          </p>
        </div>

        {editingActiveProcess && (
          <div className="mb-6 flex items-start gap-3 border-l-4 border-[#4e789b] bg-[#f1f7fb] p-4 text-[14px] font-semibold leading-relaxed text-[#31556f]" role="status">
            <CircleAlert size={20} className="mt-0.5 flex-none" />{t('setup.activeEditNotice')}
          </div>
        )}

        <ol className="mb-7 grid grid-cols-2 border-2 border-[#dedee1] bg-white md:grid-cols-4" aria-label={t('setup.progressLabel')}>
          {(['setup.progress.stage', 'setup.progress.objectives', 'setup.progress.participation', 'setup.progress.practical'] as TranslationKey[]).map((key, index) => {
            const number = index + 1;
            const complete = number < step;
            const current = number === step;
            return (
              <li key={key} aria-current={current ? 'step' : undefined} className={`flex min-h-16 items-center gap-3 border-[#dedee1] px-4 py-3 md:border-r md:last:border-r-0 ${current ? 'bg-[#fff6ed]' : ''}`}>
                <span className={`grid h-8 w-8 flex-none place-items-center rounded-full border-2 text-[13px] font-bold ${complete ? 'border-[#4d7652] bg-[#e7f2df] text-[#355a3a]' : current ? 'border-[#f68b2c] bg-[#f68b2c] text-white' : 'border-[#c8c9cd] text-[#777]'}`}>
                  {complete ? <Check size={16} aria-hidden="true" /> : number}
                </span>
                <span className="text-[12px] font-bold text-[#444]">{t(key)}</span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col items-start gap-8 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            {step === 1 && <section className="spice-card p-5 md:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f68b2c] text-[15px] font-bold text-white">1</span>
                <div>
                  <h2 className="text-[18px] font-bold text-[#444]">{t('setup.stageTitle')}</h2>
                  <SectionHelper>{t('setup.selectionRequired')}</SectionHelper>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {STAGES.map((stage) => (
                  <ChoiceCard
                    key={stage.id}
                    label={t(stage.labelKey)}
                    desc={t(stage.descKey)}
                    selected={processSetup.stage === stage.id}
                    error={getError('stage')}
                    onClick={() => updateProcessSetup({ stage: stage.id })}
                  />
                ))}
                <FieldError show={getError('stage')}>{t('setup.stageRequired')}</FieldError>
              </div>
            </section>}

            {step === 2 && <section className="spice-card p-5 md:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f68b2c] text-[15px] font-bold text-white">2</span>
                <div>
                  <h2 className="text-[18px] font-bold text-[#444]">{t('setup.objectivesTitle')}</h2>
                  <SectionHelper>{t('setup.selectTwo')}</SectionHelper>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {OBJECTIVES.map((objective) => (
                  <ChoiceCard
                    key={objective.id}
                    label={t(objective.labelKey)}
                    desc={t(objective.descKey)}
                    selected={processSetup.objectives.includes(objective.id)}
                    error={getError('objectives')}
                    multi
                    onClick={() => toggleObjective(objective.id)}
                  />
                ))}
                <FieldError show={getError('objectives')}>{t('setup.objectiveRequired')}</FieldError>
                <FieldError show={Boolean(objectiveError)}>{objectiveError}</FieldError>
              </div>
            </section>}

            {step === 3 && <section className="spice-card p-5 md:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f68b2c] text-[15px] font-bold text-white">3</span>
                <div>
                  <h2 className="text-[18px] font-bold text-[#444]">{t('setup.participationTitle')}</h2>
                  <SectionHelper>{t('setup.selectionRequired')}</SectionHelper>
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {PARTICIPATION_LEVELS.map((level) => (
                  <ChoiceCard
                    key={level.id}
                    label={t(level.labelKey)}
                    desc={t(level.descKey)}
                    selected={processSetup.level === level.id}
                    error={getError('level')}
                    onClick={() => updateProcessSetup({ level: level.id })}
                  />
                ))}
                <FieldError show={getError('level')}>{t('setup.participationRequired')}</FieldError>
              </div>
            </section>}

            {step === 3 && <section className="spice-card p-5 md:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f68b2c] text-[15px] font-bold text-white">4</span>
                <div>
                  <h2 className="text-[18px] font-bold text-[#444]">{t('setup.goalTitle')}</h2>
                  <SectionHelper>{t('setup.selectionRequired')}</SectionHelper>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {GOALS.map((goal) => (
                  <ChoiceCard
                    key={goal.id}
                    label={t(goal.labelKey)}
                    selected={processSetup.goal === goal.id}
                    error={getError('goal')}
                    onClick={() => updateProcessSetup({ goal: goal.id })}
                  />
                ))}
                <FieldError show={getError('goal')}>{t('setup.goalRequired')}</FieldError>
              </div>
            </section>}

            {step === 4 && <section className="spice-card p-5 md:p-7">
              <h2 className="text-[22px] font-bold text-[#444]">{t('setup.practicalTitle')}</h2>
              <SectionHelper>{t('setup.practicalText')}</SectionHelper>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <FilterSelect label={t('setup.groupSize')} value={processSetup.groupSize} options={localizedOptions(GROUP_SIZES)} onChange={(value) => updateProcessSetup({ groupSize: value })} error={getError('groupSize')} selectLabel={t('common.selectOne')} requiredMessage={t('common.requiredField')} />
                <FilterSelect label={t('setup.duration')} value={processSetup.duration} options={localizedOptions(DURATIONS)} onChange={(value) => updateProcessSetup({ duration: value })} error={getError('duration')} selectLabel={t('common.selectOne')} requiredMessage={t('common.requiredField')} />
                <FilterSelect label={t('setup.facilitation')} value={processSetup.facilitator} options={localizedOptions(FACILITATORS)} onChange={(value) => updateProcessSetup({ facilitator: value })} error={getError('facilitator')} selectLabel={t('common.selectOne')} requiredMessage={t('common.requiredField')} />
                <FilterSelect label={t('setup.mode')} value={processSetup.mode} options={MODES.map((mode) => ({ value: mode, label: t(`analogue.${mode.toLowerCase()}` as 'analogue.online' | 'analogue.offline' | 'analogue.hybrid') }))} onChange={(value) => updateProcessSetup({ mode: value as Mode })} error={getError('mode')} selectLabel={t('common.selectOne')} requiredMessage={t('common.requiredField')} />
              </div>
            </section>}

            <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => void handleBack()} className="flex min-h-11 items-center gap-2 border-2 border-[#444] bg-white px-5 font-bold text-[#444]"><ArrowLeft size={16} />{t('setup.back')}</button>
              <button onClick={() => void handleSaveDraft()} disabled={savingDraft} className="flex min-h-11 items-center gap-2 px-5 font-bold text-[#ca7428] transition-colors hover:bg-[#fff3e8] disabled:opacity-60"><Save size={16} /> {savingDraft ? t('common.saving') : t('setup.saveDraft')}</button>
              <button
              onClick={() => void handleContinue()}
                className="flex items-center gap-2 bg-[#f68b2c] px-8 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#e07a20]"
              >
                {t(step === 4 ? 'setup.reviewRecommendations' : 'setup.continue')} <ArrowRight size={16} />
              </button>
              {draftMessage && <p className="text-[13px] font-semibold text-[#2e6e45]">{draftMessage}</p>}
            </div>
          </div>

          {step === 4 && <aside className="flex w-full flex-shrink-0 flex-col gap-5 lg:w-[320px]">
            <div className="flex flex-col gap-4 spice-card p-5">
              <p className="text-[15px] font-bold text-[#444]">{t('setup.selectionsTitle')}</p>
              <div className="flex flex-col gap-2">
                {selections.length > 0 ? selections.map((selection) => (
                  <p key={String(selection)} className="text-[12px] leading-relaxed text-[#444]">{selection}</p>
                )) : <p className="text-[12px] text-[#888]">{t('setup.selectionsEmpty')}</p>}
              </div>
              <div className="flex items-start gap-2 bg-[#fef3e8] p-3">
                <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-[#f68b2c]" />
                <p className="text-[12px] font-semibold text-[#ca7428]">
                  {tp(matchingCount || tools.length, { one: 'setup.matchingTools.one', other: 'setup.matchingTools.other' })}
                </p>
              </div>
              <div className="bg-[#f5f5f5] p-3">
                <p className="text-[12px] leading-relaxed text-[#666]">
                  {t('setup.returnHint')}
                </p>
              </div>
            </div>
          </aside>}
        </div>
      </div>
    </SpicePublicShell>
  );
}
