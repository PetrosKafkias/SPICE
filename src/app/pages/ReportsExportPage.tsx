import { useState } from 'react';
import {
  Download, FileText, Table, FileSpreadsheet,
  Archive, CheckCircle2, Clock, Info,
  RefreshCw, Share2, Eye, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';

type ReportFormat = 'PDF' | 'DOCX' | 'XLSX' | 'CSV' | 'JSON';
type ReportStatus = 'ready' | 'generating' | 'scheduled';

interface Report {
  id: number;
  title: string;
  description: string;
  format: ReportFormat;
  pilot: string;
  phase: string;
  generated: string;
  size: string;
  status: ReportStatus;
  icon: string;
  category: string;
}

const REPORTS: Report[] = [
  {
    id: 1,
    title: 'Thessaloniki — Full Pilot Consolidated Report',
    description: 'Auto-compiled from CitiVoice exports, workshop outputs, 3D scene logs, and forum activity. Includes executive summary, methodology, findings, and recommendations.',
    format: 'PDF',
    pilot: 'Thessaloniki',
    phase: 'All phases',
    generated: '8 May 2026',
    size: '6.2 MB',
    status: 'ready',
    icon: '📋',
    category: 'Consolidated',
  },
  {
    id: 2,
    title: 'CitiVoice Campaign Export — May 2026',
    description: 'All contributions (1,247 responses), heatmap coordinates, sentiment scores, voting tallies, and demographic breakdown as structured data.',
    format: 'XLSX',
    pilot: 'Thessaloniki',
    phase: 'Collective Understanding',
    generated: '25 May 2026',
    size: '980 KB',
    status: 'ready',
    icon: '📊',
    category: 'CitiVoice',
  },
  {
    id: 3,
    title: 'CitiVoice Raw Contribution Data',
    description: 'Machine-readable export of every individual contribution with coordinates, timestamps, categories, and anonymised respondent metadata.',
    format: 'JSON',
    pilot: 'Thessaloniki',
    phase: 'Collective Understanding',
    generated: '25 May 2026',
    size: '2.1 MB',
    status: 'ready',
    icon: '🗂️',
    category: 'CitiVoice',
  },
  {
    id: 4,
    title: 'Workshop Outputs Summary — Phases 1–3',
    description: 'Compiled facilitation notes, post-it digitisations, photo documentation annotations, and participant feedback forms from all completed workshops.',
    format: 'DOCX',
    pilot: 'Thessaloniki',
    phase: 'Co-design & Scenario Building',
    generated: '2 May 2026',
    size: '1.4 MB',
    status: 'ready',
    icon: '📝',
    category: 'Workshops',
  },
  {
    id: 5,
    title: 'Forum & Voting — Activity Export',
    description: 'All forum threads, votes, and comments with anonymised author IDs, timestamps, and engagement metrics. Suitable for qualitative analysis.',
    format: 'CSV',
    pilot: 'Thessaloniki',
    phase: 'Co-design & Scenario Building',
    generated: '7 May 2026',
    size: '310 KB',
    status: 'ready',
    icon: '💬',
    category: 'Forum',
  },
  {
    id: 6,
    title: 'Participatory Process Analytics Dashboard Export',
    description: 'KPI summary: participation rates, tool engagement, phase progression, demographic reach, and accessibility metrics.',
    format: 'XLSX',
    pilot: 'Thessaloniki',
    phase: 'All phases',
    generated: '9 May 2026',
    size: '510 KB',
    status: 'ready',
    icon: '📈',
    category: 'Analytics',
  },
  {
    id: 7,
    title: 'Rovaniemi — Phase 1 Readiness Report',
    description: 'Readiness assessment findings, stakeholder map, and recommended pathway for the Rovaniemi pilot based on collected survey data.',
    format: 'PDF',
    pilot: 'Rovaniemi',
    phase: 'Framing & Readiness',
    generated: '1 Apr 2026',
    size: '1.9 MB',
    status: 'ready',
    icon: '📋',
    category: 'Consolidated',
  },
  {
    id: 8,
    title: 'Multi-Pilot Comparative Analytics',
    description: 'Cross-pilot KPIs, engagement benchmarks, and thematic comparison across Thessaloniki, Rovaniemi, Cuba, and Bielsko-Biała.',
    format: 'PDF',
    pilot: 'All pilots',
    phase: 'All phases',
    generated: '—',
    size: '—',
    status: 'generating',
    icon: '🌍',
    category: 'Analytics',
  },
  {
    id: 9,
    title: 'Horizon Europe Deliverable D4.3 Export',
    description: 'Structured data package formatted to meet the Horizon Europe reporting template requirements. Scheduled for June 2026.',
    format: 'DOCX',
    pilot: 'All pilots',
    phase: 'All phases',
    generated: '—',
    size: '—',
    status: 'scheduled',
    icon: '🇪🇺',
    category: 'Deliverable',
  },
];

const FORMAT_STYLE: Record<ReportFormat, string> = {
  PDF:  'bg-red-50 text-red-600 border-red-100',
  DOCX: 'bg-blue-50 text-blue-700 border-blue-100',
  XLSX: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  CSV:  'bg-orange-50 text-orange-700 border-orange-100',
  JSON: 'bg-purple-50 text-purple-700 border-purple-100',
};

const FORMAT_ICON: Record<ReportFormat, React.ElementType> = {
  PDF:  FileText,
  DOCX: FileText,
  XLSX: FileSpreadsheet,
  CSV:  Table,
  JSON: Archive,
};

const CATEGORIES = ['All', 'Consolidated', 'CitiVoice', 'Workshops', 'Forum', 'Analytics', 'Deliverable'];
const PILOTS     = ['All pilots', 'Thessaloniki', 'Rovaniemi', 'Cuba', 'Bielsko-Biała'];

export default function ReportsExportPage() {
  const [selectedPilot, setSelectedPilot] = useState('All pilots');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState<string>('All');
  const [showBuilder, setShowBuilder] = useState(false);

  // Custom report builder state
  const [builderPilot, setBuilderPilot] = useState('Thessaloniki');
  const [builderPhase, setBuilderPhase] = useState('All phases');
  const [builderFormat, setBuilderFormat] = useState<ReportFormat>('PDF');
  const [builderSections, setBuilderSections] = useState({
    executive: true, citivoice: true, workshops: true,
    forum: false, analytics: true, appendix: false,
  });

  const filtered = REPORTS.filter((r) => {
    const matchPilot    = selectedPilot === 'All pilots' || r.pilot === selectedPilot || r.pilot === 'All pilots';
    const matchCategory = selectedCategory === 'All' || r.category === selectedCategory;
    const matchFormat   = selectedFormat === 'All' || r.format === selectedFormat;
    return matchPilot && matchCategory && matchFormat;
  });

  const handleDownload = (report: Report) => {
    if (report.status !== 'ready') {
      toast.info(`"${report.title}" is not yet ready for download.`);
      return;
    }
    toast.success(`Downloading ${report.format}: ${report.title}`);
  };

  const handleBuildReport = () => {
    toast.success('Custom report queued — you will be notified when it is ready.');
    setShowBuilder(false);
  };

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Reports auto-compiled from live SPICE tool data · Role-based export permissions · Horizon Europe deliverable templates
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1a3924] mb-1">Reports & Export</h1>
          <p className="text-gray-500 text-[13px]">
            Generate, download, and schedule exports from all SPICE tool outputs across pilots and phases.
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[13px] shadow-sm transition-colors"
          style={{ backgroundColor: '#1a3924', color: '#fff' }}
        >
          <Settings2 size={14} />
          Build custom report
        </button>
      </div>

      {/* Custom Report Builder */}
      {showBuilder && (
        <div className="bg-white rounded-2xl border border-[#d6e8dc] shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 size={15} style={{ color: '#1a3924' }} />
            <span className="text-[14px] font-semibold" style={{ color: '#1a3924' }}>Custom Report Builder</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Pilot</label>
              <select value={builderPilot} onChange={e => setBuilderPilot(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700">
                <option>Thessaloniki</option><option>Rovaniemi</option>
                <option>Cuba</option><option>Bielsko-Biała</option><option>All pilots</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Phase scope</label>
              <select value={builderPhase} onChange={e => setBuilderPhase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700">
                <option>All phases</option>
                <option>Phase 1: Framing &amp; Readiness</option>
                <option>Phase 2: Collective Understanding</option>
                <option>Phase 3: Co-design &amp; Scenario Building</option>
                <option>Phase 4: Prototyping &amp; Testing</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Export format</label>
              <select value={builderFormat} onChange={e => setBuilderFormat(e.target.value as ReportFormat)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700">
                <option>PDF</option><option>DOCX</option><option>XLSX</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[11px] font-medium text-gray-500 mb-2">Include sections</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(builderSections) as (keyof typeof builderSections)[]).map(k => (
                <button key={k}
                  onClick={() => setBuilderSections(s => ({ ...s, [k]: !s[k] }))}
                  className="px-3 py-1 rounded-full text-[11px] font-medium border transition-colors"
                  style={{
                    backgroundColor: builderSections[k] ? '#1a3924' : '#fff',
                    color: builderSections[k] ? '#fff' : '#4a5e4f',
                    borderColor: builderSections[k] ? '#1a3924' : '#d6e8dc',
                  }}>
                  {k === 'executive' ? 'Executive summary'
                    : k === 'citivoice' ? 'CitiVoice data'
                    : k === 'workshops' ? 'Workshop outputs'
                    : k === 'forum' ? 'Forum activity'
                    : k === 'analytics' ? 'Analytics & KPIs'
                    : 'Appendix'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowBuilder(false)}
              className="px-4 py-2 rounded-xl text-[12px] font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleBuildReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium text-white"
              style={{ backgroundColor: '#1a3924' }}>
              <RefreshCw size={12} /> Generate report
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Reports ready',   value: REPORTS.filter(r => r.status === 'ready').length,     icon: CheckCircle2, color: '#48a06e', bg: '#edf7f1' },
          { label: 'Generating',      value: REPORTS.filter(r => r.status === 'generating').length, icon: RefreshCw,    color: '#f5a623', bg: '#fef8ee' },
          { label: 'Scheduled',       value: REPORTS.filter(r => r.status === 'scheduled').length,  icon: Clock,        color: '#6b9e8a', bg: '#eef5f3' },
          { label: 'Total downloads', value: '284',                                                  icon: Download,     color: '#4a6fa5', bg: '#eef2f9' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div className="text-[20px] font-bold" style={{ color: '#1a3924' }}>{value}</div>
              <div className="text-[11px] text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Category pills */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setSelectedCategory(c)}
              className="px-3 py-1 rounded-full text-[11px] font-medium border transition-colors"
              style={{
                backgroundColor: selectedCategory === c ? '#1a3924' : '#fff',
                color: selectedCategory === c ? '#fff' : '#4a5e4f',
                borderColor: selectedCategory === c ? '#1a3924' : '#d6e8dc',
              }}>
              {c}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <select value={selectedPilot} onChange={e => setSelectedPilot(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700 shadow-sm">
            {PILOTS.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={selectedFormat} onChange={e => setSelectedFormat(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700 shadow-sm">
            <option value="All">All formats</option>
            <option>PDF</option><option>DOCX</option>
            <option>XLSX</option><option>CSV</option><option>JSON</option>
          </select>
        </div>
      </div>

      <div className="text-[12px] text-gray-500 mb-4">
        {filtered.length} report{filtered.length !== 1 ? 's' : ''} found
      </div>

      {/* Report list */}
      <div className="flex flex-col gap-3">
        {filtered.map((report) => {
          const FmtIcon = FORMAT_ICON[report.format];
          return (
            <div key={report.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex items-start gap-4">
              <div className="text-[30px] leading-none flex-shrink-0 mt-0.5">{report.icon}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="text-[13px] font-semibold leading-tight" style={{ color: '#1a3924' }}>
                    {report.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status badge */}
                    {report.status === 'ready' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 size={9} /> Ready
                      </span>
                    )}
                    {report.status === 'generating' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
                        <RefreshCw size={9} className="animate-spin" /> Generating
                      </span>
                    )}
                    {report.status === 'scheduled' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                        <Clock size={9} /> Scheduled
                      </span>
                    )}
                    {/* Format badge */}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${FORMAT_STYLE[report.format]}`}>
                      <FmtIcon size={9} /> {report.format}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 mb-2.5 leading-relaxed">{report.description}</p>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] bg-[#f5f2ee] text-gray-600 px-2 py-0.5 rounded-full">
                    {report.pilot}
                  </span>
                  <span className="text-[10px] bg-[#f0f7f3] text-[#2e6e45] px-2 py-0.5 rounded-full">
                    {report.phase}
                  </span>
                  {report.generated !== '—' && (
                    <span className="text-[10px] text-gray-400">Updated {report.generated}</span>
                  )}
                  {report.size !== '—' && (
                    <span className="text-[10px] text-gray-400">{report.size}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 flex-shrink-0">
                {report.status === 'ready' && (
                  <>
                    <button onClick={() => toast.success(`Previewing: ${report.title}`)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-[#1a3924] hover:bg-[#f0f7f3] transition-colors"
                      title="Preview">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => toast.success(`Share link copied for: ${report.title}`)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-[#1a3924] hover:bg-[#f0f7f3] transition-colors"
                      title="Share">
                      <Share2 size={14} />
                    </button>
                    <button onClick={() => handleDownload(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-colors"
                      style={{ backgroundColor: '#1a3924' }}>
                      <Download size={13} /> Download
                    </button>
                  </>
                )}
                {report.status === 'generating' && (
                  <button disabled
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
                    <RefreshCw size={13} className="animate-spin" /> In progress
                  </button>
                )}
                {report.status === 'scheduled' && (
                  <button disabled
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
                    <Clock size={13} /> Scheduled
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="text-[32px] mb-3">📭</div>
            <div className="text-[14px] font-semibold text-gray-500 mb-1">No reports match your filters</div>
            <div className="text-[12px] text-gray-400">Try clearing filters or generating a custom report above.</div>
          </div>
        )}
      </div>
    </div>
  );
}
