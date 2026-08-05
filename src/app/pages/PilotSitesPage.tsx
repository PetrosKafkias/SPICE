import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Focus, MapPinned } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import PilotFlag from '../components/PilotFlag';
import { useI18n } from '../context/I18nContext';
import { authRoute } from '../lib/authRedirect';
import { apiRequest } from '../lib/api';
import mapImage from '../../imports/Homepage/087caaf231c4809ec526b07765a4cd03a2735839.png';
import thessalonikiImage from '../../imports/UserDetails/be2976c93a8eb6ace1815c8325f750a633bc4ba8.png';

interface Pilot {
  id: number;
  slug: string;
  city: string;
  country: string;
  countryCode: string;
  title: string;
  description: string;
  focus: string;
  status: string;
}

export default function PilotSitesPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { t } = useI18n();
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const loadPilots = async () => {
    setStatus('loading');
    try {
      const result = await apiRequest<{ pilots: Pilot[] }>('/api/pilots');
      setPilots(result.pilots);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { void loadPilots(); }, []);
  const selected = useMemo(() => pilots.find((pilot) => pilot.slug === slug), [pilots, slug]);

  return (
    <SpicePublicShell>
      <div className="bg-[#f7f7f7]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <StandardPageHeader icon={Building2} eyebrow="SPICE" title={t('pilots.title')} description={t('pilots.subtitle')} actions={<div className="w-full max-w-[420px] overflow-hidden border-[8px] border-white shadow-[8px_10px_26px_rgba(0,0,0,0.14)]"><img src={mapImage} alt="SPICE citizen feedback map" className="aspect-[1.9] w-full object-cover" /></div>} />

        <section className="mx-auto max-w-[1360px] px-6 py-12 md:px-12">
          {status === 'loading' && <div className="grid min-h-[260px] place-items-center text-[16px] font-semibold text-[#444]" role="status">{t('common.loading')}</div>}
          {status === 'error' && (
            <div className="border-2 border-[#f68b2c] bg-white p-8 text-center" role="alert">
              <p className="font-semibold text-[#444]">{t('common.error')}</p>
              <button type="button" onClick={loadPilots} className="mt-4 cursor-pointer bg-[#f68b2c] px-5 py-3 font-semibold text-white">{t('common.retry')}</button>
            </div>
          )}

          {status === 'ready' && slug && !selected && (
            <div className="border-2 border-[#f68b2c] bg-white p-8 text-center">
              <p className="font-semibold text-[#444]">Pilot site not found.</p>
              <Link to="/pilot-sites" className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[#ca7428] underline"><ArrowLeft size={17} />{t('pilots.title')}</Link>
            </div>
          )}

          {selected && (
            <article className="mb-10 overflow-hidden border-2 border-[#bfc0c5] bg-white shadow-[8px_8px_28px_rgba(0,0,0,0.12)]">
              {selected.slug === 'thessaloniki' && <img src={thessalonikiImage} alt="Thessaloniki pilot area" className="h-[260px] w-full object-cover md:h-[380px]" />}
              <div className="p-6 md:p-9">
                <Link to="/pilot-sites" className="mb-6 inline-flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-[#ca7428] hover:underline"><ArrowLeft size={17} />{t('pilots.title')}</Link>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3"><PilotFlag code={selected.countryCode} label={selected.country} /><span className="text-[15px] font-semibold text-[#777]">{selected.country}</span></div>
                    <h2 className="mt-4 text-[30px] font-bold text-[#444]">{selected.city}: {selected.title}</h2>
                  </div>
                  <span className="w-fit bg-[#e8f5ef] px-4 py-2 text-[13px] font-bold text-[#2e6e45]">{selected.status}</span>
                </div>
                <p className="mt-6 text-[17px] leading-relaxed text-[#555]">{selected.description}</p>
                <div className="mt-7 flex items-start gap-3 bg-[#fff4e9] p-5"><Focus size={22} className="mt-0.5 flex-shrink-0 text-[#ca7428]" /><div><p className="font-bold text-[#444]">{t('pilots.focus')}</p><p className="mt-1 text-[15px] text-[#555]">{selected.focus}</p></div></div>
                <Link to="/co-creation-hub" className="mt-7 inline-flex cursor-pointer items-center gap-2 bg-[#f68b2c] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]">{t('pilots.openToolkit')}<ArrowRight size={18} /></Link>
              </div>
            </article>
          )}

          {status === 'ready' && !slug && (
            <div className="grid gap-6 md:grid-cols-2">
              {pilots.map((pilot) => (
                <Link key={pilot.slug} to={`/pilot-sites/${pilot.slug}`} className="spice-interactive-card flex min-h-[290px] flex-col p-6 text-left md:p-8">
                  <div className="flex items-start justify-between gap-4"><PilotFlag code={pilot.countryCode} label={pilot.country} /><span className="bg-[#e8f5ef] px-3 py-1 text-[12px] font-bold text-[#2e6e45]">{pilot.status}</span></div>
                  <h2 className="mt-5 text-[25px] font-bold text-[#444]">{pilot.city}</h2>
                  <p className="mt-1 text-[15px] font-semibold text-[#777]">{pilot.country} - {pilot.title}</p>
                  <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-[#555]">{pilot.description}</p>
                  <span className="mt-auto inline-flex w-fit items-center gap-2 pt-6 text-[15px] font-bold text-[#ca7428]">{t('common.continue')}<ArrowRight size={17} /></span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-[#ddd] bg-white px-6 py-12 md:px-12">
          <div className="mx-auto flex max-w-[1000px] flex-col items-center text-center"><MapPinned size={32} className="text-[#ca7428]" /><h2 className="mt-4 text-[28px] font-bold text-[#444]">{t('home.ready')}</h2><Link to={authRoute('register', `${location.pathname}${location.search}${location.hash}`)} className="mt-6 cursor-pointer bg-[#f68b2c] px-7 py-3 font-semibold text-white hover:bg-[#e07a20]">{t('home.createAccount')}</Link></div>
        </section>
      </div>
    </SpicePublicShell>
  );
}
