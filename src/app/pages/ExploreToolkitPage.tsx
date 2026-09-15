import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, Grid2X2, List, Clock, Users, UserCog, ChevronDown } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { getTools, PHASES, Tool } from '../data/tools';
import { useI18n } from '../context/I18nContext';
import { processPhase } from '../data/processFramework';

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  Hybrid: { bg: '#e8f0f7', text: '#1b3a5c' },
  Online: { bg: '#e8f5ef', text: '#2e6e45' },
  Offline: { bg: '#f0eef8', text: '#5a3f7a' },
};

const PHASE_COLORS = ['#1e3d5c', '#0f6e6e', '#3a6b3a', '#c8691e', '#5a3f7a'];
function ToolCard({ tool, onViewDetail }: { tool: Tool; onViewDetail: (id: string) => void }) {
  const { t } = useI18n();
  const mc = MODE_COLORS[tool.mode];
  const modeLabel = t(`resources.${tool.mode.toLowerCase()}` as 'resources.online' | 'resources.offline' | 'resources.hybrid');
  const targetUsersLabel = t(tool.targetUsers === 'Internal team' ? 'resources.targetUsers.internal' : 'resources.targetUsers.public');

  return (
    <div className="spice-card overflow-hidden flex flex-col">
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-bold text-[#444]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{tool.name}</p>
        </div>
        <p className="text-[13px] text-[#666] leading-relaxed flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>{tool.shortDesc}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full" style={{ backgroundColor: mc.bg, color: mc.text }}>{modeLabel}</span>
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-gray-100 text-[#444] rounded-full">
            <Clock size={10} />{tool.duration}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-gray-100 text-[#444] rounded-full">
            <Users size={10} />{targetUsersLabel}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-[#fff0e1] text-[#a85f20]">
            <UserCog size={10} />{tool.facilitatorRatio}
          </span>
        </div>
      </div>

      <div className="flex border-t border-gray-100">
        <button
          onClick={() => onViewDetail(tool.id)}
          className="flex-1 py-3 text-[13px] font-semibold text-[#444] hover:bg-gray-50 transition-colors"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          {t('resources.moreInformation')}
        </button>
      </div>
    </div>
  );
}

export default function ExploreToolkitPage() {
  const navigate = useNavigate();
  const { language, t, tp, formatNumber } = useI18n();
  const tools = useMemo(() => getTools(language), [language]);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewGrid, setViewGrid] = useState(true);

  const filtered = useMemo(() => {
    return tools.filter((tool) => {
      const matchSearch = tool.name.toLocaleLowerCase(language).includes(search.toLocaleLowerCase(language)) || tool.shortDesc.toLocaleLowerCase(language).includes(search.toLocaleLowerCase(language));
      const matchMode = modeFilter === 'all' || tool.mode === modeFilter;
      const matchStatus = statusFilter === 'all' || tool.status === statusFilter;
      return matchSearch && matchMode && matchStatus;
    });
  }, [language, modeFilter, search, statusFilter, tools]);

  const byPhase = PHASES.map((ph) => ({
    phase: ph,
    tools: filtered.filter((t) => t.phase === ph.id),
  })).filter((g) => g.tools.length > 0);

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={Grid2X2} eyebrow={t('resources.eyebrow')} title={t('resources.title')} description={t('resources.description', { count: formatNumber(tools.length) })} />
      <div className="spice-page spice-wide-page flex flex-col gap-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {/* Search + controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1 flex items-center gap-3 bg-white border border-[#999] px-4 py-3">
            <Search size={18} className="text-[#aaa] flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('resources.searchPlaceholder')}
              className="flex-1 bg-transparent text-[14px] text-[#444] outline-none placeholder:text-[#aaa]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}
                className="appearance-none border border-[#999] bg-white px-3 py-2.5 pr-8 text-[13px] text-[#444] outline-none cursor-pointer"
                style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <option value="all">{t('resources.allModes')}</option>
                <option value="Online">{t('resources.online')}</option><option value="Offline">{t('resources.offline')}</option><option value="Hybrid">{t('resources.hybrid')}</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none border border-[#999] bg-white px-3 py-2.5 pr-8 text-[13px] text-[#444] outline-none cursor-pointer"
                style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <option value="all">{t('resources.allStatuses')}</option><option value="Formatted for printing">{t('resources.formatted')}</option><option value="Content ready">{t('resources.contentReady')}</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none" />
            </div>
            <div className="flex border border-[#999] overflow-hidden">
              <button onClick={() => setViewGrid(true)} aria-label={t('resources.gridView')} aria-pressed={viewGrid} className="p-2.5 transition-colors" style={{ backgroundColor: viewGrid ? '#f0f0f0' : 'white' }}>
                <Grid2X2 size={16} className="text-[#444]" />
              </button>
              <button onClick={() => setViewGrid(false)} aria-label={t('resources.listView')} aria-pressed={!viewGrid} className="p-2.5 transition-colors border-l border-gray-200" style={{ backgroundColor: !viewGrid ? '#f0f0f0' : 'white' }}>
                <List size={16} className="text-[#444]" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-[14px] text-[#888]" aria-live="polite">{tp(filtered.length, { one: 'resources.results.one', few: 'resources.results.few', many: 'resources.results.many', other: 'resources.results.other' })}</p>

        {/* Phase groups */}
        {byPhase.map(({ phase, tools }) => (
          <div key={phase.id} id={`phase-${phase.id}`} className="flex scroll-mt-28 flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0"
                style={{ backgroundColor: PHASE_COLORS[phase.id - 1] }}>
                {phase.id}
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-[#444]">{t(processPhase(phase.id).titleKey)}</h2>
                <p className="text-[12px] text-[#888]">{t(processPhase(phase.id).questionKey)}</p>
              </div>
              <span className="ml-auto text-[13px] font-medium text-[#888]">{tp(tools.length, { one: 'resources.phaseResults.one', few: 'resources.phaseResults.few', many: 'resources.phaseResults.many', other: 'resources.phaseResults.other' })}</span>
            </div>

            <div className={viewGrid ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-3'}>
              {tools.map((tool) => (
                viewGrid
                  ? <ToolCard key={tool.id} tool={tool} onViewDetail={(id) => navigate(`/tool-detail/${id}`)} />
                  : (
                    <div key={tool.id} className="spice-card p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[#444]">{tool.name}</p>
                        <p className="text-[13px] text-[#666] mt-0.5">{tool.shortDesc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full" style={{ backgroundColor: MODE_COLORS[tool.mode].bg, color: MODE_COLORS[tool.mode].text }}>{t(`resources.${tool.mode.toLowerCase()}` as 'resources.online' | 'resources.offline' | 'resources.hybrid')}</span>
                          <span className="px-2 py-0.5 text-[11px] bg-gray-100 text-[#444] rounded-full">{tool.duration}</span>
                          <span className="px-2 py-0.5 text-[11px] bg-gray-100 text-[#444] rounded-full">{t(tool.targetUsers === 'Internal team' ? 'resources.targetUsers.internal' : 'resources.targetUsers.public')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => navigate(`/tool-detail/${tool.id}`)} className="px-4 py-2 border border-gray-300 text-[13px] font-medium text-[#444] hover:bg-gray-50 transition-colors">{t('resources.moreInformation')}</button>
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
            <p className="text-[16px]">{t('resources.noResults')}</p>
            <button onClick={() => { setSearch(''); setModeFilter('all'); setStatusFilter('all'); }} className="mt-3 text-[#ca7428] hover:underline text-[14px]">{t('resources.clearFilters')}</button>
          </div>
        )}
      </div>
    </SpicePublicShell>
  );
}
