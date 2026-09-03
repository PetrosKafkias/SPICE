import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, Clock3, ListChecks } from 'lucide-react';
import { Link } from 'react-router';
import type { Role } from '../auth/permissions';
import { roleKey } from '../auth/permissions';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

export interface WorkflowRequirement {
  code: string;
  met: boolean;
  detail: number | null;
}

export interface WorkflowHandoff {
  id: number;
  phaseNumber: number;
  itemType: string;
  itemId: number | null;
  fromRole: Role;
  toRole: Role;
  status: string;
  message: string;
  createdAt: string;
}

export interface WorkflowSummary {
  currentPhaseNumber: number;
  readiness: {
    phaseNumber: number;
    ready: boolean;
    requirements: WorkflowRequirement[];
  };
  metrics: {
    toolsSelected: number;
    activitiesTotal: number;
    completedActivities: number;
    contributions: number;
    proposals: number;
    finalDecisions: number;
    outputs: number;
    facilitatorAssigned: boolean;
    draftActivities: number;
    needsRevisionActivities: number;
    readyForReviewActivities: number;
    publishedActivities: number;
    openActivities: number;
    closedActivities: number;
    municipalityReviewProposals: number;
    needsRevisionProposals: number;
    discussionOpenProposals: number;
    votingOpenProposals: number;
    participationClosedProposals: number;
    decisionPendingProposals: number;
    approvedProposals: number;
    declinedProposals: number;
    myContributions: number;
    myVotes: number;
  };
  nextAction: {
    code: string;
    actorRole: Role;
    path: string;
  };
  pendingHandoffs: WorkflowHandoff[];
}

const ACTION_LABEL_KEYS: Record<string, TranslationKey> = {
  complete_setup: 'hub.completePilotSetup',
  select_tools: 'setup.continueSelected',
  assign_facilitator: 'hub.assignFacilitator',
  review_activity: 'workflow.button.reviewActivity',
  review_proposal: 'journey.municipality.3.action',
  issue_decision: 'workflow.button.issueDecision',
  advance_phase: 'workflow.button.advancePhase',
  monitor_participation: 'workflow.button.monitorParticipation',
  configure_activity: 'workflow.button.configureActivity',
  wait_assignment: 'workflow.button.viewPilot',
  wait_activity_review: 'workflow.button.viewActivity',
  support_participation: 'workflow.button.supportParticipation',
  revise_activity: 'workflow.button.reviseActivity',
  revise_proposal: 'workflow.button.reviseProposal',
  prepare_summary: 'workflow.button.prepareSummary',
  document_results: 'hub.uploadWorkshopOutput',
  prepare_activity: 'hub.preparePhaseActivities',
  participate_now: 'hub.participate',
  vote_now: 'workflow.button.voteNow',
  review_decision: 'forum.reviewDecision',
  follow_updates: 'workflow.button.viewUpdates',
  review_platform: 'hub.openAdministration',
};

export default function WorkflowNextActionPanel({
  role,
  workflow,
  onAdvance,
}: {
  role: Role;
  workflow: WorkflowSummary;
  onAdvance?: () => void;
}) {
  const { t } = useI18n();
  const action = workflow.nextAction;
  const waitingForAnotherRole = action.actorRole !== role;
  const labelKey = ACTION_LABEL_KEYS[action.code] ?? 'common.continue';
  const isAdvance = action.code === 'advance_phase';

  return (
    <section className="spice-card border-l-4 border-l-[#f68b2c] p-6 md:p-8" aria-labelledby="workflow-next-action-title">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]">
              {waitingForAnotherRole ? <Clock3 size={20} aria-hidden="true" /> : <ListChecks size={20} aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#a85f20]">
                {t(waitingForAnotherRole ? 'workflow.waitingFor' : 'workflow.nextAction')}
              </p>
              <h2 id="workflow-next-action-title" className="mt-1 text-[22px] font-bold leading-tight text-[#444]">
                {t(labelKey, { phase: workflow.currentPhaseNumber + 1, role: t(roleKey(action.actorRole)) })}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#666]">
                {t(waitingForAnotherRole ? 'workflow.waitingExplanation' : 'workflow.nextActionExplanation', { role: t(roleKey(action.actorRole)) })}
              </p>
            </div>
          </div>

          {!waitingForAnotherRole && (
            isAdvance ? (
              <button type="button" onClick={onAdvance} className="mt-5 inline-flex min-h-12 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#df771d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]">
                {t('workflow.button.advancePhase', { phase: workflow.currentPhaseNumber + 1 })} <ArrowRight size={17} aria-hidden="true" />
              </button>
            ) : (
              <Link to={action.path} className="mt-5 inline-flex min-h-12 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#df771d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]">
                {t(labelKey)} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            )
          )}

          <Link to={`/demo?guide=${role}`} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#bfc0c5] bg-white px-4 py-2 text-[13px] font-bold text-[#555] transition-colors hover:border-[#ca7428] hover:text-[#a85f20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]">
            <BookOpen size={16} aria-hidden="true" /> {t('workflow.openRoleGuide')}
          </Link>

          {workflow.pendingHandoffs.length > 0 && (
            <div className="mt-6 border-t-2 border-[#eee] pt-4">
              <h3 className="text-[14px] font-bold text-[#444]">{t('workflow.pendingHandovers')}</h3>
              <ul className="mt-3 space-y-2">
                {workflow.pendingHandoffs.slice(0, 3).map((handoff) => (
                  <li key={handoff.id} className="flex items-start gap-2 text-[13px] leading-relaxed text-[#555]">
                    <ArrowRight size={15} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                    <span>{t('workflow.handoverLine', {
                      from: t(roleKey(handoff.fromRole)),
                      to: t(roleKey(handoff.toRole)),
                      phase: handoff.phaseNumber,
                    })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t-2 border-[#eee] pt-5 lg:border-l-2 lg:border-t-0 lg:pl-7 lg:pt-0">
          <h3 className="text-[15px] font-bold text-[#444]">{t('workflow.phaseRequirements')}</h3>
          <ul className="mt-3 space-y-3">
            {workflow.readiness.requirements.map((requirement) => (
              <li key={requirement.code} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#555]">
                {requirement.met
                  ? <CheckCircle2 size={17} className="mt-0.5 flex-none text-[#58723d]" aria-label={t('workflow.requirementComplete')} />
                  : <CircleAlert size={17} className="mt-0.5 flex-none text-[#a85f20]" aria-label={t('workflow.requirementMissing')} />}
                <span>
                  {t(`workflow.requirement.${requirement.code}` as TranslationKey)}
                  {typeof requirement.detail === 'number' && requirement.detail > 0 ? ` (${requirement.detail})` : ''}
                </span>
              </li>
            ))}
          </ul>
          <p className={`mt-4 border-l-4 px-3 py-2 text-[13px] font-semibold ${workflow.readiness.ready ? 'border-[#58723d] bg-[#f0f8ea] text-[#3d5c26]' : 'border-[#ca7428] bg-[#fff7ef] text-[#7b4b1f]'}`} role="status">
            {t(workflow.readiness.ready ? 'workflow.readyToAdvance' : 'workflow.notReadyToAdvance')}
          </p>
        </div>
      </div>
    </section>
  );
}
