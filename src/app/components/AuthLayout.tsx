import { ChevronLeft, FileCheck2, Users } from 'lucide-react';
import { useNavigate } from 'react-router';
import { LanguageDropdown, SpiceFooter } from './SpicePublicShell';
import { useI18n } from '../context/I18nContext';
import spiceLogo from '../../imports/SignIn/411ddb08eac6c477eae07f10bb3f68053986608c.png';
import bgMap from '../../imports/SignIn/ecae786a632f8d3fe286614f9c7611501f0e6a48.png';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <header className="flex min-h-[76px] flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[rgba(68,68,68,0.4)] bg-white px-5 py-3 sm:px-8 md:px-12">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex cursor-pointer items-center gap-2 text-[15px] font-medium text-[#444] transition-colors hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] sm:text-[16px]"
        >
          <ChevronLeft size={22} />
          {t('auth.backHome')}
        </button>
        <LanguageDropdown compact />
      </header>

      <div className="flex flex-1 items-center justify-center bg-[#f7f7f7] px-4 py-10 md:py-12">
        <div className="flex w-full max-w-[1200px] flex-col items-stretch justify-center gap-8 lg:flex-row lg:gap-12 xl:gap-16">
          <aside className="relative min-h-[390px] w-full overflow-hidden p-8 sm:p-10 lg:min-h-[560px] lg:w-[470px] lg:flex-shrink-0">
            <img src={bgMap} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
            <div className="relative z-10 flex h-full flex-col gap-8">
              <img src={spiceLogo} alt="SPICE" className="h-28 w-auto self-start object-contain sm:h-36" />
              <div>
                <h2 className="text-[28px] font-bold leading-tight text-[#444] sm:text-[32px]">{t('auth.demoTitle')}</h2>
                <p className="mt-5 text-[17px] font-medium leading-relaxed text-[#444] sm:text-[18px]">{t('auth.demoText')}</p>
              </div>
              <div className="mt-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="flex items-center gap-4 bg-white/80 p-4 shadow-sm">
                  <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-[rgba(246,139,44,0.18)] text-[#ca7428]"><Users size={21} /></span>
                  <p className="text-[15px] font-semibold text-[#444]">{t('auth.activeContributors')}</p>
                </div>
                <div className="flex items-center gap-4 bg-white/80 p-4 shadow-sm">
                  <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-[rgba(246,139,44,0.18)] text-[#ca7428]"><FileCheck2 size={21} /></span>
                  <p className="text-[15px] font-semibold text-[#444]">{t('auth.municipalities')}</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="w-full border-[3px] border-[#f68b2c] bg-white p-6 sm:p-8 md:p-10 lg:w-[620px] lg:flex-shrink-0">
            {children}
          </div>
        </div>
      </div>

      <SpiceFooter />
    </div>
  );
}
