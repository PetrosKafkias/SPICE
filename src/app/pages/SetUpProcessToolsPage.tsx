import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock,
  ListChecks,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import LoadingState from '../components/LoadingState';
import { getTools, PHASES, type Mode, type Tool } from '../data/tools';
import { useI18n } from '../context/I18nContext';
import { apiRequest, jsonBody } from '../lib/api';
import { DEFAULT_PROCESS_SETUP, processSetupFromInitiative, type ProcessSetupState } from '../lib/processSetup';
import type { TranslationKey } from '../i18n/translations';
import { localizedApiError } from '../lib/localizedApiError';

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
}

const OBJECTIVE_PHASES: Record<string, number[]> = {
  framing: [1],
  collective: [2],
  codesign: [3],
  prototype: [4],
  consolidation: [5],
};

const OBJECTIVE_LABELS: Record<string, TranslationKey> = {
  framing: 'setup.objective.framing',
  collective: 'setup.objective.collective',
  codesign: 'setup.objective.codesign',
  prototype: 'setup.objective.prototype',
  consolidation: 'setup.objective.consolidation',
};

const MODE_OPTIONS: Array<'all' | Mode> = ['all', 'Online', 'Offline', 'Hybrid'];

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

function scoreTool(tool: Tool, selectedPhases: number[], setup: ProcessSetupState, t: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  let score = 0;
  const reasons: string[] = [];

  if (selectedPhases.includes(tool.phase)) {
    score += 4;
    reasons.push(t('setup.reasonPhase', { phase: tool.phaseName }));
  }

  if (setup.mode && (tool.mode === setup.mode || tool.mode === 'Hybrid' || setup.mode === 'Hybrid')) {
    score += 2;
    reasons.push(t('setup.reasonMode', { mode: t(`analogue.${tool.mode.toLowerCase()}` as TranslationKey) }));
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

function ToolCard({ tool, reasons, inProcess, onToggle, onMore, t }: {
  tool: Tool;
  reasons: string[];
  inProcess: boolean;
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
          <p className="mt-1 text-[12px] font-semibold text-[#ca7428]">{tool.phaseName}</p>
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
        <span className="bg-[#f5f5f5] px-2.5 py-2">{t(`analogue.${tool.mode.toLowerCase()}` as TranslationKey)}</span>
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
          className="flex-1 px-4 py-2.5 text-[13px] font-bold text-white transition-colors"
          style={{ backgroundColor: inProcess ? '#a86622' : '#f68b2c' }}
        >
          {inProcess ? t('setup.disableTool') : t('setup.enableTool')}
        </button>
      </div>
    </article>
  );
}

export default function SetUpProcessToolsPage() {
  const navigate = useNavigate();
  const { language, t, tp } = useI18n();
  const tools = useMemo(() => getTools(language), [language]);
  const [initiativeId, setInitiativeId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [processSetup, setProcessSetup] = useState<ProcessSetupState>(DEFAULT_PROCESS_SETUP);
  const [myProcessTools, setMyProcessTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('recommended');
  const [saving, setSaving] = useState(false);

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
        setMyProcessTools(initiative.setupSelectedTools || []);
      } catch (caught) {
        if (!cancelled) setLoadError(localizedApiError(t, caught, 'setup.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  const addToolToProcess = (toolId: string) => setMyProcessTools((prev) => (prev.includes(toolId) ? prev : [...prev, toolId]));
  const removeToolFromProcess = (toolId: string) => setMyProcessTools((prev) => prev.filter((id) => id !== toolId));

  const selectedPhases = useMemo(() => {
    const phases = processSetup.objectives.flatMap((objective) => OBJECTIVE_PHASES[objective] || []);
    return phases.length ? Array.from(new Set(phases)) : [1, 2, 3, 4, 5];
  }, [processSetup.objectives]);

  const scoredTools = useMemo(() => {
    return tools.map((tool) => {
      const result = scoreTool(tool, selectedPhases, processSetup, t);
      return { tool, ...result };
    }).sort((a, b) => b.score - a.score || a.tool.phase - b.tool.phase || a.tool.name.localeCompare(b.tool.name));
  }, [processSetup, selectedPhases, t, tools]);

  const filteredTools = scoredTools.filter(({ tool, score }) => {
    const matchSearch = `${tool.name} ${tool.shortDesc} ${tool.phaseName} ${tool.objectiveTags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const matchMode = modeFilter === 'all' || tool.mode === modeFilter || tool.mode === 'Hybrid';
    const matchPhase = phaseFilter === 'recommended' ? selectedPhases.includes(tool.phase) : tool.phase === Number(phaseFilter);
    return matchSearch && matchMode && matchPhase && score > 0;
  });

  const activeObjectiveLabels = processSetup.objectives.map((id) => OBJECTIVE_LABELS[id]).filter(Boolean).map((key) => t(key));
  const selectedCount = filteredTools.filter(({ tool }) => myProcessTools.includes(tool.id)).length;

  const toolsByPhase = PHASES.map((phase) => ({
    phase,
    tools: filteredTools.filter(({ tool }) => tool.phase === phase.id),
  })).filter((group) => group.tools.length > 0);

  const toggleTool = (tool: Tool) => {
    if (myProcessTools.includes(tool.id)) {
      removeToolFromProcess(tool.id);
      toast.success(t('setup.toolDisabled', { tool: tool.name }));
      return;
    }
    addToolToProcess(tool.id);
    toast.success(t('setup.toolEnabled', { tool: tool.name }));
  };

  const continueWithTools = async () => {
    if (myProcessTools.length === 0) {
      toast.error(t('setup.enableOne'));
      return;
    }
    if (!initiativeId) return;
    setSaving(true);
    try {
      const result = await apiRequest<{ initiative: Initiative }>(`/api/hub/initiatives/${initiativeId}`, {
        method: 'PATCH', body: jsonBody({ setupSelectedTools: myProcessTools, version }),
      });
      setVersion(result.initiative.version);
      navigate('/co-creation-hub');
    } catch {
      toast.error(t('setup.selectedSaveFailed'));
    } finally {
      setSaving(false);
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
      <div className="spice-page spice-wide-page flex flex-col gap-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#ca7428]">{t('setup.toolsStep')}</p>
            <h1 className="mt-2 text-[32px] font-bold text-[#444]">{t('setup.toolsTitle')}</h1>
            <p className="mt-2 max-w-[760px] text-[15px] font-medium leading-relaxed text-[#666]">
              {t('setup.toolsIntro')}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-nowrap">
            <button
              onClick={() => navigate('/setup-questionnaire')}
              className="flex items-center gap-2 whitespace-nowrap border border-[#444] bg-white px-5 py-3 text-[14px] font-semibold text-[#444] transition-colors hover:bg-[#f7f7f7]"
            >
              <ArrowLeft size={15} /> {t('setup.previousStep')}
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

        <section className="grid gap-4 spice-card p-5 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#444]">
              <Sparkles size={18} className="text-[#ca7428]" /> {t('setup.recommendationBasis')}
            </div>
            <div className="flex flex-wrap gap-2">
              {(activeObjectiveLabels.length ? activeObjectiveLabels : [t('setup.allObjectives')]).map((label) => (
                <span key={label} className="bg-[#fef3e8] px-3 py-1.5 text-[12px] font-semibold text-[#ca7428]">{label}</span>
              ))}
              <span className="bg-[#f2f2f2] px-3 py-1.5 text-[12px] font-semibold text-[#555]">{processSetup.mode ? t(`analogue.${processSetup.mode.toLowerCase()}` as TranslationKey) : t('setup.anyMode')}</span>
              {processSetup.groupSize && <span className="bg-[#f2f2f2] px-3 py-1.5 text-[12px] font-semibold text-[#555]">{processSetup.groupSize}</span>}
              {processSetup.duration && <span className="bg-[#f2f2f2] px-3 py-1.5 text-[12px] font-semibold text-[#555]">{processSetup.duration}</span>}
            </div>
          </div>
          <div className="border-t border-[#eee] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <p className="text-[28px] font-bold text-[#444]">{myProcessTools.length}</p>
            <p className="text-[13px] font-semibold text-[#666]">{tp(myProcessTools.length, { one: 'setup.enabledCount.one', other: 'setup.enabledCount.other' })}</p>
            <p className="mt-2 text-[12px] text-[#888]">{tp(selectedCount, { one: 'setup.currentEnabled.one', other: 'setup.currentEnabled.other' })}</p>
          </div>
        </section>

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
            <SelectFilter label={t('setup.phase')} value={phaseFilter} options={[{ value: 'recommended', label: t('setup.recommendedPhases') }, ...PHASES.map((phase) => ({ value: String(phase.id), label: t(phase.nameKey) }))]} onChange={setPhaseFilter} />
            <SelectFilter label={t('setup.mode')} value={modeFilter} options={MODE_OPTIONS.map((mode) => ({ value: mode, label: mode === 'all' ? t('setup.allModes') : t(`analogue.${mode.toLowerCase()}` as TranslationKey) }))} onChange={setModeFilter} />
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
            <div key={phase.id} className="flex flex-col gap-4">
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
                    reasons={reasons}
                    inProcess={myProcessTools.includes(tool.id)}
                    onToggle={() => toggleTool(tool)}
                    onMore={() => navigate(`/tool-detail/${tool.id}`)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="spice-card-dashed py-16 text-center">
            <p className="text-[16px] font-bold text-[#444]">{t('setup.noTools')}</p>
            <p className="mt-2 text-[13px] text-[#777]">{t('setup.noToolsHint')}</p>
          </div>
        )}
      </div>
    </SpicePublicShell>
  );
}
