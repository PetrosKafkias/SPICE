import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Info, ArrowRight, Filter, Clock, Users, DollarSign, Wifi } from 'lucide-react';

const STAGE_OPTIONS = [
  { id: 'proposal', label: 'We are writing the project proposal', desc: 'Scoping tools and methods for the funding application.' },
  { id: 'setup', label: 'Project is funded and tools need to be set up', desc: 'Process design and tool selection phase.' },
  { id: 'underway', label: 'Project is underway — targeted guidance needed', desc: 'Mid-process support for a specific phase or challenge.' },
];

const OBJECTIVE_OPTIONS = [
  { id: 'framing', label: 'Framing and readiness', phase: 1 },
  { id: 'understanding', label: 'Collective understanding', phase: 2 },
  { id: 'codesign', label: 'Co-design and scenario building', phase: 3 },
  { id: 'prototype', label: 'Prototype and test ideas', phase: 4 },
  { id: 'consolidation', label: 'Consolidation, learning and governance', phase: 5 },
];

const PARTICIPATION_OPTIONS = [
  { id: 'input', label: 'Input (consultation)', desc: 'Stakeholders give input but decisions remain with the project team.' },
  { id: 'collaboration', label: 'Collaboration (co-design)', desc: 'Stakeholders collaborate in shaping solutions and priorities.' },
  { id: 'ownership', label: 'Ownership (co-governance)', desc: 'Stakeholders take responsibility for parts of the process or future management.' },
];

const GOAL_OPTIONS = [
  { id: 'physical', label: 'Physical site intervention', desc: 'Redesign, renovation or new infrastructure for a public space.' },
  { id: 'intangible', label: 'Intangible results', desc: 'Events, programming, community organisation, or governance.' },
  { id: 'undefined', label: 'Not defined yet', desc: 'Exploration phase — outcomes are still open.' },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<string | null>('underway');
  const [objectives, setObjectives] = useState<string[]>(['codesign', 'prototype']);
  const [participation, setParticipation] = useState<string | null>('collaboration');
  const [goal, setGoal] = useState<string | null>('physical');
  const [duration, setDuration] = useState('half-day');
  const [mode, setMode] = useState('hybrid');
  const [budget, setBudget] = useState('medium');

  const toggleObjective = (id: string) => {
    setObjectives((prev) => prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]);
  };

  const completeness = [
    stage !== null,
    objectives.length > 0,
    participation !== null,
    goal !== null,
  ].filter(Boolean).length;

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Process questionnaire · Inputs are sent to Backend Integration Layer · Filtered tool list generated server-side
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">Set Up My Process</h1>
          <p className="text-gray-500 text-[13px]">Answer the questions below to receive a personalised list of co-creation tools.</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-4 py-2 shadow-sm">
          <div className="w-20 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-[#4a7c59] rounded-full transition-all" style={{ width: `${(completeness / 4) * 100}%` }}></div>
          </div>
          <span className="text-[12px] text-gray-600">{completeness}/4 complete</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5">
        {/* Left: Questions */}
        <div className="flex flex-col gap-5">
          {/* Q1 */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold
                ${stage ? 'bg-[#1b3a5c] text-white' : 'bg-gray-100 text-gray-500'}`}>1</div>
              <h2 className="font-semibold text-[14px] text-[#1b3a5c]">Stage of the participatory process</h2>
              {stage && <CheckCircle2 size={16} className="text-[#4a7c59] ml-auto" />}
            </div>
            <div className="flex flex-col gap-2">
              {STAGE_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => setStage(opt.id)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${stage === opt.id ? 'border-[#1b3a5c] bg-[#e8f0f7]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${stage === opt.id ? 'border-[#1b3a5c] bg-[#1b3a5c]' : 'border-gray-300'}`}>
                      {stage === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white m-auto mt-[2px]"></div>}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-gray-800">{opt.label}</div>
                      <div className="text-[11px] text-gray-500">{opt.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Q2 */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold
                ${objectives.length > 0 ? 'bg-[#1b3a5c] text-white' : 'bg-gray-100 text-gray-500'}`}>2</div>
              <h2 className="font-semibold text-[14px] text-[#1b3a5c]">Objectives requiring guidance</h2>
              <span className="text-[11px] text-gray-400">(select all that apply)</span>
              {objectives.length > 0 && <CheckCircle2 size={16} className="text-[#4a7c59] ml-auto" />}
            </div>
            <div className="flex flex-wrap gap-2">
              {OBJECTIVE_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => toggleObjective(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border-2 font-medium transition-all
                    ${objectives.includes(opt.id) ? 'border-[#1b3a5c] bg-[#1b3a5c] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                  <span className="text-[10px] opacity-70">Ph.{opt.phase}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Q3 */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold
                ${participation ? 'bg-[#1b3a5c] text-white' : 'bg-gray-100 text-gray-500'}`}>3</div>
              <h2 className="font-semibold text-[14px] text-[#1b3a5c]">Level of participation</h2>
              {participation && <CheckCircle2 size={16} className="text-[#4a7c59] ml-auto" />}
            </div>
            <div className="flex gap-3">
              {PARTICIPATION_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => setParticipation(opt.id)}
                  className={`flex-1 text-left p-3 rounded-lg border-2 transition-all ${participation === opt.id ? 'border-[#1b3a5c] bg-[#e8f0f7]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="text-[12px] font-semibold text-[#1b3a5c] mb-1">{opt.label}</div>
                  <div className="text-[11px] text-gray-500 leading-snug">{opt.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Q4 */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold
                ${goal ? 'bg-[#1b3a5c] text-white' : 'bg-gray-100 text-gray-500'}`}>4</div>
              <h2 className="font-semibold text-[14px] text-[#1b3a5c]">Goal of the participatory process</h2>
              {goal && <CheckCircle2 size={16} className="text-[#4a7c59] ml-auto" />}
            </div>
            <div className="flex gap-3">
              {GOAL_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => setGoal(opt.id)}
                  className={`flex-1 text-left p-3 rounded-lg border-2 transition-all ${goal === opt.id ? 'border-[#1b3a5c] bg-[#e8f0f7]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="text-[12px] font-semibold text-[#1b3a5c] mb-1">{opt.label}</div>
                  <div className="text-[11px] text-gray-500 leading-snug">{opt.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* CTA */}
          <button onClick={() => navigate('/filtered-tools')}
            className="flex items-center justify-center gap-2 bg-[#1b3a5c] text-white rounded-xl py-3.5 font-semibold text-[14px] hover:bg-[#163058] transition-colors shadow-md">
            Generate filtered tool list <ArrowRight size={16} />
          </button>
        </div>

        {/* Right: Filters + preview */}
        <div className="flex flex-col gap-4">
          {/* Additional filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-[#1b3a5c]" />
              <h3 className="font-semibold text-[13px] text-[#1b3a5c]">Additional filters</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mb-1.5">
                  <Users size={11} /> Group size
                </label>
                <div className="flex gap-2">
                  {['< 10', '10–30', '30–100', 'Any'].map((s) => (
                    <button key={s} onClick={() => {}}
                      className={`flex-1 text-[10px] py-1 rounded-md border ${s === '10–30' ? 'bg-[#1b3a5c] text-white border-[#1b3a5c]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mb-1.5">
                  <Clock size={11} /> Time duration
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['< 1h', '1–3h', 'Half day', 'Full day', 'Multi-day'].map((d) => (
                    <button key={d} onClick={() => setDuration(d)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${duration === d ? 'bg-[#1b3a5c] text-white border-[#1b3a5c]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mb-1.5">
                  <Wifi size={11} /> Mode
                </label>
                <div className="flex gap-2">
                  {['Online', 'Offline', 'Hybrid'].map((m) => (
                    <button key={m} onClick={() => setMode(m.toLowerCase())}
                      className={`flex-1 text-[10px] py-1 rounded-md border ${mode === m.toLowerCase() ? 'bg-[#1b3a5c] text-white border-[#1b3a5c]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mb-1.5">
                  <DollarSign size={11} /> Budget
                </label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map((b) => (
                    <button key={b} onClick={() => setBudget(b.toLowerCase())}
                      className={`flex-1 text-[10px] py-1 rounded-md border ${budget === b.toLowerCase() ? 'bg-[#1b3a5c] text-white border-[#1b3a5c]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">Facilitator/participant ratio</label>
                <select className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white">
                  <option>Any</option>
                  <option>1:5 – very hands-on</option>
                  <option>1:10 – standard</option>
                  <option>1:20 – self-guided</option>
                  <option>1:∞ – digital only</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium mb-1.5 block">Supplies required</label>
                <div className="flex gap-2">
                  {['None/digital', 'Basic', 'Materials needed'].map((s) => (
                    <button key={s} className="flex-1 text-[10px] py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Summary card */}
          <div className="bg-[#fefce8] border border-[#e8e3c8] rounded-xl p-4">
            <div className="text-[12px] font-semibold text-[#1b3a5c] mb-2">Your selections</div>
            <div className="flex flex-col gap-1.5">
              {stage && (
                <div className="text-[11px] text-gray-700">
                  <span className="font-medium text-gray-500">Stage: </span>
                  {STAGE_OPTIONS.find((s) => s.id === stage)?.label}
                </div>
              )}
              {objectives.length > 0 && (
                <div className="text-[11px] text-gray-700">
                  <span className="font-medium text-gray-500">Objectives: </span>
                  {objectives.map((o) => OBJECTIVE_OPTIONS.find((x) => x.id === o)?.label).join(', ')}
                </div>
              )}
              {participation && (
                <div className="text-[11px] text-gray-700">
                  <span className="font-medium text-gray-500">Level: </span>
                  {PARTICIPATION_OPTIONS.find((p) => p.id === participation)?.label}
                </div>
              )}
              {goal && (
                <div className="text-[11px] text-gray-700">
                  <span className="font-medium text-gray-500">Goal: </span>
                  {GOAL_OPTIONS.find((g) => g.id === goal)?.label}
                </div>
              )}
            </div>
            {completeness >= 3 && (
              <div className="mt-3 pt-2 border-t border-[#e8e3c8] text-[11px] text-[#3a6b3a] font-medium">
                ✓ ~8–10 tools match your selections
              </div>
            )}
          </div>

          {/* Note */}
          <div className="bg-[#f0eef8] rounded-xl border border-purple-200 p-3 flex gap-2">
            <Info size={13} className="text-[#5a3f7a] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#5a3f7a] leading-relaxed">
              This list is pre-filtered based on your questionnaire answers.
              You can change filters at any time on the results page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
