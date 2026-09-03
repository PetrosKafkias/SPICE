import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Accessibility,
  Archive,
  ArrowDown,
  ArrowRight,
  Bot,
  Box,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  Landmark,
  Languages,
  Leaf,
  Lightbulb,
  ListChecks,
  Map,
  MessageCircle,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  Target,
  UsersRound,
  Vote,
  Workflow,
} from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import PilotFlag from '../components/PilotFlag';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import sceneImage from '../../assets/scene-editor-spatial.png';
import mapImage from '../../imports/Homepage/087caaf231c4809ec526b07765a4cd03a2735839.png';
import repositoryImage from '../../imports/Homepage/e686a1eb5bae881501430129224457684b2decf5.png';
import ctaLandscape from '../../imports/Homepage/06fb18451018d0df34b31fdeacb7bf2e6c9b0972.png';
import chatbotImage from '../../assets/tool-ai-chatbot.png';
import forumImage from '../../assets/tool-forum-voting.png';
import methodologyImage from '../../assets/methodology-card.png';
import coCreationProcessImage from '../../imports/Homepage/bf12a0be312c383c6259b344bc7d9c1812490034.png';
import itiLogo from '../../assets/partners/iti.png';
import kepaLogo from '../../assets/partners/kepa.png';
import drevenLogo from '../../assets/partners/dreven.png';
import codesignLogo from '../../assets/partners/codesign.png';
import iridraLogo from '../../assets/partners/iridra.png';
import uabLogo from '../../assets/partners/uab.png';
import ensaLogo from '../../assets/partners/ensa.png';
import impactHubLogo from '../../assets/partners/impact-hub.png';
import euradaLogo from '../../assets/partners/eurada.png';
import arrLogo from '../../assets/partners/arr.png';
import makeItBetterLogo from '../../assets/partners/make-it-better.png';
import arcticFactoryLogo from '../../assets/partners/arctic-factory.png';
import thessalonikiLogo from '../../assets/partners/city-thessaloniki.png';
import rovaseudunLogo from '../../assets/partners/rovaseudun.png';
import cubaLogo from '../../assets/partners/municipio-cuba.png';
import { getTools } from '../data/tools';

const PILOTS = [
  { code: 'GR', slug: 'thessaloniki', cityKey: 'home.pilot.thessaloniki', countryKey: 'home.country.greece', titleKey: 'pilots.site.thessaloniki.title', focusKey: 'pilots.site.thessaloniki.focus' },
  { code: 'FI', slug: 'rovaniemi', cityKey: 'home.pilot.rovaniemi', countryKey: 'home.country.finland', titleKey: 'pilots.site.rovaniemi.title', focusKey: 'pilots.site.rovaniemi.focus' },
  { code: 'PL', slug: 'bielsko-biala', cityKey: 'home.pilot.bielsko', countryKey: 'home.country.poland', titleKey: 'pilots.site.bielsko-biala.title', focusKey: 'pilots.site.bielsko-biala.focus' },
  { code: 'PT', slug: 'cuba', cityKey: 'home.pilot.cuba', countryKey: 'home.country.portugal', titleKey: 'pilots.site.cuba.title', focusKey: 'pilots.site.cuba.focus' },
];

const PILLARS = [
  { icon: Accessibility, titleKey: 'home.pillar.accessibility', textKey: 'home.pillar.accessibilityText' },
  { icon: ShieldCheck, titleKey: 'home.pillar.privacy', textKey: 'home.pillar.privacyText' },
  { icon: UsersRound, titleKey: 'home.pillar.impact', textKey: 'home.pillar.impactText' },
  { icon: MessageCircle, titleKey: 'home.pillar.channel', textKey: 'home.pillar.channelText' },
];

const DIGITAL_TOOLS = [
  {
    icon: Workflow,
    titleKey: 'nav.coCreationHub',
    textKey: 'home.tool.processText',
    image: coCreationProcessImage,
    path: '/co-creation-hub',
  },
  {
    icon: Map,
    titleKey: 'home.tool.citivoiceTitle',
    textKey: 'home.tool.citivoiceText',
    image: mapImage,
    path: '/citivoice-app',
  },
  {
    icon: Box,
    titleKey: 'nav.sceneEditor',
    textKey: 'home.tool.sceneText',
    image: sceneImage,
    path: '/3d-scene-editor',
  },
  {
    icon: Bot,
    titleKey: 'home.tool.aiTitle',
    textKey: 'home.tool.aiText',
    image: chatbotImage,
    path: '/co-creation-guide',
  },
];

const PLATFORM_LINKS = [
  {
    icon: Archive,
    titleKey: 'nav.repository',
    textKey: 'home.tool.repositoryText',
    image: repositoryImage,
    path: '/repository',
    categoryKey: 'home.categoryKnowledge',
  },
  {
    icon: Vote,
    titleKey: 'nav.forum',
    textKey: 'home.tool.forumText',
    image: forumImage,
    path: '/forum-voting',
    categoryKey: 'home.categoryParticipation',
  },
  {
    icon: BookOpenCheck,
    titleKey: 'nav.methodology',
    textKey: 'home.tool.methodologyText',
    image: methodologyImage,
    path: '/methodology',
    categoryKey: 'home.categoryGuidance',
  },
];

const LANGUAGE_FEATURES = [
  { n: 1, titleKey: 'home.feature.localized', textKey: 'home.feature.localizedText' },
  { n: 2, titleKey: 'home.feature.guidance', textKey: 'home.feature.guidanceText' },
  { n: 3, titleKey: 'home.feature.participation', textKey: 'home.feature.participationText' },
  { n: 4, titleKey: 'home.feature.content', textKey: 'home.feature.contentText' },
];

const LANGUAGE_LABELS = [
  'EN: Co-creation',
  'EL: Συνδημιουργία',
  'FI: Yhteisluominen',
  'PL: Współtworzenie',
  'PT: Co-Criação',
];

const PARTNERS = [
  { name: 'Information Technologies Institute', image: itiLogo },
  { name: 'KEPA Business and Cultural Development Centre', image: kepaLogo },
  { name: 'DREVEN', image: drevenLogo },
  { name: 'CODESIGN Toscana', image: codesignLogo },
  { name: 'IRIDRA', image: iridraLogo },
  { name: 'Universitat Autònoma de Barcelona', image: uabLogo },
  { name: 'ENSA Nantes', image: ensaLogo },
  { name: 'Impact Hub', image: impactHubLogo },
  { name: 'EURADA', image: euradaLogo },
  { name: 'ARR', image: arrLogo },
  { name: 'Make It Better', image: makeItBetterLogo },
  { name: 'Arctic Factory', image: arcticFactoryLogo },
  { name: 'City of Thessaloniki', image: thessalonikiLogo },
  { name: 'Rovaseudun Markkinakiinteistöt', image: rovaseudunLogo },
  { name: 'Município de Cuba', image: cubaLogo },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { language, t, formatNumber } = useI18n();
  const sourceTools = useMemo(() => getTools(language), [language]);
  const analoguePreview = useMemo(() => [1, 2, 3, 4, 5]
    .map((phase) => sourceTools.find((tool) => tool.phase === phase))
    .filter((tool): tool is (typeof sourceTools)[number] => Boolean(tool)), [sourceTools]);

  return (
    <SpicePublicShell variant="public">
      <div className="bg-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <section className="relative overflow-hidden border-b border-[#edd9c6] bg-[linear-gradient(112deg,#fff_0%,#fffaf5_58%,#fde5ce_100%)]">
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-14 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-20">
            <div className="max-w-[590px]">
              <p className="mb-4 text-[13px] font-bold uppercase text-[#ca7428]">{t('home.nebEyebrow')}</p>
              <h1 className="max-w-[540px] text-[38px] font-bold leading-tight text-[#383838] md:text-[48px]">{t('home.nebTitle')}</h1>
              <div className="mt-5 h-1 w-[150px] bg-[#f68b2c]" />
              <p className="mt-6 max-w-[560px] text-[17px] font-medium leading-relaxed text-[#4c4c4c] md:text-[19px]">
                {t('home.nebText')}
              </p>
              <div className="mt-7 flex flex-wrap gap-2" aria-label={t('home.nebValues')}>
                {[
                  [t('home.sustainable'), Leaf],
                  [t('home.together'), HeartHandshake],
                  [t('home.beautiful'), Palette],
                ].map(([label, Icon]) => {
                  const ValueIcon = Icon as typeof Leaf;
                  return <span key={label as string} className="inline-flex items-center gap-2 border border-[#d9b08b] bg-white px-3 py-2 text-[13px] font-bold text-[#555]"><ValueIcon size={17} className="text-[#ca7428]" />{label as string}</span>;
                })}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/register')}
                  className="cursor-pointer bg-[#f68b2c] px-6 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444] active:bg-[#ca7428]"
                >
                  {t('nav.signUp')}
                </button>
                <button
                  onClick={() => navigate('/explore-toolkit')}
                  className="cursor-pointer border-2 border-[#444] bg-white px-6 py-4 text-[16px] font-semibold text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428] active:bg-[#f4f4f4]"
                >
                  {t('home.exploreToolkit')}
                </button>
              </div>
              <button type="button" onClick={() => navigate('/methodology')} className="mt-5 inline-flex cursor-pointer items-center gap-2 font-bold text-[#a95f20] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]">
                {t('home.viewMethodology')} <ArrowRight size={17} />
              </button>
            </div>

            <div className="relative spice-card p-5 md:p-7" aria-label={t('home.ecosystemAria')}>
              <div className="mb-6 text-center">
                <h2 className="text-[24px] font-bold text-[#383838] md:text-[28px]">{t('home.ecosystemTitle')}</h2>
              </div>
              <div className="relative grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: t('home.nbsTitle'), text: t('home.nbsText'),
                    icon: Leaf,
                    tone: 'border-[#a8bd65] bg-[#f3f7e8]',
                    iconTone: 'bg-[#dfe9bc] text-[#637948]',
                  },
                  {
                    title: t('home.nebCardTitle'), text: t('home.nebCardText'),
                    icon: Palette,
                    tone: 'border-[#d78770] bg-[#fff2ed]',
                    iconTone: 'bg-[#f3d1c6] text-[#a85743]',
                  },
                  {
                    title: t('home.codesignTitle'), text: t('home.codesignText'),
                    icon: HeartHandshake,
                    tone: 'border-[#e3a55e] bg-[#fff7ed]',
                    iconTone: 'bg-[#f9dfbd] text-[#b86620]',
                  },
                  {
                    title: t('home.digitalEnablementTitle'), text: t('home.digitalEnablementText'),
                    icon: MonitorSmartphone,
                    tone: 'border-[#a9a8ad] bg-[#f5f5f6]',
                    iconTone: 'bg-[#e3e3e6] text-[#555]',
                  },
                ].map(({ title, text, icon: Icon, tone, iconTone }) => (
                  <article key={title} className={`min-h-[150px] border-2 p-5 ${tone}`}>
                    <span className={`grid h-11 w-11 place-items-center rounded-full ${iconTone}`}><Icon size={22} /></span>
                    <h3 className="mt-4 text-[17px] font-bold text-[#383838]">{title}</h3>
                    <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#555]">{text}</p>
                  </article>
                ))}
                <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-8 border-white bg-[#f68b2c] text-center shadow-[0_8px_24px_rgba(85,55,28,0.22)] sm:grid" aria-hidden="true">
                  <span className="text-[16px] font-bold text-white">SPICE</span>
                </div>
              </div>
              <p className="mt-5 text-center text-[13px] font-semibold leading-relaxed text-[#66513e]">
                {t('home.ecosystemCaption')}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-[#e4e4e4] bg-[#f8f8f8] px-6 py-14 md:px-12">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-9 text-center">
              <p className="text-[12px] font-bold uppercase text-[#ca7428]">{t('home.pathEyebrow')}</p>
              <h2 className="mt-2 text-[28px] font-bold text-[#383838] md:text-[34px]">{t('home.pathTitle')}</h2>
              <p className="mx-auto mt-3 max-w-[720px] text-[15px] font-medium leading-relaxed text-[#555]">{t('home.pathText')}</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {[
                {
                  step: t('home.step1'), title: t('home.step1Title'),
                  icon: Target,
                  text: t('home.step1Text'), items: [t('home.step1Item1'), t('home.step1Item2'), t('home.step1Item3')],
                },
                {
                  step: t('home.step2'), title: t('home.step2Title'),
                  icon: Workflow,
                  text: t('home.step2Text'), items: [t('home.step2Item1'), t('home.step2Item2'), t('home.step2Item3')],
                },
                {
                  step: t('home.step3'), title: t('home.step3Title'),
                  icon: Lightbulb,
                  text: t('home.step3Text'), items: [t('home.step3Item1'), t('home.step3Item2'), t('home.step3Item3')],
                },
              ].map(({ step, title, icon: Icon, text, items }, index) => (
                <article key={step} className="relative flex min-h-[285px] flex-col spice-card p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[12px] font-bold uppercase text-[#ca7428]">{step}</span>
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]"><Icon size={22} /></span>
                  </div>
                  <h3 className="mt-5 text-[22px] font-bold text-[#383838]">{title}</h3>
                  <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#555]">{text}</p>
                  <ul className="mt-5 grid gap-2 text-[13px] font-semibold text-[#555]">
                    {items.map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="flex-none text-[#ca7428]" />{item}</li>)}
                  </ul>
                  {index < 2 ? (
                    <>
                      <ArrowDown className="absolute -bottom-4 right-5 z-10 rounded-full border-2 border-[#bfc0c5] bg-white p-1 text-[#ca7428] lg:hidden" size={32} aria-hidden="true" />
                      <ArrowRight className="absolute -right-7 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border-2 border-[#bfc0c5] bg-white p-1 text-[#ca7428] lg:block" size={32} aria-hidden="true" />
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-12 md:px-12">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-12 flex flex-col items-center gap-4 text-center">
              <Building2 size={34} className="text-black" />
              <h2 className="text-[24px] font-bold text-black">{t('home.pilotSites')}</h2>
              <p className="max-w-[720px] text-[15px] font-medium leading-relaxed text-[#555]">{t('home.pilotSitesText')}</p>
            </div>
            <div className="grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
              {PILOTS.map((pilot) => (
                <button
                  key={pilot.code}
                  type="button"
                  onClick={() => navigate(`/pilot-sites/${pilot.slug}`)}
                  className="spice-interactive-card group flex min-h-[270px] flex-col overflow-hidden text-left"
                  aria-label={`${t(pilot.cityKey as TranslationKey)}, ${t(pilot.countryKey as TranslationKey)}`}
                >
                  <span className="flex items-center justify-between gap-4 border-b border-[#e4e4e4] bg-[#fafafa] px-5 py-4 transition-colors duration-300 group-hover:bg-[#fff4e9]">
                    <span className="grid h-12 w-16 place-items-center rounded-full bg-white shadow-sm">
                      <PilotFlag code={pilot.code} label={t(pilot.countryKey as TranslationKey)} />
                    </span>
                    <span className="spice-interactive-icon grid h-10 w-10 place-items-center rounded-full">
                      <ArrowRight size={19} aria-hidden="true" />
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col px-5 py-5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#a85f20]">{t(pilot.countryKey as TranslationKey)}</span>
                    <span className="mt-2 text-[21px] font-bold leading-tight text-[#333]">{t(pilot.cityKey as TranslationKey)}</span>
                    <span className="mt-2 text-[14px] font-semibold leading-snug text-[#555]">{t(pilot.titleKey as TranslationKey)}</span>
                    <span className="mt-3 line-clamp-2 text-[13px] font-medium leading-relaxed text-[#666]">{t(pilot.focusKey as TranslationKey)}</span>
                    <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[13px] font-bold text-[#ca7428]">
                      {t('account.viewPilot')}
                      <ArrowRight size={16} className="transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f7f7] px-6 py-12 md:px-12">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-10 flex flex-col items-center gap-4 text-center">
              <Landmark size={34} className="text-black" />
              <h2 className="text-[24px] font-bold text-black">{t('home.pillars')}</h2>
              <p className="max-w-[720px] text-[15px] font-medium leading-relaxed text-[#555]">{t('home.pillarsText')}</p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {PILLARS.map(({ icon: Icon, titleKey, textKey }) => (
                <div key={titleKey} className="spice-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[rgba(246,139,44,0.16)] text-[#ca7428]">
                      <Icon size={23} />
                    </span>
                    <h3 className="text-[17px] font-bold text-black">{t(titleKey as TranslationKey)}</h3>
                  </div>
                  <p className="text-[14px] font-medium leading-snug text-black">{t(textKey as TranslationKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-14 md:px-12">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-10 flex flex-col items-center gap-4 text-center">
              <ClipboardList size={34} className="text-black" />
              <h2 className="text-[24px] font-bold text-black">{t('home.analogueTools')}</h2>
              <p className="max-w-[760px] text-[15px] font-medium leading-relaxed text-[#555]">{t('home.analogueToolsText')}</p>
            </div>
            <p className="mb-4 text-center text-[13px] font-bold uppercase tracking-wide text-[#ca7428]">
              {t('home.analoguePreviewCount', { visible: formatNumber(analoguePreview.length), total: formatNumber(sourceTools.length) })}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {analoguePreview.map((tool) => (
                <button key={tool.id} type="button" onClick={() => navigate(`/tool-detail/${tool.id}`)} className="spice-interactive-card group flex min-h-[220px] flex-col p-5 text-left">
                  <span className="inline-flex min-h-9 w-fit items-center bg-[#fff0e1] px-3 text-[12px] font-bold uppercase text-[#ca7428]">{t('hub.phaseNumber', { phase: tool.phase })}</span>
                  <h3 className="mt-5 text-[17px] font-bold leading-tight text-[#333]">{tool.name}</h3>
                  <p className="mt-3 line-clamp-4 text-[13px] font-medium leading-relaxed text-[#666]">{tool.shortDesc || t('home.sourceDescriptionUnavailable')}</p>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => navigate('/analogue-tools')} className="mx-auto mt-8 flex min-h-12 cursor-pointer items-center justify-center border-2 border-[#444] bg-white px-7 py-3 text-[15px] font-bold text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]">
              {t('home.exploreAnalogueTools')}
            </button>
          </div>
        </section>

        <section id="digital-tools" className="scroll-mt-24 bg-white px-6 py-14 md:px-12">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-12 flex flex-col items-center gap-4 text-center">
              <MonitorSmartphone size={34} className="text-black" />
              <h2 className="text-[24px] font-bold text-black">{t('home.digitalTools')}</h2>
              <p className="max-w-[760px] text-[15px] font-medium leading-relaxed text-[#555]">{t('home.digitalToolsText')}</p>
            </div>
            <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4 md:gap-8">
              {DIGITAL_TOOLS.map(({ icon: Icon, titleKey, textKey, image, path }) => (
                <button
                  key={titleKey}
                  onClick={() => navigate(path)}
                  className="spice-interactive-card group flex min-h-[390px] flex-col p-5 text-left md:min-h-[410px]"
                >
                  <span className="spice-interactive-icon mb-4 grid h-11 w-11 place-items-center rounded-full">
                    <Icon size={23} />
                  </span>
                  <h3 className="text-[18px] font-bold leading-tight text-black">{t(titleKey as TranslationKey)}</h3>
                  <p className="mt-3 min-h-[58px] text-[14px] font-medium leading-snug text-black">{t(textKey as TranslationKey)}</p>
                  <div className="mt-auto overflow-hidden pt-4"><img src={image} alt="" className="aspect-[1.52] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transform-none" /></div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f7f7] px-6 py-14 md:px-12">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-10 flex flex-col items-center gap-4 text-center">
              <ListChecks size={34} className="text-black" />
              <h2 className="text-[24px] font-bold text-black">{t('home.explorePlatform')}</h2>
              <p className="max-w-[760px] text-[15px] font-medium leading-relaxed text-[#555]">{t('home.platformText')}</p>
            </div>
            <div className="grid gap-7 md:grid-cols-3">
              {PLATFORM_LINKS.map(({ icon: Icon, titleKey, textKey, image, path, categoryKey }) => (
                <button key={titleKey} type="button" onClick={() => navigate(path)} className="spice-interactive-card group flex min-h-[390px] flex-col p-5 text-left">
                  <span className="spice-interactive-icon mb-4 grid h-11 w-11 place-items-center rounded-full"><Icon size={23} /></span>
                  <span className="mb-2 text-[11px] font-bold uppercase text-[#a85f20]">{t(categoryKey as TranslationKey)}</span>
                  <h3 className="text-[18px] font-bold text-black">{t(titleKey as TranslationKey)}</h3>
                  <p className="mt-3 min-h-[58px] text-[14px] font-medium leading-snug text-black">{t(textKey as TranslationKey)}</p>
                  <img src={image} alt="" className="mt-auto aspect-[1.52] w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-10 md:px-12">
          <div className="mx-auto grid max-w-[1344px] gap-10 bg-[#ce7d35] px-8 py-10 text-white lg:grid-cols-[1fr_1fr]">
            <div className="flex flex-col gap-7">
              <div className="flex items-center gap-4">
                <span className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#f68b2c]">
                  <Languages size={28} />
                </span>
                <p className="text-[22px] font-bold">{t('home.multilingual')}</p>
              </div>
              <h2 className="text-[36px] font-bold leading-tight md:text-[44px]">
                {t('home.multilingualHeading')}
              </h2>
              <p className="max-w-[560px] text-[20px] font-medium leading-snug">
                {t('home.multilingualText')}
              </p>
              <div className="flex max-w-[540px] flex-wrap gap-2">
                {LANGUAGE_LABELS.map((item) => (
                  <span key={item} className="border-2 border-white px-2 py-1 text-[15px] font-medium">{item}</span>
                ))}
              </div>
              <button
                onClick={() => navigate('/glossary')}
                className="mt-6 w-fit cursor-pointer border-2 border-[#444] bg-white px-7 py-4 text-[20px] font-bold text-[#444] transition-colors hover:border-[#444] hover:bg-[#444] hover:text-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white active:bg-black"
              >
                {t('home.exploreGlossary')}
              </button>
            </div>
            <div className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2 sm:pb-16">
              {LANGUAGE_FEATURES.map((feature, index) => (
                <div
                  key={feature.n}
                  className={`${index % 2 === 1 ? 'sm:translate-y-16' : ''} h-full border-2 border-white p-4`}
                >
                  <span className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#f68b2c] text-[24px] font-bold">
                    {feature.n}
                  </span>
                  <h3 className="mt-4 text-[20px] font-bold">{t(feature.titleKey as TranslationKey)}</h3>
                  <p className="mt-3 text-[16px] font-medium leading-snug">{t(feature.textKey as TranslationKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#e6e6e6] bg-[#fafafa] px-6 py-12 md:px-12" aria-labelledby="partners-title">
          <div className="mx-auto max-w-[1280px]">
            <div className="text-center">
              <h2 id="partners-title" className="text-[28px] font-bold text-[#444] md:text-[34px]">{t('home.partners')}</h2>
              <span className="mx-auto mt-4 block h-1 w-28 bg-[#ca7428]" aria-hidden="true" />
            </div>
            <div className="mt-9 grid grid-cols-2 items-center gap-x-7 gap-y-6 sm:grid-cols-3 lg:grid-cols-5" role="list" aria-label={t('home.partnersAria')}>
              {PARTNERS.map((partner) => (
                <figure key={partner.name} role="listitem" className="flex min-h-24 items-center justify-center px-2 py-2">
                  <img src={partner.image} alt={partner.name} className="h-20 w-full object-contain mix-blend-multiply sm:h-24" loading="lazy" />
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-white">
          <img src={ctaLandscape} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative mx-auto flex max-w-[1440px] flex-col items-center px-6 py-20 text-center md:px-12">
            <Map size={36} className="mb-7 text-[#ca7428]" />
            <h2 className="text-[34px] font-bold leading-tight text-[#444] md:text-[40px]">
              {t('home.ready')}
            </h2>
            <p className="mt-10 text-[20px] font-medium text-[#444]">
              {t('home.readyText')}
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-8">
              <button
                onClick={() => navigate('/register')}
                className="cursor-pointer bg-[#f68b2c] px-10 py-4 text-[20px] font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]"
              >
                {t('home.createAccount')}
              </button>
              <button
                onClick={() => navigate('/pilot-sites')}
                className="cursor-pointer border-2 border-[#444] bg-white/80 px-10 py-4 text-[20px] font-semibold text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]"
              >
                {t('home.explorePilots')}
              </button>
            </div>
          </div>
        </section>
      </div>
    </SpicePublicShell>
  );
}
