import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Save } from 'lucide-react';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import { TOOLS, type Mode } from '../data/tools';
import { useApp } from '../context/AppContext';

const STAGES = [
  { id: 'proposal', label: 'We are currently writing the project proposal', desc: 'Scoping tools and methods for the funding application.' },
  { id: 'setup', label: 'Project is funded and tools need to be set up', desc: 'Process design and tool selection phase.' },
  { id: 'underway', label: 'Project is underway and targeted guidance is needed', desc: 'Mid-process support for a specific phase or challenge.' },
];

const OBJECTIVES = [
  { id: 'framing', label: 'Framing and readiness', desc: 'Assess whether the pilot is ready to co-design and who needs to be involved.' },
  { id: 'collective', label: 'Collective understanding', desc: 'Engage local actors to understand place-based challenges and needs.' },
  { id: 'codesign', label: 'Co-design and scenario building', desc: 'Co-create ideas, compare scenarios, and shape desirable solutions.' },
  { id: 'prototype', label: 'Prototype and test ideas', desc: 'Collect feedback on possible solutions through quick testing.' },
  { id: 'consolidation', label: 'Consolidation, learning and governance', desc: 'Turn results into responsibilities, outputs, learning, and next steps.' },
];

const PARTICIPATION_LEVELS = [
  { id: 'inform', label: 'Inform and explain', desc: 'Use clear materials to help people understand the project and decisions.' },
  { id: 'consult', label: 'Consult and collect feedback', desc: 'Ask citizens and stakeholders to comment, vote, map, or respond.' },
  { id: 'cocreate', label: 'Co-create with participants', desc: 'Work together on ideas, scenarios, priorities, and future actions.' },
];

const GOALS = [
  { id: 'physical', label: 'Physical site intervention' },
  { id: 'intangible', label: 'Intangible results, events, or community organisation' },
  { id: 'undefined', label: 'Not defined yet' },
];

const GROUP_SIZES = ['< 10 people', '10-25 people', '25-50 people', '50+ people'];
const DURATIONS = ['< 5 minutes', '5-30 minutes', '30 min - 2 hours', 'Half day', 'Full day', 'Multi-day'];
const FACILITATORS = ['1 person', '2-3 people', '4+ people'];
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

function FilterSelect({ label, value, options, onChange, error }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error: boolean;
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
          <option value="">Select one</option>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888]" />
      </div>
      <FieldError show={error}>This field is required.</FieldError>
    </div>
  );
}

export default function SetUpProcessQuestionnairePage() {
  const navigate = useNavigate();
  const { processSetup, updateProcessSetup, saveProcessDraft } = useApp();
  const [submitted, setSubmitted] = useState(false);
  const [objectiveError, setObjectiveError] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  const getError = (key: keyof typeof processSetup) => submitted && (
    Array.isArray(processSetup[key]) ? (processSetup[key] as string[]).length === 0 : !processSetup[key]
  );

  const toggleObjective = (id: string) => {
    setObjectiveError('');
    const exists = processSetup.objectives.includes(id);
    if (!exists && processSetup.objectives.length >= 2) {
      setObjectiveError('Select up to two choices.');
      return;
    }
    updateProcessSetup({
      objectives: exists
        ? processSetup.objectives.filter((objective) => objective !== id)
        : [...processSetup.objectives, id],
    });
  };

  const selections = useMemo(() => [
    processSetup.stage && `Stage: ${STAGES.find((item) => item.id === processSetup.stage)?.label}`,
    processSetup.objectives.length > 0 && `Objectives: ${processSetup.objectives.map((id) => OBJECTIVES.find((item) => item.id === id)?.label).join(', ')}`,
    processSetup.level && `Participation: ${PARTICIPATION_LEVELS.find((item) => item.id === processSetup.level)?.label}`,
    processSetup.goal && `Goal: ${GOALS.find((item) => item.id === processSetup.goal)?.label}`,
    processSetup.groupSize && `Group size: ${processSetup.groupSize}`,
    processSetup.duration && `Duration: ${processSetup.duration}`,
    processSetup.facilitator && `Facilitation: ${processSetup.facilitator}`,
    processSetup.mode && `Mode: ${processSetup.mode}`,
  ].filter(Boolean), [processSetup]);

  const matchingCount = useMemo(() => {
    const phaseMap: Record<string, number[]> = {
      framing: [1],
      collective: [2],
      codesign: [3],
      prototype: [4],
      consolidation: [5],
    };
    const selectedPhases = processSetup.objectives.flatMap((id) => phaseMap[id] || []);
    return TOOLS.filter((tool) => {
      const phaseMatch = selectedPhases.length === 0 || selectedPhases.includes(tool.phase);
      const modeMatch = !processSetup.mode || tool.mode === processSetup.mode || tool.mode === 'Hybrid';
      return phaseMatch && modeMatch;
    }).length;
  }, [processSetup]);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      await saveProcessDraft();
      setDraftMessage('Draft saved successfully. You can continue editing it later.');
      toast.success('Draft saved successfully. You can continue editing it later.');
    } catch {
      toast.error('The draft could not be saved. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleContinue = async () => {
    setSubmitted(true);
    setObjectiveError('');
    const requiredMissing =
      !processSetup.stage ||
      processSetup.objectives.length === 0 ||
      !processSetup.level ||
      !processSetup.goal ||
      !processSetup.groupSize ||
      !processSetup.duration ||
      !processSetup.facilitator ||
      !processSetup.mode;

    if (requiredMissing) {
      toast.error('Please complete the required fields before continuing.');
      return;
    }

    try {
      await saveProcessDraft();
      navigate('/setup-tools');
    } catch {
      toast.error('The process could not be saved. Please try again.');
    }
  };

  return (
    <SpicePublicShell variant="public">
      <div className="spice-page" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="mb-8">
          <p className="text-[13px] font-bold uppercase tracking-wide text-[#ca7428]">Step 1 of 2</p>
          <h1 className="mt-2 text-[32px] font-bold text-[#444]">Set up my process</h1>
          <p className="mt-2 max-w-[760px] text-[15px] font-medium leading-relaxed text-[#666]">
            Answer the required questions and SPICE will recommend tools that fit your phase, objective, activity type, and filters.
          </p>
        </div>

        <div className="flex flex-col items-start gap-8 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            <section>
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f68b2c] text-[15px] font-bold text-white">1</span>
                <div>
                  <h2 className="text-[18px] font-bold text-[#444]">What is the stage of your participatory process?</h2>
                  <SectionHelper>Selection required.</SectionHelper>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 pl-11">
                {STAGES.map((stage) => (
                  <ChoiceCard
                    key={stage.id}
                    label={stage.label}
                    desc={stage.desc}
                    selected={processSetup.stage === stage.id}
                    error={getError('stage')}
                    onClick={() => updateProcessSetup({ stage: stage.id })}
                  />
                ))}
                <FieldError show={getError('stage')}>Select the current process stage.</FieldError>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f68b2c] text-[15px] font-bold text-white">2</span>
                <div>
                  <h2 className="text-[18px] font-bold text-[#444]">What objectives do you need guidance with?</h2>
                  <SectionHelper>Select up to two choices.</SectionHelper>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 pl-11">
                {OBJECTIVES.map((objective) => (
                  <ChoiceCard
                    key={objective.id}
                    label={objective.label}
                    desc={objective.desc}
                    selected={processSetup.objectives.includes(objective.id)}
                    error={getError('objectives')}
                    multi
                    onClick={() => toggleObjective(objective.id)}
                  />
                ))}
                <FieldError show={getError('objectives')}>Select at least one objective.</FieldError>
                <FieldError show={Boolean(objectiveError)}>{objectiveError}</FieldError>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f68b2c] text-[15px] font-bold text-white">3</span>
                <div>
                  <h2 className="text-[18px] font-bold text-[#444]">Frame the level of participation in the process</h2>
                  <SectionHelper>Selection required.</SectionHelper>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 pl-11">
                {PARTICIPATION_LEVELS.map((level) => (
                  <ChoiceCard
                    key={level.id}
                    label={level.label}
                    desc={level.desc}
                    selected={processSetup.level === level.id}
                    error={getError('level')}
                    onClick={() => updateProcessSetup({ level: level.id })}
                  />
                ))}
                <FieldError show={getError('level')}>Select the participation level.</FieldError>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f68b2c] text-[15px] font-bold text-white">4</span>
                <div>
                  <h2 className="text-[18px] font-bold text-[#444]">Frame the goal of the participatory process</h2>
                  <SectionHelper>Selection required.</SectionHelper>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 pl-11">
                {GOALS.map((goal) => (
                  <ChoiceCard
                    key={goal.id}
                    label={goal.label}
                    selected={processSetup.goal === goal.id}
                    error={getError('goal')}
                    onClick={() => updateProcessSetup({ goal: goal.id })}
                  />
                ))}
                <FieldError show={getError('goal')}>Select the process goal.</FieldError>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
              <button
              onClick={() => void handleSaveDraft()}
              disabled={savingDraft}
                className="flex items-center gap-2 px-6 py-3 text-[15px] font-semibold text-[#ca7428] transition-colors hover:bg-[#fff3e8]"
              >
              <Save size={16} /> {savingDraft ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
              onClick={() => void handleContinue()}
                className="flex items-center gap-2 bg-[#f68b2c] px-8 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#e07a20]"
              >
                Continue to Tools <ArrowRight size={16} />
              </button>
              {draftMessage && <p className="text-[13px] font-semibold text-[#2e6e45]">{draftMessage}</p>}
            </div>
          </div>

          <aside className="flex w-full flex-shrink-0 flex-col gap-5 lg:w-[320px]">
            <div className="flex flex-col gap-4 border-2 border-[#bfc0c5] bg-white p-5">
              <div>
                <p className="text-[15px] font-bold text-[#444]">Additional Filters</p>
                <SectionHelper>Selection required.</SectionHelper>
              </div>
              <FilterSelect label="Group Size" value={processSetup.groupSize} options={GROUP_SIZES} onChange={(value) => updateProcessSetup({ groupSize: value })} error={getError('groupSize')} />
              <FilterSelect label="Duration" value={processSetup.duration} options={DURATIONS} onChange={(value) => updateProcessSetup({ duration: value })} error={getError('duration')} />
              <FilterSelect label="Facilitator / Participants" value={processSetup.facilitator} options={FACILITATORS} onChange={(value) => updateProcessSetup({ facilitator: value })} error={getError('facilitator')} />
              <FilterSelect label="Online / Offline" value={processSetup.mode} options={MODES} onChange={(value) => updateProcessSetup({ mode: value as Mode })} error={getError('mode')} />
            </div>

            <div className="flex flex-col gap-4 border-2 border-[#bfc0c5] bg-white p-5">
              <p className="text-[15px] font-bold text-[#444]">Your selections</p>
              <div className="flex flex-col gap-2">
                {selections.length > 0 ? selections.map((selection) => (
                  <p key={String(selection)} className="text-[12px] leading-relaxed text-[#444]">{selection}</p>
                )) : <p className="text-[12px] text-[#888]">Your selections will appear here.</p>}
              </div>
              <div className="flex items-start gap-2 bg-[#fef3e8] p-3">
                <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-[#f68b2c]" />
                <p className="text-[12px] font-semibold text-[#ca7428]">
                  {matchingCount || TOOLS.length} tools can match your current setup.
                </p>
              </div>
              <div className="bg-[#f5f5f5] p-3">
                <p className="text-[12px] leading-relaxed text-[#666]">
                  You can return to this step from the recommendations page without losing your selected options.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SpicePublicShell>
  );
}
