import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ExternalLink, Keyboard, MapPinned, MousePointerClick, PlayCircle, Wrench } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { usePermissions } from '../auth/usePermissions';
import { ROLES, roleKey, type Role } from '../auth/permissions';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

const GUIDE_SECTIONS: Array<{ icon: typeof BookOpen; titleKey: TranslationKey; textKey: TranslationKey; path: string; actionKey: TranslationKey; roles: Role[] }> = [
  { icon: MapPinned, titleKey: 'demo.citizen.phasesTitle', textKey: 'demo.citizen.phasesText', path: '/co-creation-hub', actionKey: 'nav.coCreationHub', roles: ['citizen'] },
  { icon: CheckCircle2, titleKey: 'demo.citizen.participateTitle', textKey: 'demo.citizen.participateText', path: '/co-creation-hub', actionKey: 'hub.viewCurrentActivities', roles: ['citizen'] },
  { icon: BookOpen, titleKey: 'demo.citizen.resultsTitle', textKey: 'demo.citizen.resultsText', path: '/repository', actionKey: 'nav.repository', roles: ['citizen'] },
  { icon: CheckCircle2, titleKey: 'demo.citizen.decisionsTitle', textKey: 'demo.citizen.decisionsText', path: '/forum-voting', actionKey: 'nav.forum', roles: ['citizen'] },
  { icon: Wrench, titleKey: 'demo.facilitator.instructionsTitle', textKey: 'demo.facilitator.instructionsText', path: '/co-creation-hub', actionKey: 'nav.coCreationHub', roles: ['facilitator'] },
  { icon: Wrench, titleKey: 'demo.facilitator.toolsTitle', textKey: 'demo.facilitator.toolsText', path: '/co-creation-hub', actionKey: 'nav.coCreationHub', roles: ['facilitator'] },
  { icon: BookOpen, titleKey: 'demo.facilitator.resultsTitle', textKey: 'demo.facilitator.resultsText', path: '/repository', actionKey: 'nav.repository', roles: ['facilitator'] },
  { icon: Wrench, titleKey: 'demo.step2', textKey: 'demo.step2Text', path: '/setup-questionnaire', actionKey: 'setup.title', roles: ['municipality'] },
  { icon: CheckCircle2, titleKey: 'demo.municipality.reviewTitle', textKey: 'demo.municipality.reviewText', path: '/co-creation-hub', actionKey: 'nav.coCreationHub', roles: ['municipality'] },
  { icon: BookOpen, titleKey: 'demo.municipality.resultsTitle', textKey: 'demo.municipality.resultsText', path: '/repository', actionKey: 'nav.repository', roles: ['municipality'] },
  { icon: CheckCircle2, titleKey: 'demo.municipality.advanceTitle', textKey: 'demo.municipality.advanceText', path: '/co-creation-hub', actionKey: 'nav.coCreationHub', roles: ['municipality'] },
  { icon: MapPinned, titleKey: 'demo.admin.platformTitle', textKey: 'demo.admin.platformText', path: '/admin', actionKey: 'nav.account', roles: ['admin'] },
  { icon: BookOpen, titleKey: 'demo.admin.repositoryTitle', textKey: 'demo.admin.repositoryText', path: '/admin', actionKey: 'nav.repository', roles: ['admin'] },
];

export default function DemoGuidePage() {
  const { t } = useI18n();
  const { role } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTutorial, setActiveTutorial] = useState(0);
  const requestedRole = searchParams.get('guide') as Role | null;
  const initialRole = requestedRole && ROLES.includes(requestedRole) ? requestedRole : role ?? 'citizen';
  const [guideRole, setGuideRole] = useState<Role>(initialRole);
  const youtubeSearch = 'https://www.youtube.com/results?search_query=SPICE+Sustainable+Public+Spaces+Inclusive+Community+Engagement';
  const visibleGuideSections = GUIDE_SECTIONS.filter((section) => section.roles.includes(guideRole));
  const tutorial = visibleGuideSections[Math.min(activeTutorial, visibleGuideSections.length - 1)];

  useEffect(() => {
    if (requestedRole && ROLES.includes(requestedRole)) setGuideRole(requestedRole);
  }, [requestedRole]);

  useEffect(() => {
    setActiveTutorial(0);
  }, [guideRole]);

  const selectGuideRole = (nextRole: Role) => {
    setGuideRole(nextRole);
    setSearchParams({ guide: nextRole }, { replace: true });
  };

  return (
    <SpicePublicShell>
      <div className="bg-[#f7f7f7]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <StandardPageHeader icon={PlayCircle} eyebrow={t('demo.eyebrow')} title={t('demo.title')} description={t('demo.subtitle')} />
        <section className="bg-white px-6 py-10 text-center md:px-12 md:py-12">
          <div className="mx-auto mt-9 w-full max-w-[960px] overflow-hidden border-[10px] border-white bg-black shadow-[10px_12px_32px_rgba(0,0,0,0.18)]">
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                src="https://www.youtube-nocookie.com/embed?listType=search&list=SPICE%20Sustainable%20Public%20Spaces%20Inclusive%20Community%20Engagement"
                title={t('demo.videoTitle')}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-[720px] text-[13px] text-[#777]">{t('demo.videoFallback')} <a href={youtubeSearch} target="_blank" rel="noreferrer" className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[#ca7428] underline">{t('demo.openYoutube')}<ExternalLink size={13} /></a></p>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 py-12 md:px-12 md:py-16">
          <div className="mb-9 flex items-center gap-4"><BookOpen size={32} className="text-[#ca7428]" /><div><h2 className="text-[30px] font-bold text-[#444]">{t('demo.guideTitle')}</h2><p className="mt-1 text-[15px] text-[#777]">{t('demo.guideText')}</p></div></div>
          <section className="mb-8" aria-labelledby="role-guide-selector-title">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 id="role-guide-selector-title" className="text-[21px] font-bold text-[#444]">{t('demo.chooseRoleGuide')}</h2>
                <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-[#666]">{t('demo.chooseRoleGuideText')}</p>
              </div>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('demo.chooseRoleGuide')}>
                {ROLES.map((guideOption) => (
                  <button
                    key={guideOption}
                    type="button"
                    role="tab"
                    aria-selected={guideRole === guideOption}
                    onClick={() => selectGuideRole(guideOption)}
                    className={`min-h-11 cursor-pointer border-2 px-4 py-2 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] ${guideRole === guideOption ? 'border-[#f68b2c] bg-[#f68b2c] text-white' : 'border-[#bfc0c5] bg-white text-[#444] hover:border-[#ca7428] hover:text-[#a85f20]'}`}
                  >
                    {t(roleKey(guideOption))}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="mb-6 border-t-2 border-[#dedee1] pt-8">
            <h2 className="text-[22px] font-bold text-[#444]">{t('demo.platformGuideTitle')}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{t('demo.platformGuideText')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {visibleGuideSections.map(({ icon: Icon, titleKey, textKey, path, actionKey }, index) => (
              <button key={titleKey} type="button" onClick={() => navigate(path)} onFocus={() => setActiveTutorial(index)} onMouseEnter={() => setActiveTutorial(index)} className="spice-interactive-card group flex min-h-[245px] flex-col p-6 text-left md:p-8" aria-label={`${t(titleKey)}: ${t(actionKey)}`}>
                <div className="flex items-start gap-4"><span className="spice-interactive-icon grid h-12 w-12 flex-shrink-0 place-items-center rounded-full"><Icon size={24} /></span><h3 className="pt-2 text-[21px] font-bold text-[#444]">{t(titleKey)}</h3></div>
                <p className="mt-5 text-[15px] leading-relaxed text-[#555]">{t(textKey)}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[14px] font-bold text-[#ca7428]">{t(actionKey)}<ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" /></span>
              </button>
            ))}
          </div>

          <section className="spice-card mt-8 overflow-hidden bg-white" aria-live="polite">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div key={tutorial.titleKey} className="spice-tutorial-preview relative min-h-[310px] overflow-hidden border-b-2 border-[#dedee1] bg-[#f6f7f8] p-6 lg:border-b-0 lg:border-r-2 md:p-8" aria-hidden="true">
                <div className="mx-auto max-w-[620px] border-2 border-[#bfc0c5] bg-white shadow-[7px_9px_20px_rgba(68,68,68,0.12)]">
                  <div className="flex h-11 items-center gap-2 border-b border-[#dedee1] bg-[#fafafa] px-4">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f68b2c]" /><span className="h-2.5 w-2.5 rounded-full bg-[#d8d8d8]" /><span className="h-2.5 w-2.5 rounded-full bg-[#d8d8d8]" />
                    <span className="ml-3 h-5 flex-1 rounded bg-[#ececec]" />
                  </div>
                  <div className="p-6">
                    <span className="spice-tutorial-target grid h-12 w-12 place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]"><tutorial.icon size={24} /></span>
                    <span className="mt-5 block h-5 w-3/5 rounded bg-[#444]" />
                    <span className="mt-4 block h-3 w-full rounded bg-[#dedee1]" />
                    <span className="mt-2 block h-3 w-4/5 rounded bg-[#dedee1]" />
                    <span className="spice-tutorial-action mt-7 block h-11 w-44 bg-[#f68b2c]" />
                  </div>
                </div>
                <MousePointerClick className="spice-tutorial-pointer absolute bottom-10 right-12 text-[#ca7428]" size={34} />
              </div>

              <div className="flex min-h-[310px] flex-col p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#f68b2c] text-white"><tutorial.icon size={24} /></span>
                  <div><p className="text-[12px] font-bold uppercase tracking-wide text-[#ca7428]">{t('demo.guideTitle')}</p><h3 className="mt-1 text-[24px] font-bold leading-tight text-[#444]">{t(tutorial.titleKey)}</h3></div>
                </div>
                <p className="mt-5 text-[15px] leading-relaxed text-[#555]">{t(tutorial.textKey)}</p>
                <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t('demo.guideTitle')}>
                  {visibleGuideSections.map((item, index) => (
                    <button key={item.titleKey} type="button" onClick={() => setActiveTutorial(index)} className={`grid h-10 w-10 cursor-pointer place-items-center border-2 text-[13px] font-bold transition-colors ${index === activeTutorial ? 'border-[#f68b2c] bg-[#f68b2c] text-white' : 'border-[#bfc0c5] bg-white text-[#555] hover:border-[#ca7428]'}`} role="tab" aria-selected={index === activeTutorial} aria-label={t(item.titleKey)}>{index + 1}</button>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-7">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setActiveTutorial((activeTutorial + visibleGuideSections.length - 1) % visibleGuideSections.length)} className="grid h-11 w-11 cursor-pointer place-items-center border-2 border-[#444] bg-white text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428]" aria-label={t('common.previous')}><ArrowLeft size={18} /></button>
                    <button type="button" onClick={() => setActiveTutorial((activeTutorial + 1) % visibleGuideSections.length)} className="grid h-11 w-11 cursor-pointer place-items-center border-2 border-[#444] bg-white text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428]" aria-label={t('common.next')}><ArrowRight size={18} /></button>
                  </div>
                  <button type="button" onClick={() => navigate(tutorial.path)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#df7720] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#444]">{t(tutorial.actionKey)}<ArrowRight size={17} /></button>
                </div>
              </div>
            </div>
          </section>

          <article id="keyboard" className="mt-8 flex flex-col gap-5 border-2 border-[#f68b2c] bg-[#fff8f2] p-6 sm:flex-row sm:items-start md:p-8">
            <Keyboard size={30} className="flex-shrink-0 text-[#ca7428]" />
            <div><h3 className="text-[21px] font-bold text-[#444]">{t('toolkit.keyboardHelp')}</h3><p className="mt-3 text-[15px] leading-relaxed text-[#555]">{t('demo.keyboardText')}</p></div>
          </article>
        </section>
      </div>
    </SpicePublicShell>
  );
}
