import { useState } from 'react';
import { Download, Share2, Plus, Trash2, Calendar, User, FileText, Info, Award, CheckCircle2, Save, Edit3 } from 'lucide-react';
import { TOOLS, PHASES } from '../data/tools';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router';
import { toast } from 'sonner';
import ModalPortal from '../components/ModalPortal';

const WORKSHOP_DATES: Record<string, string> = {
  'stakeholder-mapping': '14 Jun 2025',
  'pilot-diagnostic': '21 Jun 2025',
  'citivoice-collection': 'Ongoing',
  'future-scenarios': '19 Jul 2025',
  'outcome-mapping': '15 Nov 2025',
};

export default function MyProcessPage() {
  const { myProcessTools, removeToolFromProcess, currentPilot } = useApp();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const selectedTools = TOOLS.filter((t) => myProcessTools.includes(t.id));

  const toolsByPhase = PHASES.map((phase) => ({
    phase,
    tools: selectedTools.filter((t) => t.phase === phase.id),
  }));

  const handleRemove = (id: string) => {
    setConfirmRemove(id);
  };

  const confirmRemoveTool = () => {
    if (confirmRemove) {
      removeToolFromProcess(confirmRemove);
      setConfirmRemove(null);
      toast.success('Tool removed from your process');
    }
  };

  const progress = Math.round((myProcessTools.length / 8) * 100);

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Saved co-creation roadmap · Requires login · Persistent storage mediated by backend · Role-aware access
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">My Process</h1>
          <p className="text-gray-500 text-[13px]">Your saved co-creation roadmap for the Thessaloniki pilot.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Process saved as draft')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-700 hover:bg-gray-50 shadow-sm">
            <Save size={14} /> Save draft
          </button>
          <button onClick={() => toast.success('Process shared with project team')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-700 hover:bg-gray-50 shadow-sm">
            <Share2 size={14} /> Share
          </button>
          <button onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1b3a5c] text-white text-[12px] font-medium hover:bg-[#163058] shadow-sm">
            <Download size={14} /> Export process plan
          </button>
        </div>
      </div>

      {/* Process info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 shadow-sm">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 font-medium">Process title</div>
            <div className="text-[13px] font-semibold text-[#1b3a5c]">Thessaloniki Waterfront Co-Design</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 font-medium">Pilot / Project</div>
            <div className="text-[13px] text-gray-700">{currentPilot.split('–')[0].trim()}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 font-medium">Lead facilitator</div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#1b3a5c] flex items-center justify-center text-white text-[10px] font-bold">N</div>
              <span className="text-[13px] text-gray-700">Nikos Papadopoulos</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 font-medium">Timeline</div>
            <div className="text-[13px] text-gray-700">Jun – Dec 2025</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-500">Process setup progress</span>
              <span className="text-[11px] font-medium text-[#1b3a5c]">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#4a7c59] rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-[#eaf3ea] px-3 py-1.5 rounded-lg">
            <Award size={14} className="text-[#3a6b3a]" />
            <span className="text-[12px] font-medium text-[#3a6b3a]">Process builder — 62 pts</span>
          </div>
          <div className="text-[11px] bg-[#e8f0f7] text-[#1b3a5c] px-3 py-1.5 rounded-lg font-medium">
            Current phase: Co-design & Scenario Building
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div className="mb-5">
        <h2 className="text-[16px] font-bold text-[#1b3a5c] mb-3">Co-Creation Roadmap</h2>
        {/* Phase columns */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {toolsByPhase.map(({ phase, tools }) => (
            <div key={phase.id} className="flex-shrink-0 w-[220px]">
              <div className={`${phase.light} rounded-t-lg px-3 py-2 flex items-center gap-2`}>
                <div className={`w-5 h-5 rounded-full ${phase.bg} flex items-center justify-center text-white text-[10px] font-bold`}>
                  {phase.id}
                </div>
                <span className={`text-[11px] font-semibold ${phase.color} leading-tight`}>{phase.name}</span>
              </div>
              <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg min-h-[200px] p-2 flex flex-col gap-2">
                {tools.map((tool) => (
                  <div key={tool.id} className="bg-[#fefce8] border border-[#e8e3c8] rounded-lg p-2.5 group">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="text-[11px] font-semibold text-[#1b3a5c] leading-tight">{tool.name}</div>
                      <button
                        onClick={() => handleRemove(tool.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="text-[10px] text-gray-500 mb-1.5">{tool.mode} · {tool.duration}</div>
                    {WORKSHOP_DATES[tool.id] && (
                      <div className="flex items-center gap-1 text-[10px] text-[#1b3a5c]">
                        <Calendar size={9} />
                        {WORKSHOP_DATES[tool.id]}
                      </div>
                    )}
                  </div>
                ))}
                {tools.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                    <div className="text-[11px] text-gray-400 mb-2">No tools added</div>
                    <Link to="/explore" className="text-[10px] text-[#1b3a5c] underline">+ Browse tools</Link>
                  </div>
                )}
                <button onClick={() => toast.info('Browse tools to add to this phase...')}
                  className="w-full mt-1 py-1.5 rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400 hover:border-[#1b3a5c]/30 hover:text-[#1b3a5c] transition-colors flex items-center justify-center gap-1">
                  <Plus size={10} /> Add tool
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Process details */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Participants */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-[#1b3a5c]" />
            <h3 className="font-semibold text-[13px] text-[#1b3a5c]">Participants & Team</h3>
          </div>
          {[
            { name: 'Municipality of Thessaloniki', role: 'Process Owner', avatar: 'MT' },
            { name: 'Nikos Papadopoulos', role: 'Lead Facilitator', avatar: 'NP' },
            { name: 'Eleni Vasiliou', role: 'Community Liaison', avatar: 'EV' },
            { name: 'ARCHi5 Studio', role: 'Urban Design Partner', avatar: 'A5' },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-2 py-1.5">
              <div className="w-6 h-6 rounded-full bg-[#1b3a5c] text-white text-[10px] font-bold flex items-center justify-center">{p.avatar}</div>
              <div>
                <div className="text-[12px] font-medium text-gray-800">{p.name}</div>
                <div className="text-[10px] text-gray-500">{p.role}</div>
              </div>
            </div>
          ))}
          <button className="w-full mt-2 py-1.5 rounded-lg border border-dashed border-gray-300 text-[11px] text-gray-400 hover:border-[#1b3a5c]/30 hover:text-[#1b3a5c] flex items-center justify-center gap-1">
            <Plus size={11} /> Add participant
          </button>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-[#1b3a5c]" />
            <h3 className="font-semibold text-[13px] text-[#1b3a5c]">Process Notes</h3>
            <Edit3 size={12} className="text-gray-400 ml-auto" />
          </div>
          <div className="text-[12px] text-gray-600 leading-relaxed">
            <p className="mb-2">Focus on the central plaza and eastern waterfront section (Phase 1 & 2 in the site plan).</p>
            <p className="mb-2">Ensure youth representation — contact local schools for the co-design sprint.</p>
            <p>Language support needed for non-Greek speakers (Romani community in Toumba district).</p>
          </div>
        </div>

        {/* Outputs */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-[#4a7c59]" />
            <h3 className="font-semibold text-[13px] text-[#1b3a5c]">Expected Outputs</h3>
          </div>
          {[
            { label: 'Stakeholder map', done: true },
            { label: 'Pilot diagnostic report', done: true },
            { label: 'CitiVoice heatmap', done: false },
            { label: 'Scenario comparison document', done: false },
            { label: '3D scene renders (3 options)', done: false },
            { label: 'Final co-design report', done: false },
          ].map((o) => (
            <div key={o.label} className="flex items-center gap-2 py-1">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${o.done ? 'bg-[#4a7c59] border-[#4a7c59]' : 'border-gray-300'}`}>
                {o.done && <CheckCircle2 size={10} className="text-white" />}
              </div>
              <span className={`text-[12px] ${o.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{o.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm remove modal */}
      {confirmRemove && (
        <ModalPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="remove-tool-dialog-title">
          <div className="relative z-10 my-auto w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-2xl">
            <h3 id="remove-tool-dialog-title" className="text-[16px] font-bold text-[#1b3a5c] mb-2">Remove tool from process?</h3>
            <p className="text-[13px] text-gray-600 mb-5">
              "{TOOLS.find((t) => t.id === confirmRemove)?.name}" will be removed from your roadmap. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={confirmRemoveTool}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-[13px] font-medium hover:bg-red-600">
                Remove
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Export modal */}
      {exportOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="export-process-dialog-title">
          <div className="relative z-10 my-auto w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-2xl">
            <h3 id="export-process-dialog-title" className="text-[16px] font-bold text-[#1b3a5c] mb-1">Export Process Plan</h3>
            <p className="text-[12px] text-gray-500 mb-4">Select format and content to export.</p>
            <div className="flex flex-col gap-2 mb-4">
              {['PDF report (full process)', 'Excel spreadsheet (tool list + timeline)', 'Word document (editable)', 'JSON (for import into another pilot)'].map((f) => (
                <label key={f} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="export-format" defaultChecked={f.startsWith('PDF')} className="text-[#1b3a5c]" />
                  <span className="text-[12px] text-gray-700">{f}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setExportOpen(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => { setExportOpen(false); toast.success('Export ready — downloading…'); }}
                className="flex-1 py-2 rounded-xl bg-[#1b3a5c] text-white text-[13px] font-medium hover:bg-[#163058] flex items-center justify-center gap-2">
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
