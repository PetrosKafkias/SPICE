import { BookOpen, CheckCircle2, ExternalLink, Keyboard, MapPinned, PlayCircle, Wrench } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

const GUIDE_SECTIONS: Array<{ icon: typeof BookOpen; titleKey: TranslationKey; textKey: TranslationKey }> = [
  { icon: MapPinned, titleKey: 'demo.step1', textKey: 'demo.step1Text' },
  { icon: Wrench, titleKey: 'demo.step2', textKey: 'demo.step2Text' },
  { icon: CheckCircle2, titleKey: 'demo.step3', textKey: 'demo.step3Text' },
  { icon: BookOpen, titleKey: 'demo.step4', textKey: 'demo.step4Text' },
];

export default function DemoGuidePage() {
  const { t } = useI18n();
  const youtubeSearch = 'https://www.youtube.com/results?search_query=SPICE+Sustainable+Public+Spaces+Inclusive+Community+Engagement';

  return (
    <SpicePublicShell>
      <div className="bg-[#f7f7f7]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <StandardPageHeader icon={PlayCircle} eyebrow="SPICE platform guide" title={t('demo.title')} description={t('demo.subtitle')} />
        <section className="bg-white px-6 py-10 text-center md:px-12 md:py-12">
          <div className="mx-auto mt-9 w-full max-w-[960px] overflow-hidden border-[10px] border-white bg-black shadow-[10px_12px_32px_rgba(0,0,0,0.18)]">
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                src="https://www.youtube-nocookie.com/embed?listType=search&list=SPICE%20Sustainable%20Public%20Spaces%20Inclusive%20Community%20Engagement"
                title="SPICE project demo videos"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-[720px] text-[13px] text-[#777]">{t('demo.videoFallback')} <a href={youtubeSearch} target="_blank" rel="noreferrer" className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[#ca7428] underline">{t('demo.openYoutube')}<ExternalLink size={13} /></a></p>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 py-12 md:px-12 md:py-16">
          <div className="mb-9 flex items-center gap-4"><BookOpen size={32} className="text-[#ca7428]" /><div><h2 className="text-[30px] font-bold text-[#444]">{t('demo.guideTitle')}</h2><p className="mt-1 text-[15px] text-[#777]">{t('demo.guideText')}</p></div></div>
          <div className="grid gap-6 md:grid-cols-2">
            {GUIDE_SECTIONS.map(({ icon: Icon, titleKey, textKey }) => (
              <article key={titleKey} className="border-2 border-[#bfc0c5] bg-white p-6 shadow-[7px_8px_22px_rgba(0,0,0,0.09)] md:p-8">
                <div className="flex items-start gap-4"><span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><Icon size={24} /></span><h3 className="pt-2 text-[21px] font-bold text-[#444]">{t(titleKey)}</h3></div>
                <p className="mt-5 text-[15px] leading-relaxed text-[#555]">{t(textKey)}</p>
              </article>
            ))}
          </div>

          <article id="keyboard" className="mt-8 flex flex-col gap-5 border-2 border-[#f68b2c] bg-[#fff8f2] p-6 sm:flex-row sm:items-start md:p-8">
            <Keyboard size={30} className="flex-shrink-0 text-[#ca7428]" />
            <div><h3 className="text-[21px] font-bold text-[#444]">{t('toolkit.keyboardHelp')}</h3><p className="mt-3 text-[15px] leading-relaxed text-[#555]">{t('demo.keyboardText')}</p></div>
          </article>
        </section>
      </div>
    </SpicePublicShell>
  );
}
