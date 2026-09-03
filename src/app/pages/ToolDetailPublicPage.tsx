import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, Clock, Users, CheckSquare, Bot, Camera, FileText, ChevronRight, Lightbulb, LayoutPanelTop, ListOrdered, Link as LinkIcon, Radio, Settings, UserCog, Info } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import { getTools, PHASES } from '../data/tools';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { apiRequest } from '../lib/api';

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  Hybrid: { bg: '#e8f0f7', text: '#1b3a5c' },
  Online: { bg: '#e8f5ef', text: '#2e6e45' },
  Offline: { bg: '#f0eef8', text: '#5a3f7a' },
};

export default function ToolDetailPublicPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useI18n();
  const tools = useMemo(() => getTools(language), [language]);

  const tool = tools.find((item) => item.id === id) ?? tools[0];
  const phase = PHASES.find((p) => p.id === tool.phase)!;
  const relatedTools = tools.filter((item) => item.phase === tool.phase && item.id !== tool.id).slice(0, 3);
  const mc = MODE_COLORS[tool.mode];

  const [inProcess, setInProcess] = useState(false);
  useEffect(() => {
    if (!user) { setInProcess(false); return; }
    apiRequest<{ initiatives: { setupSelectedTools: string[] }[] }>('/api/hub/initiatives')
      .then((result) => setInProcess(result.initiatives.some((initiative) => initiative.setupSelectedTools?.includes(tool.id))))
      .catch(() => setInProcess(false));
  }, [user, tool.id]);

  return (
    <SpicePublicShell variant="public">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Main content */}
          <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex flex-col gap-4 spice-card p-6">
              {/* Back link */}
              <button onClick={() => navigate('/explore-toolkit')} className="flex items-center gap-1.5 text-[13px] font-semibold text-[#ca7428] hover:text-[#a85f20] transition-colors">
                <ChevronLeft size={16} /> {t('toolDetail.back')}
              </button>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 text-[13px] font-semibold rounded-full bg-[#f5f5f5] text-[#444] flex items-center gap-1.5"><Clock size={13} />{tool.duration}</span>
                <span className="px-3 py-1.5 text-[13px] font-semibold rounded-full bg-[#f5f5f5] text-[#444] flex items-center gap-1.5"><Users size={13} />{tool.groupSize}</span>
                <span className="px-3 py-1.5 text-[13px] font-semibold rounded-full" style={{ backgroundColor: mc.bg, color: mc.text }}>{t(`analogue.${tool.mode.toLowerCase()}` as 'analogue.online' | 'analogue.offline' | 'analogue.hybrid')}</span>
              </div>

              <div>
                <h1 className="text-[32px] font-bold text-[#444] leading-tight">{tool.name}</h1>
                <p className="text-[15px] font-semibold text-[#ca7428] mt-1">{t('toolDetail.phase', { phase: tool.phase, name: t(phase.nameKey) })}</p>
                <p className="text-[15px] text-[#666] leading-relaxed mt-3">{tool.purpose}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-stretch gap-3">
                {inProcess && (
                  <span className="flex items-center gap-2 rounded bg-[#f68b2c] px-6 py-3 text-[14px] font-semibold text-white">
                    <CheckSquare size={16} /> {t('toolDetail.inProcess')}
                  </span>
                )}
                <button
                  onClick={() => navigate('/co-creation-guide')}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-[#f68b2c] text-[#ca7428] text-[14px] font-semibold rounded hover:bg-[#fdf4ea] transition-colors"
                >
                  <Bot size={16} /> {t('toolDetail.askAi')}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-[18px] font-bold text-[#444]">{t('toolDetail.howTo')}</h2>
              </div>
              <div className="grid gap-4 p-6">
                {(tool.howTo || t('toolDetail.defaultHowTo')).split(/\n+/).filter(Boolean).map((step) => step.replace(/^\d+\)\s*/, '')).map((step, index) => (
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
                <h2 className="text-[18px] font-bold text-[#444]">{t('toolDetail.guidance')}</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#fdf4ea', border: '1px solid #f5d5a0' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#f68b2c] rounded flex items-center justify-center flex-shrink-0">
                      <Lightbulb size={13} className="text-white" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#ca7428]">{t('toolDetail.usageTip')}</p>
                  </div>
                  <p className="text-[13px] text-[#444] leading-relaxed">{tool.usageTip}</p>
                </div>
                <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#e8f5ef', border: '1px solid #b6ddc6' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#2e6e45] rounded flex items-center justify-center flex-shrink-0">
                      <Lightbulb size={13} className="text-white" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#2e6e45]">{t('toolDetail.proTip')}</p>
                  </div>
                  <p className="text-[13px] text-[#444] leading-relaxed">{tool.proTip}</p>
                </div>
              </div>
            </div>

            {/* Expected Outputs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-[18px] font-bold text-[#444]">{t('toolDetail.outputs')}</h2>
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
                <h2 className="text-[18px] font-bold text-[#444]">{t('toolDetail.accessibility')}</h2>
              </div>
              <div className="p-6">
                <p className="text-[14px] text-[#666] leading-relaxed">{tool.accessibilityNotes}</p>
              </div>
            </div>

            {/* Examples & Screenshots */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-[18px] font-bold text-[#444]">{t('toolDetail.examples')}</h2>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                {[
                  { icon: Camera, label: t('toolDetail.workshopSession'), onClick: () => navigate(`/repository?phase=${tool.phase}`) },
                  { icon: FileText, label: t('toolDetail.outputDocumentation'), onClick: () => navigate(`/repository?phase=${tool.phase}`) },
                  { icon: LayoutPanelTop, label: t('toolDetail.printableVersion'), onClick: () => (tool.printableUrl ? window.open(tool.printableUrl, '_blank', 'noopener,noreferrer') : window.print()) },
                ].map(({ icon: Icon, label, onClick }) => (
                  <button type="button" key={label} onClick={onClick} className="spice-interactive-card flex flex-col items-center justify-center gap-3 rounded-xl py-10">
                    <Icon size={32} className="text-[#ca7428]" />
                    <p className="text-[14px] font-semibold text-[#555]">{label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-[18px] font-bold text-[#444]"><ListOrdered size={20} className="text-[#ca7428]" />{t('toolDetail.requirements')}</h2>
                <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-[#666]">{(tool.requirements || tool.suppliesRequired || t('toolDetail.defaultRequirements')).replace(/^\d+_\s*/, '')}</p>
              </section>
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-[18px] font-bold text-[#444]"><LinkIcon size={20} className="text-[#ca7428]" />{t('toolDetail.resources')}</h2>
                <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-[#666]">{tool.examples || tool.onlineResources || tool.reference || t('toolDetail.defaultResources')}</p>
              </section>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-5">
            {/* Quick Specifications */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-[16px] font-bold text-[#444] mb-4">{t('toolDetail.quickSpecifications')}</h3>
              <div className="flex flex-col divide-y divide-gray-100">
                {[
                  { label: t('toolDetail.mode'), value: t(`analogue.${tool.mode.toLowerCase()}` as 'analogue.online' | 'analogue.offline' | 'analogue.hybrid'), icon: Radio },
                  { label: t('toolDetail.duration'), value: tool.duration, icon: Clock },
                  { label: t('toolDetail.developmentTime'), value: tool.developmentTime, icon: Settings },
                  { label: t('toolDetail.groupSize'), value: tool.groupSize, icon: Users },
                  { label: t('toolDetail.facilitatorRatio'), value: tool.facilitatorRatio, icon: UserCog },
                  { label: t('toolDetail.supplies'), value: tool.suppliesRequired, icon: Info },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-2.5 py-3">
                    <Icon size={15} className="mt-0.5 flex-shrink-0 text-[#ca7428]" />
                    <div>
                      <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wide">{label}</p>
                      <p className="whitespace-pre-line text-[13px] font-medium text-[#444] mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Tools */}
            {relatedTools.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-[16px] font-bold text-[#444] mb-4">{t('toolDetail.related', { phase: t(phase.nameKey) })}</h3>
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
