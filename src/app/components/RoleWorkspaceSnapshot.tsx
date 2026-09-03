import { Activity, CheckCircle2, ClipboardCheck, FileText, Handshake, MessageSquareText, Vote } from 'lucide-react';
import type { Role } from '../auth/permissions';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import type { WorkflowSummary } from './WorkflowNextActionPanel';

interface SnapshotMetric {
  label: TranslationKey;
  value: number;
  icon: typeof Activity;
}

const RESPONSIBILITY_KEYS: Record<Role, TranslationKey> = {
  municipality: 'hub.workspaceResponsibilityMunicipality',
  facilitator: 'hub.workspaceResponsibilityFacilitator',
  citizen: 'hub.workspaceResponsibilityCitizen',
  admin: 'hub.workspaceResponsibilityAdmin',
};

function metricsFor(role: Role, workflow: WorkflowSummary): SnapshotMetric[] {
  const metrics = workflow.metrics;
  if (role === 'municipality') {
    return [
      { label: 'hub.statSelectedTools', value: metrics.toolsSelected, icon: ClipboardCheck },
      { label: 'hub.statActivitiesReadyReview', value: metrics.readyForReviewActivities, icon: Activity },
      { label: 'hub.statCitizenContributions', value: metrics.contributions, icon: MessageSquareText },
      { label: 'hub.statDecisionsPending', value: metrics.decisionPendingProposals, icon: FileText },
    ];
  }
  if (role === 'facilitator') {
    return [
      { label: 'hub.statDraftActivities', value: metrics.draftActivities + metrics.needsRevisionActivities, icon: Activity },
      { label: 'hub.statActivitiesReadyReview', value: metrics.readyForReviewActivities, icon: ClipboardCheck },
      { label: 'hub.statParticipationClosed', value: metrics.participationClosedProposals, icon: Vote },
      { label: 'hub.statCompletedActivities', value: metrics.completedActivities, icon: CheckCircle2 },
    ];
  }
  if (role === 'citizen') {
    return [
      { label: 'hub.statOpenActivities', value: metrics.openActivities, icon: Activity },
      { label: 'hub.statVotingOpen', value: metrics.votingOpenProposals, icon: Vote },
      { label: 'hub.statMyContributions', value: metrics.myContributions, icon: MessageSquareText },
      { label: 'hub.statResultsPublished', value: metrics.finalDecisions, icon: CheckCircle2 },
    ];
  }
  return [
    { label: 'hub.statActivities', value: metrics.activitiesTotal, icon: Activity },
    { label: 'hub.statProposals', value: metrics.proposals, icon: FileText },
    { label: 'hub.statResultsPublished', value: metrics.outputs, icon: CheckCircle2 },
    { label: 'hub.statPendingHandovers', value: workflow.pendingHandoffs.length, icon: Handshake },
  ];
}

export default function RoleWorkspaceSnapshot({ role, workflow }: { role: Role; workflow: WorkflowSummary }) {
  const { t } = useI18n();
  const metrics = metricsFor(role, workflow);

  return (
    <section className="spice-card p-6 md:p-8" aria-labelledby="workspace-snapshot-title">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#a85f20]">{t('hub.currentWorkspace')}</p>
          <h2 id="workspace-snapshot-title" className="mt-1 text-[22px] font-bold text-[#444]">{t('hub.workspaceSnapshot')}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#666]">{t(RESPONSIBILITY_KEYS[role])}</p>
          <div className="mt-4 flex items-start gap-2 border-l-4 border-[#ca7428] bg-[#fff7ef] px-4 py-3 text-[13px] leading-relaxed text-[#65411f]">
            <Handshake size={17} className="mt-0.5 flex-none" aria-hidden="true" />
            <span>{t('hub.roleHandoverExplanation')}</span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="min-w-0 border-2 border-[#e2e2e2] bg-white p-4">
                <Icon size={19} className="text-[#ca7428]" aria-hidden="true" />
                <dd className="mt-3 text-[24px] font-bold leading-none text-[#444]">{metric.value}</dd>
                <dt className="mt-2 text-[12px] font-semibold leading-snug text-[#666]">{t(metric.label)}</dt>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
