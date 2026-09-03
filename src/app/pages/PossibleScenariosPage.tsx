import { useEffect, useState, type ElementType } from 'react';
import { Check, FileText, Hourglass, Layers, Lightbulb, ListChecks, MapPinned, Sparkles, Users, Wrench } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import LoadingState from '../components/LoadingState';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest } from '../lib/api';

interface Scenario {
  id: number;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  phase: number;
  publicationStatus: 'in_preparation' | 'implementation_ongoing' | 'under_evaluation' | 'published';
  pilotContext: string;
  toolsUsed: string[];
  stakeholders: string;
  activities: string;
  outputsResults: string;
  lessonsLearned: string;
  recommendations: string;
}

const WILL_CONTAIN_KEYS: TranslationKey[] = [
  'scenarios.willContain1', 'scenarios.willContain2', 'scenarios.willContain3', 'scenarios.willContain4',
  'scenarios.willContain5', 'scenarios.willContain6', 'scenarios.willContain7', 'scenarios.willContain8',
];

const STATUS_KEYS: Record<Scenario['publicationStatus'], TranslationKey> = {
  in_preparation: 'scenarios.statusInPreparation',
  implementation_ongoing: 'scenarios.statusImplementationOngoing',
  under_evaluation: 'scenarios.statusUnderEvaluation',
  published: 'scenarios.statusPublished',
};

const STATUS_STYLES: Record<Scenario['publicationStatus'], string> = {
  in_preparation: 'bg-[#f2f2f2] text-[#666]',
  implementation_ongoing: 'bg-[#e8f0f7] text-[#1b3a5c]',
  under_evaluation: 'bg-[#fff5d9] text-[#7a5b00]',
  published: 'bg-[#e7f2df] text-[#47662f]',
};

function DetailBlock({ icon: Icon, label, text }: { icon: ElementType; label: string; text: string }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-[14px] font-bold text-[#444]"><Icon size={16} className="text-[#ca7428]" />{label}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{text}</p>
    </div>
  );
}

export default function PossibleScenariosPage() {
  const { t } = useI18n();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = () => {
    setStatus('loading');
    apiRequest<{ scenarios: Scenario[] }>('/api/scenarios')
      .then((result) => { setScenarios(result.scenarios); setStatus('ready'); })
      .catch(() => setStatus('error'));
  };

  useEffect(() => { load(); }, []);

  const selected = scenarios.find((scenario) => scenario.id === selectedId) || null;

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={Sparkles} eyebrow={t('scenarios.eyebrow')} title={t('scenarios.title')} description={t('scenarios.subtitle')} />
      <div className="spice-page spice-wide-page" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="mt-8 border-l-4 border-[#f68b2c] bg-[#fff4e9] p-5">
          <span className="inline-flex items-center gap-2 bg-[#f68b2c] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            <Hourglass size={13} aria-hidden="true" />{t('scenarios.wipLabel')}
          </span>
          <p className="mt-3 text-[16px] font-bold text-[#444]">{t('scenarios.wipTitle')}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#555]">{t('scenarios.wipMessage')}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#555]">{t('scenarios.wipSupporting')}</p>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]" aria-labelledby="scenarios-will-contain-title">
          <div className="spice-card p-6 md:p-8">
            <h2 className="text-[20px] font-bold text-[#444]">{t('scenarios.howTheyAreBuiltTitle')}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[#666]">{t('scenarios.currentlyImplementing')}</p>
          </div>
          <div className="spice-card p-6 md:p-8">
            <h2 id="scenarios-will-contain-title" className="text-[20px] font-bold text-[#444]">{t('scenarios.willContainTitle')}</h2>
            <ul className="mt-4 grid gap-2.5" role="list">
              {WILL_CONTAIN_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[#555]">
                  <Check size={16} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {status === 'loading' && <LoadingState message={t('common.loading')} minHeight="240px" />}
        {status === 'error' && (
          <div className="mt-8 border-l-4 border-red-600 bg-red-50 p-6" role="alert">
            <p className="font-semibold text-red-800">{t('common.error')}</p>
            <button type="button" onClick={load} className="mt-3 cursor-pointer text-[#ca7428] underline">{t('common.retry')}</button>
          </div>
        )}

        {status === 'ready' && scenarios.length === 0 && (
          <div className="mt-8 spice-card-dashed p-12 text-center">
            <Layers className="mx-auto text-[#ca7428]" size={32} />
            <h2 className="mt-4 text-xl font-bold text-[#444]">{t('scenarios.emptyTitle')}</h2>
            <p className="mt-2 text-[#666]">{t('scenarios.emptyDescription')}</p>
          </div>
        )}

        {status === 'ready' && scenarios.length > 0 && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {scenarios.map((scenario) => (
              <button key={scenario.id} type="button" onClick={() => setSelectedId(scenario.id)} className="spice-interactive-card flex min-h-[220px] flex-col p-5 text-left">
                <span className={`self-start px-3 py-1 text-[11px] font-bold uppercase ${STATUS_STYLES[scenario.publicationStatus]}`}>{t(STATUS_KEYS[scenario.publicationStatus])}</span>
                <h2 className="mt-4 text-[19px] font-bold text-[#444]">{scenario.title}</h2>
                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[#666]">{scenario.summary}</p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <section className="mt-10 spice-card p-6 md:p-8">
            <span className={`inline-flex px-3 py-1 text-[11px] font-bold uppercase ${STATUS_STYLES[selected.publicationStatus]}`}>{t(STATUS_KEYS[selected.publicationStatus])}</span>
            <h2 className="mt-3 text-[28px] font-bold text-[#444]">{selected.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{selected.summary}</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {selected.pilotContext && <DetailBlock icon={MapPinned} label={t('scenarios.pilotContext')} text={selected.pilotContext} />}
              {selected.toolsUsed.length > 0 && <DetailBlock icon={Wrench} label={t('scenarios.toolsUsed')} text={selected.toolsUsed.join(', ')} />}
              {selected.stakeholders && <DetailBlock icon={Users} label={t('scenarios.stakeholders')} text={selected.stakeholders} />}
              {selected.activities && <DetailBlock icon={ListChecks} label={t('scenarios.activitiesCarriedOut')} text={selected.activities} />}
              {selected.outputsResults && <DetailBlock icon={FileText} label={t('scenarios.outputsResults')} text={selected.outputsResults} />}
              {selected.lessonsLearned && <DetailBlock icon={Lightbulb} label={t('scenarios.lessonsLearned')} text={selected.lessonsLearned} />}
              {selected.recommendations && <DetailBlock icon={Sparkles} label={t('scenarios.recommendationsForReuse')} text={selected.recommendations} />}
            </div>
          </section>
        )}
      </div>
    </SpicePublicShell>
  );
}
