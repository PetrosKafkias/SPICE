import { normalizeRole } from './permissions.mjs';

export const ACTIVITY_WORKFLOW_STATUSES = Object.freeze([
  'draft', 'ready_for_review', 'needs_revision', 'published', 'scheduled',
  'open', 'closed', 'completed', 'cancelled',
]);

export const PROPOSAL_WORKFLOW_STATUSES = Object.freeze([
  'draft', 'municipality_review', 'needs_revision', 'published', 'discussion_open',
  'voting_open', 'participation_closed', 'decision_pending', 'approved', 'declined', 'archived',
]);

const ACTIVITY_TRANSITIONS = Object.freeze({
  facilitator: {
    draft: ['ready_for_review', 'cancelled'],
    needs_revision: ['draft', 'ready_for_review', 'cancelled'],
    published: ['scheduled'],
    scheduled: ['open'],
    open: ['closed'],
    closed: ['completed'],
  },
  municipality: {
    draft: ['ready_for_review', 'cancelled'],
    ready_for_review: ['needs_revision', 'published', 'scheduled', 'open', 'cancelled'],
    needs_revision: ['draft', 'cancelled'],
    published: ['scheduled', 'open', 'cancelled'],
    scheduled: ['open', 'cancelled'],
    open: ['closed', 'cancelled'],
    closed: ['completed', 'open'],
    completed: [],
  },
});

const PROPOSAL_TRANSITIONS = Object.freeze({
  facilitator: {
    draft: ['municipality_review', 'archived'],
    needs_revision: ['draft', 'municipality_review', 'archived'],
    voting_open: ['participation_closed'],
    participation_closed: ['decision_pending'],
  },
  municipality: {
    draft: ['municipality_review', 'archived'],
    municipality_review: ['needs_revision', 'published', 'archived'],
    needs_revision: ['draft', 'archived'],
    published: ['discussion_open', 'archived'],
    discussion_open: ['voting_open', 'participation_closed', 'archived'],
    voting_open: ['participation_closed'],
    participation_closed: ['decision_pending', 'needs_revision'],
    decision_pending: ['needs_revision'],
  },
});

export function activityTransitionsFor(roleValue, currentStatus) {
  const role = normalizeRole(roleValue);
  if (role === 'admin') return ACTIVITY_WORKFLOW_STATUSES.filter((status) => status !== currentStatus);
  return ACTIVITY_TRANSITIONS[role]?.[currentStatus] || [];
}

export function proposalTransitionsFor(roleValue, currentStatus) {
  const role = normalizeRole(roleValue);
  if (role === 'admin') return PROPOSAL_WORKFLOW_STATUSES.filter((status) => status !== currentStatus);
  return PROPOSAL_TRANSITIONS[role]?.[currentStatus] || [];
}

export function publicActivityStatus(workflowStatus) {
  if (workflowStatus === 'open') return 'open';
  if (workflowStatus === 'closed' || workflowStatus === 'cancelled') return 'closed';
  if (workflowStatus === 'completed') return 'completed';
  return 'scheduled';
}

function count(db, sql, ...params) {
  return Number(db.prepare(sql).get(...params)?.count || 0);
}

function requirement(code, met, detail = null) {
  return { code, met: Boolean(met), detail };
}

export function phaseReadiness(db, initiative, phaseNumber = Number(initiative.current_phase_number || 1)) {
  const phase = db.prepare('SELECT * FROM hub_phases WHERE initiative_id = ? AND phase_number = ?')
    .get(initiative.id, phaseNumber);
  if (!phase) return { ready: false, phaseNumber, requirements: [requirement('phase_missing', false)] };

  const selectedTools = JSON.parse(phase.enabled_tools_json || '[]');
  const setupTools = JSON.parse(initiative.setup_selected_tools_json || '[]');
  const activityCounts = Object.fromEntries(db.prepare(`
    SELECT workflow_status, COUNT(*) AS count
    FROM hub_activities WHERE initiative_id = ? AND phase_id = ?
    GROUP BY workflow_status
  `).all(initiative.id, phase.id).map((row) => [row.workflow_status, Number(row.count)]));
  const activitiesTotal = Object.values(activityCounts).reduce((total, value) => total + value, 0);
  const completedActivities = Number(activityCounts.completed || 0);
  const contributions = count(db, 'SELECT COUNT(*) AS count FROM hub_contributions WHERE initiative_id = ? AND phase_id = ? AND status != ?', initiative.id, phase.id, 'hidden');
  const proposals = count(db, 'SELECT COUNT(*) AS count FROM forum_proposals WHERE initiative_id = ? AND phase_number = ? AND COALESCE(moderation_status, ?) != ?', initiative.id, phaseNumber, 'visible', 'hidden');
  const finalDecisions = count(db, `SELECT COUNT(*) AS count FROM forum_proposals WHERE initiative_id = ? AND phase_number = ? AND workflow_status IN ('approved','declined')`, initiative.id, phaseNumber);
  const outputs = count(db, `SELECT COUNT(*) AS count FROM repository_documents WHERE initiative_id = ? AND phase = ? AND publication_status = 'published'`, initiative.id, phaseNumber);
  const facilitatorAssigned = count(db, `SELECT COUNT(*) AS count FROM hub_participants WHERE initiative_id = ? AND assignment_role = 'facilitator'`, initiative.id) > 0;
  const toolsSelected = new Set([...selectedTools, ...setupTools]).size;

  let requirements;
  if (phaseNumber === 1) {
    requirements = [
      requirement('setup_complete', initiative.setup_completed_at),
      requirement('tools_selected', toolsSelected > 0, toolsSelected),
      requirement('facilitator_assigned', facilitatorAssigned),
      requirement('activity_completed', completedActivities > 0, completedActivities),
    ];
  } else if (phaseNumber === 2) {
    requirements = [
      requirement('tools_selected', toolsSelected > 0, toolsSelected),
      requirement('activity_completed', completedActivities > 0, completedActivities),
      requirement('contributions_documented', contributions > 0, contributions),
    ];
  } else if (phaseNumber === 3) {
    requirements = [
      requirement('activity_completed', completedActivities > 0, completedActivities),
      requirement('proposal_prepared', proposals > 0, proposals),
    ];
  } else if (phaseNumber === 4) {
    requirements = [
      requirement('participation_completed', completedActivities > 0, completedActivities),
      requirement('official_decision_published', finalDecisions > 0, finalDecisions),
    ];
  } else {
    requirements = [
      requirement('published_results', outputs > 0 && Boolean(phase.results_visible), outputs),
      requirement('completion_summary', String(phase.completion_summary || '').trim().length >= 20),
    ];
  }

  if (phaseNumber < 5) {
    requirements.push(requirement('published_results', outputs > 0 && Boolean(phase.results_visible), outputs));
  }

  return {
    phaseNumber,
    ready: requirements.every((item) => item.met),
    requirements,
    metrics: { toolsSelected, activitiesTotal, completedActivities, contributions, proposals, finalDecisions, outputs },
  };
}

function nextActionFor(role, initiative, readiness, metrics) {
  const routeBase = `/hub/${initiative.id}`;
  if (role === 'municipality') {
    if (!initiative.setup_completed_at) return { code: 'complete_setup', actorRole: 'municipality', path: '/setup-questionnaire' };
    if (!metrics.toolsSelected) return { code: 'select_tools', actorRole: 'municipality', path: '/setup-tools' };
    if (!metrics.facilitatorAssigned) return { code: 'assign_facilitator', actorRole: 'municipality', path: '/co-creation-hub' };
    if (metrics.decisionPendingProposals > 0) return { code: 'issue_decision', actorRole: 'municipality', path: `/forum-voting?initiative=${initiative.id}` };
    if (metrics.readyForReviewActivities > 0) return { code: 'review_activity', actorRole: 'municipality', path: `${routeBase}/phase/${readiness.phaseNumber}` };
    if (metrics.municipalityReviewProposals > 0) return { code: 'review_proposal', actorRole: 'municipality', path: `/forum-voting?initiative=${initiative.id}` };
    if (readiness.ready && readiness.phaseNumber < 5) return { code: 'advance_phase', actorRole: 'municipality', path: '/co-creation-hub' };
    if (metrics.openActivities > 0) return { code: 'monitor_participation', actorRole: 'municipality', path: `${routeBase}/phase/${readiness.phaseNumber}` };
    return { code: 'configure_activity', actorRole: 'municipality', path: `${routeBase}/phase/${readiness.phaseNumber}` };
  }
  if (role === 'facilitator') {
    if (!metrics.facilitatorAssigned) return { code: 'wait_assignment', actorRole: 'municipality', path: '/co-creation-hub' };
    if (metrics.needsRevisionActivities > 0) return { code: 'revise_activity', actorRole: 'facilitator', path: `${routeBase}/phase/${readiness.phaseNumber}` };
    if (metrics.needsRevisionProposals > 0) return { code: 'revise_proposal', actorRole: 'facilitator', path: `/forum-voting?initiative=${initiative.id}` };
    if (metrics.participationClosedProposals > 0) return { code: 'prepare_summary', actorRole: 'facilitator', path: `/forum-voting?initiative=${initiative.id}` };
    if (metrics.readyForReviewActivities > 0) return { code: 'wait_activity_review', actorRole: 'municipality', path: `${routeBase}/phase/${readiness.phaseNumber}` };
    if (metrics.openActivities > 0) return { code: 'support_participation', actorRole: 'facilitator', path: `${routeBase}/phase/${readiness.phaseNumber}` };
    if (metrics.closedActivities > 0) return { code: 'document_results', actorRole: 'facilitator', path: '/repository' };
    return { code: 'prepare_activity', actorRole: 'facilitator', path: `${routeBase}/phase/${readiness.phaseNumber}` };
  }
  if (role === 'citizen') {
    if (metrics.votingOpenProposals > 0) return { code: 'vote_now', actorRole: 'citizen', path: `/forum-voting?initiative=${initiative.id}` };
    if (metrics.openActivities > 0) return { code: 'participate_now', actorRole: 'citizen', path: `/co-creation-hub?phase=${readiness.phaseNumber}` };
    if (metrics.finalDecisions > 0) return { code: 'review_decision', actorRole: 'citizen', path: `/forum-voting?initiative=${initiative.id}` };
    return { code: 'follow_updates', actorRole: 'municipality', path: '/account/notifications' };
  }
  return { code: 'review_platform', actorRole: 'admin', path: '/admin' };
}

export function workflowSummary(db, initiative, user) {
  const phaseNumber = Number(initiative.current_phase_number || 1);
  const readiness = phaseReadiness(db, initiative, phaseNumber);
  const role = user ? normalizeRole(user.role) : 'citizen';
  const phase = db.prepare('SELECT id FROM hub_phases WHERE initiative_id = ? AND phase_number = ?').get(initiative.id, phaseNumber);
  const phaseId = Number(phase?.id || 0);
  const workflowCounts = Object.fromEntries(db.prepare(`
    SELECT workflow_status, COUNT(*) AS count FROM hub_activities
    WHERE initiative_id = ? AND phase_id = ? GROUP BY workflow_status
  `).all(initiative.id, phaseId).map((row) => [row.workflow_status, Number(row.count)]));
  const proposalCounts = Object.fromEntries(db.prepare(`
    SELECT workflow_status, COUNT(*) AS count FROM forum_proposals
    WHERE initiative_id = ? AND phase_number = ? GROUP BY workflow_status
  `).all(initiative.id, phaseNumber).map((row) => [row.workflow_status, Number(row.count)]));
  const userId = Number(user?.id || 0);
  const metrics = {
    ...readiness.metrics,
    facilitatorAssigned: count(db, `SELECT COUNT(*) AS count FROM hub_participants WHERE initiative_id = ? AND assignment_role = 'facilitator'`, initiative.id) > 0,
    draftActivities: Number(workflowCounts.draft || 0),
    needsRevisionActivities: Number(workflowCounts.needs_revision || 0),
    readyForReviewActivities: Number(workflowCounts.ready_for_review || 0),
    publishedActivities: Number(workflowCounts.published || 0) + Number(workflowCounts.scheduled || 0),
    openActivities: Number(workflowCounts.open || 0),
    closedActivities: Number(workflowCounts.closed || 0),
    municipalityReviewProposals: Number(proposalCounts.municipality_review || 0),
    needsRevisionProposals: Number(proposalCounts.needs_revision || 0),
    discussionOpenProposals: Number(proposalCounts.discussion_open || 0),
    votingOpenProposals: Number(proposalCounts.voting_open || 0),
    participationClosedProposals: Number(proposalCounts.participation_closed || 0),
    decisionPendingProposals: Number(proposalCounts.decision_pending || 0),
    approvedProposals: Number(proposalCounts.approved || 0),
    declinedProposals: Number(proposalCounts.declined || 0),
    myContributions: userId ? count(db, `SELECT COUNT(*) AS count FROM hub_contributions WHERE initiative_id = ? AND user_id = ? AND status != 'hidden'`, initiative.id, userId) : 0,
    myVotes: userId ? count(db, `SELECT COUNT(*) AS count FROM forum_votes v JOIN forum_proposals p ON p.id = v.proposal_id WHERE p.initiative_id = ? AND v.user_id = ?`, initiative.id, userId) : 0,
  };
  const pendingHandoffs = db.prepare(`
    SELECT id, phase_number, item_type, item_id, from_role, to_role, status, message, created_at
    FROM workflow_handoffs WHERE initiative_id = ? AND status = 'pending'
    ORDER BY created_at DESC LIMIT 20
  `).all(initiative.id).map((row) => ({
    id: Number(row.id), phaseNumber: Number(row.phase_number), itemType: row.item_type,
    itemId: row.item_id ? Number(row.item_id) : null, fromRole: row.from_role,
    toRole: row.to_role, status: row.status, message: row.message, createdAt: row.created_at,
  }));

  return {
    currentPhaseNumber: phaseNumber,
    readiness,
    metrics,
    nextAction: nextActionFor(role, initiative, readiness, metrics),
    pendingHandoffs: role === 'admin' ? pendingHandoffs : pendingHandoffs.filter((item) => item.toRole === role || item.fromRole === role),
  };
}
