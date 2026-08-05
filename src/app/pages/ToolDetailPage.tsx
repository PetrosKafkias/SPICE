import { useParams, Link } from 'react-router';
import { ArrowLeft, Clock, Users, DollarSign, Wifi, Info, Plus, Bot, CheckCircle2, AlertCircle, BookOpen, Lightbulb } from 'lucide-react';
import { TOOLS, PHASES } from '../data/tools';
import { useApp } from '../context/AppContext';
import { toast } from 'sonner';

const MODE_COLORS: Record<string, string> = {
  Online: 'bg-[#e6f5f5] text-[#0f6e6e]',
  Offline: 'bg-[#fef3e8] text-[#8b4f15]',
  Hybrid: 'bg-[#eaf3ea] text-[#3a6b3a]',
};

const BUDGET_COLORS: Record<string, string> = {
  Low: 'text-[#3a6b3a]',
  Medium: 'text-[#8b4f15]',
  High: 'text-red-600',
};

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToolToProcess, myProcessTools } = useApp();

  const tool = TOOLS.find((t) => t.id === id);

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-[48px] mb-4">🔍</div>
        <h2 className="text-[20px] font-bold text-[#1b3a5c] mb-2">Tool not found</h2>
        <Link to="/explore" className="text-[#1b3a5c] underline text-[13px]">Back to toolkit</Link>
      </div>
    );
  }

  const phase = PHASES.find((p) => p.id === tool.phase)!;
  const inProcess = myProcessTools.includes(tool.id);

  const handleAdd = () => {
    addToolToProcess(tool.id);
    toast.success(`"${tool.name}" added to your process`);
  };

  // Related tools (same phase)
  const relatedTools = TOOLS.filter((t) => t.phase === tool.phase && t.id !== tool.id).slice(0, 3);

  return (
    <div className="px-8 py-8 max-w-[1100px] mx-auto">
      {/* Back */}
      <Link to="/explore" className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-[#1b3a5c] mb-4 group">
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to full catalogue
      </Link>

      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Tool detail page - Repository read from backend - "Add to Process" triggers REST API write
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-6">
        {/* Main content */}
        <div>
          {/* Title */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${phase.light} ${phase.color}`}>
                    Phase {phase.id}: {phase.name}
                  </span>
                  {tool.objectiveTags.map((tag) => (
                    <span key={tag} className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{tag}</span>
                  ))}
                </div>
                <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-2">{tool.name}</h1>
                <p className="text-gray-600 text-[14px] leading-relaxed">{tool.purpose}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={inProcess}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[13px] shadow-md transition-colors
                  ${inProcess ? 'bg-[#4a7c59] text-white cursor-default' : 'bg-[#1b3a5c] text-white hover:bg-[#163058]'}`}
              >
                <Plus size={16} />
                {inProcess ? 'In My Process' : 'Add to Process'}
              </button>
              <Link to="/ai-agent"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#5a3f7a]/30 bg-[#f0eef8] text-[#5a3f7a] font-semibold text-[13px] hover:bg-[#e8e6f4] transition-colors">
                <Bot size={16} />
                Ask AI about this tool
              </Link>
            </div>
          </div>

          {/* Usage & Tips */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#1b3a5c] mb-4">Guidance</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#e8f0f7] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb size={13} className="text-[#1b3a5c]" />
                  <span className="text-[12px] font-semibold text-[#1b3a5c]">Usage tip</span>
                </div>
                <p className="text-[12px] text-gray-700 leading-relaxed">{tool.usageTip}</p>
              </div>
              <div className="bg-[#fefce8] border border-[#e8e3c8] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen size={13} className="text-[#8b4f15]" />
                  <span className="text-[12px] font-semibold text-[#8b4f15]">Pro tip</span>
                </div>
                <p className="text-[12px] text-gray-700 leading-relaxed">{tool.proTip}</p>
              </div>
            </div>
          </div>

          {/* Expected outputs */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#1b3a5c] mb-3">Expected Outputs</h2>
            <div className="grid grid-cols-2 gap-2">
              {tool.expectedOutputs.map((output) => (
                <div key={output} className="flex items-center gap-2 py-1.5 px-3 bg-[#eaf3ea] rounded-lg">
                  <CheckCircle2 size={13} className="text-[#3a6b3a] flex-shrink-0" />
                  <span className="text-[12px] text-gray-700">{output}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-[#f0eef8] rounded-xl border border-purple-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-[#5a3f7a]" />
              <h3 className="text-[13px] font-semibold text-[#5a3f7a]">Accessibility notes</h3>
            </div>
            <p className="text-[12px] text-[#5a3f7a]/80 leading-relaxed">{tool.accessibilityNotes}</p>
          </div>

          {/* Examples placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#1b3a5c] mb-3">Examples & Screenshots</h2>
            <div className="grid grid-cols-3 gap-3">
              {['Workshop session — Thessaloniki', 'Output documentation — Rovaniemi', 'Digital implementation — CitiVoice'].map((label, i) => (
                <div key={i} className="bg-[#f5f2ee] rounded-lg aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-[24px] mb-1">{['📸', '📋', '💻'][i]}</div>
                  <div className="text-[10px] text-gray-500 text-center px-2">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Screenshots from SPICE pilot implementations. Stored in the Repository.</p>
          </div>
        </div>

        {/* Sidebar: specs */}
        <div className="flex flex-col gap-4">
          {/* Quick specs */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-[13px] font-bold text-[#1b3a5c] mb-3">Quick specifications</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <Wifi size={14} className="text-[#1b3a5c] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">Mode</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${MODE_COLORS[tool.mode]}`}>{tool.mode}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock size={14} className="text-[#1b3a5c] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">Duration</div>
                  <div className="text-[12px] text-gray-700">{tool.duration}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock size={14} className="text-[#c8691e] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">Development time</div>
                  <div className="text-[12px] text-gray-700">{tool.developmentTime}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users size={14} className="text-[#1b3a5c] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">Group size</div>
                  <div className="text-[12px] text-gray-700">{tool.groupSize}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users size={14} className="text-[#0f6e6e] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">Facilitator ratio</div>
                  <div className="text-[12px] text-gray-700">{tool.facilitatorRatio}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign size={14} className={`mt-0.5 flex-shrink-0 ${BUDGET_COLORS[tool.budget]}`} />
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">Budget</div>
                  <div className={`text-[12px] font-medium ${BUDGET_COLORS[tool.budget]}`}>{tool.budget}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Info size={14} className="text-[#1b3a5c] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">Supplies required</div>
                  <div className="text-[12px] text-gray-700">{tool.suppliesRequired}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy note */}
          <div className="bg-[#e8f0f7] rounded-xl p-3">
            <div className="text-[11px] font-semibold text-[#1b3a5c] mb-1">Data & Privacy</div>
            <div className="text-[11px] text-[#1b3a5c]/70">
              Outputs from this tool are shared with the project team only unless explicitly made public.
              Contributions are stored on SPICE project servers.
            </div>
          </div>

          {/* Related tools */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-[13px] font-bold text-[#1b3a5c] mb-3">Related tools — {phase.name}</h3>
            {relatedTools.map((t) => (
              <Link key={t.id} to={`/tool/${t.id}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:text-[#1b3a5c] group">
                <span className="text-[12px] text-gray-700 group-hover:text-[#1b3a5c]">{t.name}</span>
                <ArrowLeft size={11} className="rotate-180 text-gray-400 group-hover:text-[#1b3a5c]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
