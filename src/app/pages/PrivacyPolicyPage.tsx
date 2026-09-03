import {
  ArrowDownToLine,
  ChevronRight,
  Cookie,
  Database,
  FileText,
  Globe2,
  Languages,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import { useI18n } from '../context/I18nContext';
import { localeDefinition } from '../i18n/config';
import type { TranslationKey } from '../i18n/translations';

const POLICY_SECTIONS = [
  {
    id: 'overview',
    titleKey: 'privacy.section.overview.title',
    icon: ShieldCheck,
    textKey: 'privacy.section.overview.text',
  },
  {
    id: 'data-we-collect',
    titleKey: 'privacy.section.collection.title',
    icon: Database,
    textKey: 'privacy.section.collection.text',
  },
  {
    id: 'how-we-use-data',
    titleKey: 'privacy.section.use.title',
    icon: FileText,
    textKey: 'privacy.section.use.text',
  },
  {
    id: 'sharing',
    titleKey: 'privacy.section.sharing.title',
    icon: Globe2,
    textKey: 'privacy.section.sharing.text',
  },
  {
    id: 'cookies',
    titleKey: 'privacy.section.cookies.title',
    icon: Cookie,
    textKey: 'privacy.section.cookies.text',
  },
  {
    id: 'rights',
    titleKey: 'privacy.section.rights.title',
    icon: UserCheck,
    textKey: 'privacy.section.rights.text',
  },
  {
    id: 'security',
    titleKey: 'privacy.section.security.title',
    icon: Lock,
    textKey: 'privacy.section.security.text',
  },
  {
    id: 'contact',
    titleKey: 'privacy.section.contact.title',
    icon: Mail,
    textKey: 'privacy.section.contact.text',
  },
];

const QUICK_SECTION_IDS = ['overview', 'data-we-collect', 'how-we-use-data', 'cookies', 'rights', 'contact'];

export default function PrivacyPolicyPage() {
  const { t, language } = useI18n();
  const activeLocale = localeDefinition(language);
  return (
    <SpicePublicShell variant="public">
      <div className="bg-[#f7f7f7]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="spice-page spice-wide-page">
          <section className="mb-10 spice-card p-6 md:p-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-[#e4e4e4] pb-6 md:flex-row md:items-center md:justify-between">
              <div className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#555]">
                <Languages size={18} className="text-[#ca7428]" />
                {t('privacy.languageLabel')}: {activeLocale.nativeName} ({activeLocale.shortLabel})
              </div>
              <div className="text-[13px] font-semibold text-[#888]">SPICE Digital Toolkit</div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wide text-[#ca7428]">{t('privacy.eyebrow')}</p>
                <h1 className="mt-3 text-[40px] font-bold leading-tight text-[#444] md:text-[52px]">{t('privacy.title')}</h1>
                <p className="mt-3 text-[15px] font-semibold text-[#777]">{t('privacy.updated')}</p>
                <p className="mt-6 max-w-[860px] text-[18px] font-medium leading-relaxed text-[#444]">
                  {t('privacy.intro')}
                </p>
                <p className="mt-4 max-w-[860px] text-[15px] font-medium leading-relaxed text-[#666]">
                  {t('privacy.contextNotice')}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a
                    href="#overview"
                    className="inline-flex items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#e07a20]"
                  >
                    {t('privacy.readPolicy')} <ChevronRight size={16} />
                  </a>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 border-2 border-[#444] bg-white px-5 py-3 text-[14px] font-bold text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428]"
                  >
                    <ArrowDownToLine size={16} /> {t('privacy.download')}
                  </button>
                  <a
                    href="#cookies"
                    className="inline-flex items-center justify-center gap-2 border-2 border-[#ca7428] bg-white px-5 py-3 text-[14px] font-bold text-[#ca7428] transition-colors hover:bg-[#fff3e8]"
                  >
                    {t('privacy.cookiePreferences')}
                  </a>
                </div>
              </div>

              <aside className="border-2 border-[#f68b2c] bg-[#fff8f2] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(246,139,44,0.18)]">
                    <Lock size={22} className="text-[#ca7428]" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[#444]">{t('privacy.dataPrivacy')}</p>
                    <p className="text-[12px] font-bold uppercase tracking-wide text-[#ca7428]">{t('privacy.participantFirst')}</p>
                  </div>
                </div>
                <p className="text-[13px] font-medium leading-relaxed text-[#666]">
                  {t('privacy.participantFirstText')}
                </p>
              </aside>
            </div>
          </section>

          <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {POLICY_SECTIONS.filter((section) => QUICK_SECTION_IDS.includes(section.id)).map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center justify-between border-2 border-[#d7d8dc] bg-white px-5 py-4 text-[14px] font-bold text-[#444] transition-colors hover:border-[#f68b2c] hover:text-[#ca7428]"
              >
                {t(section.titleKey as TranslationKey)}
                <ChevronRight size={16} />
              </a>
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 border-2 border-[#d7d8dc] bg-white p-5">
                <p className="mb-4 text-[15px] font-bold text-[#444]">{t('privacy.policyHeadings')}</p>
                <nav className="flex flex-col gap-2">
                  {POLICY_SECTIONS.map((section) => (
                    <a key={section.id} href={`#${section.id}`} className="text-[13px] font-semibold leading-snug text-[#666] hover:text-[#ca7428]">
                      {t(section.titleKey as TranslationKey)}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="flex flex-col gap-6">
              {POLICY_SECTIONS.map(({ id, titleKey, textKey, icon: Icon }) => (
                <article key={id} id={id} className="scroll-mt-24 border-2 border-[#d7d8dc] bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.06)] md:p-7">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-[rgba(246,139,44,0.15)]">
                      <Icon size={22} className="text-[#ca7428]" />
                    </div>
                    <div>
                      <h2 className="text-[24px] font-bold leading-tight text-[#444]">{t(titleKey as TranslationKey)}</h2>
                      <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#555]">{t(textKey as TranslationKey)}</p>
                    </div>
                  </div>

                  <div className="ml-0 mt-5 border-l-4 border-[#f68b2c] bg-[#f7f7f7] px-5 py-4 md:ml-16">
                    <p className="text-[13px] font-semibold leading-relaxed text-[#555]">
                      {t('privacy.contextualText')}
                    </p>
                  </div>
                </article>
              ))}

              <article className="border-2 border-[#f68b2c] bg-[#d87d2a] p-7 text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
                <h2 className="text-[24px] font-bold">{t('privacy.helpTitle')}</h2>
                <p className="mt-3 max-w-[780px] text-[15px] font-medium leading-relaxed">
                  {t('privacy.helpText')}
                </p>
                <a href="mailto:privacy@spice-toolkit.eu" className="mt-5 inline-flex items-center gap-2 border-2 border-white px-5 py-3 text-[14px] font-bold text-white hover:bg-white hover:text-[#ca7428]">
                  <Mail size={16} /> privacy@spice-toolkit.eu
                </a>
              </article>
            </div>
          </section>
        </div>
      </div>
    </SpicePublicShell>
  );
}
