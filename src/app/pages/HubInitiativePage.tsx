import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Circle, CircleAlert, CircleDot, Eye, MessageSquareText, Vote } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import LoadingState from '../components/LoadingState';
import { useI18n } from '../context/I18nContext';
import { statusKey } from '../lib/statusLabel';
import { phaseState } from '../lib/phaseState';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest } from '../lib/api';
import { usePermissions } from '../auth/usePermissions';

interface Phase {
  id: number;
  phaseNumber: number;
  title: string;
  description: string;
  status: 'not_started' | 'scheduled' | 'open' | 'closed' | 'completed';
  instructions: string;
  enabledTools: string[];
  resultsVisible: boolean;
  startDate: string | null;
  endDate: string | null;
}

const PHASE_TEXT_KEYS: Record<number, TranslationKey> = {
  1: 'hub.phase1Text', 2: 'hub.phase2Text', 3: 'hub.phase3Text', 4: 'hub.phase4Text', 5: 'hub.phase5Text',
};
const PHASE_TITLE_KEYS: Record<number, TranslationKey> = {
  1: 'hub.phase1', 2: 'hub.phase2', 3: 'hub.phase3', 4: 'hub.phase4', 5: 'hub.phase5',
};

interface Initiative {
  id: number;
  title: string;
  description: string;
  objectives: string;
  location: string;
  status: 'draft' | 'scheduled' | 'published' | 'active' | 'paused' | 'completed' | 'archived';
  visibility: 'public' | 'private' | 'invitation_only';
  version: number;
  phases: Phase[];
  currentPhaseNumber: number | null;
  pilotFinalizedAt: string | null;
}

export default function HubInitiativePage() {
  const { initiativeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [canParticipate, setCanParticipate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { role } = usePermissions();

  const previewingAsCitizen = searchParams.get('preview') === 'citizen';
  const effectiveCanManage = canManage && !previewingAsCitizen;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{ initiative: Initiative; access: { canManage: boolean; canParticipate: boolean } }>(`/api/hub/initiatives/${initiativeId}`);
      setInitiative(result.initiative);
      setCanManage(result.access.canManage);
      setCanParticipate(result.access.canParticipate);
    } catch {
      setError(t('hub.initiativeLoadError'));
    } finally {
      setLoading(false);
    }
  }, [initiativeId, t]);

  useEffect(() => { void load(); }, [load]);

  const currentPhase = initiative?.currentPhaseNumber
    ? initiative.phases.find((phase) => phase.phaseNumber === initiative.currentPhaseNumber) || null
    : null;
  const pilotFinalized = Boolean(initiative?.pilotFinalizedAt);

  if (!loading && initiative && role === 'citizen' && !previewingAsCitizen) {
    return <Navigate to={`/co-creation-hub?phase=${initiative.currentPhaseNumber || 1}`} replace />;
  }

  return (
    <SpicePublicShell variant="public">
      <div className="spice-page spice-wide-page">
        <Link to="/co-creation-hub" className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-bold text-[#a85f20] hover:underline">
          <ArrowLeft size={18} /> {t('hub.backToHub')}
        </Link>

        {loading && <div className="mt-10 spice-card"><LoadingState message={t('hub.loadingPilotSite')} minHeight="256px" size="lg" /></div>}
        {error && <div className="mt-8 flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 font-semibold text-red-800" role="alert"><CircleAlert size={20} />{error}</div>}

        {!loading && initiative && (
          <>
            {previewingAsCitizen && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-2 border-[#ca7428] bg-[#fff7ef] p-4" role="status">
                <p className="text-sm font-semibold text-[#8f4d18]"><Eye size={16} className="mr-2 inline" />{t('hub.previewCitizenNotice')}</p>
                <button type="button" onClick={() => setSearchParams((params) => { params.delete('preview'); return params; })} className="cursor-pointer text-sm font-bold text-[#a85f20] underline underline-offset-4">{t('hub.exitPreview')}</button>
              </div>
            )}

            <header className="mt-6 spice-card p-6 md:p-8">
              <div className="max-w-4xl">
                <span className="text-[12px] font-bold uppercase text-[#ca7428]">{t('hub.initiativeStatus', { status: t(statusKey(initiative.status)) })}</span>
                <h1 className="mt-3 text-[34px] font-bold leading-tight text-[#444] md:text-[44px]">{initiative.title}</h1>
                <p className="mt-4 text-[16px] leading-relaxed text-[#666]">{initiative.description}</p>
                {initiative.location && <p className="mt-4 font-semibold text-[#59713d]">{t('hub.location', { location: initiative.location })}</p>}
              </div>
              {effectiveCanManage && (
                <Link to="/co-creation-hub" className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-4 py-2 text-sm font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">
                  {t('hub.managePhases')}
                </Link>
              )}
            </header>

            <section className="mt-10" aria-labelledby="phase-heading">
              <h2 id="phase-heading" className="text-[28px] font-bold text-[#444]">{t('hub.fivePhaseRoadmap')}</h2>
              <p className="mt-2 text-[#666]">{t('hub.fivePhaseRoadmapText')}</p>
              <div className="mt-6 grid gap-5 lg:grid-cols-5">
                {initiative.phases.map((phase) => {
                  const state = phaseState(phase.phaseNumber, initiative.currentPhaseNumber, pilotFinalized);
                  const stateLabelKey: TranslationKey = state === 'completed' ? 'hub.phaseCompleted'
                    : state === 'current' ? 'hub.phaseCurrent'
                    : effectiveCanManage ? 'hub.phaseIncomplete' : 'hub.phaseUpcoming';
                  return (
                    <article key={phase.id} className={`flex min-h-72 flex-col border-2 bg-white p-5 ${state === 'current' ? 'border-[#f68b2c]' : 'border-[#d5d6da]'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff0e1] font-bold text-[#ca7428]">{phase.phaseNumber}</span>
                        {state === 'completed'
                          ? <CheckCircle2 className="text-[#2e6e45]" />
                          : state === 'current'
                            ? <CircleDot className="text-[#ca7428]" />
                            : <Circle className="text-[#aaa]" />}
                      </div>
                      <h3 className="mt-5 text-lg font-bold leading-tight text-[#444]">{t(PHASE_TITLE_KEYS[phase.phaseNumber] || 'hub.phase1')}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-[#666]">{t(PHASE_TEXT_KEYS[phase.phaseNumber] || 'hub.phase1Text')}</p>
                      <div className="mt-auto flex flex-col gap-3 pt-5">
                        <span className="text-xs font-bold uppercase text-[#a85f20]">{t(stateLabelKey)}</span>
                        <Link
                          to={`/hub/${initiative.id}/phase/${phase.phaseNumber}`}
                          aria-current={phase.id === currentPhase?.id ? 'step' : undefined}
                          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 border-2 border-[#444] bg-white px-3 text-sm font-bold text-[#444] transition-colors duration-200 hover:border-[#ca7428] hover:bg-[#fff7ef] hover:text-[#a85f20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]"
                        >
                          {t('hub.viewDetails')}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="spice-card p-6">
                <MessageSquareText className="text-[#ca7428]" />
                <h2 className="mt-4 text-2xl font-bold text-[#444]">{t('hub.discussionProposals')}</h2>
                <p className="mt-3 text-[#666]">{t('hub.discussionProposalsText')}</p>
                <Link to={`/forum-voting?initiative=${initiative.id}`} className="mt-6 inline-flex min-h-12 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-3 font-bold text-white">{t('hub.openForum')} <MessageSquareText size={18} /></Link>
              </div>
              <div className="spice-card p-6">
                <Vote className="text-[#ca7428]" />
                <h2 className="mt-4 text-2xl font-bold text-[#444]">{t('hub.participation')}</h2>
                {(() => {
                  if (!canParticipate) {
                    return <p className="mt-3 text-[#666]">{t('hub.eligibleCitizenRequired')}</p>;
                  }
                  if (currentPhase) {
                    return (
                      <>
                        <p className="mt-3 text-[#666]">{t('hub.phaseOpenForParticipation', { number: currentPhase.phaseNumber, phase: t(PHASE_TITLE_KEYS[currentPhase.phaseNumber] || 'hub.phase1') })}</p>
                        <div className="mt-6 border-l-4 border-[#f68b2c] bg-[#fff7ef] p-4 text-sm text-[#444]">
                          <p className="font-bold">{t('hub.citizen.noOpenActivities')}</p>
                          <p className="mt-1 leading-relaxed text-[#666]">{t('hub.citizen.noOpenActivitiesText')}</p>
                          <Link to={`/co-creation-hub?phase=${currentPhase.phaseNumber}`} className="mt-4 inline-flex min-h-11 items-center font-bold text-[#a85f20] underline underline-offset-4">
                            {t('hub.citizen.viewCurrentPhase')}
                          </Link>
                        </div>
                      </>
                    );
                  }
                  return (
                    <>
                      <p className="mt-3 text-[#666]">{t('hub.noOpenPhase')}</p>
                      <div className="mt-6 spice-card-dashed p-4 text-sm text-[#666]">{t('hub.returnForNextPhase')}</div>
                    </>
                  );
                })()}
              </div>
            </section>
          </>
        )}
      </div>
    </SpicePublicShell>
  );
}
