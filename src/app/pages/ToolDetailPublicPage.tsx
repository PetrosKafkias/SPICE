import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, Clock, Users, CheckSquare, Bot, Camera, FileText, ChevronRight, Lightbulb, CheckCircle2, LayoutPanelTop, ListOrdered, Link as LinkIcon } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import { TOOLS, PHASES } from '../data/tools';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  Hybrid: { bg: '#e8f0f7', text: '#1b3a5c' },
  Online: { bg: '#e8f5ef', text: '#2e6e45' },
  Offline: { bg: '#f0eef8', text: '#5a3f7a' },
};

export default function ToolDetailPublicPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { myProcessTools, addToolToProcess, removeToolFromProcess } = useApp();
  const { user } = useAuth();

  const tool = TOOLS.find((t) => t.id === id) ?? TOOLS[0];
  const phase = PHASES.find((p) => p.id === tool.phase)!;
  const relatedTools = TOOLS.filter((t) => t.phase === tool.phase && t.id !== tool.id).slice(0, 3);
  const mc = MODE_COLORS[tool.mode];
  const inProcess = myProcessTools.includes(tool.id);

  return (
    <SpicePublicShell variant="public">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>

        {/* Back link */}
        <button onClick={() => navigate('/explore-toolkit')} className="flex items-center gap-1.5 text-[13px] font-medium text-[#888] hover:text-[#ca7428] transition-colors mb-6">
          <ChevronLeft size={16} /> Back to exploring the toolkit freely
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Main content */}
          <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex flex-col gap-4">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 text-[13px] font-semibold rounded-full bg-[#f5f5f5] text-[#444] flex items-center gap-1.5"><Clock size={13} />{tool.duration}</span>
                <span className="px-3 py-1.5 text-[13px] font-semibold rounded-full bg-[#f5f5f5] text-[#444] flex items-center gap-1.5"><Users size={13} />{tool.groupSize}</span>
                <span className="px-3 py-1.5 text-[13px] font-semibold rounded-full" style={{ backgroundColor: mc.bg, color: mc.text }}>{tool.mode}</span>
              </div>

              <div>
                <h1 className="text-[32px] font-bold text-[#444] leading-tight">{tool.name}</h1>
                <p className="text-[15px] font-semibold text-[#ca7428] mt-1">Phase {tool.phase} | {tool.phaseName}</p>
                <p className="text-[15px] text-[#666] leading-relaxed mt-3">{tool.purpose}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (!user) {
                      navigate(`/signin?returnTo=${encodeURIComponent(`/tool-detail/${tool.id}`)}`);
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
                  className="flex items-center gap-2 px-6 py-3 bg-[#f68b2c] text-white text-[14px] font-semibold rounded hover:bg-[#e07a20] transition-colors"
                >
                  {inProcess && <CheckCircle2 size={16} />} {inProcess ? 'In My Process' : 'Add to Process'}
                </button>
                <button
                  onClick={() => navigate('/co-creation-guide')}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-[#f68b2c] text-[#ca7428] text-[14px] font-semibold rounded hover:bg-[#fdf4ea] transition-colors"
                >
                  <Bot size={16} /> Ask AI about this tool
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-[18px] font-bold text-[#444]">How to use this participatory tool</h2>
              </div>
              <div className="grid gap-4 p-6">
                {(tool.howTo || 'Review the purpose with participants, prepare the required materials, facilitate the activity, and document the shared outputs.').split(/\n+/).filter(Boolean).map((step, index) => (
                  <div key={`${index}-${step.slice(0, 20)}`} className="flex gap-3">
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-[#fff0e1] text-[12px] font-bold text-[#ca7428]">{index + 1}</span>
                    <p className="text-[14px] leading-relaxed text-[#555]">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Guidance */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-[18px] font-bold text-[#444]">Guidance</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#fdf4ea', border: '1px solid #f5d5a0' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#f68b2c] rounded flex items-center justify-center flex-shrink-0">
                      <Lightbulb size={13} className="text-white" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#ca7428]">Usage Tip</p>
                  </div>
                  <p className="text-[13px] text-[#444] leading-relaxed">{tool.usageTip}</p>
                </div>
                <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#e8f5ef', border: '1px solid #b6ddc6' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#2e6e45] rounded flex items-center justify-center flex-shrink-0">
                      <Lightbulb size={13} className="text-white" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#2e6e45]">Usage Tip</p>
                  </div>
                  <p className="text-[13px] text-[#444] leading-relaxed">{tool.proTip}</p>
                </div>
              </div>
            </div>

            {/* Expected Outputs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-[18px] font-bold text-[#444]">Expected Outputs</h2>
              </div>
              <div className="p-6 flex flex-wrap gap-3">
                {tool.expectedOutputs.map((output) => (
                  <div key={output} className="flex items-center gap-2 px-3 py-2 bg-[#f0f8f4] rounded-lg border border-[#c8e0d0]">
                    <CheckSquare size={14} className="text-[#2e6e45] flex-shrink-0" />
                    <span className="text-[13px] font-medium text-[#2e6e45]">{output}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Accessibility Notes */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-[18px] font-bold text-[#444]">Accessibility Notes</h2>
              </div>
              <div className="p-6">
                <p className="text-[14px] text-[#666] leading-relaxed">{tool.accessibilityNotes}</p>
              </div>
            </div>

            {/* Examples & Screenshots */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-[18px] font-bold text-[#444]">Examples &amp; Screenshots</h2>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                {[
                  { icon: Camera, label: 'Workshop Session' },
                  { icon: FileText, label: 'Output documentation' },
                  { icon: LayoutPanelTop, label: 'Printable Version' },
                ].map(({ icon: Icon, label }) => label === 'Printable Version' ? (
                  <button type="button" key={label} onClick={() => tool.printableUrl ? window.open(tool.printableUrl, '_blank', 'noopener,noreferrer') : window.print()} className="spice-interactive-card flex flex-col items-center justify-center gap-3 rounded-xl py-10">
                    <Icon size={32} className="text-[#ca7428]" />
                    <p className="text-[14px] font-semibold text-[#555]">{label}</p>
                  </button>
                ) : (
                  <div key={label} className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-[#fafafa] py-10">
                    <Icon size={32} className="text-[#aaa]" />
                    <p className="text-[14px] font-medium text-[#777]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-[18px] font-bold text-[#444]"><ListOrdered size={20} className="text-[#ca7428]" />Requirements and preparation</h2>
                <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-[#666]">{tool.requirements || tool.suppliesRequired || 'No additional preparation requirements are specified in the approved source workbook.'}</p>
              </section>
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-[18px] font-bold text-[#444]"><LinkIcon size={20} className="text-[#ca7428]" />Examples and resources</h2>
                <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-[#666]">{tool.examples || tool.onlineResources || tool.reference || 'Use the printable version as a facilitation template and upload the documented outcome to the SPICE Repository.'}</p>
              </section>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-5">
            {/* Quick Specifications */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-[16px] font-bold text-[#444] mb-4">Quick Specifications</h3>
              <div className="flex flex-col divide-y divide-gray-100">
                {[
                  { label: 'Phase', value: `Phase ${tool.phase}` },
                  { label: 'Duration', value: tool.duration },
                  { label: 'Implementation Time', value: tool.implementationTime },
                  { label: 'Development Time', value: tool.developmentTime },
                  { label: 'Group Size', value: tool.groupSize },
                  { label: 'Facilitator', value: tool.facilitatorRatio },
                  { label: 'Supplies Required', value: tool.suppliesRequired },
                ].map(({ label, value }) => (
                  <div key={label} className="py-3">
                    <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wide">{label}</p>
                    <p className="text-[13px] font-medium text-[#444] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Tools */}
            {relatedTools.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-[16px] font-bold text-[#444] mb-4">Related Tools - {phase.name}</h3>
                <div className="flex flex-col gap-2">
                  {relatedTools.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/tool-detail/${t.id}`)}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-[#fdf4ea] transition-colors text-left w-full"
                    >
                      <span className="text-[13px] font-medium text-[#444]">{t.name}</span>
                      <ChevronRight size={14} className="text-[#ca7428] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SpicePublicShell>
  );
}
