import { ArrowRight, Bot, CheckCircle2, Circle, Clock, DraftingCompass, FileStack, Grid3X3, Plus, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

const PHASES: Array<{ id: number; labelKey: TranslationKey }> = [
  { id: 1, labelKey: 'hub.phase1' },
  { id: 2, labelKey: 'hub.phase2' },
  { id: 3, labelKey: 'hub.phase3' },
  { id: 4, labelKey: 'hub.phase4' },
  { id: 5, labelKey: 'hub.phase5' },
];

const OBJECTIVE_PHASES: Record<string, number> = {
  framing: 1,
  collective: 2,
  codesign: 3,
  prototype: 4,
  consolidation: 5,
};

const QUICK_START: Array<{ icon: typeof FileStack; labelKey: TranslationKey; textKey: TranslationKey; path: string }> = [
  { icon: FileStack, labelKey: 'hub.setup', textKey: 'hub.setupText', path: '/setup-questionnaire' },
  { icon: Grid3X3, labelKey: 'hub.explore', textKey: 'hub.exploreText', path: '/explore-toolkit' },
  { icon: DraftingCompass, labelKey: 'hub.scenarios', textKey: 'hub.scenariosText', path: '/possible-scenarios' },
  { icon: Bot, labelKey: 'hub.guide', textKey: 'hub.guideText', path: '/co-creation-guide' },
];

const RECOMMENDED_TOOLS: Array<{
  id: string;
  nameKey: TranslationKey;
  textKey: TranslationKey;
  mode: 'Online' | 'Offline' | 'Hybrid';
  duration: string;
  groupSize: string;
  status: string;
}> = [
  { id: 'future-scenarios', nameKey: 'hub.tool.future', textKey: 'hub.tool.futureText', mode: 'Hybrid', duration: '45-90 m', groupSize: '12-30 people', status: 'Content ready' },
  { id: 'design-sprint', nameKey: 'hub.tool.sprint', textKey: 'hub.tool.sprintText', mode: 'Hybrid', duration: '2-3 days', groupSize: '8-20 people', status: 'Content ready' },
  { id: 'digital-forum', nameKey: 'hub.tool.forum', textKey: 'hub.tool.forumText', mode: 'Online', duration: 'Flexible', groupSize: 'Not specified', status: 'Content ready' },
  { id: 'scene-visualisation', nameKey: 'hub.tool.scene', textKey: 'hub.tool.sceneText', mode: 'Online', duration: '45-90 m', groupSize: 'Not specified', status: 'Content ready' },
];

const MODE_COLORS: Record<(typeof RECOMMENDED_TOOLS)[number]['mode'], { bg: string; text: string }> = {
  Hybrid: { bg: '#e8f0f7', text: '#1b3a5c' },
  Online: { bg: '#e8f5ef', text: '#2e6e45' },
  Offline: { bg: '#f0eef8', text: '#5a3f7a' },
};
const PUBLIC_OVERVIEW_PATHS = new Set(['/explore-toolkit', '/possible-scenarios']);
export default function OverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useI18n();
  const { myProcessTools, addToolToProcess, removeToolFromProcess, processSetup } = useApp();
  const selectedPhases = new Set(processSetup.objectives.map((objective) => OBJECTIVE_PHASES[objective]).filter(Boolean));

  const requireAccount = (path: string) => {
    if (user || PUBLIC_OVERVIEW_PATHS.has(path)) navigate(path);
    else navigate(`/signin?returnTo=${encodeURIComponent(path)}`, { state: { from: location.pathname } });
  };

  const toggleTool = (toolId: string) => {
    if (!user) {
      toast.info(t('hub.signInToAdd'));
      navigate(`/signin?returnTo=${encodeURIComponent('/co-creation-hub')}`);
      return;
    }
    if (myProcessTools.includes(toolId)) {
      removeToolFromProcess(toolId);
      toast.success(t('hub.remove'));
    } else {
      addToolToProcess(toolId);
      toast.success(t('hub.added'));
    }
  };

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={Grid3X3} eyebrow={t('hub.eyebrow')} title={t('hub.title')} description={t('hub.subtitle')} />
      <div className="spice-page spice-wide-page" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {user && <section className="border-2 border-[#bfc0c5] bg-white p-6 md:p-8">
          <h2 className="text-[27px] font-bold text-[#444]">{t('hub.roadmap')}</h2>
          <p className="mt-2 text-[15px] font-medium text-[#666]">{t('hub.roadmapText')}</p>
          <div className="mt-8 overflow-x-auto pb-2">
            <div className="grid min-w-[760px] grid-cols-5" role="list">
              {PHASES.map((phase, index) => {
              const active = user && (selectedPhases.size === 0 ? phase.id === 1 : selectedPhases.has(phase.id));
              return (
                <div key={phase.id} className="relative flex flex-col items-center px-3 text-center" role="listitem">
                  {index < PHASES.length - 1 && <span className="absolute left-[calc(50%+24px)] right-[calc(-50%+24px)] top-6 h-0.5 bg-[#d7d8dc]" />}
                  <span className={`relative z-10 grid h-12 w-12 place-items-center rounded-full border-2 ${active ? 'border-[#f68b2c] bg-[#fff4e9] text-[#ca7428]' : 'border-[#c7c8cc] bg-white text-[#aaa]'}`}>
                    {active ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </span>
                  <p className="mt-4 text-[12px] font-bold leading-snug text-[#444]">{t(phase.labelKey)}</p>
                  {user && active && (
                    <button
                      type="button"
                      onClick={() => navigate(`/repository?phase=${phase.id}`)}
                      className="mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 border border-[#ca7428] bg-white px-3 py-2 text-[11px] font-bold text-[#a85f20] transition-colors hover:bg-[#fff0e1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]"
                      aria-label={`${t('hub.viewPhaseResults')}: ${t(phase.labelKey)}`}
                    >
                      {t('hub.viewPhaseResults')} <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
              })}
            </div>
          </div>
        </section>}

        {user && <section className="mt-12">
          <h2 className="text-[27px] font-bold text-[#444]">{t('hub.getStarted')}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_START.map(({ icon: Icon, labelKey, textKey, path }) => (
              <article key={labelKey} className="flex min-h-[290px] flex-col border-[3px] border-[#f68b2c] bg-white p-5">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]"><Icon size={23} /></span>
                <h3 className="mt-6 text-[20px] font-bold leading-tight text-[#444]">{t(labelKey)}</h3>
                <p className="mt-3 flex-1 text-[14px] font-medium leading-relaxed text-[#666]">{t(textKey)}</p>
                <button type="button" onClick={() => requireAccount(path)} className="mt-6 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]">
                  {t('common.continue')} <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>}

        {user && <section className="mt-12">
          <h2 className="text-[27px] font-bold text-[#444]">{t('hub.recommended')}</h2>
          <p className="mt-2 text-[15px] font-medium text-[#666]">{t('hub.recommendedText')}</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {RECOMMENDED_TOOLS.map((tool) => {
              const inProcess = myProcessTools.includes(tool.id);
              const modeColor = MODE_COLORS[tool.mode];
              return (
                <article
                  key={tool.id}
                  className="flex min-h-[260px] flex-col overflow-hidden bg-white"
                  style={{ border: `${inProcess ? 3 : 2}px solid ${inProcess ? '#f68b2c' : '#d7d8dc'}` }}
                >
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-[15px] font-bold text-[#444]">{t(tool.nameKey)}</h3>
                      {inProcess && <span className="inline-flex flex-shrink-0 items-center gap-1 bg-[#fff0e1] px-2.5 py-1 text-[10px] font-bold text-[#ca7428]"><CheckCircle2 size={13} />{t('hub.added')}</span>}
                    </div>
                    <p className="flex-1 text-[13px] font-medium leading-relaxed text-[#666]">{t(tool.textKey)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: modeColor.bg, color: modeColor.text }}>{tool.mode}</span>
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-[#444]"><Clock size={10} aria-hidden="true" />{tool.duration}</span>
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-[#444]"><Users size={10} aria-hidden="true" />{tool.groupSize}</span>
                      <span className="rounded-full bg-[#fff0e1] px-2.5 py-1 text-[11px] font-semibold text-[#a85f20]">{tool.status}</span>
                    </div>
                  </div>
                  <div className="flex border-t border-gray-100">
                    <button type="button" onClick={() => requireAccount(`/tool-detail/${tool.id}`)} className="min-h-12 flex-1 cursor-pointer border-r border-gray-100 px-4 py-3 text-[13px] font-semibold text-[#444] transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#ca7428]">{t('hub.more')}</button>
                    <button
                      type="button"
                      onClick={() => toggleTool(tool.id)}
                      className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#444]"
                      style={{ backgroundColor: inProcess ? '#fff3e8' : '#f68b2c', color: inProcess ? '#ca7428' : 'white' }}
                    >
                      {inProcess ? <><CheckCircle2 size={14} />{t('hub.added')}</> : <><Plus size={14} />{t('hub.add')}</>}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>}
      </div>
    </SpicePublicShell>
  );
}
