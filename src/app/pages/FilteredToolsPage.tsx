import { useState } from 'react';
import { Info, SlidersHorizontal, X } from 'lucide-react';
import { TOOLS, PHASES } from '../data/tools';
import { ToolCard } from '../components/ToolCard';
import { toast } from 'sonner';

export default function FilteredToolsPage() {
  const [filterOpen, setFilterOpen] = useState(true);
  const [activePhases, setActivePhases] = useState<number[]>([3, 4, 5]);
  const [activeModes, setActiveModes] = useState<string[]>(['Online', 'Hybrid', 'Offline']);
  const [activeBudgets, setActiveBudgets] = useState<string[]>(['Low', 'Medium', 'High']);
  const filteredTools = TOOLS.filter((t) =>
    activePhases.includes(t.phase) && activeModes.includes(t.mode) && activeBudgets.includes(t.budget)
  );

  const togglePhase = (p: number) => setActivePhases((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  const toggleMode = (m: string) => setActiveModes((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  const toggleBudget = (b: string) => setActiveBudgets((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Filtered tool list — generated from questionnaire inputs · REST API response from Backend Integration Layer
      </div>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">Filtered Tool List</h1>
          <p className="text-gray-500 text-[13px]">
            Based on your answers: <span className="text-[#1b3a5c] font-medium">Project underway</span> ·{' '}
            <span className="text-[#1b3a5c] font-medium">Co-design & prototyping</span> ·{' '}
            <span className="text-[#1b3a5c] font-medium">Collaboration</span> ·{' '}
            <span className="text-[#1b3a5c] font-medium">Physical site intervention</span>
          </p>
        </div>
        <button onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-700 hover:bg-gray-50 shadow-sm">
          <SlidersHorizontal size={14} />
          {filterOpen ? 'Hide filters' : 'Show filters'}
        </button>
      </div>

      {/* Info note */}
      <div className="bg-[#f0eef8] rounded-xl border border-purple-200 p-3 flex gap-2 mb-5">
        <Info size={13} className="text-[#5a3f7a] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#5a3f7a] leading-relaxed">
          This list has already been filtered based on the questionnaire. You can adjust filters on the right to broaden or narrow the results.
          <button onClick={() => toast.info('Edit questionnaire answers...')} className="underline ml-1 font-medium">Edit questionnaire answers</button>
        </p>
      </div>

      <div className={`grid ${filterOpen ? 'grid-cols-[1fr_260px]' : 'grid-cols-1'} gap-5`}>
        {/* Tool list */}
        <div>
          {PHASES.filter((p) => activePhases.includes(p.id)).map((phase) => {
            const tools = filteredTools.filter((t) => t.phase === phase.id);
            if (tools.length === 0) return null;
            return (
              <div key={phase.id} className="mb-7">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex items-center gap-2 ${phase.light} px-3 py-1.5 rounded-lg`}>
                    <div className={`w-5 h-5 rounded-full ${phase.bg} flex items-center justify-center text-white text-[10px] font-bold`}>
                      {phase.id}
                    </div>
                    <span className={`text-[13px] font-semibold ${phase.color}`}>{phase.name}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 italic">{phase.question}</span>
                  <span className="ml-auto text-[11px] text-gray-500">{tools.length} tool{tools.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {tools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </div>
            );
          })}
          {filteredTools.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="text-[32px] mb-3">🔍</div>
              <div className="text-[15px] font-semibold text-gray-600 mb-1">No tools match the current filters</div>
              <div className="text-[13px] text-gray-400">Try adjusting the filter panel to see more tools.</div>
            </div>
          )}
        </div>

        {/* Filter drawer */}
        {filterOpen && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-fit sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[13px] text-[#1b3a5c]">Refine filters</h3>
              <button onClick={() => setFilterOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>

            {/* Phases */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Roadmap phase</div>
              {PHASES.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={activePhases.includes(p.id)} onChange={() => togglePhase(p.id)}
                    className="rounded border-gray-300" />
                  <span className="text-[12px] text-gray-700">Ph. {p.id}: {p.name}</span>
                </label>
              ))}
            </div>

            {/* Objectives */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Objectives</div>
              {['Framing', 'Inclusion', 'Co-design', 'Prototyping', 'Evaluation', 'Governance'].map((o) => (
                <label key={o} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-[12px] text-gray-700">{o}</span>
                </label>
              ))}
            </div>

            {/* Participation level */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Participation level</div>
              {['Input / Consultation', 'Collaboration / Co-design', 'Ownership / Co-governance'].map((l) => (
                <label key={l} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                  <span className="text-[12px] text-gray-700">{l}</span>
                </label>
              ))}
            </div>

            {/* Mode */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Mode</div>
              {['Online', 'Offline', 'Hybrid'].map((m) => (
                <label key={m} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={activeModes.includes(m)} onChange={() => toggleMode(m)}
                    className="rounded border-gray-300" />
                  <span className="text-[12px] text-gray-700">{m}</span>
                </label>
              ))}
            </div>

            {/* Group size */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Group size</div>
              {['< 10 people', '10–30 people', '30–100 people', 'Any size'].map((g) => (
                <label key={g} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                  <span className="text-[12px] text-gray-700">{g}</span>
                </label>
              ))}
            </div>

            {/* Duration */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Time duration</div>
              <select className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700">
                <option>Any duration</option>
                <option>Under 1 hour</option>
                <option>1–3 hours</option>
                <option>Half day</option>
                <option>Full day</option>
                <option>Multi-day</option>
                <option>Ongoing campaign</option>
              </select>
            </div>

            {/* Budget */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Budget</div>
              {['Low', 'Medium', 'High'].map((b) => (
                <label key={b} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={activeBudgets.includes(b)} onChange={() => toggleBudget(b)}
                    className="rounded border-gray-300" />
                  <span className="text-[12px] text-gray-700">{b}</span>
                </label>
              ))}
            </div>

            {/* Ratio */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Facilitator/participant ratio</div>
              <select className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700">
                <option>Any</option>
                <option>1:5 (intensive)</option>
                <option>1:10 (standard)</option>
                <option>1:20 (light)</option>
                <option>1:∞ (digital only)</option>
              </select>
            </div>

            <button className="w-full bg-[#1b3a5c] text-white rounded-lg py-2 text-[12px] font-medium hover:bg-[#163058]">
              Apply filters ({filteredTools.length} tools)
            </button>
            <button className="w-full mt-2 text-[11px] text-gray-500 hover:text-gray-700">
              Reset to questionnaire defaults
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
