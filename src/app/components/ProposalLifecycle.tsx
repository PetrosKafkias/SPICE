import { Check, Circle, Clock3 } from 'lucide-react';
import { roleKey, type Role } from '../auth/permissions';
import { useI18n } from '../context/I18nContext';
import { statusKey } from '../lib/statusLabel';

const MILESTONES = ['draft', 'municipality_review', 'discussion_open', 'voting_open', 'decision_pending', 'approved'] as const;

const STATUS_INDEX: Record<string, number> = {
  draft: 0,
  municipality_review: 1,
  needs_revision: 1,
  published: 2,
  discussion_open: 2,
  voting_open: 3,
  participation_closed: 4,
  decision_pending: 4,
  approved: 5,
  declined: 5,
  archived: 5,
};

const NEXT_ACTOR: Record<string, Role | null> = {
  draft: 'facilitator',
  municipality_review: 'municipality',
  needs_revision: 'facilitator',
  published: 'municipality',
  discussion_open: 'citizen',
  voting_open: 'citizen',
  participation_closed: 'facilitator',
  decision_pending: 'municipality',
  approved: null,
  declined: null,
  archived: null,
};

export default function ProposalLifecycle({ status }: { status: string }) {
  const { t } = useI18n();
  const currentIndex = STATUS_INDEX[status] ?? 0;
  const nextActor = NEXT_ACTOR[status] ?? null;

  return (
    <section className="mt-5 border-y-2 border-[#eee] py-4" aria-label={t('workflow.proposalLifecycle')}>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {MILESTONES.map((milestone, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;
          const visibleStatus = index === currentIndex ? status : milestone;
          return (
            <li key={milestone} className={`flex min-w-0 items-center gap-2 border px-2.5 py-2 text-[11px] font-semibold ${current ? 'border-[#f68b2c] bg-[#fff4e9] text-[#7b4218]' : complete ? 'border-[#b8c9a9] bg-[#f3f8ef] text-[#476133]' : 'border-[#dedee1] bg-white text-[#777]'}`} aria-current={current ? 'step' : undefined}>
              {complete ? <Check size={14} className="flex-none" aria-hidden="true" /> : current ? <Clock3 size={14} className="flex-none" aria-hidden="true" /> : <Circle size={14} className="flex-none" aria-hidden="true" />}
              <span className="min-w-0 leading-tight">{t(statusKey(visibleStatus))}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#555]" role="status">
        <Clock3 size={15} className="flex-none text-[#ca7428]" aria-hidden="true" />
        {nextActor ? t('workflow.whoActsNext', { role: t(roleKey(nextActor)) }) : t('workflow.outcomePublished')}
      </p>
    </section>
  );
}
