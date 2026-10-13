import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock,
  ListChecks,
  Lock,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import LoadingState from '../components/LoadingState';
import { getTools, PHASES, TOOLS, type Mode, type Tool } from '../data/tools';
import { useI18n } from '../context/I18nContext';
import { DEFAULT_PROCESS_SETUP, processSetupFromInitiative, type ProcessSetupState } from '../lib/processSetup';
import { OBJECTIVE_NUMBERS, resourceLockMessage, useObjectiveResources, type ObjectiveSelections } from '../lib/objectiveResources';
import ObjectiveCoverage from '../components/ObjectiveCoverage';
import ObjectiveDigitalTools from '../components/ObjectiveDigitalTools';
import type { TranslationKey } from '../i18n/translations';
import { localizedApiError } from '../lib/localizedApiError';

const OBJECTIVE_PHASES: Record<string, number[]> = {
  framing: [1],
  collective: [2],
  codesign: [3],
  prototype: [4],
  consolidation: [5],
};

const MODE_OPTIONS: Array<'all' | Mode> = ['all', 'Online', 'Offline', 'Hybrid'];

// Participation levels of the SPICE catalogue, matched against each resource's English tags so the
// filter works in every language.
const PARTICIPATION_LEVELS: Array<{ value: string; tag: string; labelKey: TranslationKey }> = [
  { value: 'consult', tag: 'To consult', labelKey: 'setup.participation.consult' },
  { value: 'codesign', tag: 'To co-design', labelKey: 'setup.participation.codesign' },
  { value: 'selfgovern', tag: 'To self-govern', labelKey: 'setup.participation.selfgovern' },
];
const PARTICIPATION_TAGS = new Map(TOOLS.map((tool) => [tool.id, tool.objectiveTags]));

const PHASE_ICONS: Record<number, ElementType> = {
  1: Wrench,
  2: Users,
  3: Sparkles,
  4: ListChecks,
  5: CheckCircle2,
};

function parseSize(value: string) {
  if (!value) return null;
  if (value.includes('Any')) return 999;
  const numbers = value.match(/\d+/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : null;
}

function parseDurationBucket(value: string) {
  const lower = value.toLowerCase();
  if (!lower) return 0;
  if (lower.includes('min') || lower.includes('hour') || lower.includes('half')) return 1;
  if (lower.includes('day')) return 2;
  if (lower.includes('week') || lower.includes('ongoing')) return 3;
  return 1;
}

function scoreTool(tool: Tool, selectedPhases: number[], setup: ProcessSetupState, t: (key: TranslationKey, values?: Record<string, string | number>) => string, phaseName: string) {
  let score = 0;
  const reasons: string[] = [];

  if (selectedPhases.includes(tool.phase)) {
    score += 4;
    reasons.push(t('setup.reasonPhase', { phase: phaseName }));
  }

  if (setup.mode && (tool.mode === setup.mode || tool.mode === 'Hybrid' || setup.mode === 'Hybrid')) {
    score += 2;
    reasons.push(t('setup.reasonMode', { mode: t(`resources.${tool.mode.toLowerCase()}` as TranslationKey) }));
  }

  if (setup.groupSize) {
    const requested = parseSize(setup.groupSize);
    const toolSize = parseSize(tool.groupSize);
    if (requested && toolSize && toolSize >= Math.min(requested, 30)) {
      score += 1;
      reasons.push(t('setup.reasonGroup'));
    }
  }

  if (setup.duration) {
    const requestedDuration = parseDurationBucket(setup.duration);
    const toolDuration = parseDurationBucket(tool.duration);
    if (!requestedDuration || toolDuration <= requestedDuration + 1) {
      score += 1;
      reasons.push(t('setup.reasonDuration'));
    }
  }

  if (setup.facilitator && tool.facilitatorRatio.includes('1:')) {
    score += 1;
    reasons.push(t('setup.reasonFacilitation'));
  }

  return { score, reasons: reasons.slice(0, 3) };
}

function SelectFilter({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="spice-field-group min-w-[150px] flex-1 gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-[#888]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border border-[#bfc0c5] bg-white px-3 py-2.5 text-[13px] font-medium text-[#444] outline-none transition-colors hover:border-[#f68b2c]"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ToolCard({ tool, phaseName, reasons, inProcess, lockMessage, onToggle, onMore, t }: {
  tool: Tool;
  phaseName: string;
  reasons: string[];
  inProcess: boolean;
  /** Why the resource cannot be added or removed right now, if it cannot. */
  lockMessage: string | null;
  onToggle: () => void;
  onMore: () => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}) {
  const Icon = PHASE_ICONS[tool.phase] || Wrench;

  return (
    <article
      className="flex min-h-[286px] flex-col gap-4 border bg-white p-5 shadow-[0_10px_22px_rgba(0,0,0,0.08)] transition-colors"
      style={{
        borderColor: inProcess ? 'var(--border-active)' : 'var(--border-default)',
        borderWidth: inProcess ? 3 : 2,
        backgroundColor: inProcess ? 'var(--surface-active)' : 'white',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[rgba(246,139,44,0.15)]">
          <Icon size={22} className="text-[#ca7428]" />
        </div>
        {inProcess && (
          <span className="inline-flex items-center gap-1.5 bg-[#f68b2c] px-2.5 py-1 text-[11px] font-bold text-white">
            <CheckCircle2 size={13} /> {t('setup.enabled')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div>
          <p className="text-[18px] font-bold leading-tight text-[#444]">{tool.name}</p>
          <p className="mt-1 text-[12px] font-semibold text-[#ca7428]">{phaseName}</p>
        </div>
        <p className="text-[13px] font-medium leading-relaxed text-[#666]">{tool.shortDesc}</p>
        {reasons.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {reasons.map((reason) => (
              <span key={reason} className="bg-[#f2f2f2] px-2.5 py-1 text-[11px] font-semibold text-[#555]">
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-[#555]">
        <span className="flex items-center gap-1.5 bg-[#f5f5f5] px-2.5 py-2"><Clock size={12} /> {tool.duration}</span>
        <span className="flex items-center gap-1.5 bg-[#f5f5f5] px-2.5 py-2"><Users size={12} /> {tool.groupSize}</span>
        <span className="bg-[#f5f5f5] px-2.5 py-2">{t(`resources.${tool.mode.toLowerCase()}` as TranslationKey)}</span>
      </div>

      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onMore}
          className="flex-1 border border-[#bfc0c5] px-4 py-2.5 text-[13px] font-semibold text-[#444] transition-colors hover:bg-[#f7f7f7]"
        >
          {t('setup.moreInformation')}
        </button>
        <button
          onClick={onToggle}
          disabled={Boolean(lockMessage)}
          title={lockMessage || undefined}
          className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-[13px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: inProcess ? '#a86622' : '#f68b2c' }}
        >
          {lockMessage && <Lock size={13} aria-hidden="true" />}
          {inProcess ? t('setup.disableTool') : t('setup.enableTool')}
        </button>
      </div>
      {lockMessage && <p className="flex items-start gap-1.5 text-[12px] font-semibold text-[#8a4b16]"><Lock size={13} className="mt-0.5 flex-none" aria-hidden="true" />{lockMessage}</p>}
    </article>
  );
}

export default function SetUpProcessToolsPage() {
  const navigate = useNavigate();
  const { language, t, tp } = useI18n();
  // "Explore the toolkit freely" opens the same page without the questionnaire: every Objective is shown.
  const [searchParams] = useSearchParams();
  const exploring = searchParams.get('mode') === 'explore';
  const tools = useMemo(() => getTools(language), [language]);
  const { initiative, selections, loading, error, save, editContext } = useObjectiveResources(true);
  const [processSetup, setProcessSetup] = useState<ProcessSetupState>(DEFAULT_PROCESS_SETUP);
  // Draft of the resources chosen per Objective; saved together when the Municipality continues.
  const [draft, setDraft] = useState<ObjectiveSelections>(selections);
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initiative) setProcessSetup(processSetupFromInitiative(initiative));
    setDraft(selections);
  }, [initiative, selections]);

  const loadError = error ? localizedApiError(t, error, 'setup.loadFailed') : !loading && !initiative ? t('setup.noPilot') : '';
  const myProcessTools = [...new Set(OBJECTIVE_NUMBERS.flatMap((number) => draft[number] || []))];
  const isSelected = (phaseNumber: number, id: string) => (draft[phaseNumber] || []).includes(id);
  // The same rules as the server, checked against the unsaved draft.
  const lockMessageFor = (phaseNumber: number, id: string) => resourceLockMessage(t, editContext, phaseNumber, id, draft[phaseNumber] || []);
  const toggleResource = (phaseNumber: number, id: string, name: string) => {
    const lockMessage = lockMessageFor(phaseNumber, id);
    if (lockMessage) { toast.error(lockMessage); return; }
    const selected = isSelected(phaseNumber, id);
    setDraft((current) => ({
      ...current,
      [phaseNumber]: selected ? (current[phaseNumber] || []).filter((item) => item !== id) : [...(current[phaseNumber] || []), id],
    }));
    toast.success(t(selected ? 'coverage.removed' : 'coverage.added', { resource: name, number: phaseNumber }));
  };

  const selectedPhases = useMemo(() => {
    const phases = exploring ? [] : processSetup.objectives.flatMap((objective) => OBJECTIVE_PHASES[objective] || []);
    return phases.length ? Array.from(new Set(phases)) : [1, 2, 3, 4, 5];
  }, [exploring, processSetup.objectives]);

  const phaseNameById = useMemo(() => new Map(PHASES.map((phase) => [phase.id, t(phase.nameKey)])), [t]);

  const scoredTools = useMemo(() => {
    return tools.map((tool) => {
      const result = scoreTool(tool, selectedPhases, processSetup, t, phaseNameById.get(tool.phase) || '');
      return { tool, ...result };
    }).sort((a, b) => b.score - a.score || a.tool.phase - b.tool.phase || a.tool.name.localeCompare(b.tool.name));
  }, [phaseNameById, processSetup, selectedPhases, t, tools]);

  const filteredTools = scoredTools.filter(({ tool }) => {
    const matchSearch = `${tool.name} ${tool.shortDesc} ${phaseNameById.get(tool.phase) || ''} ${tool.objectiveTags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const matchMode = modeFilter === 'all' || tool.mode === modeFilter || tool.mode === 'Hybrid';
    const matchPhase = phaseFilter === 'all' || tool.phase === Number(phaseFilter);
    const levelTag = PARTICIPATION_LEVELS.find((level) => level.value === levelFilter)?.tag;
    const matchLevel = !levelTag || (PARTICIPATION_TAGS.get(tool.id) || []).includes(levelTag);
    return matchSearch && matchMode && matchPhase && matchLevel;
  });

  const visiblePhase = (phaseNumber: number) => phaseFilter === 'all' || Number(phaseFilter) === phaseNumber;
  const showDigital = modeFilter !== 'Offline';

  // Every visible Objective is listed, so its digital tools can be chosen even when no analogue resource matches.
  const toolsByPhase = PHASES.map((phase) => ({
    phase,
    tools: filteredTools.filter(({ tool }) => tool.phase === phase.id),
  })).filter((group) => visiblePhase(group.phase.id) && (group.tools.length > 0 || showDigital));

  const continueWithTools = async () => {
    if (myProcessTools.length === 0) {
      toast.error(t('setup.enableOne'));
      return;
    }
    if (!initiative) return;
    setSaving(true);
    try {
      await save(draft);
      // The hub decides where to land: the start page until every Objective has a resource, the hub afterwards.
      navigate('/co-creation-hub');
    } catch (caught) {
      toast.error(localizedApiError(t, caught, 'setup.selectedSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const showObjective = (phaseNumber: number) => {
    setPhaseFilter(String(phaseNumber));
    window.requestAnimationFrame(() => document.getElementById(`setup-objective-${phaseNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
      <div className="spice-page spice-wide-page flex flex-col gap-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#ca7428]">{t(exploring ? 'process.explore' : 'setup.toolsStep')}</p>
            <h1 className="mt-2 text-[32px] font-bold text-[#444]">{t('setup.toolsTitle')}</h1>
            <p className="mt-2 max-w-[760px] text-[15px] font-medium leading-relaxed text-[#666]">
              {t(exploring ? 'setup.exploreIntro' : 'setup.toolsIntro')}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-nowrap">
            <button
              onClick={() => navigate(exploring ? '/co-creation-process?revisit=1' : '/setup-questionnaire')}
              className="flex items-center gap-2 whitespace-nowrap border border-[#444] bg-white px-5 py-3 text-[14px] font-semibold text-[#444] transition-colors hover:bg-[#f7f7f7]"
            >
              <ArrowLeft size={15} /> {t(exploring ? 'common.back' : 'setup.previousStep')}
            </button>
            <button
              onClick={() => void continueWithTools()}
              disabled={saving}
              className="flex items-center gap-2 whitespace-nowrap bg-[#f68b2c] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#e07a20]"
            >
              {saving ? t('common.saving') : t('setup.continueSelected')} <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <ObjectiveCoverage selections={draft} onSelectObjective={showObjective} />

        <section className="spice-card p-5">
          <div className="mb-4 flex items-center gap-2 text-[14px] font-bold text-[#444]">
            <SlidersHorizontal size={17} className="text-[#ca7428]" /> {t('setup.filterRecommendations')}
          </div>
          <div className="flex flex-col items-start gap-3 lg:flex-row">
            <label className="spice-field-group w-full min-w-[260px] flex-[2] gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#888]">{t('common.search')}</span>
              <span className="flex items-center gap-2 border border-[#bfc0c5] bg-white px-3 py-2.5">
                <Search size={15} className="text-[#888]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('setup.searchPlaceholder')}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#444] outline-none placeholder:text-[#999]"
                />
              </span>
            </label>
            <SelectFilter label={t('setup.phase')} value={phaseFilter} options={[{ value: 'all', label: t('setup.allObjectivesFilter') }, ...PHASES.map((phase) => ({ value: String(phase.id), label: t(phase.nameKey) }))]} onChange={setPhaseFilter} />
            <SelectFilter label={t('setup.mode')} value={modeFilter} options={MODE_OPTIONS.map((mode) => ({ value: mode, label: mode === 'all' ? t('setup.allModes') : t(`resources.${mode.toLowerCase()}` as TranslationKey) }))} onChange={setModeFilter} />
            <SelectFilter label={t('setup.participationLevelFilter')} value={levelFilter} options={[{ value: 'all', label: t('setup.allParticipationLevels') }, ...PARTICIPATION_LEVELS.map((level) => ({ value: level.value, label: t(level.labelKey) }))]} onChange={setLevelFilter} />
          </div>
        </section>

        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-[#444]">{tp(filteredTools.length, { one: 'setup.recommendations.one', other: 'setup.recommendations.other' })}</h2>
          <button onClick={() => navigate('/setup-questionnaire')} className="text-[13px] font-semibold text-[#ca7428] underline">
            {t('setup.editChoices')}
          </button>
        </div>

        <div className="flex flex-col gap-8">
          {toolsByPhase.map(({ phase, tools }) => (
            <div key={phase.id} id={`setup-objective-${phase.id}`} className="flex scroll-mt-28 flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[13px] font-bold text-white ${phase.bg}`}>{phase.id}</span>
                <h3 className="text-[17px] font-bold text-[#444]">{t(phase.nameKey)}</h3>
                <span className="ml-auto text-[13px] font-medium text-[#888]">{tp(tools.length, { one: 'setup.toolsInPhase.one', other: 'setup.toolsInPhase.other' })}</span>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {tools.map(({ tool, reasons }) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    phaseName={phaseNameById.get(tool.phase) || ''}
                    reasons={reasons}
                    inProcess={isSelected(tool.phase, tool.id)}
                    lockMessage={lockMessageFor(tool.phase, tool.id)}
                    onToggle={() => toggleResource(tool.phase, tool.id, tool.name)}
                    onMore={() => navigate(`/tool-detail/${tool.id}`)}
                    t={t}
                  />
                ))}
              </div>
              {showDigital && <ObjectiveDigitalTools phaseNumber={phase.id} selectedIds={draft[phase.id] || []} onToggle={(id, name) => toggleResource(phase.id, id, name)} lockMessageFor={(id) => lockMessageFor(phase.id, id)} />}
            </div>
          ))}
        </div>

        {toolsByPhase.length === 0 && (
          <div className="spice-card-dashed py-16 text-center">
            <p className="text-[16px] font-bold text-[#444]">{t('setup.noTools')}</p>
            <p className="mt-2 text-[13px] text-[#777]">{t('setup.noToolsHint')}</p>
          </div>
        )}
      </div>
    </SpicePublicShell>
  );
}
