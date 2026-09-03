import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, ClipboardList, FileCheck2, Focus, Info, MapPinned, Users } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import PilotFlag from '../components/PilotFlag';
import { useI18n } from '../context/I18nContext';
import { authRoute } from '../lib/authRedirect';
import { apiRequest } from '../lib/api';
import { getCrossSiteConclusions, getPilotSiteDetails } from '../data/pilotSiteDetails';
import { statusKey } from '../lib/statusLabel';
import type { TranslationKey } from '../i18n/translations';
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
  const { language, t } = useI18n();
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
  useEffect(() => {
    if (status !== 'ready' || location.hash !== '#cross-site-evaluation') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('cross-site-evaluation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, status]);
  const selected = useMemo(() => pilots.find((pilot) => pilot.slug === slug), [pilots, slug]);
  const pilotSiteDetails = useMemo(() => getPilotSiteDetails(language), [language]);
  const crossSiteConclusions = useMemo(() => getCrossSiteConclusions(language), [language]);
  const pilotText = (pilotSlug: string, field: 'city' | 'country' | 'title' | 'description' | 'focus') => (
    t(`pilots.site.${pilotSlug}.${field}` as TranslationKey)
  );

  return (
    <SpicePublicShell>
      <div className="bg-[#f7f7f7]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <StandardPageHeader icon={Building2} eyebrow="SPICE" title={t('pilots.title')} description={t('pilots.subtitle')} actions={<div className="w-full max-w-[420px] overflow-hidden border-[8px] border-white shadow-[8px_10px_26px_rgba(0,0,0,0.14)]"><img src={mapImage} alt={t('pilots.mapAlt')} className="aspect-[1.9] w-full object-cover" /></div>} />

        <section className="mx-auto max-w-[1440px] px-6 py-12 md:px-12">
          {status === 'loading' && <div className="grid min-h-[260px] place-items-center text-[16px] font-semibold text-[#444]" role="status">{t('common.loading')}</div>}
          {status === 'error' && (
            <div className="border-2 border-[#f68b2c] bg-white p-8 text-center" role="alert">
              <p className="font-semibold text-[#444]">{t('common.error')}</p>
              <button type="button" onClick={loadPilots} className="mt-4 cursor-pointer bg-[#f68b2c] px-5 py-3 font-semibold text-white">{t('common.retry')}</button>
            </div>
          )}

          {status === 'ready' && slug && !selected && (
            <div className="border-2 border-[#f68b2c] bg-white p-8 text-center">
              <p className="font-semibold text-[#444]">{t('pilots.notFound')}</p>
              <Link to="/pilot-sites" className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[#ca7428] underline"><ArrowLeft size={17} />{t('pilots.title')}</Link>
            </div>
          )}

          {selected && (
            <article className="mb-10 overflow-hidden spice-card">
              {selected.slug === 'thessaloniki' && <img src={thessalonikiImage} alt={t('pilots.thessalonikiAlt')} className="h-[260px] w-full object-cover md:h-[380px]" />}
              <div className="p-6 md:p-9">
                <Link to="/pilot-sites" className="mb-6 inline-flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-[#ca7428] hover:underline"><ArrowLeft size={17} />{t('pilots.title')}</Link>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3"><PilotFlag code={selected.countryCode} label={pilotText(selected.slug, 'country')} /><span className="text-[15px] font-semibold text-[#777]">{pilotText(selected.slug, 'country')}</span></div>
                    <h2 className="mt-4 text-[30px] font-bold text-[#444]">{pilotText(selected.slug, 'city')}: {pilotText(selected.slug, 'title')}</h2>
                  </div>
                  <span className="w-fit bg-[#e8f5ef] px-4 py-2 text-[13px] font-bold text-[#2e6e45]">{t(statusKey(selected.status))}</span>
                </div>
                <p className="mt-6 text-[17px] leading-relaxed text-[#555]">{pilotText(selected.slug, 'description')}</p>
                <div className="mt-7 flex items-start gap-3 bg-[#fff4e9] p-5"><Focus size={22} className="mt-0.5 flex-shrink-0 text-[#ca7428]" /><div><p className="font-bold text-[#444]">{t('pilots.focus')}</p><p className="mt-1 text-[15px] text-[#555]">{pilotText(selected.slug, 'focus')}</p></div></div>
                <Link to="/co-creation-hub" className="mt-7 inline-flex cursor-pointer items-center gap-2 bg-[#f68b2c] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]">{t('pilots.openToolkit')}<ArrowRight size={18} /></Link>

                {pilotSiteDetails[selected.slug] && (() => {
                  const site = pilotSiteDetails[selected.slug];
                  return (
                    <div className="mt-10 border-t-2 border-[#eee] pt-8">
                      <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#ca7428]">{t('pilots.actionPlanBrief')}</h3>
                      <h4 className="mt-1 text-[22px] font-bold text-[#444]">{site.demoSite}</h4>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="border-2 border-[#e5e5e5] p-4"><p className="text-[11px] font-bold uppercase text-[#999]">{t('pilots.task')}</p><p className="mt-1 text-[15px] font-semibold text-[#444]">{site.task}</p></div>
                        <div className="border-2 border-[#e5e5e5] p-4"><p className="text-[11px] font-bold uppercase text-[#999]">{t('pilots.theme')}</p><p className="mt-1 text-[15px] font-semibold text-[#444]">{site.theme}</p></div>
                        <div className="border-2 border-[#e5e5e5] p-4"><p className="text-[11px] font-bold uppercase text-[#999]">{t('pilots.lead')}</p><p className="mt-1 text-[15px] font-semibold text-[#444]">{site.lead}{site.participants.length > 0 ? ` · ${site.participants.join(', ')}` : ''}</p></div>
                        <div className="border-2 border-[#e5e5e5] p-4"><p className="text-[11px] font-bold uppercase text-[#999]">{t('pilots.deliverable')}</p><p className="mt-1 text-[15px] font-semibold text-[#444]">{site.deliverable}</p></div>
                      </div>

                      <div className="mt-5 flex items-start gap-3 bg-[#f0f8f4] p-5">
                        <FileCheck2 size={20} className="mt-0.5 flex-shrink-0 text-[#2e6e45]" />
                        <div><p className="font-bold text-[#2e6e45]">{t('pilots.expectedResult')}</p><p className="mt-1 text-[15px] text-[#444]">{site.expectedResult}</p></div>
                      </div>

                      {site.sections.map((section) => (
                        <div key={section.title} className="mt-8">
                          <h4 className="text-[18px] font-bold text-[#444]">{section.title}</h4>
                          {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-2 text-[15px] leading-relaxed text-[#666]">{paragraph}</p>)}
                          {section.bullets && (
                            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                              {section.bullets.map((bullet) => (
                                <li key={bullet} className="flex items-start gap-2 text-[14px] leading-relaxed text-[#666]">
                                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ca7428]" />{bullet}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}

                      <div className="mt-8">
                        <h4 className="flex items-center gap-2 text-[18px] font-bold text-[#444]"><Users size={19} className="text-[#ca7428]" />{t('pilots.participationInsights')}</h4>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          {site.participationInsights.map((insight) => (
                            <div key={insight.title} className="border-2 border-[#e5e5e5] p-4">
                              <p className="font-bold text-[#444]">{insight.title}</p>
                              <p className="mt-1.5 text-[14px] leading-relaxed text-[#666]">{insight.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {site.priorityGroups && site.priorityGroups.length > 0 && (
                        <div className="mt-8">
                          <h4 className="text-[18px] font-bold text-[#444]">{t('pilots.priorityGroups')}</h4>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {site.priorityGroups.map((group) => (
                              <span key={group} className="bg-[#fff0e1] px-3 py-1.5 text-[13px] font-semibold text-[#a85f20]">{group}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {site.additionalNotes && (
                        <div className="mt-8">
                          <h4 className="flex items-center gap-2 text-[18px] font-bold text-[#444]"><ClipboardList size={19} className="text-[#ca7428]" />{site.additionalNotes.title}</h4>
                          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                            {site.additionalNotes.bullets.map((bullet) => (
                              <li key={bullet} className="flex items-start gap-2 text-[14px] leading-relaxed text-[#666]">
                                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ca7428]" />{bullet}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </article>
          )}

          {status === 'ready' && !slug && (
            <div className="grid gap-6 md:grid-cols-2">
              {pilots.map((pilot) => {
                const detail = pilotSiteDetails[pilot.slug];
                return (
                  <Link key={pilot.slug} to={`/pilot-sites/${pilot.slug}`} className="spice-interactive-card flex min-h-[290px] flex-col p-6 text-left md:p-8">
                    <div className="flex items-start justify-between gap-4"><PilotFlag code={pilot.countryCode} label={pilotText(pilot.slug, 'country')} /><span className="bg-[#e8f5ef] px-3 py-1 text-[12px] font-bold text-[#2e6e45]">{t(statusKey(pilot.status))}</span></div>
                    <h2 className="mt-5 text-[25px] font-bold text-[#444]">{pilotText(pilot.slug, 'city')}</h2>
                    <p className="mt-1 text-[15px] font-semibold text-[#777]">{pilotText(pilot.slug, 'country')} - {pilotText(pilot.slug, 'title')}</p>
                    <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-[#555]">{pilotText(pilot.slug, 'description')}</p>
                    {detail && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <span className="bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-[#555]">{detail.task}</span>
                        <span className="bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-[#555]">{t('pilots.lead')}: {detail.lead}</span>
                        <span className="bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-[#555]">{t('pilots.masterplanDue')}</span>
                      </div>
                    )}
                    <span className="mt-auto inline-flex w-fit items-center gap-2 pt-6 text-[15px] font-bold text-[#ca7428]">{t('common.continue')}<ArrowRight size={17} /></span>
                  </Link>
                );
              })}
            </div>
          )}

          {status === 'ready' && !slug && (
            <div id="cross-site-evaluation" className="mt-12 scroll-mt-28 spice-card p-6 md:p-8">
              <h2 className="flex items-center gap-2 text-[22px] font-bold text-[#444]"><ClipboardList size={22} className="text-[#ca7428]" />{t('pilots.crossSiteTitle')}</h2>
              <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[#666]">{t('pilots.crossSiteIntro')}</p>

              <ul className="mt-5 grid gap-2 md:grid-cols-2">
                {crossSiteConclusions.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-[14px] leading-relaxed text-[#666]">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ca7428]" />{bullet}
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {crossSiteConclusions.perSiteStrategy.map((item) => (
                  <div key={item.slug} className="border-2 border-[#e5e5e5] p-4">
                    <p className="font-bold text-[#444]">{pilotText(item.slug, 'city')}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-[#666]">{item.strategy}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-start gap-3 bg-[#f5f5f5] p-4">
                <Info size={18} className="mt-0.5 flex-shrink-0 text-[#888]" />
                <p className="text-[13px] leading-relaxed text-[#777]">{crossSiteConclusions.timingNote}</p>
              </div>
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
