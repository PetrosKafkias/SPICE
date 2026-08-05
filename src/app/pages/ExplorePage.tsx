import { useState } from 'react';
import { Search, SlidersHorizontal, Grid3X3, List, Info } from 'lucide-react';
import { TOOLS, PHASES } from '../data/tools';
import { ToolCard } from '../components/ToolCard';

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [activePhases, setActivePhases] = useState<number[]>([1, 2, 3, 4, 5]);
  const [activeModes, setActiveModes] = useState<string[]>(['Online', 'Offline', 'Hybrid']);
  const [activeBudgets, setActiveBudgets] = useState<string[]>(['Low', 'Medium', 'High']);
  const [sortBy, setSortBy] = useState('phase');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterOpen, setFilterOpen] = useState(true);

  const filteredTools = TOOLS.filter((t) => {
    const matchesSearch = search === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.shortDesc.toLowerCase().includes(search.toLowerCase());
    const matchesPhase = activePhases.includes(t.phase);
    const matchesMode = activeModes.includes(t.mode);
    const matchesBudget = activeBudgets.includes(t.budget);
    return matchesSearch && matchesPhase && matchesMode && matchesBudget;
  });

  const togglePhase = (p: number) => setActivePhases((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  const toggleMode = (m: string) => setActiveModes((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  const toggleBudget = (b: string) => setActiveBudgets((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Full tool catalogue · No questionnaire required · All tools visible · Manual filtering
      </div>

      <div className="mb-5">
        <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">Explore the Toolkit Freely</h1>
        <p className="text-gray-500 text-[13px]">Browse all {TOOLS.length} co-creation tools. Filter by phase, mode, group size, and more.</p>
      </div>

      {/* Search and controls */}
      <div className="flex gap-3 mb-5 items-center">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools by name, objective, or keyword…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-700 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1b3a5c]/20"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700 shadow-sm"
        >
          <option value="phase">Sort by phase</option>
          <option value="duration">Sort by duration</option>
          <option value="name">Sort by name</option>
          <option value="mode">Sort by mode</option>
        </select>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setViewMode('grid')}
            className={`p-2.5 ${viewMode === 'grid' ? 'bg-[#1b3a5c] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <Grid3X3 size={15} />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2.5 ${viewMode === 'list' ? 'bg-[#1b3a5c] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <List size={15} />
          </button>
        </div>
        <button onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700 hover:bg-gray-50 shadow-sm">
          <SlidersHorizontal size={14} />
          Filters {activePhases.length < 5 || activeModes.length < 3 ? `(active)` : ''}
        </button>
      </div>

      {/* Filter chips summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        {activePhases.length < 5 && activePhases.map((p) => (
          <span key={p} className="flex items-center gap-1 bg-[#e8f0f7] text-[#1b3a5c] text-[11px] px-2.5 py-1 rounded-full font-medium">
            Phase {p}
            <button onClick={() => togglePhase(p)} className="ml-1 opacity-60 hover:opacity-100">×</button>
          </span>
        ))}
        {activeModes.length < 3 && activeModes.map((m) => (
          <span key={m} className="flex items-center gap-1 bg-[#eaf3ea] text-[#3a6b3a] text-[11px] px-2.5 py-1 rounded-full font-medium">
            {m}
            <button onClick={() => toggleMode(m)} className="ml-1 opacity-60 hover:opacity-100">×</button>
          </span>
        ))}
        {search && (
          <span className="flex items-center gap-1 bg-[#fefce8] text-[#8b4f15] text-[11px] px-2.5 py-1 rounded-full font-medium border border-[#e8e3c8]">
            "{search}"
            <button onClick={() => setSearch('')} className="ml-1 opacity-60 hover:opacity-100">×</button>
          </span>
        )}
        <span className="text-[12px] text-gray-500 self-center ml-2">{filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} shown</span>
      </div>

      <div className={`grid ${filterOpen ? 'grid-cols-[1fr_240px]' : 'grid-cols-1'} gap-5`}>
        {/* Tools grouped by phase */}
        <div>
          {PHASES.filter((p) => activePhases.includes(p.id)).map((phase) => {
            const tools = filteredTools.filter((t) => t.phase === phase.id);
            if (tools.length === 0) return null;
            return (
              <div key={phase.id} className="mb-7">
                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200">
                  <div className={`w-7 h-7 rounded-full ${phase.bg} flex items-center justify-center text-white text-[12px] font-bold`}>
                    {phase.id}
                  </div>
                  <div>
                    <span className={`text-[14px] font-bold ${phase.color}`}>{phase.name}</span>
                    <p className="text-[11px] text-gray-400 italic">{phase.question}</p>
                  </div>
                  <span className="ml-auto text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tools.length} tools</span>
                </div>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {tools.map((tool) => (
                      <div key={tool.id} className="bg-[#fefce8] border border-[#e8e3c8] rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm hover:shadow-md">
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-[#1b3a5c]">{tool.name}</div>
                          <div className="text-[11px] text-gray-500">{tool.shortDesc}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tool.mode}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tool.duration}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tool.groupSize}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredTools.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="text-[32px] mb-3">🔍</div>
              <div className="text-[15px] font-semibold text-gray-600 mb-1">No tools found</div>
              <div className="text-[13px] text-gray-400">Try adjusting the search or filters.</div>
            </div>
          )}
        </div>

        {/* Filter panel */}
        {filterOpen && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-fit sticky top-4">
            <h3 className="font-semibold text-[13px] text-[#1b3a5c] mb-4">Filter tools</h3>

            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Roadmap phase</div>
              {PHASES.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={activePhases.includes(p.id)} onChange={() => togglePhase(p.id)} className="rounded" />
                  <span className="text-[12px] text-gray-700">Ph. {p.id}: {p.name}</span>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Mode</div>
              {['Online', 'Offline', 'Hybrid'].map((m) => (
                <label key={m} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={activeModes.includes(m)} onChange={() => toggleMode(m)} className="rounded" />
                  <span className="text-[12px] text-gray-700">{m}</span>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Budget</div>
              {['Low', 'Medium', 'High'].map((b) => (
                <label key={b} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={activeBudgets.includes(b)} onChange={() => toggleBudget(b)} className="rounded" />
                  <span className="text-[12px] text-gray-700">{b}</span>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Duration</div>
              {['< 1h', '1–3h', 'Half day', 'Full day', 'Multi-day', 'Ongoing'].map((d) => (
                <label key={d} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-[12px] text-gray-700">{d}</span>
                </label>
              ))}
            </div>

            <button onClick={() => { setActivePhases([1,2,3,4,5]); setActiveModes(['Online','Offline','Hybrid']); setActiveBudgets(['Low','Medium','High']); setSearch(''); }}
              className="w-full text-[11px] text-gray-500 hover:text-[#1b3a5c] py-1">
              Reset all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
