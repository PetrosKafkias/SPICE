import { useEffect, useState, type ElementType } from 'react';
import { Accessibility, Activity, BarChart2, FileText, Languages, MapPin, MessageSquare, Users, Wrench } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest } from '../lib/api';

interface Metric {
  key: string;
  value: number;
  label: string;
  category: string;
  updatedAt: string;
}

interface BarItem { label: string; value: number }
interface InsightsData {
  activePilots: BarItem[];
  toolUsage: BarItem[];
  phaseEngagement: BarItem[];
  feedbackTrend: BarItem[];
}

interface InsightsResponse { metrics: Metric[]; data: InsightsData }

const METRIC_ICONS: Record<string, ElementType> = {
  contributions: Activity,
  participants: Users,
  active_pilots: MapPin,
  tools_used: Wrench,
  repository_outputs: FileText,
  multilingual_share: Languages,
  accessible_sessions: Accessibility,
  positive_feedback: MessageSquare,
};

const PERCENT_METRICS = new Set(['multilingual_share', 'accessible_sessions', 'positive_feedback']);
const EMPTY_DATA: InsightsData = { activePilots: [], toolUsage: [], phaseEngagement: [], feedbackTrend: [] };

function metricLabelKey(key: string) {
  return `insights.metric.${key}` as TranslationKey;
}

function BarList({ title, items, icon: Icon }: { title: string; items: BarItem[]; icon: ElementType }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <article className="border-2 border-[#d7d8dc] bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
      <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[rgba(246,139,44,0.15)]"><Icon size={19} className="text-[#ca7428]" /></span><h2 className="text-[18px] font-bold text-[#444]">{title}</h2></div>
      <div className="flex flex-col gap-4">{items.map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-4 text-[12px] font-semibold text-[#555]"><span>{item.label}</span><span>{item.value}</span></div><div className="h-3 bg-[#ececec]"><div className="h-full bg-[#f68b2c]" style={{ width: `${(item.value / max) * 100}%` }} /></div></div>)}</div>
    </article>
  );
}

export default function InsightsPage() {
  const { t, formatDate } = useI18n();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [data, setData] = useState<InsightsData>(EMPTY_DATA);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = async () => {
    setStatus('loading');
    try {
      const result = await apiRequest<InsightsResponse>('/api/insights');
      setMetrics(result.metrics);
      setData(result.data);
      setStatus('ready');
    } catch { setStatus('error'); }
  };

  useEffect(() => { void load(); }, []);

  if (status === 'loading') return <SpicePublicShell><div className="grid min-h-[520px] place-items-center font-semibold text-[#555]" role="status">{t('common.loading')}</div></SpicePublicShell>;
  if (status === 'error') return <SpicePublicShell><div className="spice-page"><div className="border-l-4 border-red-600 bg-red-50 p-6" role="alert"><p className="font-semibold text-red-800">{t('common.error')}</p><button type="button" onClick={load} className="mt-3 cursor-pointer text-[#ca7428] underline">{t('common.retry')}</button></div></div></SpicePublicShell>;

  return (
    <SpicePublicShell>
      <div className="bg-[#f7f7f7]">
        <StandardPageHeader icon={BarChart2} eyebrow={t('insights.dashboard')} title={t('insights.title')} description={t('insights.subtitle')} />
        <div className="spice-page spice-wide-page flex flex-col gap-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = METRIC_ICONS[metric.key] || BarChart2;
              const displayValue = `${new Intl.NumberFormat().format(metric.value)}${PERCENT_METRICS.has(metric.key) ? '%' : ''}`;
              return <article key={metric.key} className="border-2 border-[#d7d8dc] bg-white p-5 shadow-[0_10px_22px_rgba(0,0,0,0.08)]"><div className="mb-5 flex items-center justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(246,139,44,0.15)]"><Icon size={21} className="text-[#ca7428]" /></span><span className="bg-[#e8f5ef] px-2.5 py-1 text-[11px] font-bold text-[#2e6e45]">{t('insights.live')}</span></div><p className="text-[28px] font-bold text-[#444]">{displayValue}</p><p className="mt-1 text-[14px] font-bold text-[#444]">{t(metricLabelKey(metric.key))}</p><p className="mt-2 text-[11px] font-semibold text-[#888]">{formatDate(metric.updatedAt)}</p></article>;
            })}
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <BarList title={t('insights.activePilots')} items={data.activePilots} icon={MapPin} />
            <BarList title={t('insights.usedTools')} items={data.toolUsage} icon={Wrench} />
            <BarList title={t('insights.phaseEngagement')} items={data.phaseEngagement} icon={BarChart2} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="border-2 border-[#d7d8dc] bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.08)]"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[rgba(246,139,44,0.15)]"><Activity size={19} className="text-[#ca7428]" /></span><h2 className="text-[18px] font-bold text-[#444]">{t('insights.feedbackTrend')}</h2></div><ResponsiveContainer width="100%" height={250}><AreaChart data={data.feedbackTrend}><defs><linearGradient id="insights-trend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ca7428" stopOpacity={0.34} /><stop offset="95%" stopColor="#ca7428" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#777' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#777' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ fontSize: 12 }} /><Area type="monotone" dataKey="value" stroke="#ca7428" strokeWidth={3} fill="url(#insights-trend)" /></AreaChart></ResponsiveContainer></article>

            <article className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {[{ key: 'multilingual_share', title: t('insights.multilingual'), icon: Languages }, { key: 'accessible_sessions', title: t('insights.accessibility'), icon: Accessibility }, { key: 'repository_outputs', title: t('insights.outputs'), icon: FileText }, { key: 'contributions', title: t('insights.participation'), icon: Activity }].map(({ key, title, icon: Icon }) => {
                const metric = metrics.find((item) => item.key === key);
                return <div key={key} className="flex items-center gap-4 border-2 border-[#d7d8dc] bg-white p-5 shadow-[0_8px_18px_rgba(0,0,0,0.07)]"><span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><Icon size={21} /></span><div><p className="text-[13px] font-bold text-[#444]">{title}</p><p className="mt-1 text-[22px] font-bold text-[#ca7428]">{metric ? `${new Intl.NumberFormat().format(metric.value)}${PERCENT_METRICS.has(key) ? '%' : ''}` : '-'}</p></div></div>;
              })}
            </article>
          </section>
        </div>
      </div>
    </SpicePublicShell>
  );
}
