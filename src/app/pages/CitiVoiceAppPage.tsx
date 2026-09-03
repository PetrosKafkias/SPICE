import { useEffect, useState, type ElementType } from 'react';
import { AlertTriangle, ArrowRight, Download, Image, MapPin, MessageCircle, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import LoadingState from '../components/LoadingState';
import mapImage from '../../imports/Homepage/087caaf231c4809ec526b07765a4cd03a2735839.png';

interface Metric {
  key: string;
  value: number;
  label: string;
  periodLabel: string;
  updatedAt: string;
}

interface DashboardData {
  engagement: Array<{ week: string; value: number }>;
  sentiment: Array<{ name: string; value: number; color: string }>;
  categories: Array<{ name: string; value: number }>;
  ideas: Array<{ name: string; votes: number; support: boolean }>;
  locations: Array<{ name: string; description: string; count: number; color: string }>;
}

interface CitiVoiceResponse {
  metrics: Metric[];
  data: DashboardData;
}

type MapTab = 'heatmap' | 'points' | 'clusters';
type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

const METRIC_CONFIG: Record<string, { icon: ElementType; labelKey: TranslationKey }> = {
  contributions: { icon: MessageCircle, labelKey: 'citivoice.contributions' },
  participants: { icon: Users, labelKey: 'citivoice.participants' },
  votes: { icon: MessageCircle, labelKey: 'citivoice.votes' },
  photos: { icon: Image, labelKey: 'citivoice.photos' },
  issues: { icon: AlertTriangle, labelKey: 'citivoice.issues' },
};

const EMPTY_DATA: DashboardData = { engagement: [], sentiment: [], categories: [], ideas: [], locations: [] };

const SENTIMENT_KEYS: Record<string, TranslationKey> = {
  Positive: 'citivoice.sentimentPositive',
  Constructive: 'citivoice.sentimentConstructive',
  Concerned: 'citivoice.sentimentConcerned',
  Negative: 'citivoice.sentimentNegative',
};

const CATEGORY_KEYS: Record<string, TranslationKey> = {
  'Safety & lighting': 'citivoice.categorySafetyLighting',
  'Greenery & nature': 'citivoice.categoryGreeneryNature',
  'Seating & rest': 'citivoice.categorySeatingRest',
  'Play & sport': 'citivoice.categoryPlaySport',
  Accessibility: 'citivoice.categoryAccessibility',
  'Events & activity': 'citivoice.categoryEventsActivity',
};

const IDEA_KEYS: Record<string, TranslationKey> = {
  'Add cycle lane': 'citivoice.ideaCycleLane',
  'Community garden': 'citivoice.ideaCommunityGarden',
  'Covered seating': 'citivoice.ideaCoveredSeating',
  'Water feature': 'citivoice.ideaWaterFeature',
  'Remove parking': 'citivoice.ideaRemoveParking',
};

const LOCATION_KEYS: Record<string, TranslationKey> = {
  'Central plaza (eastern section)': 'citivoice.locationCentralPlaza',
  'Northern pedestrian entrance': 'citivoice.locationNorthernEntrance',
  'Waterfront promenade': 'citivoice.locationWaterfront',
  "Children's play area": 'citivoice.locationPlayArea',
};

const LOCATION_DESCRIPTION_KEYS: Record<string, TranslationKey> = {
  'Lack of shade and seating': 'citivoice.locationShadeSeating',
  'Safety at night - poor lighting': 'citivoice.locationNightSafety',
  'Damaged paving - accessibility issue': 'citivoice.locationDamagedPaving',
  'Outdated equipment': 'citivoice.locationOutdatedEquipment',
};

function translatedValue(value: string, mapping: Record<string, TranslationKey>, t: Translate) {
  const key = mapping[value];
  return key ? t(key) : value;
}

function downloadCsv(metrics: Metric[], data: DashboardData, t: Translate) {
  const lines = [
    [t('citivoice.csvMetric'), t('citivoice.csvValue'), t('citivoice.csvPeriod')],
    ...metrics.map((metric) => [t(METRIC_CONFIG[metric.key]?.labelKey || 'citivoice.contributions'), metric.value, t(`citivoice.period.${metric.key}` as TranslationKey)]),
    [],
    [t('citivoice.csvTopLocation'), t('citivoice.contributions'), t('citivoice.csvDescription')],
    ...data.locations.map((location) => [translatedValue(location.name, LOCATION_KEYS, t), location.count, translatedValue(location.description, LOCATION_DESCRIPTION_KEYS, t)]),
    [],
    [t('citivoice.csvSupportedIdea'), t('citivoice.votes')],
    ...data.ideas.map((idea) => [translatedValue(idea.name, IDEA_KEYS, t), idea.votes]),
  ];
  const csv = lines.map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `citivoice-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CitiVoiceAppPage() {
  const navigate = useNavigate();
  const { t, formatNumber } = useI18n();
  const [mapTab, setMapTab] = useState<MapTab>('heatmap');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = async () => {
    setStatus('loading');
    try {
      const result = await apiRequest<CitiVoiceResponse>('/api/citivoice');
      setMetrics(result.metrics);
      setData(result.data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { void load(); }, []);

  const localizedEngagement = data.engagement.map((item, index) => ({
    ...item,
    localizedWeek: t('citivoice.week', { number: index + 1 }),
  }));

  const handleDownload = () => {
    downloadCsv(metrics, data, t);
    toast.success(t('citivoice.downloaded'));
  };

  if (status === 'loading') {
    return <SpicePublicShell><LoadingState message={t('common.loading')} minHeight="500px" /></SpicePublicShell>;
  }

  if (status === 'error') {
    return <SpicePublicShell><div className="spice-page spice-wide-page"><div className="border-l-4 border-red-600 bg-red-50 p-6" role="alert"><p className="font-semibold text-red-800">{t('common.error')}</p><button type="button" onClick={load} className="mt-3 cursor-pointer text-[#ca7428] underline">{t('common.retry')}</button></div></div></SpicePublicShell>;
  }

  const maxLocation = Math.max(...data.locations.map((item) => item.count), 1);
  const maxIdea = Math.max(...data.ideas.map((item) => item.votes), 1);

  return (
    <SpicePublicShell>
      <div className="spice-page spice-wide-page flex flex-col gap-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div><h1 className="text-[32px] font-bold text-[#444]">{t('nav.citivoice')}</h1><p className="mt-1 text-[15px] font-medium text-[#888]">{t('citivoice.subtitle')}</p></div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={handleDownload} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 border-2 border-[#444] px-5 py-3 text-[14px] font-semibold text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]"><Download size={17} />{t('citivoice.downloadSummary')}</button>
            <button type="button" onClick={() => navigate('/app/citivoice')} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]">{t('citivoice.openWorkspace')}<ArrowRight size={17} /></button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => {
            const config = METRIC_CONFIG[metric.key] || { icon: MessageCircle, labelKey: 'citivoice.contributions' as TranslationKey };
            const Icon = config.icon;
            return <article key={metric.key} className="flex min-h-[165px] flex-col gap-2 border-2 border-[#bfc0c5] bg-white p-4 shadow-sm"><Icon size={21} className="text-[#ca7428]" /><p className="text-[25px] font-bold text-[#444]">{formatNumber(metric.value)}</p><p className="text-[12px] font-semibold text-[#777]">{t(config.labelKey)}</p><p className="mt-auto text-[11px] font-semibold text-[#2e6e45]">{t(`citivoice.period.${metric.key}` as TranslationKey)}</p></article>;
          })}
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <article className="overflow-hidden border-2 border-[#bfc0c5] bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5"><h2 className="flex items-center gap-2 text-[17px] font-bold text-[#444]"><MapPin size={18} className="text-[#ca7428]" />{t('citivoice.feedbackMap')}</h2></div>
            <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-5 py-3">
              {(['heatmap', 'points', 'clusters'] as MapTab[]).map((tab) => <button key={tab} type="button" onClick={() => setMapTab(tab)} className={`min-h-10 cursor-pointer px-4 py-2 text-[13px] font-semibold transition-colors ${mapTab === tab ? 'border border-[#ca7428] bg-[#fff4e9] text-[#ca7428]' : 'border border-transparent text-[#777] hover:bg-[#f5f5f5]'}`} aria-pressed={mapTab === tab}>{t(`citivoice.${tab}` as TranslationKey)}</button>)}
            </div>
            <div className="relative h-[300px] overflow-hidden bg-[#e8f0e8] sm:h-[340px]">
              <img src={mapImage} alt={t('citivoice.mapAlt')} className="absolute inset-0 h-full w-full object-cover opacity-75" />
              {mapTab === 'heatmap' && <><span className="absolute left-[20%] top-[34%] h-24 w-32 rounded-full bg-red-500/40 blur-xl" /><span className="absolute left-[50%] top-[46%] h-28 w-36 rounded-full bg-[#f68b2c]/45 blur-xl" /><span className="absolute right-[14%] top-[22%] h-20 w-28 rounded-full bg-yellow-400/35 blur-xl" /></>}
              {mapTab === 'points' && [[22, 38], [38, 62], [51, 48], [65, 28], [78, 57], [84, 34]].map(([left, top], index) => <span key={index} className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#f68b2c] shadow" style={{ left: `${left}%`, top: `${top}%` }} />)}
              {mapTab === 'clusters' && [{ left: 28, top: 43, count: 134 }, { left: 56, top: 55, count: 412 }, { left: 80, top: 32, count: 166 }].map((cluster) => <span key={cluster.count} className="absolute grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[#ca7428]/90 text-[12px] font-bold text-white shadow" style={{ left: `${cluster.left}%`, top: `${cluster.top}%` }}>{cluster.count}</span>)}
            </div>
          </article>

          <article className="flex flex-col gap-4 border-2 border-[#bfc0c5] bg-white p-5 shadow-sm">
            <h2 className="text-[17px] font-bold text-[#444]">{t('citivoice.topLocations')}</h2>
            {data.locations.map((location) => <div key={location.name} className="flex flex-col gap-1"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: location.color }} /><p className="text-[12px] font-semibold leading-tight text-[#444]">{translatedValue(location.name, LOCATION_KEYS, t)}</p></div><span className="flex-shrink-0 text-[12px] font-bold text-[#444]">{formatNumber(location.count)}</span></div><p className="pl-5 text-[11px] text-[#888]">{translatedValue(location.description, LOCATION_DESCRIPTION_KEYS, t)}</p><div className="ml-5 h-1.5 max-w-[calc(100%-20px)] bg-gray-100"><div className="h-1.5" style={{ width: `${(location.count / maxLocation) * 100}%`, backgroundColor: location.color }} /></div></div>)}
          </article>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <article className="border-2 border-[#bfc0c5] bg-white p-5 shadow-sm"><h3 className="mb-4 text-[15px] font-bold text-[#444]">{t('citivoice.engagement')}</h3><ResponsiveContainer width="100%" height={200}><AreaChart data={localizedEngagement}><defs><linearGradient id="engagement-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2e6e45" stopOpacity={0.3} /><stop offset="95%" stopColor="#2e6e45" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="localizedWeek" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => formatNumber(Number(value))} contentStyle={{ fontSize: 12 }} /><Area type="monotone" dataKey="value" stroke="#2e6e45" strokeWidth={2} fill="url(#engagement-gradient)" /></AreaChart></ResponsiveContainer></article>
          <article className="border-2 border-[#bfc0c5] bg-white p-5 shadow-sm"><h3 className="mb-4 text-[15px] font-bold text-[#444]">{t('citivoice.sentiment')}</h3><div className="flex flex-col items-center gap-5 sm:flex-row"><ResponsiveContainer width={160} height={160}><PieChart><Pie data={data.sentiment} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value">{data.sentiment.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer><div className="flex min-w-[190px] flex-1 flex-col gap-2">{data.sentiment.map((item) => <div key={item.name} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-[13px] text-[#444]">{translatedValue(item.name, SENTIMENT_KEYS, t)}</span><span className="ml-auto text-[13px] font-semibold text-[#444]">{formatNumber(item.value / 100, { style: 'percent', maximumFractionDigits: 0, minimumFractionDigits: 0 })}</span></div>)}</div></div></article>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <article className="border-2 border-[#bfc0c5] bg-white p-5 shadow-sm"><h3 className="mb-4 text-[15px] font-bold text-[#444]">{t('citivoice.concerns')}</h3><ResponsiveContainer width="100%" height={220}><BarChart data={data.categories.map((item) => ({ ...item, localizedName: translatedValue(item.name, CATEGORY_KEYS, t) }))} layout="vertical"><XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="localizedName" tick={{ fontSize: 10, fill: '#444' }} width={120} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ fontSize: 12 }} /><Bar dataKey="value" fill="#2e6e45" /></BarChart></ResponsiveContainer></article>
          <article className="border-2 border-[#bfc0c5] bg-white p-5 shadow-sm"><h3 className="mb-4 text-[15px] font-bold text-[#444]">{t('citivoice.ideas')}</h3><div className="flex flex-col gap-4">{data.ideas.map((idea) => <div key={idea.name}><div className="flex items-center justify-between gap-3"><p className="text-[12px] font-medium text-[#444]">{translatedValue(idea.name, IDEA_KEYS, t)}</p><span className="text-[12px] font-bold text-[#444]">{formatNumber(idea.votes)}</span></div><div className="mt-1 h-2 w-full bg-gray-100"><div className="h-2" style={{ width: `${(idea.votes / maxIdea) * 100}%`, backgroundColor: idea.support ? '#2e6e45' : '#c0392b' }} /></div></div>)}</div></article>
        </section>
      </div>
    </SpicePublicShell>
  );
}
