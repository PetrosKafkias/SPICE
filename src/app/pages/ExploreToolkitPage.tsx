import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, Grid2X2, List, Clock, Users, UserCog, ChevronDown, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import ObjectiveCoverage from '../components/ObjectiveCoverage';
import ObjectiveDigitalTools from '../components/ObjectiveDigitalTools';
import { getTools, PHASES, Tool } from '../data/tools';
import { useI18n } from '../context/I18nContext';
import { processPhase } from '../data/processFramework';
import { usePermissions } from '../auth/usePermissions';
import { resourceLockMessage, selectionsComplete, useObjectiveResources } from '../lib/objectiveResources';
import { localizedApiError } from '../lib/localizedApiError';

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  Hybrid: { bg: '#e8f0f7', text: '#1b3a5c' },
  Online: { bg: '#e8f5ef', text: '#2e6e45' },
  Offline: { bg: '#f0eef8', text: '#5a3f7a' },
};

const PHASE_COLORS = ['#1e3d5c', '#0f6e6e', '#3a6b3a', '#c8691e', '#5a3f7a'];

// Lets the Municipality add a resource to the Objective it belongs to, straight from the catalogue.
interface ProcessSelection {
  selected: boolean;
  saving: boolean;
  /** Why the resource cannot be added or removed right now, if it cannot. */
  lockMessage: string | null;
  onToggle: () => void;
}

function ProcessToggle({ selection, phaseNumber }: { selection: ProcessSelection; phaseNumber: number }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={selection.onToggle}
      disabled={selection.saving || Boolean(selection.lockMessage)}
      aria-pressed={selection.selected}
      title={selection.lockMessage || undefined}
      className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-4 py-3 text-[13px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${selection.selected ? 'bg-[#a86622]' : 'bg-[#f68b2c] hover:bg-[#e07a20]'}`}
    >
      {selection.lockMessage && <Lock size={13} aria-hidden="true" />}
      {t(selection.selected ? 'coverage.removeFrom' : 'coverage.addTo', { number: phaseNumber })}
    </button>
  );
}

function LockNote({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return <p className="flex items-start gap-1.5 px-5 pb-4 text-[12px] font-semibold text-[#8a4b16]"><Lock size={13} className="mt-0.5 flex-none" aria-hidden="true" />{message}</p>;
}

function ToolCard({ tool, onViewDetail, selection }: { tool: Tool; onViewDetail: (id: string) => void; selection?: ProcessSelection }) {
  const { t } = useI18n();
  const mc = MODE_COLORS[tool.mode];
  const modeLabel = t(`resources.${tool.mode.toLowerCase()}` as 'resources.online' | 'resources.offline' | 'resources.hybrid');
  const targetUsersLabel = t(tool.targetUsers === 'Internal team' ? 'resources.targetUsers.internal' : 'resources.targetUsers.public');

  return (
    <div className={`spice-card overflow-hidden flex flex-col ${selection?.selected ? 'border-[#f68b2c] bg-[#fffaf4]' : ''}`}>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-bold text-[#444]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{tool.name}</p>
          {selection?.selected && <span className="inline-flex flex-none items-center gap-1 bg-[#f68b2c] px-2 py-0.5 text-[11px] font-bold text-white"><CheckCircle2 size={12} aria-hidden="true" />{t('coverage.inProcess')}</span>}
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
        {selection && <ProcessToggle selection={selection} phaseNumber={tool.phase} />}
      </div>
      <LockNote message={selection?.lockMessage} />
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
  const { role } = usePermissions();
  const isMunicipality = role === 'municipality';
  const { initiative, selections, save, editContext } = useObjectiveResources(isMunicipality);
  const [saving, setSaving] = useState(false);
  const canSelect = isMunicipality && Boolean(initiative);

  // Selections are saved immediately, so leaving the page never loses a choice.
  const toggleResource = async (phaseNumber: number, id: string, name: string) => {
    const current = selections[phaseNumber] || [];
    const selected = current.includes(id);
    const next = { ...selections, [phaseNumber]: selected ? current.filter((item) => item !== id) : [...current, id] };
    setSaving(true);
    try {
      await save(next);
      toast.success(t(selected ? 'coverage.removed' : 'coverage.added', { resource: name, number: phaseNumber }));
    } catch (caught) {
      toast.error(localizedApiError(t, caught, 'coverage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };
  const selectionFor = (tool: Tool): ProcessSelection | undefined => (canSelect ? {
    selected: (selections[tool.phase] || []).includes(tool.id),
    saving,
    lockMessage: resourceLockMessage(t, editContext, tool.phase, tool.id, selections[tool.phase] || []),
    onToggle: () => void toggleResource(tool.phase, tool.id, tool.name),
  } : undefined);

  const filtered = useMemo(() => {
    return tools.filter((tool) => {
      const matchSearch = tool.name.toLocaleLowerCase(language).includes(search.toLocaleLowerCase(language)) || tool.shortDesc.toLocaleLowerCase(language).includes(search.toLocaleLowerCase(language));
      const matchMode = modeFilter === 'all' || tool.mode === modeFilter;
      const matchStatus = statusFilter === 'all' || tool.status === statusFilter;
      return matchSearch && matchMode && matchStatus;
    });
  }, [language, modeFilter, search, statusFilter, tools]);

  // A Municipality sees every Objective, so its digital tools stay selectable whatever the filters show.
  const byPhase = PHASES.map((ph) => ({
    phase: ph,
    tools: filtered.filter((t) => t.phase === ph.id),
  })).filter((g) => g.tools.length > 0 || canSelect);

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={Grid2X2} eyebrow={t('resources.eyebrow')} title={t('resources.title')} description={t('resources.description', { count: formatNumber(tools.length) })} />
      <div className="spice-page spice-wide-page flex flex-col gap-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {canSelect && (
          <div className="flex flex-col gap-3">
            <ObjectiveCoverage selections={selections} onSelectObjective={(number) => document.getElementById(`phase-${number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
            {selectionsComplete(selections) && (
              <Link to="/co-creation-hub" className="inline-flex min-h-11 items-center gap-2 self-start bg-[#f68b2c] px-5 font-bold text-white hover:bg-[#e07a20]">
                {t('process.goToHub')} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

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
              {tools.map((tool) => {
                const selection = selectionFor(tool);
                return viewGrid
                  ? <ToolCard key={tool.id} tool={tool} onViewDetail={(id) => navigate(`/tool-detail/${id}`)} selection={selection} />
                  : (
                    <div key={tool.id} className={`spice-card p-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center ${selection?.selected ? 'border-[#f68b2c] bg-[#fffaf4]' : ''}`}>
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
                        {selection && <ProcessToggle selection={selection} phaseNumber={tool.phase} />}
                      </div>
                      {selection?.lockMessage && <p className="flex items-start gap-1.5 text-[12px] font-semibold text-[#8a4b16] sm:basis-full"><Lock size={13} className="mt-0.5 flex-none" aria-hidden="true" />{selection.lockMessage}</p>}
                    </div>
                  );
              })}
            </div>
            {canSelect && <ObjectiveDigitalTools phaseNumber={phase.id} selectedIds={selections[phase.id] || []} disabled={saving} onToggle={(id, name) => void toggleResource(phase.id, id, name)} lockMessageFor={(id) => resourceLockMessage(t, editContext, phase.id, id, selections[phase.id] || [])} />}
          </div>
        ))}

        {filtered.length === 0 && !canSelect && (
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
