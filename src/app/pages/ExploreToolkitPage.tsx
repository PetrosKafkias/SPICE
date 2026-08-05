import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Search, Grid2X2, List, Clock, Users, Plus, ChevronDown, CheckCircle2 } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { TOOLS, PHASES, Tool } from '../data/tools';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  Hybrid: { bg: '#e8f0f7', text: '#1b3a5c' },
  Online: { bg: '#e8f5ef', text: '#2e6e45' },
  Offline: { bg: '#f0eef8', text: '#5a3f7a' },
};

const PHASE_COLORS = ['#1e3d5c', '#0f6e6e', '#3a6b3a', '#c8691e', '#5a3f7a'];
function ToolCard({ tool, onViewDetail }: { tool: Tool; onViewDetail: (id: string) => void }) {
  const { myProcessTools, addToolToProcess, removeToolFromProcess } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const inProcess = myProcessTools.includes(tool.id);
  const mc = MODE_COLORS[tool.mode];

  return (
    <div
      className="bg-white overflow-hidden transition-shadow flex flex-col"
      style={{ border: `${inProcess ? 3 : 2}px solid ${inProcess ? '#f68b2c' : '#d7d8dc'}` }}
    >
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-bold text-[#444]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{tool.name}</p>
        </div>
        <p className="text-[13px] text-[#666] leading-relaxed flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>{tool.shortDesc}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full" style={{ backgroundColor: mc.bg, color: mc.text }}>{tool.mode}</span>
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-gray-100 text-[#444] rounded-full">
            <Clock size={10} />{tool.duration}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-gray-100 text-[#444] rounded-full">
            <Users size={10} />{tool.groupSize}
          </span>
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-[#fff0e1] text-[#a85f20]">{tool.status}</span>
        </div>
      </div>

      <div className="flex border-t border-gray-100">
        <button
          onClick={() => onViewDetail(tool.id)}
          className="flex-1 py-3 text-[13px] font-semibold text-[#444] hover:bg-gray-50 transition-colors border-r border-gray-100"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          More information
        </button>
        <button
          onClick={() => {
            if (!user) {
              toast.info('Sign in to add a tool to your process.');
              navigate(`/signin?returnTo=${encodeURIComponent('/analogue-tools')}`);
              return;
            }
            if (inProcess) {
              removeToolFromProcess(tool.id);
              toast.success('Removed from process');
            } else {
              addToolToProcess(tool.id);
              toast.success('Added to process');
            }
          }}
          className="flex-1 py-3 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          style={{
            backgroundColor: inProcess ? '#fff3e8' : '#f68b2c',
            color: inProcess ? '#ca7428' : 'white',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          {inProcess ? <><CheckCircle2 size={14} /> In My Process</> : <><Plus size={14} /> Add to Process</>}
        </button>
      </div>
    </div>
  );
}

export default function ExploreToolkitPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addToolToProcess } = useApp();
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewGrid, setViewGrid] = useState(true);

  const filtered = useMemo(() => {
    return TOOLS.filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.shortDesc.toLowerCase().includes(search.toLowerCase());
      const matchMode = modeFilter === 'All' || t.mode === modeFilter;
      const matchStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchSearch && matchMode && matchStatus;
    });
  }, [search, modeFilter, statusFilter]);

  const byPhase = PHASES.map((ph) => ({
    phase: ph,
    tools: filtered.filter((t) => t.phase === ph.id),
  })).filter((g) => g.tools.length > 0);

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={Grid2X2} eyebrow="SPICE participatory methods" title="Analogue Tools" description={`Browse ${TOOLS.length} approved tools and methods imported from the supplied SPICE source workbook.`} />
      <div className="spice-page spice-wide-page flex flex-col gap-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {/* Search + controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1 flex items-center gap-3 bg-white border border-[#999] px-4 py-3">
            <Search size={18} className="text-[#aaa] flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for tool, objective, or keywords"
              className="flex-1 bg-transparent text-[14px] text-[#444] outline-none placeholder:text-[#aaa]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
                className="appearance-none border border-[#999] bg-white px-3 py-2.5 pr-8 text-[13px] text-[#444] outline-none cursor-pointer"
                style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {['All', 'Online', 'Offline', 'Hybrid'].map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none border border-[#999] bg-white px-3 py-2.5 pr-8 text-[13px] text-[#444] outline-none cursor-pointer"
                style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {['All', 'Formatted for printing', 'Content ready'].map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none" />
            </div>
            <div className="flex border border-[#999] overflow-hidden">
              <button onClick={() => setViewGrid(true)} className="p-2.5 transition-colors" style={{ backgroundColor: viewGrid ? '#f0f0f0' : 'white' }}>
                <Grid2X2 size={16} className="text-[#444]" />
              </button>
              <button onClick={() => setViewGrid(false)} className="p-2.5 transition-colors border-l border-gray-200" style={{ backgroundColor: !viewGrid ? '#f0f0f0' : 'white' }}>
                <List size={16} className="text-[#444]" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-[14px] text-[#888]">{filtered.length} tools found</p>

        {/* Phase groups */}
        {byPhase.map(({ phase, tools }) => (
          <div key={phase.id} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0"
                style={{ backgroundColor: PHASE_COLORS[phase.id - 1] }}>
                {phase.id}
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-[#444]">{phase.name}</h2>
                <p className="text-[12px] text-[#888]">{phase.question}</p>
              </div>
              <span className="ml-auto text-[13px] font-medium text-[#888]">{tools.length} tools</span>
            </div>

            <div className={viewGrid ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-3'}>
              {tools.map((tool) => (
                viewGrid
                  ? <ToolCard key={tool.id} tool={tool} onViewDetail={(id) => navigate(`/tool-detail/${id}`)} />
                  : (
                    <div key={tool.id} className="bg-white border-[3px] border-[#f68b2c] p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[#444]">{tool.name}</p>
                        <p className="text-[13px] text-[#666] mt-0.5">{tool.shortDesc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full" style={{ backgroundColor: MODE_COLORS[tool.mode].bg, color: MODE_COLORS[tool.mode].text }}>{tool.mode}</span>
                          <span className="px-2 py-0.5 text-[11px] bg-gray-100 text-[#444] rounded-full">{tool.duration}</span>
                          <span className="px-2 py-0.5 text-[11px] bg-gray-100 text-[#444] rounded-full">{tool.groupSize}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => navigate(`/tool-detail/${tool.id}`)} className="px-4 py-2 border border-gray-300 text-[13px] font-medium text-[#444] hover:bg-gray-50 transition-colors">More info</button>
                        <button onClick={() => {
                          if (!user) {
                            toast.info('Sign in to add a tool to your process.');
                            navigate(`/signin?returnTo=${encodeURIComponent(location.pathname)}`);
                            return;
                          }
                          addToolToProcess(tool.id);
                          toast.success('Added to process');
                        }} className="px-4 py-2 bg-[#f68b2c] text-white text-[13px] font-semibold hover:bg-[#e07a20] transition-colors">Add to Process</button>
                      </div>
                    </div>
                  )
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-[#aaa]">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[16px]">No tools match your search</p>
            <button onClick={() => { setSearch(''); setModeFilter('All'); setStatusFilter('All'); }} className="mt-3 text-[#ca7428] hover:underline text-[14px]">Clear filters</button>
          </div>
        )}
      </div>
    </SpicePublicShell>
  );
}
