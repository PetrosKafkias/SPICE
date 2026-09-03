import { Check, Lock, Settings2, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { readCookiePreferences, type CookiePreferences } from '../lib/cookieConsent';

interface Props {
  onAccept: () => void;
  onReject: () => void;
  onPreferences: (preferences: CookiePreferences) => void;
  onReadPrivacy: () => void;
  onClose: () => void;
}

export default function CookieBanner({ onAccept, onReject, onPreferences, onReadPrivacy, onClose }: Props) {
  const { t } = useI18n();
  const initialPreferences = readCookiePreferences();
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(initialPreferences.analytics);
  const [personalization, setPersonalization] = useState(initialPreferences.personalization);

  return (
    <section className="fixed bottom-[104px] left-1/2 z-[70] max-h-[calc(100dvh-8rem)] w-[min(760px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden border-2 border-[#b7b7bb] bg-white shadow-[0_12px_42px_rgba(0,0,0,0.24)] transition-[opacity,transform] duration-250 motion-reduce:transition-none max-sm:bottom-[92px]" role="dialog" aria-modal="false" aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-description">
      <div className="mx-auto flex max-h-[calc(100dvh-8rem)] flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="w-11 h-11 rounded-full bg-[rgba(246,139,44,0.2)] flex items-center justify-center">
            <Lock size={22} className="text-[#ca7428]" />
          </div>
          <div>
            <p id="cookie-consent-title" className="text-[18px] font-semibold text-[#444]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{t('cookie.title')}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          <p id="cookie-consent-description" className="text-[15px] text-[#444] leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {t('cookie.message')}
          </p>
          {showPreferences && (
            <div id="cookie-options-panel" className="border-2 border-[#b2b2b8] bg-[#f7f7f7] p-4" aria-labelledby="cookie-options-title">
              <div className="mb-4 flex items-center gap-2"><Settings2 size={20} className="text-[#ca7428]" aria-hidden="true"/><h2 id="cookie-options-title" className="text-[16px] font-bold text-[#444]">{t('cookie.optionsTitle')}</h2></div>
              <div className="spice-form-grid gap-3 md:grid-cols-3">
                <div className="flex items-start justify-between gap-3 border border-[#d4d4d4] bg-white p-3"><div><p className="flex items-center gap-2 text-[14px] font-bold text-[#444]"><ShieldCheck size={17} aria-hidden="true"/>{t('cookie.essential')}</p><p className="mt-1 text-[12px] leading-relaxed text-[#666]">{t('cookie.essentialText')}</p></div><span className="flex flex-none items-center gap-1 text-[12px] font-bold text-[#637948]"><Check size={16} aria-hidden="true"/>{t('cookie.alwaysOn')}</span></div>
                <label className="flex cursor-pointer items-start justify-between gap-3 border border-[#d4d4d4] bg-white p-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ca7428]"><div><span className="text-[14px] font-bold text-[#444]">{t('cookie.analytics')}</span><p className="mt-1 text-[12px] leading-relaxed text-[#666]">{t('cookie.analyticsText')}</p></div><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="mt-1 h-5 w-5 flex-none cursor-pointer accent-[#ca7428]" /></label>
                <label className="flex cursor-pointer items-start justify-between gap-3 border border-[#d4d4d4] bg-white p-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ca7428]"><div><span className="text-[14px] font-bold text-[#444]">{t('cookie.personalization')}</span><p className="mt-1 text-[12px] leading-relaxed text-[#666]">{t('cookie.personalizationText')}</p></div><input type="checkbox" checked={personalization} onChange={(event) => setPersonalization(event.target.checked)} className="mt-1 h-5 w-5 flex-none cursor-pointer accent-[#ca7428]" /></label>
              </div>
              <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => onPreferences({ analytics, personalization })} className="cursor-pointer bg-[#f68b2c] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]">{t('cookie.save')}</button><button type="button" onClick={() => setShowPreferences(false)} className="cursor-pointer border-2 border-[#444] px-5 py-2 text-[14px] font-semibold text-[#444] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]">{t('common.cancel')}</button></div>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              onClick={onAccept}
              className="cursor-pointer bg-[#f68b2c] px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {t('cookie.accept')}
            </button>
            <button
              onClick={() => setShowPreferences(true)}
              aria-expanded={showPreferences}
              aria-controls="cookie-options-panel"
              className="cursor-pointer border-2 border-black px-5 py-3 text-[15px] font-semibold text-black transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {t('cookie.manage')}
            </button>
            <button
              onClick={onReject}
              className="cursor-pointer border-2 border-[#ca7428] px-5 py-3 text-[15px] font-semibold text-[#ca7428] transition-colors hover:bg-[#fdf4ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {t('cookie.reject')}
            </button>
            <button
              onClick={onReadPrivacy}
              className="cursor-pointer px-5 py-3 text-[15px] font-semibold text-[#ca7428] underline transition-colors hover:text-[#9b4e13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {t('cookie.read')}
            </button>
          </div>
        </div>

        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 cursor-pointer place-items-center bg-white text-[#444] transition-colors hover:bg-[#eee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]" aria-label={t('cookie.closePreferences')}>
          <X size={28} />
        </button>
      </div>
    </section>
  );
}
