import { useState } from 'react';
import { Search, Upload, Download, Info, ExternalLink, Tag } from 'lucide-react';
import { toast } from 'sonner';

const DOCS = [
  {
    id: 1, title: 'Thessaloniki Pilot Diagnostic Report', type: 'PDF', icon: '📋',
    pilot: 'Thessaloniki', phase: 'Framing & Readiness', size: '2.4 MB',
    date: '22 Jun 2025', author: 'Nikos Papadopoulos', public: false,
    tags: ['Diagnostic', 'Phase 1', 'Report'],
    desc: 'Full diagnostic assessment of the Nea Paralia site, stakeholder landscape, and readiness conditions.',
  },
  {
    id: 2, title: 'Stakeholder Mapping Workshop — Notes', type: 'DOCX', icon: '📝',
    pilot: 'Thessaloniki', phase: 'Framing & Readiness', size: '340 KB',
    date: '14 Jun 2025', author: 'Eleni Vasiliou', public: false,
    tags: ['Workshop notes', 'Phase 1', 'Facilitation'],
    desc: 'Verbatim notes and post-its from the stakeholder mapping workshop (32 participants).',
  },
  {
    id: 3, title: 'CitiVoice Campaign Summary — May–Jun 2025', type: 'PDF', icon: '📊',
    pilot: 'Thessaloniki', phase: 'Collective Understanding', size: '1.8 MB',
    date: '25 Jun 2025', author: 'CitiVoice (auto-generated)', public: true,
    tags: ['CitiVoice', 'Phase 2', 'Summary', 'Heatmap'],
    desc: 'Automated summary of 1,247 contributions, heatmaps, voting results, and sentiment analysis.',
  },
  {
    id: 4, title: 'Photo Documentation — Spatial Feedback Walk', type: 'ZIP', icon: '📸',
    pilot: 'Thessaloniki', phase: 'Collective Understanding', size: '87 MB',
    date: '18 Jun 2025', author: 'Workshop participants', public: false,
    tags: ['Photos', 'Phase 2', 'Walk'],
    desc: 'Photo collection with geo-captions from the participatory feedback walk (25 participants).',
  },
  {
    id: 5, title: 'Spatial Feedback Walk — Participatory Photojournal', type: 'PDF', icon: '📖',
    pilot: 'Thessaloniki', phase: 'Collective Understanding', size: '5.2 MB',
    date: '20 Jun 2025', author: 'Eleni Vasiliou', public: false,
    tags: ['Method', 'Analog results', 'Phase 2'],
    desc: 'Scanned and annotated photojournal outputs from the analog photojournal tool.',
  },
  {
    id: 6, title: 'SPICE Toolkit Method Guide v2.1', type: 'PDF', icon: '📚',
    pilot: 'All pilots', phase: 'All phases', size: '4.1 MB',
    date: '1 Apr 2025', author: 'SPICE Consortium', public: true,
    tags: ['Method guide', 'Toolkit', 'Reference'],
    desc: 'Complete guide to all 17 co-creation tools with facilitation notes, templates and examples.',
  },
  {
    id: 7, title: '3D Scene Editor Export — v3 (Cycle lane scenario)', type: 'GLTF', icon: '🏗️',
    pilot: 'Thessaloniki', phase: 'Co-design & Scenario Building', size: '12.4 MB',
    date: '8 May 2025', author: 'Nikos Papadopoulos', public: false,
    tags: ['3D Scene', 'Phase 3', 'Export'],
    desc: '3D Gaussian Splatting scene export — Version 3, including cycle lane and expanded greenery proposal.',
  },
  {
    id: 8, title: 'Rovaniemi — Readiness Assessment Results', type: 'XLSX', icon: '📈',
    pilot: 'Rovaniemi', phase: 'Framing & Readiness', size: '210 KB',
    date: '15 Mar 2025', author: 'City of Rovaniemi', public: false,
    tags: ['Assessment', 'Phase 1', 'Rovaniemi'],
    desc: 'Compiled survey results from the readiness assessment (89 respondents, Jan–Feb 2025).',
  },
];

const FILE_COLORS: Record<string, string> = {
  PDF: 'bg-red-50 text-red-600',
  DOCX: 'bg-blue-50 text-blue-600',
  ZIP: 'bg-yellow-50 text-yellow-600',
  XLSX: 'bg-green-50 text-green-600',
  GLTF: 'bg-purple-50 text-purple-600',
};

export default function RepositoryPage() {
  const [search, setSearch] = useState('');
  const [activePhase, setActivePhase] = useState('All');
  const [activePilot, setActivePilot] = useState('All');
  const [activeType, setActiveType] = useState('All');

  const filtered = DOCS.filter((d) => {
    const matchSearch = search === '' || d.title.toLowerCase().includes(search.toLowerCase()) || d.desc.toLowerCase().includes(search.toLowerCase());
    const matchPhase = activePhase === 'All' || d.phase === activePhase || d.phase === 'All phases';
    const matchPilot = activePilot === 'All' || d.pilot === activePilot || d.pilot === 'All pilots';
    const matchType = activeType === 'All' || d.type === activeType;
    return matchSearch && matchPhase && matchPilot && matchType;
  });

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Repository and persistent storage mediated by backend · Role-based access control · Linked outputs from SPICE tools
      </div>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">Repository</h1>
          <p className="text-gray-500 text-[13px]">Documents, media, workshop outputs, and linked results from all SPICE tools.</p>
        </div>
        <button onClick={() => toast.success('Upload dialog opened — authorised users only')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1b3a5c] text-white rounded-xl font-medium text-[13px] hover:bg-[#163058] shadow-sm">
          <Upload size={14} /> Upload
        </button>
      </div>

      {/* Search & filters */}
      <div className="flex gap-3 mb-4 items-center">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents, reports, and outputs…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-700 placeholder-gray-400 shadow-sm focus:outline-none"
          />
        </div>
        <select value={activePilot} onChange={(e) => setActivePilot(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700 shadow-sm">
          <option value="All">All pilots</option>
          <option value="Thessaloniki">Thessaloniki</option>
          <option value="Rovaniemi">Rovaniemi</option>
          <option value="Cuba">Cuba</option>
          <option value="Bielsko-Biała">Bielsko-Biała</option>
        </select>
        <select value={activePhase} onChange={(e) => setActivePhase(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700 shadow-sm">
          <option value="All">All phases</option>
          <option value="Framing & Readiness">Phase 1: Framing</option>
          <option value="Collective Understanding">Phase 2: Understanding</option>
          <option value="Co-design & Scenario Building">Phase 3: Co-design</option>
          <option value="Prototyping & Testing">Phase 4: Prototyping</option>
          <option value="Consolidation, Governance & Learning">Phase 5: Consolidation</option>
        </select>
        <select value={activeType} onChange={(e) => setActiveType(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] text-gray-700 shadow-sm">
          <option value="All">All types</option>
          <option value="PDF">PDF</option>
          <option value="DOCX">DOCX</option>
          <option value="XLSX">XLSX</option>
          <option value="ZIP">ZIP</option>
          <option value="GLTF">3D / GLTF</option>
        </select>
      </div>

      {/* Result count */}
      <div className="text-[12px] text-gray-500 mb-4">{filtered.length} document{filtered.length !== 1 ? 's' : ''} found</div>

      {/* Report summary card */}
      <div className="bg-[#e8f0f7] rounded-xl border border-[#c0d4e8] p-4 mb-5 flex items-center gap-4">
        <div className="text-[32px]">📊</div>
        <div>
          <div className="text-[13px] font-bold text-[#1b3a5c] mb-0.5">Thessaloniki Pilot — Consolidated Report (draft)</div>
          <div className="text-[11px] text-[#1b3a5c]/70">
            Auto-generated from linked repository items, CitiVoice exports, and workshop outputs. Last updated: 8 May 2025
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => toast.success('Opening report preview…')}
            className="flex items-center gap-1.5 text-[11px] text-[#1b3a5c] bg-white border border-[#c0d4e8] px-3 py-1.5 rounded-lg hover:bg-[#f0f7ff]">
            <ExternalLink size={12} /> Preview
          </button>
          <button onClick={() => toast.success('Report downloaded')}
            className="flex items-center gap-1.5 text-[11px] text-white bg-[#1b3a5c] px-3 py-1.5 rounded-lg hover:bg-[#163058]">
            <Download size={12} /> Download
          </button>
        </div>
      </div>

      {/* Document list */}
      <div className="flex flex-col gap-3">
        {filtered.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
            <div className="text-[32px] flex-shrink-0">{doc.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-[13px] font-semibold text-[#1b3a5c] leading-tight">{doc.title}</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.public ? (
                    <span className="text-[10px] bg-[#eaf3ea] text-[#3a6b3a] px-2 py-0.5 rounded-full font-medium">Public</span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Project team</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${FILE_COLORS[doc.type] || 'bg-gray-100 text-gray-600'}`}>
                    {doc.type}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{doc.desc}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-0.5 text-[10px] bg-[#f5f2ee] text-gray-600 px-1.5 py-0.5 rounded-full">
                      <Tag size={8} /> {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">{doc.pilot} · {doc.date} · {doc.author} · {doc.size}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => toast.success(`Downloading ${doc.title}…`)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#1b3a5c]">
                <Download size={14} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="text-[32px] mb-3">📂</div>
            <div className="text-[14px] font-semibold text-gray-600 mb-1">No documents found</div>
            <div className="text-[12px] text-gray-400">Try adjusting your search or filters.</div>
          </div>
        )}
      </div>
    </div>
  );
}
