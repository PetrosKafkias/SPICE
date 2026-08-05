import { useMemo, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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
import { PHASES, TOOLS, type Mode, type Tool } from '../data/tools';
import { useApp } from '../context/AppContext';

const OBJECTIVE_PHASES: Record<string, number[]> = {
  framing: [1],
  collective: [2],
  codesign: [3],
  prototype: [4],
  consolidation: [5],
};

const OBJECTIVE_LABELS: Record<string, string> = {
  framing: 'Framing and readiness',
  collective: 'Collective understanding',
  codesign: 'Co-design and scenario building',
  prototype: 'Prototype and test ideas',
  consolidation: 'Consolidation, learning and governance',
};

const MODE_OPTIONS: Array<'All modes' | Mode> = ['All modes', 'Online', 'Offline', 'Hybrid'];

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

function scoreTool(tool: Tool, selectedPhases: number[], setup: ReturnType<typeof useApp>['processSetup']) {
  let score = 0;
  const reasons: string[] = [];

  if (selectedPhases.includes(tool.phase)) {
    score += 4;
    reasons.push(`matches ${tool.phaseName}`);
  }

  if (setup.mode && (tool.mode === setup.mode || tool.mode === 'Hybrid' || setup.mode === 'Hybrid')) {
    score += 2;
    reasons.push(`${tool.mode} delivery`);
  }

  if (setup.groupSize) {
    const requested = parseSize(setup.groupSize);
    const toolSize = parseSize(tool.groupSize);
    if (requested && toolSize && toolSize >= Math.min(requested, 30)) {
      score += 1;
      reasons.push('fits the group size');
    }
  }

  if (setup.duration) {
    const requestedDuration = parseDurationBucket(setup.duration);
    const toolDuration = parseDurationBucket(tool.duration);
    if (!requestedDuration || toolDuration <= requestedDuration + 1) {
      score += 1;
      reasons.push('fits the activity duration');
    }
  }

  if (setup.facilitator && tool.facilitatorRatio.includes('1:')) {
    score += 1;
    reasons.push('works with the facilitation capacity');
  }

  return { score, reasons: reasons.slice(0, 3) };
}

function SelectFilter({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
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
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ToolCard({ tool, reasons, inProcess, onToggle, onMore }: {
  tool: Tool;
  reasons: string[];
  inProcess: boolean;
  onToggle: () => void;
  onMore: () => void;
}) {
  const Icon = PHASE_ICONS[tool.phase] || Wrench;

  return (
    <article
      className="flex min-h-[286px] flex-col gap-4 border bg-white p-5 shadow-[0_10px_22px_rgba(0,0,0,0.08)] transition-colors"
      style={{
        borderColor: inProcess ? '#f68b2c' : '#d7d8dc',
        borderWidth: inProcess ? 3 : 2,
        backgroundColor: inProcess ? '#fff8f2' : 'white',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[rgba(246,139,44,0.15)]">
          <Icon size={22} className="text-[#ca7428]" />
        </div>
        {inProcess && (
          <span className="inline-flex items-center gap-1.5 bg-[#f68b2c] px-2.5 py-1 text-[11px] font-bold text-white">
            <CheckCircle2 size={13} /> In My Process
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
        <span className="bg-[#f5f5f5] px-2.5 py-2">{tool.mode}</span>
      </div>

      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onMore}
          className="flex-1 border border-[#bfc0c5] px-4 py-2.5 text-[13px] font-semibold text-[#444] transition-colors hover:bg-[#f7f7f7]"
        >
          More information
        </button>
        <button
          onClick={onToggle}
          className="flex-1 px-4 py-2.5 text-[13px] font-bold text-white transition-colors"
          style={{ backgroundColor: inProcess ? '#a86622' : '#f68b2c' }}
        >
          {inProcess ? 'Remove from Process' : 'Add to Process'}
        </button>
      </div>
    </article>
  );
}

export default function SetUpProcessToolsPage() {
  const navigate = useNavigate();
  const { processSetup, myProcessTools, addToolToProcess, removeToolFromProcess, saveProcessDraft } = useApp();
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('All modes');
  const [phaseFilter, setPhaseFilter] = useState<string>('Recommended phases');
  const [saving, setSaving] = useState(false);

  const selectedPhases = useMemo(() => {
    const phases = processSetup.objectives.flatMap((objective) => OBJECTIVE_PHASES[objective] || []);
    return phases.length ? Array.from(new Set(phases)) : [1, 2, 3, 4, 5];
  }, [processSetup.objectives]);

  const scoredTools = useMemo(() => {
    return TOOLS.map((tool) => {
      const result = scoreTool(tool, selectedPhases, processSetup);
      return { tool, ...result };
    }).sort((a, b) => b.score - a.score || a.tool.phase - b.tool.phase || a.tool.name.localeCompare(b.tool.name));
  }, [processSetup, selectedPhases]);

  const filteredTools = scoredTools.filter(({ tool, score }) => {
    const matchSearch = `${tool.name} ${tool.shortDesc} ${tool.phaseName} ${tool.objectiveTags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const matchMode = modeFilter === 'All modes' || tool.mode === modeFilter || tool.mode === 'Hybrid';
    const matchPhase = phaseFilter === 'Recommended phases' ? selectedPhases.includes(tool.phase) : tool.phaseName === phaseFilter;
    return matchSearch && matchMode && matchPhase && score > 0;
  });

  const activeObjectiveLabels = processSetup.objectives.map((id) => OBJECTIVE_LABELS[id]).filter(Boolean);
  const selectedCount = filteredTools.filter(({ tool }) => myProcessTools.includes(tool.id)).length;

  const toggleTool = (tool: Tool) => {
    if (myProcessTools.includes(tool.id)) {
      removeToolFromProcess(tool.id);
      toast.success(`${tool.name} removed from your process.`);
      return;
    }
    addToolToProcess(tool.id);
    toast.success(`${tool.name} added to your process.`);
  };

  const continueWithTools = async () => {
    if (myProcessTools.length === 0) {
      toast.error('Add at least one tool before continuing.');
      return;
    }
    setSaving(true);
    try {
      await saveProcessDraft();
      navigate('/co-creation-hub');
    } catch {
      toast.error('Your selected tools could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SpicePublicShell variant="public">
      <div className="spice-page spice-wide-page flex flex-col gap-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#ca7428]">Step 2 of 2</p>
            <h1 className="mt-2 text-[32px] font-bold text-[#444]">Recommended tools for your process</h1>
            <p className="mt-2 max-w-[760px] text-[15px] font-medium leading-relaxed text-[#666]">
              These recommendations respond to your selected objectives, phase focus, activity mode, group size, duration, and facilitation capacity.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-nowrap">
            <button
              onClick={() => navigate('/setup-questionnaire')}
              className="flex items-center gap-2 whitespace-nowrap border border-[#444] bg-white px-5 py-3 text-[14px] font-semibold text-[#444] transition-colors hover:bg-[#f7f7f7]"
            >
              <ArrowLeft size={15} /> Previous Step
            </button>
            <button
              onClick={() => void continueWithTools()}
              disabled={saving}
              className="flex items-center gap-2 whitespace-nowrap bg-[#f68b2c] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#e07a20]"
            >
              {saving ? 'Saving...' : 'Continue with Selected Tools'} <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <section className="grid gap-4 border-2 border-[#bfc0c5] bg-white p-5 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#444]">
              <Sparkles size={18} className="text-[#ca7428]" /> Recommendation basis
            </div>
            <div className="flex flex-wrap gap-2">
              {(activeObjectiveLabels.length ? activeObjectiveLabels : ['All co-creation objectives']).map((label) => (
                <span key={label} className="bg-[#fef3e8] px-3 py-1.5 text-[12px] font-semibold text-[#ca7428]">{label}</span>
              ))}
              <span className="bg-[#f2f2f2] px-3 py-1.5 text-[12px] font-semibold text-[#555]">{processSetup.mode || 'Any mode'}</span>
              {processSetup.groupSize && <span className="bg-[#f2f2f2] px-3 py-1.5 text-[12px] font-semibold text-[#555]">{processSetup.groupSize}</span>}
              {processSetup.duration && <span className="bg-[#f2f2f2] px-3 py-1.5 text-[12px] font-semibold text-[#555]">{processSetup.duration}</span>}
            </div>
          </div>
          <div className="border-t border-[#eee] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <p className="text-[28px] font-bold text-[#444]">{myProcessTools.length}</p>
            <p className="text-[13px] font-semibold text-[#666]">tools in your process</p>
            <p className="mt-2 text-[12px] text-[#888]">{selectedCount} selected from the current results.</p>
          </div>
        </section>

        <section className="border-2 border-[#bfc0c5] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-[14px] font-bold text-[#444]">
            <SlidersHorizontal size={17} className="text-[#ca7428]" /> Filter recommendations
          </div>
          <div className="flex flex-col items-start gap-3 lg:flex-row">
            <label className="spice-field-group w-full min-w-[260px] flex-[2] gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#888]">Search</span>
              <span className="flex items-center gap-2 border border-[#bfc0c5] bg-white px-3 py-2.5">
                <Search size={15} className="text-[#888]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by tool, phase, or objective"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#444] outline-none placeholder:text-[#999]"
                />
              </span>
            </label>
            <SelectFilter label="Phase" value={phaseFilter} options={['Recommended phases', ...PHASES.map((phase) => phase.name)]} onChange={setPhaseFilter} />
            <SelectFilter label="Mode" value={modeFilter} options={MODE_OPTIONS} onChange={setModeFilter} />
          </div>
        </section>

        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-[#444]">{filteredTools.length} matching tools</h2>
          <button onClick={() => navigate('/setup-questionnaire')} className="text-[13px] font-semibold text-[#ca7428] underline">
            Edit setup choices
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map(({ tool, reasons }) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              reasons={reasons}
              inProcess={myProcessTools.includes(tool.id)}
              onToggle={() => toggleTool(tool)}
              onMore={() => navigate(`/tool-detail/${tool.id}`)}
            />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="border-2 border-dashed border-[#d7d8dc] bg-white py-16 text-center">
            <p className="text-[16px] font-bold text-[#444]">No tools match these filters.</p>
            <p className="mt-2 text-[13px] text-[#777]">Try a broader phase or mode filter.</p>
          </div>
        )}
      </div>
    </SpicePublicShell>
  );
}
