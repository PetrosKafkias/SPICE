import type { ElementType } from 'react';
import { ArrowRight, Bot, Box, Grid3X3, LayoutGrid, MapPinned } from 'lucide-react';
import { useNavigate } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

interface ToolCard {
  icon: ElementType;
  titleKey: TranslationKey;
  textKey: TranslationKey;
  path: string;
}

const DIGITAL_TOOLS: ToolCard[] = [
  { icon: MapPinned, titleKey: 'nav.citivoice', textKey: 'gate.citivoice.description', path: '/citivoice-app' },
  { icon: Box, titleKey: 'nav.sceneEditor', textKey: 'gate.scene.description', path: '/3d-scene-editor' },
  { icon: Bot, titleKey: 'nav.aiChatbot', textKey: 'tools.aiChatbotText', path: '/co-creation-guide' },
];

function ToolTile({ icon: Icon, title, text, exploreLabel, onClick }: { icon: ElementType; title: string; text: string; exploreLabel: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[220px] cursor-pointer flex-col border-2 border-[#d7d8dc] bg-white p-6 text-left transition-[border-color,box-shadow,background-color] duration-300 hover:border-[#f68b2c] hover:bg-[#fffdfa] hover:shadow-[0_12px_28px_rgba(202,116,40,0.2)] focus-visible:border-[#f68b2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ca7428] active:bg-[#fff3e8]"
    >
      <span className="spice-interactive-icon grid h-12 w-12 place-items-center rounded-full">
        <Icon size={23} aria-hidden="true" />
      </span>
      <h3 className="mt-6 text-[19px] font-bold leading-tight text-[#444]">{title}</h3>
      <p className="mt-3 flex-1 text-[13px] font-medium leading-relaxed text-[#666]">{text}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-[#a85f20]">
        {exploreLabel} <ArrowRight size={16} aria-hidden="true" />
      </span>
    </button>
  );
}

export default function ToolsOverviewPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={LayoutGrid} eyebrow={t('nav.tools')} title={t('tools.title')} description={t('tools.subtitle')} />
      <div className="spice-page spice-wide-page flex flex-col gap-10" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <section aria-labelledby="tools-digital-title">
          <h2 id="tools-digital-title" className="text-[20px] font-bold text-[#444]">{t('tools.digitalSectionTitle')}</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-[#777]">{t('tools.digitalSectionText')}</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {DIGITAL_TOOLS.map((tool) => (
              <ToolTile key={tool.path} icon={tool.icon} title={t(tool.titleKey)} text={t(tool.textKey)} exploreLabel={t('hub.publicExplore')} onClick={() => navigate(tool.path)} />
            ))}
          </div>
        </section>

        <section aria-labelledby="tools-analog-title">
          <h2 id="tools-analog-title" className="text-[20px] font-bold text-[#444]">{t('tools.analogSectionTitle')}</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-[#777]">{t('tools.analogSectionText')}</p>
          <button
            type="button"
            onClick={() => navigate('/analog-resources')}
            className="group mt-5 flex min-h-[160px] w-full cursor-pointer flex-col gap-3 border-2 border-[#d7d8dc] bg-white p-6 text-left transition-[border-color,box-shadow,background-color] duration-300 hover:border-[#f68b2c] hover:bg-[#fffdfa] hover:shadow-[0_12px_28px_rgba(202,116,40,0.2)] focus-visible:border-[#f68b2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ca7428] active:bg-[#fff3e8] sm:flex-row sm:items-center"
          >
            <span className="spice-interactive-icon grid h-12 w-12 flex-none place-items-center rounded-full">
              <Grid3X3 size={23} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[19px] font-bold leading-tight text-[#444]">{t('nav.analogResources')}</span>
              <span className="mt-2 block text-[13px] font-medium leading-relaxed text-[#666]">{t('tools.analogCardText')}</span>
            </span>
            <span className="mt-3 inline-flex flex-none items-center gap-2 text-[13px] font-bold text-[#a85f20] sm:mt-0">
              {t('hub.publicExplore')} <ArrowRight size={16} aria-hidden="true" />
            </span>
          </button>
        </section>
      </div>
    </SpicePublicShell>
  );
}
