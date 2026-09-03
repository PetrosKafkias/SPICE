import { createDatabase } from './db.mjs';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  isValidEmail,
  normalizeEmail,
  validatePassword,
  verifyPassword,
} from './security.mjs';
import { sendAccountVerificationEmail } from './email.mjs';
import { hasPermission, normalizeRole } from './permissions.mjs';
import {
  ACTIVITY_WORKFLOW_STATUSES,
  activityTransitionsFor,
  phaseReadiness,
  proposalTransitionsFor,
  publicActivityStatus,
  workflowSummary,
} from './workflow.mjs';
import { randomUUID } from 'node:crypto';

const SESSION_COOKIE = 'spice_session';
const MAX_BODY_SIZE = 1_000_000;
const REGISTRATION_ROLES = new Set(['Citizen', 'Municipality Staff', 'Facilitator']);
const LOCALES = new Set(['EN', 'EL', 'FI', 'PL', 'PT']);

function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  const pathname = value.split(/[?#]/, 1)[0];
  return ['/signin', '/register', '/verify-email'].includes(pathname) ? '/' : value;
}

function sendJson(response, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload, (_key, value) => typeof value === 'bigint' ? Number(value) : value);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  response.end(body);
}

function defaultErrorCode(status) {
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 401) return 'AUTH_REQUIRED';
  if (status === 403) return 'PERMISSION_DENIED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  return 'SERVER_ERROR';
}

function sendError(response, status, message, fieldErrors, code = defaultErrorCode(status)) {
  sendJson(response, status, { code, error: message, ...(fieldErrors ? { fieldErrors } : {}) });
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
      const separator = part.indexOf('=');
      return separator < 0
        ? [part, '']
        : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    }),
  );
}

function sessionCookie(token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

async function readJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_SIZE) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('The request body must be valid JSON.'), { status: 400 });
  }
}

function serializeUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    roles: (() => {
      try {
        const stored = JSON.parse(row.roles_json || '[]');
        return Array.isArray(stored) && stored.length ? stored : [row.role];
      } catch { return [row.role]; }
    })(),
    organisationId: row.organisation_id ? Number(row.organisation_id) : null,
    accountStatus: row.account_status || 'active',
    pilotSite: row.pilot_site,
    phone: row.phone,
    locale: row.locale,
    preferences: {
      profileVisibility: row.profile_visibility,
      usageAnalytics: Boolean(row.usage_analytics),
      personalizedRecommendations: Boolean(row.personalized_recommendations),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    avatarData: row.avatar_data || null,
  };
}

function getSessionUser(db, request) {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
  if (!token) return { token: null, tokenHash: null, user: null };

  const tokenHash = hashSessionToken(token);
  const user = db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(tokenHash, new Date().toISOString());
  if (user && user.account_status === 'suspended') {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return { token, tokenHash, user: null };
  }
  return { token, tokenHash, user: user || null };
}

function requireUser(db, request, response) {
  const session = getSessionUser(db, request);
  if (!session.user) {
    sendError(response, 401, 'Please sign in to continue.');
    return null;
  }
  return session;
}

function requirePermission(db, request, response, permission) {
  const session = requireUser(db, request, response);
  if (!session) return null;
  if (!hasPermission(session.user, permission)) {
    sendError(response, 403, 'You do not have permission to perform this action.');
    return null;
  }
  return session;
}

function validateSameOrigin(request, response) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return true;
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return true;

    const configuredOrigins = new Set(
      (process.env.SPICE_ALLOWED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
    if (configuredOrigins.has(originUrl.origin)) return true;

    // Vite forwards same-site browser requests to the API's development port.
    // Only trust that port mismatch when both ends of the request are loopback.
    const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
    const remoteAddress = request.socket.remoteAddress || '';
    const localConnection = remoteAddress === '127.0.0.1'
      || remoteAddress === '::1'
      || remoteAddress.endsWith(':127.0.0.1');
    if (localConnection && loopbackHosts.has(originUrl.hostname)) return true;
  } catch {
    // The generic response below intentionally avoids reflecting malformed input.
  }
  sendError(response, 403, 'Cross-origin requests are not allowed.');
  return false;
}

function notificationFromRow(row) {
  let payload = {};
  try { payload = JSON.parse(row.payload_json || '{}'); } catch { /* Keep the safe empty payload. */ }
  return {
    id: Number(row.id),
    type: row.type,
    title: row.title,
    body: row.body,
    tag: row.tag,
    pilot: row.pilot,
    isRead: Boolean(row.is_read),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    eventType: row.event_type || 'general',
    payload,
    actionUrl: row.action_url || null,
  };
}

function createNotification(db, {
  userId,
  actorUserId = null,
  type,
  eventType,
  title,
  body,
  tag,
  pilot,
  actionUrl,
  payload = {},
  createdAt = new Date().toISOString(),
}) {
  if (!userId || Number(userId) === Number(actorUserId)) return null;
  return db.prepare(`
    INSERT INTO notifications (
      user_id, actor_user_id, type, event_type, title, body, tag, pilot,
      action_url, payload_json, is_read, archived, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `).run(userId, actorUserId, type, eventType, title, body, tag, pilot, actionUrl, JSON.stringify(payload), createdAt);
}

function createWorkflowHandoff(db, {
  initiativeId,
  phaseNumber,
  itemType,
  itemId = null,
  fromRole,
  toRole,
  message,
  actorUserId = null,
  createdAt = new Date().toISOString(),
}) {
  db.prepare(`
    UPDATE workflow_handoffs SET status = 'completed', completed_at = ?
    WHERE initiative_id = ? AND item_type = ? AND item_id IS ? AND status = 'pending'
  `).run(createdAt, initiativeId, itemType, itemId);
  return db.prepare(`
    INSERT INTO workflow_handoffs (
      initiative_id, phase_number, item_type, item_id, from_role, to_role,
      status, message, created_by_user_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(initiativeId, phaseNumber, itemType, itemId, fromRole, toRole, message, actorUserId, createdAt);
}

function notifyInitiativeRole(db, {
  initiativeId,
  role,
  actorUserId,
  eventType,
  title,
  body,
  actionUrl,
  payload = {},
  createdAt = new Date().toISOString(),
}) {
  const initiative = db.prepare(`
    SELECT h.id, h.pilot_slug, h.organisation_id, o.municipality
    FROM hub_initiatives h LEFT JOIN organisations o ON o.id = h.organisation_id
    WHERE h.id = ?
  `).get(initiativeId);
  if (!initiative) return 0;
  let users = [];
  if (role === 'facilitator') {
    users = db.prepare(`
      SELECT u.id FROM hub_participants hp JOIN users u ON u.id = hp.user_id
      WHERE hp.initiative_id = ? AND hp.assignment_role = 'facilitator' AND u.account_status = 'active'
    `).all(initiativeId);
  } else if (role === 'municipality') {
    users = db.prepare(`SELECT id FROM users WHERE organisation_id = ? AND role IN ('Municipality Staff','Municipality') AND account_status = 'active'`)
      .all(initiative.organisation_id);
  } else if (role === 'citizen') {
    users = db.prepare(`
      SELECT DISTINCT u.id FROM users u
      LEFT JOIN hub_participants hp ON hp.user_id = u.id AND hp.initiative_id = ?
      WHERE u.account_status = 'active' AND u.role = 'Citizen'
        AND (hp.initiative_id IS NOT NULL OR lower(u.pilot_site) = lower(?) OR lower(u.pilot_site) = lower(?))
    `).all(initiativeId, initiative.pilot_slug || '', initiative.municipality || '');
  } else if (role === 'admin') {
    users = db.prepare(`SELECT id FROM users WHERE role = 'Admin' AND account_status = 'active'`).all();
  }
  let created = 0;
  for (const target of users) {
    if (createNotification(db, {
      userId: target.id, actorUserId, type: 'workflow', eventType, title, body,
      tag: 'Workflow', pilot: initiative.municipality || initiative.pilot_slug,
      actionUrl, payload, createdAt,
    })) created += 1;
  }
  return created;
}

function proposalFromRow(row) {
  const upvotes = Number(row.upvotes);
  const downvotes = Number(row.downvotes);
  const totalVotes = upvotes + downvotes;
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    tags: JSON.parse(row.tags_json || '[]'),
    status: row.status,
    workflowStatus: row.workflow_status || 'published',
    participationSummary: row.participation_summary || null,
    votingClosesAt: row.voting_closes_at || null,
    decisionAt: row.decision_at || null,
    upvotes,
    downvotes,
    totalVotes,
    supportPct: Math.round((upvotes / Math.max(totalVotes, 1)) * 100),
    officialResponse: row.official_response,
    authorId: row.user_id ? Number(row.user_id) : null,
    initiativeId: row.initiative_id ? Number(row.initiative_id) : null,
    phaseNumber: Number(row.phase_number || 1),
    itemType: row.item_type || 'proposal',
    category: row.category || null,
    workflowStepId: row.workflow_step_id || null,
    votingMode: row.voting_mode || 'support',
    votingOpensAt: row.voting_opens_at || null,
    linkedOutput: row.linked_output_label || row.linked_output_url ? {
      type: row.linked_output_type || 'resource',
      id: row.linked_output_id || null,
      label: row.linked_output_label || row.linked_output_url,
      url: row.linked_output_url || null,
    } : null,
    sourceProposalId: row.source_proposal_id ? Number(row.source_proposal_id) : null,
    organisationId: row.organisation_id ? Number(row.organisation_id) : null,
    version: Number(row.version || 1),
    comments: Number(row.comments_count || 0),
    userVote: row.user_vote || null,
    author: row.author_name,
    authorRole: row.author_role,
    authorAvatar: row.author_avatar || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    moderationStatus: row.moderation_status || 'visible',
    moderationReason: row.moderation_reason || null,
  };
}

function proposalHistory(db, proposalId) {
  return db.prepare(`
    SELECT e.id, e.phase_number, e.event_type, e.from_status, e.to_status,
           e.note, e.created_at, u.full_name AS actor_name, u.role AS actor_role
    FROM forum_proposal_events e
    LEFT JOIN users u ON u.id = e.actor_user_id
    WHERE e.proposal_id = ?
    ORDER BY e.created_at ASC, e.id ASC
  `).all(proposalId).map((row) => ({
    id: Number(row.id), phaseNumber: Number(row.phase_number), eventType: row.event_type,
    fromStatus: row.from_status || null, toStatus: row.to_status || null,
    note: row.note || null, createdAt: row.created_at,
    actorName: row.actor_name || null, actorRole: row.actor_role || null,
  }));
}

function addProposalEvent(db, {
  proposalId, phaseNumber, actorUserId = null, eventType,
  fromStatus = null, toStatus = null, note = null, createdAt = new Date().toISOString(),
}) {
  db.prepare(`
    INSERT INTO forum_proposal_events (
      proposal_id, phase_number, actor_user_id, event_type,
      from_status, to_status, note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    proposalId, phaseNumber, actorUserId, eventType,
    fromStatus, toStatus, note, createdAt,
  );
}

function listProposals(db, viewer = null, filters = {}) {
  const viewerId = Number(viewer?.id || 0);
  const role = viewer ? normalizeRole(viewer.role) : 'citizen';
  const visibility = role === 'admin'
    ? { sql: '1 = 1', params: [] }
    : role === 'municipality'
      ? { sql: '(p.organisation_id = ? OR p.user_id = ?)', params: [Number(viewer.organisation_id || 0), viewerId] }
      : role === 'facilitator'
        ? { sql: `(p.user_id = ? OR p.initiative_id IN (SELECT initiative_id FROM hub_participants WHERE user_id = ? AND assignment_role = 'facilitator') OR p.workflow_status IN ('published','discussion_open','voting_open','participation_closed','decision_pending','approved','declined'))`, params: [viewerId, viewerId] }
        : { sql: `p.workflow_status IN ('published','discussion_open','voting_open','participation_closed','decision_pending','approved','declined')`, params: [] };
  const clauses = [`COALESCE(p.moderation_status, 'visible') != 'hidden'`, visibility.sql];
  const params = [...visibility.params];
  if (filters.initiativeId) { clauses.push('p.initiative_id = ?'); params.push(Number(filters.initiativeId)); }
  if (filters.phaseScope === 'current' && filters.currentPhaseNumber) { clauses.push('p.phase_number = ?'); params.push(Number(filters.currentPhaseNumber)); }
  if (filters.phaseScope === 'previous' && filters.currentPhaseNumber) { clauses.push('p.phase_number < ?'); params.push(Number(filters.currentPhaseNumber)); }
  if (filters.phaseNumber) { clauses.push('p.phase_number = ?'); params.push(Number(filters.phaseNumber)); }
  if (filters.itemType) { clauses.push('p.item_type = ?'); params.push(filters.itemType); }
  if (filters.category) { clauses.push('p.category = ?'); params.push(filters.category); }
  if (filters.status) { clauses.push('p.workflow_status = ?'); params.push(filters.status); }
  if (filters.votingState === 'open') clauses.push("p.workflow_status = 'voting_open'");
  if (filters.votingState === 'closed') clauses.push("p.workflow_status IN ('participation_closed','decision_pending','approved','declined','archived')");
  return db.prepare(`
    SELECT
      p.*,
      u.full_name AS author_name,
      u.role AS author_role,
      u.avatar_data AS author_avatar,
      (SELECT COUNT(*) FROM forum_comments c WHERE c.proposal_id = p.id) AS comments_count,
      v.direction AS user_vote
    FROM forum_proposals p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN forum_votes v ON v.proposal_id = p.id AND v.user_id = ?
    WHERE ${clauses.join(' AND ')}
    ORDER BY p.phase_number DESC, p.updated_at DESC
  `).all(viewerId, ...params).map((row) => ({ ...proposalFromRow(row), history: proposalHistory(db, row.id) }));
}

function scenarioFromRow(row) {
  return {
    id: Number(row.id),
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    color: row.color,
    background: row.background,
    borderColor: row.border_color,
    tags: JSON.parse(row.tags_json || '[]'),
    strengths: JSON.parse(row.strengths_json || '[]'),
    concerns: JSON.parse(row.concerns_json || '[]'),
    upvotes: Number(row.upvotes),
    downvotes: Number(row.downvotes),
    rating: Number(row.rating),
    ratingCount: Number(row.rating_count),
    contributors: Number(row.contributors),
    phase: Number(row.phase),
    status: row.status,
    guidance: row.guidance,
    publicationStatus: row.publication_status,
    pilotContext: row.pilot_context,
    toolsUsed: JSON.parse(row.tools_used_json || '[]'),
    stakeholders: row.stakeholders,
    activities: row.activities,
    outputsResults: row.outputs_results,
    lessonsLearned: row.lessons_learned,
    recommendations: row.recommendations,
    userVote: row.user_vote || null,
    adopted: Boolean(row.adopted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listScenarios(db, userId, { includeDrafts = false } = {}) {
  return db.prepare(`
    SELECT
      s.*,
      v.direction AS user_vote,
      CASE WHEN a.scenario_id IS NULL THEN 0 ELSE 1 END AS adopted
    FROM scenarios s
    LEFT JOIN scenario_votes v ON v.scenario_id = s.id AND v.user_id = ?
    LEFT JOIN scenario_adoptions a ON a.scenario_id = s.id AND a.user_id = ?
    ${includeDrafts ? '' : "WHERE s.publication_status = 'published'"}
    ORDER BY s.upvotes DESC, s.created_at DESC
  `).all(userId, userId).map(scenarioFromRow);
}

function makeSlug(value) {
  const base = String(value || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '-')
    .slice(0, 56) || 'scenario';
  return `${base}-${Date.now().toString(36)}`;
}

function parseJson(value, fallback) {
  try { return JSON.parse(value ?? ''); } catch { return fallback; }
}

function repositoryFromRow(row) {
  return {
    id: Number(row.id), title: row.title, description: row.description, phase: Number(row.phase),
    documentType: row.document_type, pilot: row.pilot, fileFormat: row.file_format,
    tags: JSON.parse(row.tags_json || '[]'), updatedAt: row.updated_at,
    publicationStatus: row.publication_status || 'published',
    accessLevel: row.access_level || 'public',
    initiativeId: row.initiative_id ? Number(row.initiative_id) : null,
    uploadedByUserId: row.uploaded_by_user_id ? Number(row.uploaded_by_user_id) : null,
    toolKey: row.tool_key || null,
    phaseId: row.phase_id ? Number(row.phase_id) : null,
    activityId: row.activity_id ? Number(row.activity_id) : null,
    resultType: row.result_type || null,
    authorRole: row.author_role || null,
    publishedAt: row.published_at || null,
    publishedByUserId: row.published_by_user_id ? Number(row.published_by_user_id) : null,
    publishedByName: row.published_by_name || null,
    uploadedByName: row.uploaded_by_name || null,
    relatedActivityTitle: row.related_activity_title || null,
    relatedProposalId: row.related_proposal_id ? Number(row.related_proposal_id) : null,
    version: Number(row.version || 1),
    createdAt: row.created_at || row.updated_at,
  };
}

function assignedFacilitatorFor(db, initiativeId) {
  const row = db.prepare(`
    SELECT u.id, u.full_name, u.email FROM hub_participants p
    JOIN users u ON u.id = p.user_id
    WHERE p.initiative_id = ? AND p.assignment_role = 'facilitator'
    LIMIT 1
  `).get(initiativeId);
  return row ? { id: Number(row.id), fullName: row.full_name, email: row.email } : null;
}

function isAssignedFacilitator(db, user, initiativeId) {
  if (!user || normalizeRole(user.role) !== 'facilitator') return false;
  return Boolean(db.prepare(`
    SELECT 1 FROM hub_participants
    WHERE initiative_id = ? AND user_id = ? AND assignment_role = 'facilitator'
  `).get(initiativeId, user.id));
}

function canOperateInitiative(db, user, initiative) {
  return initiativeIsInScope(user, initiative) || isAssignedFacilitator(db, user, initiative.id);
}

function initiativeFromRow(row, phases = [], facilitator = null) {
  return {
    id: Number(row.id), organisationId: Number(row.organisation_id), pilotSlug: row.pilot_slug,
    title: row.title, description: row.description, objectives: row.objectives, location: row.location,
    status: row.status, visibility: row.visibility, participationRules: row.participation_rules,
    enabledTools: parseJson(row.enabled_tools_json, []), startDate: row.start_date, endDate: row.end_date,
    publishedAt: row.published_at, updatedAt: row.updated_at, version: Number(row.version), phases,
    setupStage: row.setup_stage, setupObjectives: parseJson(row.setup_objectives_json, []),
    setupParticipationLevel: row.setup_participation_level, setupGoal: row.setup_goal,
    setupCompletedAt: row.setup_completed_at,
    setupSelectedTools: parseJson(row.setup_selected_tools_json, []),
    setupGroupSize: row.setup_group_size, setupDuration: row.setup_duration,
    setupFacilitator: row.setup_facilitator, setupMode: row.setup_mode,
    lifecycleStatus: row.lifecycle_status || (['active','published','paused'].includes(row.status) ? 'active' : row.status === 'completed' ? 'completed' : 'setup_required'),
    activatedAt: row.activated_at || null,
    setupUpdatedAt: row.setup_updated_at || null,
    currentPhaseNumber: row.current_phase_number == null ? null : Number(row.current_phase_number),
    pilotFinalizedAt: row.pilot_finalized_at,
    facilitator,
  };
}

function phaseFromRow(row) {
  return {
    id: Number(row.id), phaseNumber: Number(row.phase_number), title: row.title,
    description: row.description, status: row.status, enabledTools: parseJson(row.enabled_tools_json, []),
    instructions: row.instructions, resultsVisible: Boolean(row.results_visible),
    eventTypes: parseJson(row.event_types_json, []),
    expectedOutputs: parseJson(row.expected_outputs_json, []),
    completionSummary: row.completion_summary || null,
    completionRequirements: parseJson(row.completion_requirements_json, []),
    completedAt: row.completed_at || null,
    startDate: row.start_date, endDate: row.end_date,
    activities: row.activities || [],
    results: row.results || [],
    myContributions: row.myContributions || [],
  };
}

function activityFromRow(row) {
  return {
    id: Number(row.id), initiativeId: Number(row.initiative_id), phaseId: Number(row.phase_id),
    title: row.title, description: row.description, status: row.status,
    workflowStatus: row.workflow_status || row.status, toolKey: row.tool_key || null,
    activityType: row.activity_type || 'participation',
    selectedToolIds: parseJson(row.selected_tool_ids_json, row.tool_key ? [row.tool_key] : []),
    instructions: row.instructions || '',
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    location: row.location || null,
    participationMode: row.participation_mode || 'offline',
    estimatedDuration: row.estimated_duration || null,
    requiredMaterials: row.required_materials || null,
    eligibility: row.eligibility || null,
    submissionType: row.submission_type || null,
    submissionDeadline: row.submission_deadline || null,
    visibility: row.visibility || 'public',
    allowAnonymousParticipation: Boolean(row.allow_anonymous_participation),
    allowEditing: Boolean(row.allow_editing),
    accessibilityNotes: row.accessibility_notes || null,
    languageSupport: row.language_support || null,
    supportContact: row.support_contact || null,
    publishedByUserId: row.published_by_user_id ? Number(row.published_by_user_id) : null,
    assignedToUserId: row.assigned_to_user_id ? Number(row.assigned_to_user_id) : null,
    reviewNotes: row.review_notes || null,
    contributionTypes: parseJson(row.contribution_types_json, ['text']),
    votingEnabled: Boolean(row.voting_enabled), forumEnabled: Boolean(row.forum_enabled),
    resultsVisible: Boolean(row.results_visible), createdAt: row.created_at, updatedAt: row.updated_at,
    submittedAt: row.submitted_at || null, publishedAt: row.published_at || null,
    closedAt: row.closed_at || null, completedAt: row.completed_at || null,
    cancelledAt: row.cancelled_at || null,
  };
}

function contributionFromRow(row) {
  return {
    id: Number(row.id), initiativeId: Number(row.initiative_id), phaseId: Number(row.phase_id),
    activityId: Number(row.activity_id), userId: Number(row.user_id),
    contributionType: row.contribution_type, content: row.content, status: row.status,
    municipalityResponse: row.municipality_response || null, createdAt: row.created_at,
    updatedAt: row.updated_at, version: Number(row.version || 1),
  };
}

function addAudit(db, { actor, action, targetType, targetId, previousValue = null, newValue = null, reason = null }) {
  db.prepare(`INSERT INTO audit_log (event_id, timestamp, actor_user_id, actor_role, organisation_id, action, target_type, target_id, previous_value, new_value, reason, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'api')`)
    .run(randomUUID(), new Date().toISOString(), actor?.id || null, actor?.role || 'guest', actor?.organisation_id || null, action, targetType, String(targetId), previousValue == null ? null : JSON.stringify(previousValue), newValue == null ? null : JSON.stringify(newValue), reason);
}

function initiativeIsInScope(user, initiative) {
  const role = normalizeRole(user.role);
  return role === 'admin' || (role === 'municipality' && Number(user.organisation_id) === Number(initiative.organisation_id));
}

function forumInitiativeAccess(db, user, initiative) {
  if (!initiative) return { canView: false, canParticipate: false, canManage: false, canFacilitate: false };
  const role = user ? normalizeRole(user.role) : 'guest';
  const publicInitiative = initiative.visibility === 'public'
    && ['published', 'active', 'paused', 'completed'].includes(initiative.status);
  const participant = Boolean(user && db.prepare('SELECT 1 FROM hub_participants WHERE initiative_id = ? AND user_id = ?').get(initiative.id, user.id));
  const samePilot = Boolean(user && (
    String(user.pilot_site || '').toLowerCase() === String(initiative.pilot_slug || '').toLowerCase()
    || String(user.pilot_site || '').toLowerCase() === String(initiative.municipality || '').toLowerCase()
  ));
  const canManage = Boolean(user && (role === 'admin'
    || (role === 'municipality' && Number(user.organisation_id || 0) === Number(initiative.organisation_id || 0))));
  const canFacilitate = Boolean(user && role === 'facilitator' && isAssignedFacilitator(db, user, initiative.id));
  return {
    canView: publicInitiative || canManage || canFacilitate || participant,
    canParticipate: Boolean(user && (canManage || canFacilitate || (role === 'citizen' && (samePilot || participant)))),
    canManage,
    canFacilitate,
  };
}

function resolveForumInitiative(db, user, { initiativeId = 0, proposalId = 0 } = {}) {
  let resolvedId = Number(initiativeId || 0);
  if (!resolvedId && proposalId) {
    resolvedId = Number(db.prepare('SELECT initiative_id FROM forum_proposals WHERE id = ?').get(proposalId)?.initiative_id || 0);
  }
  if (!resolvedId && user) {
    const role = normalizeRole(user.role);
    if (role === 'municipality') {
      resolvedId = Number(db.prepare(`SELECT id FROM hub_initiatives WHERE organisation_id = ? ORDER BY status = 'active' DESC, updated_at DESC LIMIT 1`).get(user.organisation_id)?.id || 0);
    } else if (role === 'facilitator') {
      resolvedId = Number(db.prepare(`
        SELECT h.id FROM hub_initiatives h JOIN hub_participants p ON p.initiative_id = h.id
        WHERE p.user_id = ? AND p.assignment_role = 'facilitator'
        ORDER BY h.status = 'active' DESC, h.updated_at DESC LIMIT 1
      `).get(user.id)?.id || 0);
    } else {
      resolvedId = Number(db.prepare(`
        SELECT h.id FROM hub_initiatives h LEFT JOIN organisations o ON o.id = h.organisation_id
        LEFT JOIN hub_participants p ON p.initiative_id = h.id AND p.user_id = ?
        WHERE h.visibility = 'public' AND h.status IN ('published','active','paused','completed')
          AND (p.user_id IS NOT NULL OR lower(h.pilot_slug) = lower(?) OR lower(o.municipality) = lower(?))
        ORDER BY h.status = 'active' DESC, h.updated_at DESC LIMIT 1
      `).get(user.id, user.pilot_site || '', user.pilot_site || '')?.id || 0);
    }
  }
  if (!resolvedId) {
    resolvedId = Number(db.prepare(`
      SELECT id FROM hub_initiatives
      WHERE visibility = 'public' AND status IN ('published','active','paused','completed')
      ORDER BY status = 'active' DESC, updated_at DESC LIMIT 1
    `).get()?.id || 0);
  }
  if (!resolvedId) return null;
  const row = db.prepare(`
    SELECT h.*, o.municipality, o.name AS organisation_name
    FROM hub_initiatives h LEFT JOIN organisations o ON o.id = h.organisation_id
    WHERE h.id = ?
  `).get(resolvedId);
  if (!row) return null;
  const access = forumInitiativeAccess(db, user, row);
  if (!access.canView) return null;
  const phases = db.prepare(`SELECT phase_number, title, description, status FROM hub_phases WHERE initiative_id = ? ORDER BY phase_number`).all(resolvedId)
    .map((phase) => ({ phaseNumber: Number(phase.phase_number), title: phase.title, description: phase.description, status: phase.status }));
  return {
    ...row,
    id: Number(row.id),
    organisation_id: Number(row.organisation_id),
    current_phase_number: Number(row.current_phase_number || 1),
    phases,
    access,
  };
}

function forumContextPayload(db, user, initiative) {
  const availablePilots = db.prepare(`
    SELECT h.id, h.title, h.pilot_slug, h.current_phase_number, h.visibility,
           h.status, h.organisation_id, o.municipality
    FROM hub_initiatives h LEFT JOIN organisations o ON o.id = h.organisation_id
    WHERE h.visibility = 'public' AND h.status IN ('published','active','paused','completed')
    ORDER BY o.municipality, h.title
  `).all().filter((row) => forumInitiativeAccess(db, user, row).canView).map((row) => ({
    id: Number(row.id), title: row.title, pilotSlug: row.pilot_slug,
    municipality: row.municipality, currentPhaseNumber: Number(row.current_phase_number || 1),
  }));
  return {
    initiativeId: initiative.id,
    title: initiative.title,
    pilotSlug: initiative.pilot_slug,
    municipality: initiative.municipality,
    location: initiative.location,
    currentPhaseNumber: initiative.current_phase_number,
    currentPhase: initiative.phases.find((phase) => phase.phaseNumber === initiative.current_phase_number) || null,
    phases: initiative.phases,
    access: initiative.access,
    availablePilots,
  };
}

function requireForumParticipation(db, response, user, initiativeId) {
  const initiative = resolveForumInitiative(db, user, { initiativeId });
  if (!initiative || !initiative.access.canParticipate) {
    sendError(response, 403, 'You can participate only in the Discuss and Decide space for your assigned pilot.', undefined, 'FORUM_PILOT_ACCESS_REQUIRED');
    return null;
  }
  return initiative;
}

export async function createApiHandler(options = {}) {
  const db = await createDatabase(options);
  const sendVerificationEmail = options.sendVerificationEmail || sendAccountVerificationEmail;
  const dummyPasswordHash = await hashPassword('InvalidPassword123!');
  const signInAttempts = new Map();

  const handler = async (request, response) => {
    const method = request.method || 'GET';
    const url = new URL(request.url || '/', 'http://spice.local');
    const pathname = url.pathname;

    if (!pathname.startsWith('/api/')) return false;

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !validateSameOrigin(request, response)) return true;

    try {
      if (method === 'GET' && pathname === '/api/health') {
        sendJson(response, 200, { ok: true, database: 'connected', timestamp: new Date().toISOString() });
        return true;
      }

      if (method === 'GET' && pathname === '/api/auth/session') {
        const { user } = getSessionUser(db, request);
        sendJson(response, 200, { user: serializeUser(user) });
        return true;
      }

      if (method === 'POST' && pathname === '/api/auth/register') {
        const body = await readJson(request);
        const email = normalizeEmail(body.email);
        const fullName = String(body.fullName || '').trim();
        const password = String(body.password || '');
        const confirmPassword = String(body.confirmPassword || '');
        const role = REGISTRATION_ROLES.has(body.role) ? body.role : 'Citizen';
        const pilotSite = String(body.pilotSite || 'Thessaloniki').trim();
        const locale = LOCALES.has(body.locale) ? body.locale : 'EN';
        const returnTo = safeReturnTo(body.returnTo);
        const fieldErrors = {};

        if (fullName.length < 2) fieldErrors.fullName = 'Enter your full name.';
        if (!isValidEmail(email)) fieldErrors.email = 'Enter a valid email address.';
        const passwordError = validatePassword(password);
        if (passwordError) fieldErrors.password = passwordError;
        if (!confirmPassword) fieldErrors.confirmPassword = 'Confirm your password.';
        else if (password !== confirmPassword) fieldErrors.confirmPassword = 'Passwords do not match.';
        if (!REGISTRATION_ROLES.has(body.role)) fieldErrors.role = 'Select a role.';
        if (!pilotSite) fieldErrors.pilotSite = 'Select a pilot site.';
        if (!body.acceptedTerms) fieldErrors.acceptedTerms = 'You must accept the Terms of Use and Privacy Policy.';
        if (Object.keys(fieldErrors).length > 0) {
          sendError(response, 400, 'Please correct the highlighted fields.', fieldErrors);
          return true;
        }

        if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
          sendError(response, 409, 'An account with this email already exists.', { email: 'Email is already registered.' }, 'EMAIL_EXISTS');
          return true;
        }

        const now = new Date().toISOString();
        const passwordHash = await hashPassword(password);
        const verificationToken = createSessionToken();
        const accountStatus = (role === 'Municipality Staff' || role === 'Facilitator') ? 'pending_approval' : 'active';
        db.exec('BEGIN IMMEDIATE');
        try {
        const result = db.prepare(`
          INSERT INTO users (
            full_name, email, password_hash, role, pilot_site, phone, locale, account_status, created_at, updated_at, email_verified_at
          ) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, NULL)
        `).run(fullName, email, passwordHash, role, pilotSite, locale, accountStatus, now, now);
        const userId = Number(result.lastInsertRowid);
        createNotification(db, {
          userId, type: 'system', eventType: 'notification_onboarding',
          title: 'Notifications are ready',
          body: 'You will be notified here when someone comments on your proposal, replies to you, or changes a proposal status.',
          tag: 'Getting started', pilot: pilotSite, actionUrl: '/forum-voting', createdAt: now,
        });
        db.prepare('INSERT INTO email_verification_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
          .run(hashSessionToken(verificationToken), userId, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), now);
        const delivery = await sendVerificationEmail({ email, fullName, token: verificationToken, locale, returnTo });
        db.exec('COMMIT');
        sendJson(response, 201, {
          message: accountStatus === 'pending_approval'
            ? 'Account created successfully. Please check your email to verify your account. This role also requires administrator approval before its permissions activate.'
            : 'Account created successfully. Please check your email to verify your account.',
          email,
          accountStatus,
          delivery: delivery.delivery,
          ...(delivery.previewUrl ? { verificationPreviewUrl: delivery.previewUrl } : {}),
        });
        } catch (error) {
          db.exec('ROLLBACK');
          console.error('Unable to create account verification email:', error);
          sendError(response, 502, 'We could not send the verification email. Please try again.', undefined, 'VERIFICATION_EMAIL_FAILED');
        }
        return true;
      }

      if (method === 'POST' && pathname === '/api/auth/verify-email') {
        const body = await readJson(request);
        const tokenHash = hashSessionToken(String(body.token || ''));
        const now = new Date().toISOString();
        const verification = db.prepare(`SELECT * FROM email_verification_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`).get(tokenHash, now);
        if (!verification) {
          sendError(response, 400, 'This verification link is invalid or has expired.', undefined, 'VERIFICATION_LINK_INVALID');
          return true;
        }
        db.exec('BEGIN IMMEDIATE');
        try {
          db.prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?').run(now, now, verification.user_id);
          db.prepare('UPDATE email_verification_tokens SET used_at = ? WHERE token_hash = ?').run(now, tokenHash);
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        sendJson(response, 200, { message: 'Email verified successfully. You can now sign in.' });
        return true;
      }

      if (method === 'POST' && pathname === '/api/auth/signin') {
        const body = await readJson(request);
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');
        const attemptKey = `${request.socket.remoteAddress || 'local'}:${email}`;
        const attempt = signInAttempts.get(attemptKey);
        if (attempt && attempt.count >= 10 && attempt.resetAt > Date.now()) {
          sendError(response, 429, 'Too many sign-in attempts. Please try again later.', undefined, 'AUTH_RATE_LIMITED');
          return true;
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        const passwordMatches = await verifyPassword(password, user?.password_hash || dummyPasswordHash);
        if (!user || !passwordMatches) {
          const next = attempt && attempt.resetAt > Date.now()
            ? { count: attempt.count + 1, resetAt: attempt.resetAt }
            : { count: 1, resetAt: Date.now() + 15 * 60 * 1000 };
          signInAttempts.set(attemptKey, next);
          sendError(response, 401, 'The email or password is incorrect.', undefined, 'AUTH_INVALID_CREDENTIALS');
          return true;
        }
        if (user.account_status === 'suspended') {
          sendError(response, 403, 'This account is suspended. Contact a platform administrator.', undefined, 'AUTH_SUSPENDED');
          return true;
        }

        if (!user.email_verified_at) {
          sendError(response, 403, 'Please verify your email address before signing in.', undefined, 'AUTH_EMAIL_UNVERIFIED');
          return true;
        }

        signInAttempts.delete(attemptKey);
        const token = createSessionToken();
        const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
        const now = new Date().toISOString();
        db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
        db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
          .run(hashSessionToken(token), user.id, new Date(Date.now() + maxAge * 1000).toISOString(), now);
        sendJson(response, 200, { user: serializeUser(user) }, { 'Set-Cookie': sessionCookie(token, maxAge) });
        return true;
      }

      if (method === 'POST' && pathname === '/api/auth/demo-login') {
        const enabled = process.env.NODE_ENV !== 'production' && process.env.VITE_ENABLE_DEMO_LOGIN !== 'false';
        if (!enabled) { sendError(response, 404, 'Development access is not enabled.'); return true; }
        const body = await readJson(request);
        const emails = {
          citizen: 'citizen.demo@spice.local',
          facilitator: 'facilitator.demo@spice.local',
          municipality: 'municipality.demo@spice.local',
          admin: 'admin.demo@spice.local',
        };
        const email = emails[body.role];
        if (!email) { sendError(response, 400, 'Choose a valid development role.'); return true; }
        const user = db.prepare('SELECT * FROM users WHERE email = ? AND account_status = ?').get(email, 'active');
        if (!user) { sendError(response, 503, 'The development profile is unavailable. Run the database seed.'); return true; }
        const token = createSessionToken();
        const maxAge = 24 * 60 * 60;
        const now = new Date().toISOString();
        db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
          .run(hashSessionToken(token), user.id, new Date(Date.now() + maxAge * 1000).toISOString(), now);
        sendJson(response, 200, { user: serializeUser(user), development: true }, { 'Set-Cookie': sessionCookie(token, maxAge) });
        return true;
      }

      if (method === 'POST' && pathname === '/api/auth/signout') {
        const { tokenHash } = getSessionUser(db, request);
        if (tokenHash) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
        sendJson(response, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
        return true;
      }

      if (method === 'GET' && pathname === '/api/pilots') {
        const pilots = db.prepare('SELECT * FROM pilots ORDER BY id').all().map((row) => ({
          id: Number(row.id), slug: row.slug, city: row.city, country: row.country,
          countryCode: row.country_code, title: row.title, description: row.description,
          focus: row.focus, status: row.status,
        }));
        sendJson(response, 200, { pilots });
        return true;
      }

      if (method === 'GET' && pathname === '/api/hub/initiatives') {
        const { user } = getSessionUser(db, request);
        const role = user ? normalizeRole(user.role) : 'guest';
        let rows;
        if (role === 'admin') rows = db.prepare('SELECT * FROM hub_initiatives ORDER BY updated_at DESC').all();
        else if (role === 'municipality') rows = db.prepare('SELECT * FROM hub_initiatives WHERE organisation_id = ? ORDER BY updated_at DESC').all(user.organisation_id);
        else if (user) rows = db.prepare(`
          SELECT DISTINCT h.* FROM hub_initiatives h
          LEFT JOIN hub_participants p ON p.initiative_id = h.id AND p.user_id = ?
          WHERE h.status IN ('published','active','paused','completed')
            AND h.lifecycle_status IN ('active','completed')
            AND (h.visibility = 'public' OR p.user_id IS NOT NULL)
          ORDER BY h.updated_at DESC
        `).all(user.id);
        else rows = db.prepare(`SELECT * FROM hub_initiatives WHERE visibility = 'public' AND status IN ('published','active','completed') AND lifecycle_status IN ('active','completed') ORDER BY updated_at DESC`).all();
        sendJson(response, 200, { initiatives: rows.map((row) => initiativeFromRow(row)) });
        return true;
      }

      if (method === 'POST' && pathname === '/api/hub/initiatives') {
        const session = requirePermission(db, request, response, 'hub:create');
        if (!session) return true;
        const body = await readJson(request);
        const title = String(body.title || '').trim();
        const description = String(body.description || '').trim();
        if (title.length < 5 || description.length < 20) {
          sendError(response, 400, 'Please complete the pilot site details.', {
            ...(title.length < 5 ? { title: 'Use at least 5 characters.' } : {}),
            ...(description.length < 20 ? { description: 'Use at least 20 characters.' } : {}),
          });
          return true;
        }
        const organisationId = normalizeRole(session.user.role) === 'admin'
          ? Number(body.organisationId || session.user.organisation_id)
          : Number(session.user.organisation_id);
        if (!organisationId) { sendError(response, 403, 'Your account is not assigned to a municipality.'); return true; }
        if (db.prepare('SELECT id FROM hub_initiatives WHERE organisation_id = ?').get(organisationId)) {
          sendError(response, 409, 'Your municipality already has a pilot site.');
          return true;
        }
        const now = new Date().toISOString();
        const result = db.prepare(`INSERT INTO hub_initiatives (organisation_id, pilot_slug, owner_user_id, title, description, objectives, location, status, visibility, participation_rules, enabled_tools_json, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`)
          .run(organisationId, String(body.pilotSlug || 'thessaloniki'), session.user.id, title, description, String(body.objectives || ''), String(body.location || ''), ['public','private','invitation_only'].includes(body.visibility) ? body.visibility : 'public', String(body.participationRules || ''), JSON.stringify(Array.isArray(body.enabledTools) ? body.enabledTools : []), body.startDate || null, body.endDate || null, now, now);
        const initiativeId = Number(result.lastInsertRowid);
        const phaseBlueprints = [
          ['Frame and assess readiness', 'Agree the scope, participation boundaries, decision links, stakeholders, competences, and resources before public activities begin.', ['EV1 Opening and local dissemination','EV2 Framing and readiness'], ['Agreed process frame','Participation ambition and decision boundaries','Stakeholder and competence map','Organisational conditions and responsibilities']],
          ['Understand with the community', 'Combine technical context with lived experience, local knowledge, needs, attachments, conflicts, and environmental perspectives.', ['EV3 Collective understanding: challenges, needs and opportunities'], ['Shared diagnosis','Recognised needs and qualities','Priority challenges','Social, spatial, and environmental evidence']],
          ['Imagine scenarios and solutions', 'Generate alternatives before converging, make trade-offs visible, and document why participants prefer particular directions.', ['EV4 Co-design and scenario building'], ['Co-developed scenarios','Design concepts or principles','Documented choices and trade-offs','Questions requiring further testing']],
          ['Test using prototypes', 'Use reversible prototypes, temporary activities, observations, and feedback to test assumptions in the real context.', ['EV5 Prototyping and real-life testing'], ['Situated testing evidence','Observed intended and unintended uses','Participant feedback','Documented revisions and lessons']],
          ['Consolidate and learn', 'Connect outcomes to responsibilities, governance, policy, implementation, stewardship, and continued community involvement.', ['EV6 Activation, care and governance','EV7 Final event, restitution and future commitments'], ['Agreed next steps','Governance or stewardship arrangements','Documented learning','Responsibilities and commitments','Connection to planning and implementation']],
        ];
        const phaseStatement = db.prepare(`INSERT INTO hub_phases (initiative_id, phase_number, title, description, status, event_types_json, expected_outputs_json) VALUES (?, ?, ?, ?, 'not_started', ?, ?)`);
        phaseBlueprints.forEach(([name, phaseDescription, eventTypes, expectedOutputs], index) => phaseStatement.run(initiativeId, index + 1, name, phaseDescription, JSON.stringify(eventTypes), JSON.stringify(expectedOutputs)));
        addAudit(db, { actor: session.user, action: 'hub.initiative.create', targetType: 'hub_initiative', targetId: initiativeId, newValue: { title, status: 'draft' } });
        const row = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        sendJson(response, 201, { initiative: initiativeFromRow(row) });
        return true;
      }

      const hubMatch = pathname.match(/^\/api\/hub\/initiatives\/(\d+)$/);
      if (hubMatch && method === 'GET') {
        const initiativeId = Number(hubMatch[1]);
        const { user } = getSessionUser(db, request);
        const row = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        if (!row) { sendError(response, 404, 'Pilot site not found.'); return true; }
        const elevated = user && ['municipality','admin'].includes(normalizeRole(user.role)) && initiativeIsInScope(user, row);
        const facilitatorAccess = user && hasPermission(user, 'hub:facilitate') && isAssignedFacilitator(db, user, initiativeId);
        const citizenPreview = url.searchParams.get('view') === 'citizen' && Boolean(elevated || facilitatorAccess);
        const staffView = Boolean((elevated || facilitatorAccess) && !citizenPreview);
        const participant = user && db.prepare('SELECT 1 FROM hub_participants WHERE initiative_id = ? AND user_id = ?').get(initiativeId, user.id);
        const publicAccess = ['active','completed'].includes(row.lifecycle_status) && ['published','active','paused','completed'].includes(row.status) && (row.visibility === 'public' || participant);
        if (!elevated && !facilitatorAccess && !publicAccess) { sendError(response, user ? 403 : 401, user ? 'This pilot site is not available to your account.' : 'Please sign in to view this pilot site.'); return true; }
        // The five-phase roadmap is public process context. Upcoming phases remain
        // visible, but their unpublished configuration is removed below.
        const phaseRows = db.prepare('SELECT * FROM hub_phases WHERE initiative_id = ? ORDER BY phase_number').all(initiativeId);
        const activityRows = staffView
          ? db.prepare('SELECT * FROM hub_activities WHERE initiative_id = ? ORDER BY phase_id, created_at').all(initiativeId)
          : db.prepare(`
              SELECT * FROM hub_activities
              WHERE initiative_id = ?
                AND workflow_status IN ('published','scheduled','open','closed','completed')
                AND (visibility = 'public' OR (? = 1 AND visibility = 'participants'))
              ORDER BY phase_id, created_at
            `).all(initiativeId, !citizenPreview && participant ? 1 : 0);
        const activitiesByPhase = new Map();
        activityRows.forEach((activityRow) => {
          const items = activitiesByPhase.get(Number(activityRow.phase_id)) || [];
          items.push(activityFromRow(activityRow));
          activitiesByPhase.set(Number(activityRow.phase_id), items);
        });
        const repositoryRows = staffView
          ? db.prepare(`
              SELECT rd.*, uploader.full_name AS uploaded_by_name,
                     publisher.full_name AS published_by_name,
                     activity.title AS related_activity_title
              FROM repository_documents rd
              LEFT JOIN users uploader ON uploader.id = rd.uploaded_by_user_id
              LEFT JOIN users publisher ON publisher.id = rd.published_by_user_id
              LEFT JOIN hub_activities activity ON activity.id = rd.activity_id
              WHERE rd.initiative_id = ?
              ORDER BY COALESCE(rd.published_at, rd.updated_at) DESC
            `).all(initiativeId)
          : db.prepare(`
              SELECT rd.*, uploader.full_name AS uploaded_by_name,
                     publisher.full_name AS published_by_name,
                     activity.title AS related_activity_title
              FROM repository_documents rd
              LEFT JOIN users uploader ON uploader.id = rd.uploaded_by_user_id
              LEFT JOIN users publisher ON publisher.id = rd.published_by_user_id
              LEFT JOIN hub_activities activity ON activity.id = rd.activity_id
              WHERE rd.initiative_id = ?
                AND rd.publication_status = 'published'
                AND (rd.access_level = 'public' OR (? = 1 AND rd.access_level = 'participants'))
              ORDER BY COALESCE(rd.published_at, rd.updated_at) DESC
            `).all(initiativeId, !citizenPreview && participant ? 1 : 0);
        const resultsByPhase = new Map();
        repositoryRows.forEach((repositoryRow) => {
          const phaseId = Number(repositoryRow.phase_id || 0);
          if (!phaseId) return;
          const items = resultsByPhase.get(phaseId) || [];
          items.push(repositoryFromRow(repositoryRow));
          resultsByPhase.set(phaseId, items);
        });
        const contributionRows = user && !citizenPreview
          ? db.prepare(`
              SELECT * FROM hub_contributions
              WHERE initiative_id = ? AND user_id = ? AND status != 'hidden'
              ORDER BY created_at DESC
            `).all(initiativeId, user.id)
          : [];
        const contributionsByPhase = new Map();
        contributionRows.forEach((contributionRow) => {
          const items = contributionsByPhase.get(Number(contributionRow.phase_id)) || [];
          items.push(contributionFromRow(contributionRow));
          contributionsByPhase.set(Number(contributionRow.phase_id), items);
        });
        const phases = phaseRows.map((phaseRow) => {
          const isUpcomingPublicPhase = !staffView
            && Number(phaseRow.phase_number) > Number(row.current_phase_number || 0);
          const visiblePhaseRow = isUpcomingPublicPhase
            ? {
                ...phaseRow,
                enabled_tools_json: '[]',
                instructions: '',
                results_visible: 0,
                completion_summary: null,
                completion_requirements_json: '[]',
                start_date: null,
                end_date: null,
              }
            : phaseRow;
          return phaseFromRow({
            ...visiblePhaseRow,
            activities: isUpcomingPublicPhase ? [] : activitiesByPhase.get(Number(phaseRow.id)) || [],
            results: isUpcomingPublicPhase ? [] : resultsByPhase.get(Number(phaseRow.id)) || [],
            myContributions: isUpcomingPublicPhase ? [] : contributionsByPhase.get(Number(phaseRow.id)) || [],
          });
        });
        const facilitator = staffView ? assignedFacilitatorFor(db, initiativeId) : null;
        const workflow = workflowSummary(db, row, user);
        sendJson(response, 200, {
          initiative: initiativeFromRow(row, phases, facilitator),
          workflow,
          access: {
            canManage: Boolean(elevated && !citizenPreview),
            canManageLifecycle: Boolean(elevated && !citizenPreview && hasPermission(user, 'hub:manage-phases')),
            canFacilitate: Boolean(!citizenPreview && (facilitatorAccess || (elevated && hasPermission(user, 'hub:facilitate')))),
            canParticipate: Boolean(!citizenPreview && user && hasPermission(user, 'hub:participate')),
          },
        });
        return true;
      }

      if (method === 'GET' && pathname === '/api/hub/facilitator-assignments') {
        const session = requireUser(db, request, response);
        if (!session) return true;
        const rows = db.prepare(`
          SELECT h.* FROM hub_initiatives h
          JOIN hub_participants p ON p.initiative_id = h.id
          WHERE p.user_id = ? AND p.assignment_role = 'facilitator'
          ORDER BY h.updated_at DESC
        `).all(session.user.id);
        const initiatives = rows.map((row) => {
          const phaseRows = db.prepare('SELECT * FROM hub_phases WHERE initiative_id = ? ORDER BY phase_number').all(row.id);
          return initiativeFromRow(row, phaseRows.map(phaseFromRow));
        });
        sendJson(response, 200, { initiatives });
        return true;
      }

      const hubFacilitatorMatch = pathname.match(/^\/api\/hub\/initiatives\/(\d+)\/facilitator$/);
      if (hubFacilitatorMatch && (method === 'PATCH' || method === 'DELETE')) {
        const session = requirePermission(db, request, response, 'hub:configure-participation');
        if (!session) return true;
        const initiativeId = Number(hubFacilitatorMatch[1]);
        const row = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        if (!row) { sendError(response, 404, 'Pilot site not found.'); return true; }
        if (!initiativeIsInScope(session.user, row)) { sendError(response, 403, 'You can manage facilitators only for your own organisation.'); return true; }
        if (method === 'PATCH' && row.lifecycle_status !== 'active') { sendError(response, 409, 'Activate the pilot before assigning a Facilitator.', null, 'PILOT_NOT_ACTIVE'); return true; }
        const now = new Date().toISOString();
        if (method === 'DELETE') {
          db.prepare(`DELETE FROM hub_participants WHERE initiative_id = ? AND assignment_role = 'facilitator'`).run(initiativeId);
          addAudit(db, { actor: session.user, action: 'hub.facilitator.unassign', targetType: 'hub_initiative', targetId: initiativeId });
          sendJson(response, 200, { initiative: initiativeFromRow(row, [], null) });
          return true;
        }
        const body = await readJson(request);
        const email = normalizeEmail(body.email || '');
        const facilitatorUser = email ? db.prepare('SELECT * FROM users WHERE email = ?').get(email) : null;
        if (!facilitatorUser || normalizeRole(facilitatorUser.role) !== 'facilitator' || facilitatorUser.account_status !== 'active') {
          sendError(response, 400, 'Enter the email of an approved Facilitator account.', { email: 'No approved Facilitator was found with this email.' });
          return true;
        }
        db.prepare(`DELETE FROM hub_participants WHERE initiative_id = ? AND assignment_role = 'facilitator'`).run(initiativeId);
        db.prepare(`
          INSERT INTO hub_participants (initiative_id, user_id, invited_at, assignment_role) VALUES (?, ?, ?, 'facilitator')
          ON CONFLICT(initiative_id, user_id) DO UPDATE SET assignment_role = 'facilitator', invited_at = excluded.invited_at
        `).run(initiativeId, facilitatorUser.id, now);
        addAudit(db, { actor: session.user, action: 'hub.facilitator.assign', targetType: 'hub_initiative', targetId: initiativeId, newValue: { facilitatorUserId: Number(facilitatorUser.id) } });
        sendJson(response, 200, { initiative: initiativeFromRow(row, [], assignedFacilitatorFor(db, initiativeId)) });
        return true;
      }

      const hubActivationMatch = pathname.match(/^\/api\/hub\/initiatives\/(\d+)\/activate$/);
      if (hubActivationMatch && method === 'POST') {
        const session = requirePermission(db, request, response, 'hub:publish');
        if (!session) return true;
        if (normalizeRole(session.user.role) !== 'municipality') {
          sendError(response, 403, 'Only the Municipality / Pilot Coordinator can activate an assigned pilot.', null, 'MUNICIPALITY_REQUIRED');
          return true;
        }
        const initiativeId = Number(hubActivationMatch[1]);
        const row = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        if (!row) { sendError(response, 404, 'Pilot site not found.'); return true; }
        if (!initiativeIsInScope(session.user, row)) { sendError(response, 403, 'You cannot activate another municipality\'s pilot site.'); return true; }
        const body = await readJson(request);
        if (body.version != null && Number(body.version) !== Number(row.version)) {
          sendError(response, 409, 'This pilot site changed since you opened it. Review the latest version before activating.');
          return true;
        }
        const setupComplete = Boolean(
          row.setup_stage
          && parseJson(row.setup_objectives_json, []).length > 0
          && row.setup_participation_level
          && row.setup_goal
          && row.setup_group_size
          && row.setup_duration
          && row.setup_facilitator
          && row.setup_mode
          && parseJson(row.setup_selected_tools_json, []).length > 0
        );
        if (!setupComplete || row.lifecycle_status !== 'ready_to_activate') {
          sendError(response, 409, 'Complete and review the process setup before activating this pilot.', null, 'PILOT_SETUP_INCOMPLETE');
          return true;
        }
        if (body.confirmed !== true) {
          sendError(response, 400, 'Confirm that the pilot is ready to become active.', null, 'PILOT_ACTIVATION_CONFIRMATION_REQUIRED');
          return true;
        }
        const now = new Date().toISOString();
        db.prepare(`UPDATE hub_initiatives
          SET lifecycle_status='active', status='active', activated_at=?, published_at=COALESCE(published_at, ?),
              current_phase_number=COALESCE(current_phase_number, 1), updated_at=?, version=version+1
          WHERE id=?`).run(now, now, now, initiativeId);
        db.prepare(`UPDATE hub_phases SET status='open' WHERE initiative_id=? AND phase_number=1 AND status='not_started'`).run(initiativeId);
        addAudit(db, {
          actor: session.user, action: 'hub.initiative.activate', targetType: 'hub_initiative', targetId: initiativeId,
          previousValue: { lifecycleStatus: row.lifecycle_status }, newValue: { lifecycleStatus: 'active' }, reason: String(body.reason || 'Municipality confirmed pilot activation'),
        });
        const updated = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        sendJson(response, 200, { initiative: initiativeFromRow(updated) });
        return true;
      }

      if (hubMatch && method === 'PATCH') {
        const session = requirePermission(db, request, response, 'hub:edit');
        if (!session) return true;
        const initiativeId = Number(hubMatch[1]);
        const row = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        if (!row) { sendError(response, 404, 'Pilot site not found.'); return true; }
        if (!initiativeIsInScope(session.user, row)) { sendError(response, 403, 'You cannot manage another municipality\'s pilot site.'); return true; }
        const body = await readJson(request);
        const allowedStatuses = ['draft','scheduled','published','active','paused','completed','archived'];
        const nextStatus = body.status && allowedStatuses.includes(body.status) ? body.status : row.status;
        if (body.version != null && Number(body.version) !== Number(row.version)) { sendError(response, 409, 'This pilot site changed since you opened it. Review the latest version before saving.'); return true; }
        const next = {
          title: body.title == null ? row.title : String(body.title).trim(),
          description: body.description == null ? row.description : String(body.description).trim(),
          objectives: body.objectives == null ? row.objectives : String(body.objectives),
          location: body.location == null ? row.location : String(body.location),
          status: nextStatus,
          visibility: ['public','private','invitation_only'].includes(body.visibility) ? body.visibility : row.visibility,
          enabledTools: Array.isArray(body.enabledTools) ? body.enabledTools : parseJson(row.enabled_tools_json, []),
          setupStage: body.stage == null ? row.setup_stage : String(body.stage),
          setupObjectives: Array.isArray(body.setupObjectives) ? body.setupObjectives : parseJson(row.setup_objectives_json, []),
          setupParticipationLevel: body.participationLevel == null ? row.setup_participation_level : String(body.participationLevel),
          setupGoal: body.goal == null ? row.setup_goal : String(body.goal),
          setupSelectedTools: Array.isArray(body.setupSelectedTools) ? body.setupSelectedTools : parseJson(row.setup_selected_tools_json, []),
          setupGroupSize: body.groupSize == null ? row.setup_group_size : String(body.groupSize),
          setupDuration: body.duration == null ? row.setup_duration : String(body.duration),
          setupFacilitator: body.facilitator == null ? row.setup_facilitator : String(body.facilitator),
          setupMode: body.mode == null ? row.setup_mode : String(body.mode),
        };
        const setupComplete = Boolean(next.setupStage && next.setupObjectives.length > 0 && next.setupParticipationLevel && next.setupGoal && next.setupGroupSize && next.setupDuration && next.setupFacilitator && next.setupMode);
        const setupToolsComplete = next.setupSelectedTools.length > 0;
        const lifecycleBeforeSetup = nextStatus === 'draft' ? 'setup_required' : row.lifecycle_status;
        const nextLifecycleStatus = lifecycleBeforeSetup === 'setup_required' && setupComplete && setupToolsComplete
          ? 'ready_to_activate'
          : lifecycleBeforeSetup;
        const now = new Date().toISOString();
        db.prepare(`UPDATE hub_initiatives SET title=?, description=?, objectives=?, location=?, status=?, visibility=?, enabled_tools_json=?, setup_stage=?, setup_objectives_json=?, setup_participation_level=?, setup_goal=?, setup_selected_tools_json=?, setup_group_size=?, setup_duration=?, setup_facilitator=?, setup_mode=?, setup_completed_at=?, setup_updated_at=?, lifecycle_status=?, published_at=?, updated_at=?, version=version+1 WHERE id=?`)
          .run(next.title, next.description, next.objectives, next.location, next.status, next.visibility, JSON.stringify(next.enabledTools), next.setupStage, JSON.stringify(next.setupObjectives), next.setupParticipationLevel, next.setupGoal, JSON.stringify(next.setupSelectedTools), next.setupGroupSize, next.setupDuration, next.setupFacilitator, next.setupMode, setupComplete ? (row.setup_completed_at || now) : row.setup_completed_at, now, nextLifecycleStatus, ['published','active'].includes(next.status) ? (row.published_at || now) : row.published_at, now, initiativeId);
        addAudit(db, { actor: session.user, action: `hub.initiative.${next.status === row.status ? 'update' : next.status}`, targetType: 'hub_initiative', targetId: initiativeId, previousValue: { status: row.status }, newValue: next, reason: body.reason || null });
        const updated = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        sendJson(response, 200, { initiative: initiativeFromRow(updated) });
        return true;
      }

      const currentPhaseMatch = pathname.match(/^\/api\/hub\/initiatives\/(\d+)\/current-phase$/);
      if (currentPhaseMatch && method === 'PATCH') {
        const session = requirePermission(db, request, response, 'hub:manage-phases');
        if (!session) return true;
        const initiativeId = Number(currentPhaseMatch[1]);
        const row = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        if (!row) { sendError(response, 404, 'Pilot site not found.'); return true; }
        if (!initiativeIsInScope(session.user, row)) { sendError(response, 403, 'You cannot manage another municipality\'s pilot site.'); return true; }
        if (row.lifecycle_status !== 'active') { sendError(response, 409, 'Activate the pilot before changing its methodological phase.', null, 'PILOT_NOT_ACTIVE'); return true; }
        const body = await readJson(request);
        const currentPhaseNumber = Number(body.currentPhaseNumber);
        if (!Number.isInteger(currentPhaseNumber) || currentPhaseNumber < 1 || currentPhaseNumber > 5) { sendError(response, 400, 'Choose a valid phase between 1 and 5.'); return true; }
        if (body.confirmed !== true) { sendError(response, 400, 'Confirm the phase transition before continuing.', { confirmed: 'Confirmation is required.' }, 'PHASE_CONFIRMATION_REQUIRED'); return true; }
        if (body.version != null && Number(body.version) !== Number(row.version)) { sendError(response, 409, 'This pilot site changed since you opened it. Review the latest version before saving.'); return true; }
        const previousPhaseNumber = Number(row.current_phase_number || 1);
        const actorRole = normalizeRole(session.user.role);
        const movingBackward = currentPhaseNumber < previousPhaseNumber;
        if (actorRole !== 'admin' && currentPhaseNumber !== previousPhaseNumber + 1) {
          sendError(response, 409, 'Municipality users can only advance to the next phase.', null, 'INVALID_PHASE_TRANSITION');
          return true;
        }
        if (actorRole === 'admin' && movingBackward && String(body.reason || '').trim().length < 10) {
          sendError(response, 400, 'Explain why the pilot is returning to an earlier phase.', { reason: 'Enter at least 10 characters.' }, 'PHASE_REASON_REQUIRED');
          return true;
        }
        if (!movingBackward) {
          const readiness = phaseReadiness(db, row, previousPhaseNumber);
          if (!readiness.ready) {
            sendJson(response, 409, { code: 'PHASE_NOT_READY', error: 'Complete the current phase requirements before advancing.', readiness });
            return true;
          }
        }
        const now = new Date().toISOString();
        db.exec('BEGIN IMMEDIATE');
        try {
          db.prepare('UPDATE hub_initiatives SET current_phase_number=?, updated_at=?, version=version+1 WHERE id=?').run(currentPhaseNumber, now, initiativeId);
          const setPhaseStatus = db.prepare('UPDATE hub_phases SET status=?, completed_at=? WHERE initiative_id=? AND phase_number=?');
          for (let phaseNumber = 1; phaseNumber <= 5; phaseNumber += 1) {
            const status = phaseNumber < currentPhaseNumber ? 'completed' : phaseNumber === currentPhaseNumber ? 'open' : 'not_started';
            setPhaseStatus.run(status, status === 'completed' ? now : null, initiativeId, phaseNumber);
          }
          createWorkflowHandoff(db, {
            initiativeId,
            phaseNumber: currentPhaseNumber,
            itemType: 'phase',
            fromRole: actorRole,
            toRole: 'facilitator',
            message: `Phase ${currentPhaseNumber} is ready for activity preparation.`,
            actorUserId: session.user.id,
            createdAt: now,
          });
          addAudit(db, {
            actor: session.user,
            action: movingBackward ? 'hub.phase.return' : 'hub.phase.advance',
            targetType: 'hub_initiative',
            targetId: initiativeId,
            previousValue: { currentPhaseNumber: previousPhaseNumber },
            newValue: { currentPhaseNumber },
            reason: String(body.reason || '').trim() || null,
          });
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        const updated = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        const phaseRows = db.prepare('SELECT * FROM hub_phases WHERE initiative_id = ? ORDER BY phase_number').all(initiativeId);
        sendJson(response, 200, { initiative: initiativeFromRow(updated, phaseRows.map(phaseFromRow)), workflow: workflowSummary(db, updated, session.user) });
        return true;
      }

      const phaseMatch = pathname.match(/^\/api\/hub\/initiatives\/(\d+)\/phases\/(\d+)$/);
      if (phaseMatch && method === 'PATCH') {
        const session = requirePermission(db, request, response, 'hub:configure-tools');
        if (!session) return true;
        const initiativeId = Number(phaseMatch[1]);
        const phaseNumber = Number(phaseMatch[2]);
        const initiative = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        if (!initiative) { sendError(response, 404, 'Pilot site not found.'); return true; }
        if (!canOperateInitiative(db, session.user, initiative)) { sendError(response, 403, 'You cannot configure this pilot site.'); return true; }
        const phase = db.prepare('SELECT * FROM hub_phases WHERE initiative_id = ? AND phase_number = ?').get(initiativeId, phaseNumber);
        const body = await readJson(request);
        const mayManageLifecycle = hasPermission(session.user, 'hub:manage-phases');
        db.prepare('UPDATE hub_phases SET instructions=?, enabled_tools_json=?, results_visible=? WHERE id=?')
          .run(body.instructions == null ? phase.instructions : String(body.instructions), JSON.stringify(Array.isArray(body.enabledTools) ? body.enabledTools : parseJson(phase.enabled_tools_json, [])), !mayManageLifecycle || body.resultsVisible == null ? phase.results_visible : (body.resultsVisible ? 1 : 0), phase.id);
        addAudit(db, { actor: session.user, action: 'hub.phase.update', targetType: 'hub_phase', targetId: phase.id, previousValue: { enabledTools: parseJson(phase.enabled_tools_json, []) }, newValue: { enabledTools: Array.isArray(body.enabledTools) ? body.enabledTools : parseJson(phase.enabled_tools_json, []) } });
        sendJson(response, 200, { phase: phaseFromRow(db.prepare('SELECT * FROM hub_phases WHERE id = ?').get(phase.id)) });
        return true;
      }

      const initiativeActivitiesMatch = pathname.match(/^\/api\/hub\/initiatives\/(\d+)\/activities$/);
      if (initiativeActivitiesMatch && method === 'POST') {
        const session = requirePermission(db, request, response, 'hub:facilitate');
        if (!session) return true;
        const initiativeId = Number(initiativeActivitiesMatch[1]);
        const initiative = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId);
        if (!initiative) { sendError(response, 404, 'Pilot site not found.'); return true; }
        if (!canOperateInitiative(db, session.user, initiative)) { sendError(response, 403, 'You cannot configure this pilot site\'s activities.'); return true; }
        if (initiative.lifecycle_status !== 'active') { sendError(response, 409, 'Activate the pilot before preparing participation activities.', null, 'PILOT_NOT_ACTIVE'); return true; }
        const body = await readJson(request);
        const phaseNumber = Number(body.phaseNumber);
        const phase = db.prepare('SELECT * FROM hub_phases WHERE initiative_id = ? AND phase_number = ?').get(initiativeId, phaseNumber);
        const title = String(body.title || '').trim();
        if (!phase || title.length < 3) { sendError(response, 400, 'Choose a valid phase and enter an activity title.'); return true; }
        const actorRole = normalizeRole(session.user.role);
        const requestedWorkflowStatus = String(body.workflowStatus || 'draft');
        const workflowStatus = ACTIVITY_WORKFLOW_STATUSES.includes(requestedWorkflowStatus) ? requestedWorkflowStatus : 'draft';
        if (actorRole === 'facilitator' && workflowStatus !== 'draft') {
          sendError(response, 403, 'Facilitators must prepare an activity as a draft before submitting it for Municipality review.', null, 'ACTIVITY_REVIEW_REQUIRED');
          return true;
        }
        const instructions = String(body.instructions || '').trim();
        if (['published','scheduled','open'].includes(workflowStatus) && instructions.length < 10) {
          sendError(response, 400, 'Add clear participation instructions before publishing this activity.', { instructions: 'Enter at least 10 characters.' }, 'ACTIVITY_INSTRUCTIONS_REQUIRED');
          return true;
        }
        const now = new Date().toISOString();
        const selectedToolIds = Array.isArray(body.selectedToolIds)
          ? body.selectedToolIds.map(String).map((value) => value.trim()).filter(Boolean)
          : body.toolKey ? [String(body.toolKey)] : [];
        const publishedByUserId = ['published','scheduled','open'].includes(workflowStatus) ? session.user.id : null;
        const result = db.prepare(`
          INSERT INTO hub_activities (
            initiative_id, phase_id, title, description, status, workflow_status,
            assigned_to_user_id, tool_key, selected_tool_ids_json, activity_type, instructions,
            start_date, end_date, location, participation_mode, estimated_duration,
            required_materials, eligibility, submission_type, submission_deadline, visibility,
            allow_anonymous_participation, allow_editing, accessibility_notes, language_support,
            support_contact, published_by_user_id, contribution_types_json, voting_enabled,
            forum_enabled, results_visible, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          initiativeId, phase.id, title, String(body.description || ''), publicActivityStatus(workflowStatus), workflowStatus,
          session.user.id, body.toolKey || selectedToolIds[0] || null, JSON.stringify(selectedToolIds), String(body.activityType || 'participation'), instructions,
          body.startDate || null, body.endDate || null, String(body.location || '').trim() || null,
          ['online','offline','hybrid'].includes(body.participationMode) ? body.participationMode : 'offline',
          String(body.estimatedDuration || '').trim() || null, String(body.requiredMaterials || '').trim() || null,
          String(body.eligibility || '').trim() || null, String(body.submissionType || '').trim() || null,
          body.submissionDeadline || null, ['public','participants','internal'].includes(body.visibility) ? body.visibility : 'public',
          body.allowAnonymousParticipation ? 1 : 0, body.allowEditing ? 1 : 0,
          String(body.accessibilityNotes || '').trim() || null, String(body.languageSupport || '').trim() || null,
          String(body.supportContact || '').trim() || null, publishedByUserId,
          JSON.stringify(Array.isArray(body.contributionTypes) && body.contributionTypes.length ? body.contributionTypes : ['text']),
          body.votingEnabled ? 1 : 0, body.forumEnabled ? 1 : 0, body.resultsVisible ? 1 : 0, now, now,
        );
        addAudit(db, { actor: session.user, action: 'hub.activity.create', targetType: 'hub_activity', targetId: result.lastInsertRowid, newValue: { initiativeId, phaseNumber, title, workflowStatus } });
        sendJson(response, 201, { activity: activityFromRow(db.prepare('SELECT * FROM hub_activities WHERE id = ?').get(result.lastInsertRowid)) });
        return true;
      }

      const activityMatch = pathname.match(/^\/api\/hub\/activities\/(\d+)$/);
      if (activityMatch && method === 'PATCH') {
        const session = requirePermission(db, request, response, 'hub:facilitate');
        if (!session) return true;
        const activityId = Number(activityMatch[1]);
        const activity = db.prepare('SELECT * FROM hub_activities WHERE id = ?').get(activityId);
        if (!activity) { sendError(response, 404, 'Activity not found.'); return true; }
        const initiative = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(activity.initiative_id);
        if (!canOperateInitiative(db, session.user, initiative)) { sendError(response, 403, 'You cannot manage this pilot site\'s activity.'); return true; }
        const body = await readJson(request);
        const currentWorkflowStatus = activity.workflow_status || activity.status;
        const requestedWorkflowStatus = body.workflowStatus == null
          ? (ACTIVITY_WORKFLOW_STATUSES.includes(body.status) ? body.status : currentWorkflowStatus)
          : String(body.workflowStatus);
        if (!ACTIVITY_WORKFLOW_STATUSES.includes(requestedWorkflowStatus)) {
          sendError(response, 400, 'Choose a valid activity status.', { workflowStatus: 'The selected workflow status is not available.' });
          return true;
        }
        if (requestedWorkflowStatus !== currentWorkflowStatus && !activityTransitionsFor(session.user.role, currentWorkflowStatus).includes(requestedWorkflowStatus)) {
          sendError(response, 409, 'This activity cannot move to the requested status.', null, 'INVALID_ACTIVITY_TRANSITION');
          return true;
        }
        if (requestedWorkflowStatus === 'needs_revision' && String(body.reviewNotes || body.reason || '').trim().length < 10) {
          sendError(response, 400, 'Explain what the Facilitator needs to revise.', { reviewNotes: 'Enter at least 10 characters.' }, 'ACTIVITY_REVIEW_NOTES_REQUIRED');
          return true;
        }
        const instructions = body.instructions === undefined ? String(activity.instructions || '') : String(body.instructions || '').trim();
        if (['published','scheduled','open'].includes(requestedWorkflowStatus) && instructions.length < 10) {
          sendError(response, 400, 'Add clear participation instructions before publishing this activity.', { instructions: 'Enter at least 10 characters.' }, 'ACTIVITY_INSTRUCTIONS_REQUIRED');
          return true;
        }
        const status = publicActivityStatus(requestedWorkflowStatus);
        const now = new Date().toISOString();
        const submittedAt = requestedWorkflowStatus === 'ready_for_review' ? now : activity.submitted_at;
        const publishedAt = ['published','scheduled','open'].includes(requestedWorkflowStatus) ? (activity.published_at || now) : activity.published_at;
        const closedAt = requestedWorkflowStatus === 'closed' ? now : activity.closed_at;
        const completedAt = requestedWorkflowStatus === 'completed' ? now : activity.completed_at;
        const cancelledAt = requestedWorkflowStatus === 'cancelled' ? now : activity.cancelled_at;
        const reviewNotes = body.reviewNotes === undefined ? activity.review_notes : String(body.reviewNotes || '').trim() || null;
        const selectedToolIds = Array.isArray(body.selectedToolIds)
          ? body.selectedToolIds.map(String).map((value) => value.trim()).filter(Boolean)
          : parseJson(activity.selected_tool_ids_json, activity.tool_key ? [activity.tool_key] : []);
        const publishedByUserId = ['published','scheduled','open'].includes(requestedWorkflowStatus)
          ? (activity.published_by_user_id || session.user.id)
          : activity.published_by_user_id;
        db.prepare(`
          UPDATE hub_activities SET
            title=?, description=?, status=?, workflow_status=?, review_notes=?, submitted_at=?,
            published_at=?, closed_at=?, completed_at=?, cancelled_at=?, tool_key=?,
            selected_tool_ids_json=?, activity_type=?, instructions=?, start_date=?, end_date=?,
            location=?, participation_mode=?, estimated_duration=?, required_materials=?, eligibility=?,
            submission_type=?, submission_deadline=?, visibility=?, allow_anonymous_participation=?,
            allow_editing=?, accessibility_notes=?, language_support=?, support_contact=?,
            published_by_user_id=?, contribution_types_json=?, voting_enabled=?, forum_enabled=?,
            results_visible=?, updated_at=? WHERE id=?
        `).run(
          body.title == null ? activity.title : String(body.title).trim(),
          body.description == null ? activity.description : String(body.description), status,
          requestedWorkflowStatus, reviewNotes, submittedAt, publishedAt, closedAt, completedAt,
          cancelledAt, body.toolKey === undefined ? activity.tool_key : body.toolKey,
          JSON.stringify(selectedToolIds), body.activityType === undefined ? activity.activity_type : String(body.activityType || 'participation'),
          instructions, body.startDate === undefined ? activity.start_date : body.startDate || null,
          body.endDate === undefined ? activity.end_date : body.endDate || null,
          body.location === undefined ? activity.location : String(body.location || '').trim() || null,
          body.participationMode === undefined ? activity.participation_mode : (['online','offline','hybrid'].includes(body.participationMode) ? body.participationMode : 'offline'),
          body.estimatedDuration === undefined ? activity.estimated_duration : String(body.estimatedDuration || '').trim() || null,
          body.requiredMaterials === undefined ? activity.required_materials : String(body.requiredMaterials || '').trim() || null,
          body.eligibility === undefined ? activity.eligibility : String(body.eligibility || '').trim() || null,
          body.submissionType === undefined ? activity.submission_type : String(body.submissionType || '').trim() || null,
          body.submissionDeadline === undefined ? activity.submission_deadline : body.submissionDeadline || null,
          body.visibility === undefined ? activity.visibility : (['public','participants','internal'].includes(body.visibility) ? body.visibility : 'public'),
          body.allowAnonymousParticipation == null ? activity.allow_anonymous_participation : (body.allowAnonymousParticipation ? 1 : 0),
          body.allowEditing == null ? activity.allow_editing : (body.allowEditing ? 1 : 0),
          body.accessibilityNotes === undefined ? activity.accessibility_notes : String(body.accessibilityNotes || '').trim() || null,
          body.languageSupport === undefined ? activity.language_support : String(body.languageSupport || '').trim() || null,
          body.supportContact === undefined ? activity.support_contact : String(body.supportContact || '').trim() || null,
          publishedByUserId,
          JSON.stringify(Array.isArray(body.contributionTypes) ? body.contributionTypes : parseJson(activity.contribution_types_json, ['text'])),
          body.votingEnabled == null ? activity.voting_enabled : (body.votingEnabled ? 1 : 0),
          body.forumEnabled == null ? activity.forum_enabled : (body.forumEnabled ? 1 : 0),
          body.resultsVisible == null ? activity.results_visible : (body.resultsVisible ? 1 : 0),
          now, activityId,
        );
        if (requestedWorkflowStatus !== currentWorkflowStatus) {
          const actorRole = normalizeRole(session.user.role);
          const toRole = requestedWorkflowStatus === 'ready_for_review' ? 'municipality'
            : requestedWorkflowStatus === 'needs_revision' ? 'facilitator'
              : ['published','scheduled','open'].includes(requestedWorkflowStatus) ? 'citizen'
                : actorRole;
          createWorkflowHandoff(db, {
            initiativeId: initiative.id,
            phaseNumber: Number(db.prepare('SELECT phase_number FROM hub_phases WHERE id = ?').get(activity.phase_id)?.phase_number || initiative.current_phase_number || 1),
            itemType: 'activity',
            itemId: activityId,
            fromRole: actorRole,
            toRole,
            message: `Activity status changed to ${requestedWorkflowStatus}.`,
            actorUserId: session.user.id,
            createdAt: now,
          });
          notifyInitiativeRole(db, {
            initiativeId: initiative.id,
            role: toRole,
            actorUserId: session.user.id,
            eventType: 'activity_workflow',
            title: 'Activity action required',
            body: `“${activity.title}” moved to ${requestedWorkflowStatus}.`,
            actionUrl: `/hub/${initiative.id}/phase/${Number(db.prepare('SELECT phase_number FROM hub_phases WHERE id = ?').get(activity.phase_id)?.phase_number || initiative.current_phase_number || 1)}`,
            payload: { activityId, activityTitle: activity.title, workflowStatus: requestedWorkflowStatus },
            createdAt: now,
          });
        }
        addAudit(db, { actor: session.user, action: 'hub.activity.update', targetType: 'hub_activity', targetId: activityId, previousValue: { status: activity.status, workflowStatus: currentWorkflowStatus }, newValue: { status, workflowStatus: requestedWorkflowStatus }, reason: body.reason || null });
        sendJson(response, 200, { activity: activityFromRow(db.prepare('SELECT * FROM hub_activities WHERE id = ?').get(activityId)) });
        return true;
      }

      const activityContributionsMatch = pathname.match(/^\/api\/hub\/activities\/(\d+)\/contributions$/);
      if (activityContributionsMatch && method === 'POST') {
        const session = requirePermission(db, request, response, 'hub:participate');
        if (!session) return true;
        const activityId = Number(activityContributionsMatch[1]);
        const activity = db.prepare('SELECT * FROM hub_activities WHERE id = ?').get(activityId);
        if (!activity) { sendError(response, 404, 'Activity not found.'); return true; }
        const initiative = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(activity.initiative_id);
        const participant = db.prepare('SELECT 1 FROM hub_participants WHERE initiative_id = ? AND user_id = ?').get(initiative.id, session.user.id);
        const accessible = ['published','active','paused'].includes(initiative.status) && (initiative.visibility === 'public' || participant);
        if (!accessible) { sendError(response, 403, 'This activity is not available to your account.'); return true; }
        if (activity.status !== 'open') { sendError(response, 409, activity.status === 'scheduled' ? 'This activity has not opened yet.' : 'This activity is now closed.'); return true; }
        const body = await readJson(request);
        const content = String(body.content || '').trim();
        const contributionType = String(body.contributionType || 'text');
        if (!parseJson(activity.contribution_types_json, ['text']).includes(contributionType) || content.length < 2) { sendError(response, 400, 'Enter a valid contribution for this activity.'); return true; }
        const now = new Date().toISOString();
        const result = db.prepare(`INSERT INTO hub_contributions (initiative_id, phase_id, activity_id, user_id, contribution_type, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(initiative.id, activity.phase_id, activityId, session.user.id, contributionType, content, now, now);
        addAudit(db, { actor: session.user, action: 'hub.contribution.submit', targetType: 'hub_contribution', targetId: result.lastInsertRowid, newValue: { activityId, contributionType } });
        sendJson(response, 201, { contribution: contributionFromRow(db.prepare('SELECT * FROM hub_contributions WHERE id = ?').get(result.lastInsertRowid)) });
        return true;
      }

      if (activityContributionsMatch && method === 'GET') {
        const session = requireUser(db, request, response);
        if (!session) return true;
        const activityId = Number(activityContributionsMatch[1]);
        const activity = db.prepare('SELECT * FROM hub_activities WHERE id = ?').get(activityId);
        if (!activity) { sendError(response, 404, 'Activity not found.'); return true; }
        const initiative = db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(activity.initiative_id);
        const mayReview = hasPermission(session.user, 'hub:view-participant-input') && canOperateInitiative(db, session.user, initiative);
        const rows = mayReview
          ? db.prepare('SELECT * FROM hub_contributions WHERE activity_id = ? ORDER BY created_at DESC').all(activityId)
          : db.prepare("SELECT * FROM hub_contributions WHERE activity_id = ? AND user_id = ? AND status != 'hidden' ORDER BY created_at DESC").all(activityId, session.user.id);
        sendJson(response, 200, { contributions: rows.map(contributionFromRow) });
        return true;
      }

      if (method === 'GET' && pathname === '/api/admin/overview') {
        const session = requirePermission(db, request, response, 'admin:access');
        if (!session) return true;
        const scalar = (sql) => Number(db.prepare(sql).get().count || 0);
        const usersByRole = db.prepare('SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role').all().map((row) => ({ role: row.role, count: Number(row.count) }));
        const recentAudit = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 12').all();
        sendJson(response, 200, { summary: {
          totalUsers: scalar('SELECT COUNT(*) AS count FROM users'), municipalities: scalar('SELECT COUNT(*) AS count FROM organisations'),
          activeInitiatives: scalar("SELECT COUNT(*) AS count FROM hub_initiatives WHERE lifecycle_status='active'"),
          setupRequiredInitiatives: scalar("SELECT COUNT(*) AS count FROM hub_initiatives WHERE lifecycle_status='setup_required'"),
          readyToActivateInitiatives: scalar("SELECT COUNT(*) AS count FROM hub_initiatives WHERE lifecycle_status='ready_to_activate'"),
          completedInitiatives: scalar("SELECT COUNT(*) AS count FROM hub_initiatives WHERE lifecycle_status='completed'"),
          pendingApprovals: scalar("SELECT COUNT(*) AS count FROM users WHERE account_status='pending_approval'"),
          openProposals: scalar("SELECT COUNT(*) AS count FROM forum_proposals WHERE status IN ('Open','open')"),
          repositoryItems: scalar('SELECT COUNT(*) AS count FROM repository_documents'), usersByRole,
        }, recentAudit });
        return true;
      }

      if (method === 'GET' && pathname === '/api/admin/users') {
        const session = requirePermission(db, request, response, 'users:manage');
        if (!session) return true;
        const users = db.prepare(`
          SELECT u.id, u.full_name, u.email, u.role, u.account_status, u.organisation_id,
                 u.pilot_site, u.created_at, o.name AS organisation_name
          FROM users u LEFT JOIN organisations o ON o.id = u.organisation_id
          ORDER BY u.created_at DESC
        `).all().map((row) => ({
          id: Number(row.id), fullName: row.full_name, email: row.email, role: normalizeRole(row.role),
          accountStatus: row.account_status, organisationId: row.organisation_id ? Number(row.organisation_id) : null,
          organisationName: row.organisation_name || null, pilotSite: row.pilot_site, createdAt: row.created_at,
        }));
        sendJson(response, 200, { users });
        return true;
      }

      const adminUserMatch = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
      if (adminUserMatch && method === 'PATCH') {
        const session = requirePermission(db, request, response, 'users:manage');
        if (!session) return true;
        const userId = Number(adminUserMatch[1]);
        const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!existing) { sendError(response, 404, 'User not found.'); return true; }
        const body = await readJson(request);
        const role = body.role == null ? normalizeRole(existing.role) : normalizeRole(body.role);
        const roleLabel = role === 'admin' ? 'Admin' : role === 'municipality' ? 'Municipality Staff' : role === 'facilitator' ? 'Facilitator' : 'Citizen';
        const accountStatus = ['active', 'suspended', 'pending_approval'].includes(body.accountStatus) ? body.accountStatus : existing.account_status;
        if (userId === Number(session.user.id) && accountStatus === 'suspended') {
          sendError(response, 400, 'You cannot suspend your own administrator account.');
          return true;
        }
        const organisationId = body.organisationId === undefined ? existing.organisation_id : (body.organisationId ? Number(body.organisationId) : null);
        const now = new Date().toISOString();
        db.prepare('UPDATE users SET role = ?, roles_json = ?, account_status = ?, organisation_id = ?, updated_at = ? WHERE id = ?')
          .run(roleLabel, JSON.stringify([roleLabel]), accountStatus, organisationId, now, userId);
        addAudit(db, {
          actor: session.user, action: 'admin.user.update', targetType: 'user', targetId: userId,
          previousValue: { role: existing.role, accountStatus: existing.account_status, organisationId: existing.organisation_id },
          newValue: { role: roleLabel, accountStatus, organisationId }, reason: String(body.reason || 'Administrative account update'),
        });
        sendJson(response, 200, { user: { id: userId, role, accountStatus, organisationId } });
        return true;
      }

      if (method === 'GET' && pathname === '/api/admin/organisations') {
        const session = requirePermission(db, request, response, 'admin:access');
        if (!session) return true;
        const organisations = db.prepare('SELECT * FROM organisations ORDER BY name').all().map((row) => ({
          id: Number(row.id), name: row.name, municipality: row.municipality, pilotSlug: row.pilot_slug,
          status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
        }));
        sendJson(response, 200, { organisations });
        return true;
      }

      if (method === 'GET' && pathname === '/api/admin/audit') {
        const session = requirePermission(db, request, response, 'admin:access');
        if (!session) return true;
        const audit = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100').all().map((row) => ({
          eventId: row.event_id, timestamp: row.timestamp, actorUserId: row.actor_user_id ? Number(row.actor_user_id) : null,
          actorRole: row.actor_role, organisationId: row.organisation_id ? Number(row.organisation_id) : null,
          action: row.action, targetType: row.target_type, targetId: row.target_id, reason: row.reason,
        }));
        sendJson(response, 200, { audit });
        return true;
      }

      if (method === 'GET' && pathname === '/api/admin/workspace') {
        const session = requirePermission(db, request, response, 'admin:access');
        if (!session) return true;
        const initiatives = db.prepare(`SELECT h.*, o.name AS organisation_name FROM hub_initiatives h JOIN organisations o ON o.id = h.organisation_id ORDER BY h.updated_at DESC`).all().map((row) => ({ ...initiativeFromRow(row), organisationName: row.organisation_name }));
        const proposals = db.prepare(`SELECT p.id, p.title, p.status, p.moderation_status, p.moderation_reason, p.organisation_id, p.initiative_id, p.version, p.updated_at, u.full_name AS author, (SELECT COUNT(*) FROM forum_reports r WHERE r.proposal_id=p.id AND r.status='open') AS open_reports FROM forum_proposals p JOIN users u ON u.id=p.user_id ORDER BY p.updated_at DESC LIMIT 100`).all().map((row) => ({ id: Number(row.id), title: row.title, status: row.status, moderationStatus: row.moderation_status || 'visible', moderationReason: row.moderation_reason || null, openReports: Number(row.open_reports || 0), organisationId: row.organisation_id ? Number(row.organisation_id) : null, initiativeId: row.initiative_id ? Number(row.initiative_id) : null, version: Number(row.version), updatedAt: row.updated_at, author: row.author }));
        const repository = db.prepare('SELECT * FROM repository_documents ORDER BY updated_at DESC LIMIT 100').all().map(repositoryFromRow);
        const settings = Object.fromEntries(db.prepare('SELECT setting_key, setting_value FROM platform_settings ORDER BY setting_key').all().map((row) => [row.setting_key, parseJson(row.setting_value, row.setting_value)]));
        const integrations = [
          { key: 'authentication', label: 'Session authentication', status: 'operational', detail: 'Server-managed, HTTP-only sessions' },
          { key: 'database', label: 'Platform database', status: 'operational', detail: 'SQLite data store and migrations' },
          { key: 'citivoice', label: 'CitiVoice', status: 'configured', detail: 'Protected platform module' },
          { key: 'chatbot', label: 'AI Chatbot', status: 'configured', detail: 'Co-Creation Guide integration' },
          { key: 'scene-editor', label: '3D Scene Editor', status: 'configured', detail: 'Protected platform module' },
        ];
        sendJson(response, 200, { initiatives, proposals, repository, settings, integrations });
        return true;
      }

      if (method === 'POST' && pathname === '/api/admin/organisations') {
        const session = requirePermission(db, request, response, 'admin:access');
        if (!session) return true;
        const body = await readJson(request);
        const name = String(body.name || '').trim();
        const municipality = String(body.municipality || '').trim();
        const pilotSlug = String(body.pilotSlug || '').trim();
        if (name.length < 3 || municipality.length < 2 || pilotSlug.length < 2) { sendError(response, 400, 'Complete the organisation name, municipality, and pilot.'); return true; }
        const now = new Date().toISOString();
        const result = db.prepare(`INSERT INTO organisations (name, municipality, pilot_slug, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)`).run(name, municipality, pilotSlug, now, now);
        const organisationId = Number(result.lastInsertRowid);
        const initiativeResult = db.prepare(`INSERT INTO hub_initiatives (
          organisation_id, pilot_slug, owner_user_id, title, description, location, status, visibility,
          lifecycle_status, enabled_tools_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'draft', 'public', 'setup_required', '[]', ?, ?)`)
          .run(organisationId, pilotSlug, session.user.id, `${municipality} Co-Creation Pilot`, `Initial pilot context assigned to ${municipality}. The Municipality must configure and activate the participation process.`, municipality, now, now);
        const initiativeId = Number(initiativeResult.lastInsertRowid);
        const phaseBlueprints = [
          ['Frame and assess readiness', 'Agree the scope, participation boundaries, decision links, stakeholders, competences, and resources before public activities begin.'],
          ['Understand with the community', 'Combine technical context with lived experience, local knowledge, needs, attachments, conflicts, and environmental perspectives.'],
          ['Imagine scenarios and solutions', 'Generate alternatives before converging and document why participants prefer particular directions.'],
          ['Test using prototypes', 'Use prototypes, observations, and feedback to test assumptions in the real context.'],
          ['Consolidate and learn', 'Connect outcomes to responsibilities, governance, implementation, stewardship, and continued community involvement.'],
        ];
        const phaseStatement = db.prepare(`INSERT INTO hub_phases (initiative_id, phase_number, title, description, status) VALUES (?, ?, ?, ?, 'not_started')`);
        phaseBlueprints.forEach(([phaseTitle, phaseDescription], index) => phaseStatement.run(initiativeId, index + 1, phaseTitle, phaseDescription));
        addAudit(db, { actor: session.user, action: 'admin.organisation.create', targetType: 'organisation', targetId: organisationId, newValue: { name, municipality, pilotSlug, initiativeId } });
        sendJson(response, 201, { organisation: { id: organisationId, name, municipality, pilotSlug, status: 'active' }, initiative: initiativeFromRow(db.prepare('SELECT * FROM hub_initiatives WHERE id = ?').get(initiativeId)) });
        return true;
      }

      const adminOrganisationMatch = pathname.match(/^\/api\/admin\/organisations\/(\d+)$/);
      if (adminOrganisationMatch && method === 'PATCH') {
        const session = requirePermission(db, request, response, 'admin:access');
        if (!session) return true;
        const organisationId = Number(adminOrganisationMatch[1]);
        const existing = db.prepare('SELECT * FROM organisations WHERE id = ?').get(organisationId);
        if (!existing) { sendError(response, 404, 'Organisation not found.'); return true; }
        const body = await readJson(request);
        const status = ['active','disabled'].includes(body.status) ? body.status : existing.status;
        const now = new Date().toISOString();
        db.prepare('UPDATE organisations SET name=?, municipality=?, pilot_slug=?, status=?, updated_at=? WHERE id=?').run(body.name == null ? existing.name : String(body.name).trim(), body.municipality == null ? existing.municipality : String(body.municipality).trim(), body.pilotSlug == null ? existing.pilot_slug : String(body.pilotSlug).trim(), status, now, organisationId);
        addAudit(db, { actor: session.user, action: 'admin.organisation.update', targetType: 'organisation', targetId: organisationId, previousValue: { status: existing.status }, newValue: { status }, reason: body.reason || null });
        sendJson(response, 200, { organisation: { id: organisationId, status } });
        return true;
      }

      if (method === 'PATCH' && pathname === '/api/admin/settings') {
        const session = requirePermission(db, request, response, 'admin:access');
        if (!session) return true;
        const body = await readJson(request);
        const allowedKeys = new Set(['maintenanceBanner','defaultVisibility','notificationsEnabled','demoContentEnabled','pilotAvailability']);
        const now = new Date().toISOString();
        const statement = db.prepare(`INSERT INTO platform_settings (setting_key, setting_value, updated_by_user_id, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_by_user_id=excluded.updated_by_user_id, updated_at=excluded.updated_at`);
        const updated = {};
        for (const [key, value] of Object.entries(body.settings || {})) {
          if (!allowedKeys.has(key)) continue;
          statement.run(key, JSON.stringify(value), session.user.id, now);
          updated[key] = value;
        }
        addAudit(db, { actor: session.user, action: 'admin.settings.update', targetType: 'platform_settings', targetId: 'global', newValue: updated, reason: String(body.reason || 'Platform settings update') });
        sendJson(response, 200, { settings: updated });
        return true;
      }

      if (method === 'POST' && pathname === '/api/feedback') {
        const body = await readJson(request);
        const category = String(body.category || '');
        const message = String(body.message || '').trim();
        const rating = Number(body.rating);
        const source = body.source === 'account' ? 'account' : 'footer';
        const sus = Array.isArray(body.sus) ? body.sus.map(Number) : [];
        const fieldErrors = {};
        if (!['general', 'technical', 'improvement'].includes(category)) fieldErrors.category = 'Select a feedback type.';
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) fieldErrors.rating = 'Select an overall rating from 1 to 5.';
        if (message.length < 10) fieldErrors.message = 'Enter at least 10 characters so we can understand your feedback.';
        if (message.length > 2000) fieldErrors.message = 'Feedback must be 2,000 characters or fewer.';
        if (source === 'account' && (sus.length !== 10 || sus.some((value) => !Number.isInteger(value) || value < 1 || value > 5))) fieldErrors.sus = 'Answer all 10 usability statements.';
        if (Object.keys(fieldErrors).length) {
          sendError(response, 400, 'Please correct the highlighted fields.', fieldErrors);
          return true;
        }
        const { user } = getSessionUser(db, request);
        const susScore = sus.length === 10 ? sus.reduce((total, value, index) => total + (index % 2 === 0 ? value - 1 : 5 - value), 0) * 2.5 : null;
        const result = db.prepare('INSERT INTO user_feedback (user_id, category, rating, message, source, created_at, sus_json, sus_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(user?.id || null, category, rating, message, source, new Date().toISOString(), sus.length ? JSON.stringify(sus) : null, susScore);
        sendJson(response, 201, { id: Number(result.lastInsertRowid), message: 'Thank you. Your feedback has been submitted successfully.' });
        return true;
      }

      if (method === 'GET' && pathname === '/api/repository') {
        const phase = Number(url.searchParams.get('phase') || 0);
        const phaseId = Number(url.searchParams.get('phaseId') || 0);
        const initiativeId = Number(url.searchParams.get('pilotId') || url.searchParams.get('initiativeId') || 0);
        const contentType = String(url.searchParams.get('contentType') || '').trim();
        const query = String(url.searchParams.get('q') || '').trim();
        const { user: repoViewer } = getSessionUser(db, request);
        const viewerRole = repoViewer ? normalizeRole(repoViewer.role) : 'guest';
        const clauses = [];
        const params = [];
        if (viewerRole === 'admin') {
          // Platform administrators may inspect publication state across pilots.
        } else if (viewerRole === 'municipality') {
          clauses.push('rd.organisation_id = ?');
          params.push(Number(repoViewer.organisation_id || 0));
        } else if (viewerRole === 'facilitator') {
          clauses.push(`EXISTS (
            SELECT 1 FROM hub_participants hp
            WHERE hp.initiative_id = rd.initiative_id AND hp.user_id = ? AND hp.assignment_role = 'facilitator'
          )`);
          params.push(repoViewer.id);
        } else {
          clauses.push("rd.publication_status = 'published'");
          if (repoViewer) {
            clauses.push(`(
              rd.access_level = 'public' OR (
                rd.access_level = 'participants' AND EXISTS (
                  SELECT 1 FROM hub_participants hp
                  WHERE hp.initiative_id = rd.initiative_id AND hp.user_id = ?
                )
              )
            )`);
            params.push(repoViewer.id);
          } else {
            clauses.push("rd.access_level = 'public'");
          }
        }
        if (initiativeId > 0) { clauses.push('rd.initiative_id = ?'); params.push(initiativeId); }
        if (phase >= 1 && phase <= 5) { clauses.push('phase = ?'); params.push(phase); }
        if (phaseId > 0) { clauses.push('rd.phase_id = ?'); params.push(phaseId); }
        if (contentType === 'result') clauses.push('rd.result_type IS NOT NULL');
        if (query) { clauses.push('(rd.title LIKE ? OR rd.description LIKE ? OR rd.pilot LIKE ?)'); params.push(`%${query}%`, `%${query}%`, `%${query}%`); }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const documents = db.prepare(`
          SELECT rd.*, uploader.full_name AS uploaded_by_name,
                 publisher.full_name AS published_by_name,
                 activity.title AS related_activity_title
          FROM repository_documents rd
          LEFT JOIN users uploader ON uploader.id = rd.uploaded_by_user_id
          LEFT JOIN users publisher ON publisher.id = rd.published_by_user_id
          LEFT JOIN hub_activities activity ON activity.id = rd.activity_id
          ${where}
          ORDER BY COALESCE(rd.published_at, rd.updated_at) DESC
        `).all(...params).map(repositoryFromRow);
        sendJson(response, 200, { documents, total: documents.length });
        return true;
      }

      if (method === 'POST' && pathname === '/api/repository') {
        const session = requirePermission(db, request, response, 'repository:upload');
        if (!session) return true;
        const body = await readJson(request);
        const title = String(body.title || '').trim();
        const description = String(body.description || '').trim();
        const phase = Number(body.phase);
        const documentType = String(body.documentType || '').trim();
        const fileFormat = String(body.fileFormat || '').trim().toUpperCase();
        const fieldErrors = {};
        if (title.length < 5 || title.length > 160) fieldErrors.title = 'Use between 5 and 160 characters.';
        if (description.length < 10 || description.length > 1200) fieldErrors.description = 'Use between 10 and 1,200 characters.';
        if (!(phase >= 1 && phase <= 5)) fieldErrors.phase = 'Select a phase between 1 and 5.';
        if (!documentType) fieldErrors.documentType = 'Select a document type.';
        if (!fileFormat) fieldErrors.fileFormat = 'Select a file format.';
        if (Object.keys(fieldErrors).length) {
          sendError(response, 400, 'Please complete the repository item details.', fieldErrors);
          return true;
        }
        const requestedInitiativeId = Number(body.pilotId || body.initiativeId || 0);
        const initiative = (requestedInitiativeId
          ? db.prepare('SELECT id, organisation_id, pilot_slug FROM hub_initiatives WHERE id = ?').get(requestedInitiativeId)
          : null)
          || db.prepare('SELECT id, organisation_id, pilot_slug FROM hub_initiatives WHERE organisation_id = ?').get(session.user.organisation_id)
          || db.prepare(`
            SELECT h.id, h.organisation_id, h.pilot_slug FROM hub_initiatives h
            JOIN hub_participants p ON p.initiative_id = h.id
            WHERE p.user_id = ? AND p.assignment_role = 'facilitator' LIMIT 1
          `).get(session.user.id);
        if (!initiative || !canOperateInitiative(db, session.user, initiative)) {
          sendError(response, 403, 'You cannot upload results for this pilot site.');
          return true;
        }
        const phaseRow = db.prepare('SELECT id FROM hub_phases WHERE initiative_id = ? AND phase_number = ?').get(initiative.id, phase);
        if (!phaseRow) { sendError(response, 400, 'Choose a valid phase for this pilot site.', { phase: 'Select a phase from this pilot.' }); return true; }
        const activityId = Number(body.activityId || 0) || null;
        if (activityId && !db.prepare('SELECT 1 FROM hub_activities WHERE id = ? AND initiative_id = ? AND phase_id = ?').get(activityId, initiative.id, phaseRow.id)) {
          sendError(response, 400, 'Choose an activity from the selected phase.', { activityId: 'The selected activity is not part of this phase.' });
          return true;
        }
        const now = new Date().toISOString();
        const tags = Array.isArray(body.tags) ? body.tags.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 6) : [];
        const result = db.prepare(`
          INSERT INTO repository_documents (
            title, description, phase, document_type, pilot, file_format, tags_json,
            publication_status, access_level, initiative_id, organisation_id,
            uploaded_by_user_id, tool_key, phase_id, activity_id, result_type,
            author_role, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).run(
          title, description, phase, documentType,
          String(body.pilot || session.user.pilot_site || 'Thessaloniki'),
          fileFormat, JSON.stringify(tags),
          ['public', 'participants', 'internal'].includes(body.accessLevel) ? body.accessLevel : 'public',
          initiative?.id || null, initiative?.organisation_id || session.user.organisation_id || null,
          session.user.id, String(body.toolKey || '').trim() || null,
          phaseRow.id, activityId, String(body.resultType || '').trim() || null,
          normalizeRole(session.user.role), now, now,
        );
        const documentId = Number(result.lastInsertRowid);
        addAudit(db, {
          actor: session.user, action: 'repository.item.upload', targetType: 'repository_document',
          targetId: documentId, newValue: { title, phase, publicationStatus: 'draft' },
        });
        const row = db.prepare('SELECT * FROM repository_documents WHERE id = ?').get(documentId);
        sendJson(response, 201, { document: repositoryFromRow(row) });
        return true;
      }

      const repositoryStatusMatch = pathname.match(/^\/api\/repository\/(\d+)\/status$/);
      if (repositoryStatusMatch && method === 'PATCH') {
        const session = requirePermission(db, request, response, 'repository:upload');
        if (!session) return true;
        const documentId = Number(repositoryStatusMatch[1]);
        const row = db.prepare('SELECT * FROM repository_documents WHERE id = ?').get(documentId);
        if (!row) { sendError(response, 404, 'Repository item not found.'); return true; }
        const body = await readJson(request);
        const nextStatus = String(body.publicationStatus || '');
        if (!['draft', 'ready_for_review', 'published', 'archived'].includes(nextStatus)) {
          sendError(response, 400, 'Choose a valid publication status.', { publicationStatus: 'Select draft, ready for review, published, or archived.' });
          return true;
        }
        // Publishing and archiving are municipality governance actions. A facilitator may only
        // move their own upload between draft and ready-for-review.
        const canManage = hasPermission(session.user, 'repository:manage');
        if (!canManage && !['draft', 'ready_for_review'].includes(nextStatus)) {
          sendError(response, 403, 'Only the municipality can publish or archive a repository item.');
          return true;
        }
        if (!canManage && Number(row.uploaded_by_user_id || 0) !== Number(session.user.id)) {
          sendError(response, 403, 'You can only change the status of items you uploaded.');
          return true;
        }
        if (canManage && row.organisation_id && Number(row.organisation_id) !== Number(session.user.organisation_id || 0) && normalizeRole(session.user.role) !== 'admin') {
          sendError(response, 403, 'You cannot manage another municipality\'s repository items.');
          return true;
        }
        const now = new Date().toISOString();
        const publishedAt = nextStatus === 'published' ? (row.published_at || now) : row.published_at;
        const publishedByUserId = nextStatus === 'published' ? session.user.id : row.published_by_user_id;
        db.prepare('UPDATE repository_documents SET publication_status = ?, published_at = ?, published_by_user_id = ?, version = version + 1, updated_at = ? WHERE id = ?')
          .run(nextStatus, publishedAt, publishedByUserId, now, documentId);
        if (row.phase_id && row.result_type) {
          const publishedResultCount = Number(db.prepare(`
            SELECT COUNT(*) AS count FROM repository_documents
            WHERE phase_id = ? AND result_type IS NOT NULL AND publication_status = 'published'
          `).get(row.phase_id)?.count || 0);
          db.prepare('UPDATE hub_phases SET results_visible = ? WHERE id = ?')
            .run(publishedResultCount > 0 ? 1 : 0, row.phase_id);
        }
        addAudit(db, {
          actor: session.user, action: 'repository.item.status', targetType: 'repository_document',
          targetId: documentId, previousValue: { publicationStatus: row.publication_status },
          newValue: { publicationStatus: nextStatus },
        });
        const updated = db.prepare('SELECT * FROM repository_documents WHERE id = ?').get(documentId);
        sendJson(response, 200, { document: repositoryFromRow(updated) });
        return true;
      }

      if (method === 'GET' && pathname === '/api/forum/proposals') {
        const { user } = getSessionUser(db, request);
        const proposalId = Number(url.searchParams.get('proposal') || 0);
        const requestedInitiativeId = Number(url.searchParams.get('initiative') || 0);
        const initiative = resolveForumInitiative(db, user || null, { initiativeId: requestedInitiativeId, proposalId });
        if (!initiative) {
          sendError(response, 404, 'No accessible pilot Discuss and Decide space was found.', null, 'FORUM_PILOT_NOT_FOUND');
          return true;
        }
        const phaseScope = ['current', 'all', 'previous'].includes(url.searchParams.get('phaseScope'))
          ? url.searchParams.get('phaseScope')
          : 'current';
        const filters = {
          initiativeId: initiative.id,
          phaseScope,
          currentPhaseNumber: initiative.current_phase_number,
          phaseNumber: Number(url.searchParams.get('phase') || 0),
          itemType: String(url.searchParams.get('type') || ''),
          category: String(url.searchParams.get('category') || ''),
          status: String(url.searchParams.get('status') || ''),
          votingState: String(url.searchParams.get('voting') || ''),
        };
        const proposals = listProposals(db, user || null, filters);
        const allPilotProposals = listProposals(db, user || null, { initiativeId: initiative.id, phaseScope: 'all' });
        sendJson(response, 200, {
          proposals,
          context: forumContextPayload(db, user || null, initiative),
          facets: {
            itemTypes: [...new Set(allPilotProposals.map((item) => item.itemType).filter(Boolean))],
            categories: [...new Set(allPilotProposals.map((item) => item.category).filter(Boolean))],
            statuses: [...new Set(allPilotProposals.map((item) => item.workflowStatus).filter(Boolean))],
          },
        });
        return true;
      }

      const commentsMatch = pathname.match(/^\/api\/forum\/proposals\/(\d+)\/comments$/);
      if (commentsMatch && method === 'GET') {
        const proposalId = Number(commentsMatch[1]);
        const { user } = getSessionUser(db, request);
        const visibleProposal = db.prepare("SELECT id, initiative_id FROM forum_proposals WHERE id = ? AND COALESCE(moderation_status, 'visible') != 'hidden'").get(proposalId);
        if (!visibleProposal) { sendError(response, 404, 'Proposal not found.'); return true; }
        if (!resolveForumInitiative(db, user || null, { initiativeId: visibleProposal.initiative_id, proposalId })) {
          sendError(response, 404, 'Proposal not found.'); return true;
        }
        const comments = db.prepare(`
          SELECT c.id, c.body, c.created_at, c.parent_comment_id, u.full_name, u.role, u.avatar_data
          FROM forum_comments c JOIN users u ON u.id = c.user_id
          WHERE c.proposal_id = ? ORDER BY c.created_at ASC
        `).all(proposalId).map((row) => ({
          id: Number(row.id), body: row.body, createdAt: row.created_at,
          parentCommentId: row.parent_comment_id ? Number(row.parent_comment_id) : null,
          author: row.full_name, authorRole: row.role, authorAvatar: row.avatar_data || null,
        }));
        sendJson(response, 200, { comments });
        return true;
      }

      if (method === 'POST' && pathname === '/api/forum/proposals') {
        const session = requirePermission(db, request, response, 'forum:create-proposal');
        if (!session) return true;
        const body = await readJson(request);
        const title = String(body.title || '').trim();
        const description = String(body.description || '').trim();
        const tags = Array.isArray(body.tags) ? body.tags.map(String).slice(0, 3) : [];
        const fieldErrors = {};
        if (title.length < 8) fieldErrors.title = 'Use at least 8 characters for the proposal title.';
        if (description.length < 20) fieldErrors.description = 'Describe the proposal in at least 20 characters.';
        if (tags.length === 0) fieldErrors.tags = 'Select at least one topic.';
        if (Object.keys(fieldErrors).length) {
          sendError(response, 400, 'Please complete the proposal.', fieldErrors);
          return true;
        }
        const now = new Date().toISOString();
        const requestedInitiativeId = Number(body.initiativeId || 0);
        const initiative = requireForumParticipation(db, response, session.user, requestedInitiativeId);
        if (!initiative) return true;
        const creatorRole = normalizeRole(session.user.role);
        const workflowStatus = creatorRole === 'citizen' ? 'discussion_open' : 'draft';
        const legacyStatus = creatorRole === 'citizen' ? 'Open' : 'Under Review';
        const itemType = ['issue','proposal','design_alternative','finding','workshop_outcome','prototype'].includes(body.itemType)
          ? body.itemType : 'proposal';
        const votingMode = body.votingMode === 'binary' ? 'binary' : 'support';
        const category = String(body.category || tags[0] || '').trim() || null;
        const linkedOutput = body.linkedOutput && typeof body.linkedOutput === 'object' ? body.linkedOutput : {};
        const result = db.prepare(`
          INSERT INTO forum_proposals (
            user_id, title, description, tags_json, status, upvotes, downvotes,
            workflow_status, initiative_id, organisation_id, phase_number, item_type,
            category, workflow_step_id, voting_mode, linked_output_type, linked_output_id,
            linked_output_label, linked_output_url, source_proposal_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          session.user.id,
          title,
          description,
          JSON.stringify(tags),
          legacyStatus,
          workflowStatus,
          initiative.id,
          initiative.organisation_id || session.user.organisation_id || null,
          Number(initiative.current_phase_number || 1),
          itemType,
          category,
          body.workflowStepId ? Number(body.workflowStepId) : null,
          votingMode,
          String(linkedOutput.type || '').trim() || null,
          linkedOutput.id ? String(linkedOutput.id) : null,
          String(linkedOutput.label || '').trim() || null,
          String(linkedOutput.url || '').trim() || null,
          body.sourceProposalId ? Number(body.sourceProposalId) : null,
          now,
          now,
        );
        addProposalEvent(db, {
          proposalId: Number(result.lastInsertRowid), initiativeId: initiative.id,
          phaseNumber: Number(initiative.current_phase_number || 1), actorUserId: session.user.id,
          eventType: 'created', toStatus: workflowStatus, note: description, createdAt: now,
        });
        const proposal = listProposals(db, session.user, { initiativeId: initiative.id, phaseScope: 'all' })
          .find((item) => item.id === Number(result.lastInsertRowid));
        if (initiative?.id && workflowStatus === 'draft') {
          createWorkflowHandoff(db, {
            initiativeId: Number(initiative.id), phaseNumber: Number(initiative.current_phase_number || 1),
            itemType: 'proposal', itemId: Number(result.lastInsertRowid), fromRole: creatorRole,
            toRole: creatorRole, message: 'Proposal draft created and awaits preparation.', actorUserId: session.user.id, createdAt: now,
          });
        }
        sendJson(response, 201, { proposal });
        return true;
      }

      if (commentsMatch && method === 'POST') {
        const session = requirePermission(db, request, response, 'forum:comment');
        if (!session) return true;
        const proposalId = Number(commentsMatch[1]);
        const body = await readJson(request);
        const comment = String(body.body || '').trim();
        if (comment.length < 2 || comment.length > 2000) {
          sendError(response, 400, 'Comment must be between 2 and 2,000 characters.', { body: 'Enter a valid comment.' });
          return true;
        }
        const proposal = db.prepare(`
          SELECT p.id, p.user_id, p.title, p.moderation_status, p.workflow_status,
                 p.initiative_id, p.phase_number, u.pilot_site
          FROM forum_proposals p JOIN users u ON u.id = p.user_id
          WHERE p.id = ?
        `).get(proposalId);
        if (!proposal) {
          sendError(response, 404, 'Proposal not found.');
          return true;
        }
        if (!requireForumParticipation(db, response, session.user, proposal.initiative_id)) return true;
        if (proposal.moderation_status === 'locked' || proposal.moderation_status === 'hidden') {
          sendError(response, 409, proposal.moderation_status === 'locked' ? 'This discussion is locked and no longer accepts comments.' : 'This proposal is not available.');
          return true;
        }
        if (!['discussion_open', 'voting_open'].includes(proposal.workflow_status)) {
          sendError(response, 409, 'Discussion is not open for this proposal.', null, 'PROPOSAL_DISCUSSION_CLOSED');
          return true;
        }
        const parentCommentId = body.parentCommentId ? Number(body.parentCommentId) : null;
        let parentComment = null;
        if (parentCommentId) {
          parentComment = db.prepare('SELECT id, user_id FROM forum_comments WHERE id = ? AND proposal_id = ?').get(parentCommentId, proposalId);
          if (!parentComment) {
            sendError(response, 400, 'The comment you are replying to could not be found.', { parentCommentId: 'Choose a comment from this discussion.' });
            return true;
          }
        }
        const now = new Date().toISOString();
        const result = db.prepare('INSERT INTO forum_comments (proposal_id, user_id, body, created_at, parent_comment_id) VALUES (?, ?, ?, ?, ?)')
          .run(proposalId, session.user.id, comment, now, parentCommentId);
        const actionUrl = `/forum-voting?initiative=${proposal.initiative_id}&proposal=${proposalId}#proposal-${proposalId}`;
        createNotification(db, {
          userId: proposal.user_id, actorUserId: session.user.id, type: 'comment', eventType: 'proposal_comment',
          title: 'New comment on your proposal',
          body: `${session.user.full_name} commented on “${proposal.title}”.`,
          tag: 'Comment', pilot: proposal.pilot_site, actionUrl,
          payload: { actorName: session.user.full_name, proposalTitle: proposal.title }, createdAt: now,
        });
        if (parentComment && Number(parentComment.user_id) !== Number(proposal.user_id)) {
          createNotification(db, {
            userId: parentComment.user_id, actorUserId: session.user.id, type: 'reply', eventType: 'comment_reply',
            title: 'New reply to your comment',
            body: `${session.user.full_name} replied in “${proposal.title}”.`,
            tag: 'Reply', pilot: proposal.pilot_site, actionUrl,
            payload: { actorName: session.user.full_name, proposalTitle: proposal.title }, createdAt: now,
          });
        }
        sendJson(response, 201, {
          comment: { id: Number(result.lastInsertRowid), body: comment, parentCommentId, createdAt: now, author: session.user.full_name, authorRole: session.user.role, authorAvatar: session.user.avatar_data || null },
        });
        return true;
      }

      const proposalWorkflowMatch = pathname.match(/^\/api\/forum\/proposals\/(\d+)\/workflow$/);
      if (proposalWorkflowMatch && method === 'PATCH') {
        const session = requireUser(db, request, response);
        if (!session) return true;
        const proposalId = Number(proposalWorkflowMatch[1]);
        const body = await readJson(request);
        const nextStatus = String(body.workflowStatus || '').trim();
        const reviewNotes = String(body.reviewNotes || '').trim();
        const participationSummary = String(body.participationSummary || '').trim();
        const votingClosesAt = body.votingClosesAt ? String(body.votingClosesAt) : null;
        const proposal = db.prepare(`
          SELECT p.*, h.current_phase_number, h.organisation_id AS initiative_organisation_id
          FROM forum_proposals p LEFT JOIN hub_initiatives h ON h.id = p.initiative_id
          WHERE p.id = ?
        `).get(proposalId);
        if (!proposal) { sendError(response, 404, 'Proposal not found.'); return true; }
        const actorRole = normalizeRole(session.user.role);
        if (!['facilitator', 'municipality', 'admin'].includes(actorRole)) {
          sendError(response, 403, 'Your role cannot change the proposal workflow.');
          return true;
        }
        if (actorRole === 'municipality' && Number(proposal.organisation_id || proposal.initiative_organisation_id || 0) !== Number(session.user.organisation_id || 0)) {
          sendError(response, 403, 'You can update only proposals in your organisation.');
          return true;
        }
        if (actorRole === 'facilitator') {
          const assigned = proposal.initiative_id && db.prepare(`
            SELECT 1 FROM hub_participants WHERE initiative_id = ? AND user_id = ? AND assignment_role = 'facilitator'
          `).get(proposal.initiative_id, session.user.id);
          if (!assigned && Number(proposal.user_id) !== Number(session.user.id)) {
            sendError(response, 403, 'You can update only proposals for your assigned pilot.');
            return true;
          }
        }
        if (body.version !== undefined && Number(body.version) !== Number(proposal.version)) {
          sendError(response, 409, 'This proposal changed while you were reviewing it. Refresh and try again.');
          return true;
        }
        const allowed = proposalTransitionsFor(session.user.role, proposal.workflow_status);
        if (!allowed.includes(nextStatus)) {
          sendError(response, 409, 'This proposal transition is not available for your role.', { workflowStatus: `Allowed next states: ${allowed.join(', ') || 'none'}.` });
          return true;
        }
        if (nextStatus === 'needs_revision' && reviewNotes.length < 10) {
          sendError(response, 400, 'Explain what the Facilitator must revise.', { reviewNotes: 'Enter at least 10 characters.' });
          return true;
        }
        if (nextStatus === 'voting_open' && votingClosesAt && Number.isNaN(Date.parse(votingClosesAt))) {
          sendError(response, 400, 'Choose a valid voting closing date.', { votingClosesAt: 'Enter a valid date and time.' });
          return true;
        }
        if (nextStatus === 'decision_pending' && participationSummary.length < 20 && String(proposal.participation_summary || '').trim().length < 20) {
          sendError(response, 400, 'Add a participation summary before requesting a Municipality decision.', { participationSummary: 'Enter at least 20 characters.' });
          return true;
        }
        const legacyStatus = nextStatus === 'municipality_review' ? 'Under Review'
          : nextStatus === 'needs_revision' ? 'Needs Revision'
            : nextStatus === 'approved' ? 'Implemented'
              : nextStatus === 'declined' || nextStatus === 'archived' ? 'Rejected'
                : 'Open';
        const nextActor = nextStatus === 'municipality_review' || nextStatus === 'decision_pending' ? 'municipality'
          : nextStatus === 'needs_revision' || nextStatus === 'participation_closed' || nextStatus === 'draft' ? 'facilitator'
            : nextStatus === 'published' ? 'municipality'
              : nextStatus === 'discussion_open' || nextStatus === 'voting_open' ? 'citizen'
                : 'admin';
        const now = new Date().toISOString();
        db.exec('BEGIN IMMEDIATE');
        try {
          const update = db.prepare(`
            UPDATE forum_proposals SET workflow_status = ?, status = ?, participation_summary = ?,
              voting_closes_at = ?, updated_at = ?, version = version + 1
            WHERE id = ? AND version = ?
          `).run(
            nextStatus, legacyStatus,
            participationSummary || proposal.participation_summary || null,
            votingClosesAt || proposal.voting_closes_at || null,
            now, proposalId, proposal.version,
          );
          if (!update.changes) throw new Error('STALE_PROPOSAL');
          addProposalEvent(db, {
            proposalId,
            initiativeId: Number(proposal.initiative_id),
            phaseNumber: Number(proposal.phase_number || proposal.current_phase_number || 1),
            actorUserId: session.user.id,
            eventType: 'status_changed',
            fromStatus: proposal.workflow_status,
            toStatus: nextStatus,
            note: reviewNotes || participationSummary || null,
            createdAt: now,
          });
          addAudit(db, {
            actor: session.user, action: 'forum.proposal.workflow', targetType: 'forum_proposal', targetId: proposalId,
            previousValue: { workflowStatus: proposal.workflow_status, version: proposal.version },
            newValue: { workflowStatus: nextStatus, version: Number(proposal.version) + 1 },
            reason: reviewNotes || participationSummary || `Transitioned to ${nextStatus}`,
          });
          if (proposal.initiative_id) {
            createWorkflowHandoff(db, {
              initiativeId: Number(proposal.initiative_id), phaseNumber: Number(proposal.phase_number || proposal.current_phase_number || 1),
              itemType: 'proposal', itemId: proposalId, fromRole: actorRole, toRole: nextActor,
              message: `Proposal moved from ${proposal.workflow_status} to ${nextStatus}.`, actorUserId: session.user.id, createdAt: now,
            });
          }
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          if (error instanceof Error && error.message === 'STALE_PROPOSAL') {
            sendError(response, 409, 'This proposal changed while you were reviewing it. Refresh and try again.');
            return true;
          }
          throw error;
        }
        if (proposal.initiative_id) {
          notifyInitiativeRole(db, {
            initiativeId: Number(proposal.initiative_id), role: nextActor, actorUserId: session.user.id,
            eventType: 'proposal_workflow', title: 'Proposal action required',
            body: `“${proposal.title}” moved to ${nextStatus}.`,
            actionUrl: `/forum-voting?initiative=${proposal.initiative_id}&proposal=${proposalId}#proposal-${proposalId}`,
            payload: { proposalId, proposalTitle: proposal.title, workflowStatus: nextStatus }, createdAt: now,
          });
        }
        sendJson(response, 200, {
          proposal: listProposals(db, session.user, { initiativeId: proposal.initiative_id, phaseScope: 'all' })
            .find((item) => item.id === proposalId),
        });
        return true;
      }

      const proposalStatusMatch = pathname.match(/^\/api\/forum\/proposals\/(\d+)\/status$/);
      if (proposalStatusMatch && method === 'PATCH') {
        const session = requirePermission(db, request, response, 'forum:official-decision');
        if (!session) return true;
        const proposalId = Number(proposalStatusMatch[1]);
        const body = await readJson(request);
        const nextStatus = String(body.status || '');
        const rationale = String(body.rationale || '').trim();
        if (!['Implemented', 'Rejected', 'Needs Revision'].includes(nextStatus)) {
          sendError(response, 400, 'Choose a valid official decision.', { status: 'Select Approved, Declined, or Needs Revision.' });
          return true;
        }
        if (rationale.length < 20) {
          sendError(response, 400, 'Explain the reason for this official decision and what happens next.', { rationale: 'Enter at least 20 characters.' });
          return true;
        }
        const proposal = db.prepare(`
          SELECT p.id, p.user_id, p.title, p.status, p.workflow_status, p.version, p.organisation_id,
                 p.initiative_id, p.phase_number, u.pilot_site
          FROM forum_proposals p JOIN users u ON u.id = p.user_id WHERE p.id = ?
        `).get(proposalId);
        if (!proposal) { sendError(response, 404, 'Proposal not found.'); return true; }
        if (proposal.workflow_status !== 'decision_pending') {
          sendError(response, 409, 'Close participation and submit the participation summary before recording an official decision.', null, 'PROPOSAL_DECISION_NOT_READY');
          return true;
        }
        const actorRole = normalizeRole(session.user.role);
        if (actorRole === 'municipality' && Number(proposal.organisation_id || 0) !== Number(session.user.organisation_id || 0)) {
          sendError(response, 403, 'You can make official decisions only for proposals in your organisation.');
          return true;
        }
        if (body.version !== undefined && Number(body.version) !== Number(proposal.version)) {
          sendError(response, 409, 'This proposal changed while you were reviewing it. Refresh and try again.', {
            version: 'A newer proposal version is available.',
          });
          return true;
        }
        if (proposal.status !== nextStatus) {
          const now = new Date().toISOString();
          const decision = nextStatus === 'Needs Revision' || nextStatus === 'Under Review'
            ? 'under_review'
            : nextStatus === 'Rejected' ? 'declined' : 'approved';
          const workflowStatus = nextStatus === 'Under Review' ? 'municipality_review'
            : nextStatus === 'Needs Revision' ? 'needs_revision'
              : nextStatus === 'Implemented' ? 'approved'
                : nextStatus === 'Rejected' ? 'declined'
                  : 'discussion_open';
          db.exec('BEGIN IMMEDIATE');
          try {
            const update = db.prepare(`
              UPDATE forum_proposals
              SET status = ?, workflow_status = ?, official_response = ?, decision_at = ?, updated_at = ?, version = version + 1
              WHERE id = ? AND version = ?
            `).run(nextStatus, workflowStatus, rationale, ['approved','declined'].includes(workflowStatus) ? now : null, now, proposalId, proposal.version);
            if (!update.changes) throw new Error('STALE_PROPOSAL');
            addProposalEvent(db, {
              proposalId,
              initiativeId: Number(proposal.initiative_id),
              phaseNumber: Number(proposal.phase_number || 1),
              actorUserId: session.user.id,
              eventType: 'official_decision',
              fromStatus: proposal.workflow_status,
              toStatus: workflowStatus,
              note: rationale,
              createdAt: now,
            });
            db.prepare(`
              INSERT INTO forum_official_decisions (
                proposal_id, organisation_id, actor_user_id, decision,
                previous_status, rationale, reference, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              proposalId,
              proposal.organisation_id || session.user.organisation_id || null,
              session.user.id,
              decision,
              proposal.status,
              rationale,
              String(body.reference || '').trim() || null,
              now,
            );
            addAudit(db, {
              actor: session.user,
              action: 'forum.proposal.official_decision',
              targetType: 'forum_proposal',
              targetId: proposalId,
              previousValue: { status: proposal.status, version: proposal.version },
              newValue: { status: nextStatus, version: Number(proposal.version) + 1 },
              reason: rationale,
            });
            if (proposal.initiative_id) {
              createWorkflowHandoff(db, {
                initiativeId: Number(proposal.initiative_id),
                phaseNumber: Number(proposal.phase_number || 1),
                itemType: 'proposal',
                itemId: proposalId,
                fromRole: actorRole,
                toRole: workflowStatus === 'needs_revision' ? 'facilitator' : 'citizen',
                message: `Proposal status changed to ${workflowStatus}.`,
                actorUserId: session.user.id,
                createdAt: now,
              });
            }
            db.exec('COMMIT');
          } catch (error) {
            db.exec('ROLLBACK');
            if (error instanceof Error && error.message === 'STALE_PROPOSAL') {
              sendError(response, 409, 'This proposal changed while you were reviewing it. Refresh and try again.');
              return true;
            }
            throw error;
          }
          createNotification(db, {
            userId: proposal.user_id, actorUserId: session.user.id, type: 'proposal', eventType: 'proposal_status',
            title: 'Proposal status updated',
            body: `“${proposal.title}” is now ${nextStatus}.`,
            tag: nextStatus, pilot: proposal.pilot_site,
            actionUrl: `/forum-voting?initiative=${proposal.initiative_id}&proposal=${proposalId}#proposal-${proposalId}`,
            payload: { proposalTitle: proposal.title, status: nextStatus }, createdAt: now,
          });
        }
        sendJson(response, 200, {
          proposal: listProposals(db, session.user, { initiativeId: proposal.initiative_id, phaseScope: 'all' })
            .find((item) => item.id === proposalId),
        });
        return true;
      }

      const proposalReportMatch = pathname.match(/^\/api\/forum\/proposals\/(\d+)\/report$/);
      if (proposalReportMatch && method === 'POST') {
        const session = requirePermission(db, request, response, 'forum:view');
        if (!session) return true;
        const proposalId = Number(proposalReportMatch[1]);
        const proposal = db.prepare("SELECT id FROM forum_proposals WHERE id = ? AND COALESCE(moderation_status, 'visible') != 'hidden'").get(proposalId);
        if (!proposal) { sendError(response, 404, 'Proposal not found.'); return true; }
        const body = await readJson(request);
        const reason = String(body.reason || '').trim();
        const details = String(body.details || '').trim();
        if (!['spam', 'abuse', 'misinformation', 'privacy', 'other'].includes(reason)) {
          sendError(response, 400, 'Select a reason for this report.', { reason: 'Choose a report reason.' });
          return true;
        }
        const now = new Date().toISOString();
        try {
          const result = db.prepare(`INSERT INTO forum_reports (proposal_id, reporter_user_id, reason, details, created_at) VALUES (?, ?, ?, ?, ?)`)
            .run(proposalId, session.user.id, reason, details || null, now);
          sendJson(response, 201, { report: { id: Number(result.lastInsertRowid), proposalId, status: 'open' } });
        } catch (error) {
          if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            sendError(response, 409, 'You have already reported this proposal.');
            return true;
          }
          throw error;
        }
        return true;
      }

      const proposalModerationMatch = pathname.match(/^\/api\/forum\/proposals\/(\d+)\/moderation$/);
      if (proposalModerationMatch && method === 'PATCH') {
        const session = requirePermission(db, request, response, 'forum:moderate');
        if (!session) return true;
        const proposalId = Number(proposalModerationMatch[1]);
        const body = await readJson(request);
        const moderationStatus = String(body.moderationStatus || '');
        const reason = String(body.reason || '').trim();
        if (!['visible', 'locked', 'hidden'].includes(moderationStatus)) {
          sendError(response, 400, 'Choose a valid moderation action.', { moderationStatus: 'Select visible, locked, or hidden.' });
          return true;
        }
        if (moderationStatus !== 'visible' && reason.length < 8) {
          sendError(response, 400, 'Explain why this proposal is being moderated.', { reason: 'Enter at least 8 characters.' });
          return true;
        }
        const proposal = db.prepare('SELECT id, organisation_id, moderation_status, moderation_reason FROM forum_proposals WHERE id = ?').get(proposalId);
        if (!proposal) { sendError(response, 404, 'Proposal not found.'); return true; }
        if (normalizeRole(session.user.role) === 'municipality' && Number(proposal.organisation_id || 0) !== Number(session.user.organisation_id || 0)) {
          sendError(response, 403, 'You can moderate only proposals in your organisation.');
          return true;
        }
        const now = new Date().toISOString();
        db.prepare('UPDATE forum_proposals SET moderation_status=?, moderation_reason=?, moderated_at=?, moderated_by_user_id=?, updated_at=?, version=version+1 WHERE id=?')
          .run(moderationStatus, moderationStatus === 'visible' ? null : reason, now, session.user.id, now, proposalId);
        db.prepare("UPDATE forum_reports SET status='reviewed', reviewed_at=?, reviewed_by_user_id=? WHERE proposal_id=? AND status='open'")
          .run(now, session.user.id, proposalId);
        addAudit(db, {
          actor: session.user, action: 'forum.proposal.moderate', targetType: 'forum_proposal', targetId: proposalId,
          previousValue: { moderationStatus: proposal.moderation_status, reason: proposal.moderation_reason },
          newValue: { moderationStatus, reason: moderationStatus === 'visible' ? null : reason }, reason: reason || 'Restored to public view',
        });
        sendJson(response, 200, { proposal: { id: proposalId, moderationStatus } });
        return true;
      }

      const voteMatch = pathname.match(/^\/api\/forum\/proposals\/(\d+)\/vote$/);
      if (voteMatch && method === 'POST') {
        const session = requirePermission(db, request, response, 'forum:vote');
        if (!session) return true;
        const proposalId = Number(voteMatch[1]);
        const body = await readJson(request);
        if (!['up', 'down', null].includes(body.direction)) {
          sendError(response, 400, 'Vote direction must be up, down, or null.');
          return true;
        }
        const proposal = db.prepare('SELECT * FROM forum_proposals WHERE id = ?').get(proposalId);
        if (!proposal) { sendError(response, 404, 'Proposal not found.'); return true; }
        const initiative = requireForumParticipation(db, response, session.user, proposal.initiative_id);
        if (!initiative) return true;
        if (proposal.moderation_status === 'locked' || proposal.moderation_status === 'hidden') {
          sendError(response, 409, proposal.moderation_status === 'locked' ? 'Voting is closed for this proposal.' : 'This proposal is not available.');
          return true;
        }
        const votingMode = proposal.voting_mode || 'support';
        const votingIsOpen = votingMode === 'support'
          ? ['published', 'discussion_open', 'voting_open'].includes(proposal.workflow_status)
          : proposal.workflow_status === 'voting_open';
        if (!votingIsOpen) {
          sendError(response, 409, 'Voting is not open for this proposal.', null, 'PROPOSAL_VOTING_CLOSED');
          return true;
        }
        if (votingMode === 'support' && body.direction === 'down') {
          sendError(response, 400, 'Lightweight support accepts only support or removal of support.', null, 'INVALID_SUPPORT_DIRECTION');
          return true;
        }
        const previous = db.prepare('SELECT direction FROM forum_votes WHERE proposal_id = ? AND user_id = ?').get(proposalId, session.user.id)?.direction || null;
        const next = previous === body.direction ? null : body.direction;
        let upvotes = Number(proposal.upvotes);
        let downvotes = Number(proposal.downvotes);
        if (previous === 'up') upvotes = Math.max(0, upvotes - 1);
        if (previous === 'down') downvotes = Math.max(0, downvotes - 1);
        if (next === 'up') upvotes += 1;
        if (next === 'down') downvotes += 1;
        const now = new Date().toISOString();
        db.exec('BEGIN IMMEDIATE');
        try {
          db.prepare('UPDATE forum_proposals SET upvotes = ?, downvotes = ?, updated_at = ? WHERE id = ?')
            .run(upvotes, downvotes, now, proposalId);
          if (next) {
            db.prepare(`
              INSERT INTO forum_votes (proposal_id, user_id, direction, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(proposal_id, user_id) DO UPDATE SET direction = excluded.direction, updated_at = excluded.updated_at
            `).run(proposalId, session.user.id, next, now, now);
          } else {
            db.prepare('DELETE FROM forum_votes WHERE proposal_id = ? AND user_id = ?').run(proposalId, session.user.id);
          }
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        const totalVotes = upvotes + downvotes;
        sendJson(response, 200, { userVote: next, upvotes, downvotes, totalVotes, supportPct: Math.round((upvotes / Math.max(totalVotes, 1)) * 100) });
        return true;
      }

      if (method === 'GET' && pathname === '/api/citivoice') {
        const metrics = db.prepare('SELECT * FROM citivoice_metrics ORDER BY rowid').all().map((row) => ({
          key: row.metric_key, value: Number(row.metric_value), label: row.metric_label,
          periodLabel: row.period_label, updatedAt: row.updated_at,
        }));
        const data = Object.fromEntries(db.prepare("SELECT data_key, payload_json FROM dashboard_data WHERE page = 'citivoice'").all().map((row) => [row.data_key, JSON.parse(row.payload_json)]));
        sendJson(response, 200, { metrics, data });
        return true;
      }

      if (method === 'GET' && pathname === '/api/scene-state') {
        const { user: guestOrUser } = getSessionUser(db, request);
        if (!guestOrUser) { sendJson(response, 200, { state: {}, updatedAt: null }); return true; }
        const row = db.prepare('SELECT state_json, updated_at FROM scene_states WHERE user_id = ?').get(guestOrUser.id);
        sendJson(response, 200, { state: row ? JSON.parse(row.state_json || '{}') : {}, updatedAt: row?.updated_at || null });
        return true;
      }

      if (pathname === '/api/guide-progress' && (method === 'GET' || method === 'PATCH')) {
        const session = requireUser(db, request, response);
        if (!session) return true;
        const readProgress = () => {
          const row = db.prepare('SELECT * FROM user_guide_progress WHERE user_id = ?').get(session.user.id);
          return {
            tourVersion: row ? Number(row.tour_version) : 0,
            lastStepIndex: row ? Number(row.last_step_index) : 0,
            completedAt: row?.completed_at || null,
            skippedAt: row?.skipped_at || null,
          };
        };
        if (method === 'GET') {
          sendJson(response, 200, { progress: readProgress() });
          return true;
        }
        const body = await readJson(request);
        const now = new Date().toISOString();
        const lastStepIndex = Number.isFinite(Number(body.lastStepIndex)) ? Math.max(0, Number(body.lastStepIndex)) : 0;
        const tourVersion = Number.isFinite(Number(body.tourVersion)) ? Number(body.tourVersion) : 1;
        db.prepare(`
          INSERT INTO user_guide_progress (user_id, tour_version, last_step_index, completed_at, skipped_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            tour_version = excluded.tour_version,
            last_step_index = excluded.last_step_index,
            completed_at = excluded.completed_at,
            skipped_at = excluded.skipped_at,
            updated_at = excluded.updated_at
        `).run(
          session.user.id, tourVersion, lastStepIndex,
          body.completed ? now : null,
          body.skipped ? now : null,
          now,
        );
        sendJson(response, 200, { progress: readProgress() });
        return true;
      }

      if (method === 'GET' && pathname === '/api/scenarios') {
        // Public: the Scenarios page is informational. Guests and citizens only ever see
        // published scenarios; staff roles additionally see in-preparation/ongoing drafts.
        const { user: scenarioViewer } = getSessionUser(db, request);
        const includeDrafts = Boolean(scenarioViewer) && normalizeRole(scenarioViewer.role) !== 'citizen';
        sendJson(response, 200, { scenarios: listScenarios(db, scenarioViewer ? Number(scenarioViewer.id) : 0, { includeDrafts }) });
        return true;
      }

      const session = requireUser(db, request, response);
      if (!session) return true;
      const userId = Number(session.user.id);

      if (method === 'POST' && pathname === '/api/scenarios') {
        if (normalizeRole(session.user.role) === 'citizen') {
          sendError(response, 403, 'Scenarios are authored from documented pilot implementations, not citizen submissions.');
          return true;
        }
        const body = await readJson(request);
        const title = String(body.title || '').trim();
        const summary = String(body.summary || '').trim();
        const tags = Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean).slice(0, 4) : [];
        const fieldErrors = {};
        if (title.length < 8 || title.length > 120) fieldErrors.title = 'Use between 8 and 120 characters.';
        if (summary.length < 30 || summary.length > 1200) fieldErrors.summary = 'Use between 30 and 1,200 characters.';
        if (tags.length === 0) fieldErrors.tags = 'Select at least one topic.';
        if (Object.keys(fieldErrors).length) {
          sendError(response, 400, 'Please complete the scenario proposal.', fieldErrors);
          return true;
        }
        const now = new Date().toISOString();
        const result = db.prepare(`
          INSERT INTO scenarios (
            user_id, slug, title, summary, tags_json, strengths_json, concerns_json,
            phase, status, guidance, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, '[]', '[]', 3, 'Community Review', ?, ?, ?)
        `).run(userId, makeSlug(title), title, summary, JSON.stringify(tags), 'Community members can review and vote on this proposal.', now, now);
        const scenario = listScenarios(db, userId).find((item) => item.id === Number(result.lastInsertRowid));
        sendJson(response, 201, { scenario });
        return true;
      }

      const scenarioVoteMatch = pathname.match(/^\/api\/scenarios\/(\d+)\/vote$/);
      if (scenarioVoteMatch && method === 'POST') {
        const scenarioId = Number(scenarioVoteMatch[1]);
        const body = await readJson(request);
        if (!['up', 'down', null].includes(body.direction)) {
          sendError(response, 400, 'Vote direction must be up, down, or null.');
          return true;
        }
        const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(scenarioId);
        if (!scenario) { sendError(response, 404, 'Scenario not found.'); return true; }
        const previous = db.prepare('SELECT direction FROM scenario_votes WHERE scenario_id = ? AND user_id = ?').get(scenarioId, userId)?.direction || null;
        const next = previous === body.direction ? null : body.direction;
        let upvotes = Number(scenario.upvotes);
        let downvotes = Number(scenario.downvotes);
        if (previous === 'up') upvotes = Math.max(0, upvotes - 1);
        if (previous === 'down') downvotes = Math.max(0, downvotes - 1);
        if (next === 'up') upvotes += 1;
        if (next === 'down') downvotes += 1;
        const now = new Date().toISOString();
        db.exec('BEGIN IMMEDIATE');
        try {
          db.prepare('UPDATE scenarios SET upvotes = ?, downvotes = ?, updated_at = ? WHERE id = ?').run(upvotes, downvotes, now, scenarioId);
          if (next) {
            db.prepare(`
              INSERT INTO scenario_votes (scenario_id, user_id, direction, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(scenario_id, user_id) DO UPDATE SET direction = excluded.direction, updated_at = excluded.updated_at
            `).run(scenarioId, userId, next, now, now);
          } else {
            db.prepare('DELETE FROM scenario_votes WHERE scenario_id = ? AND user_id = ?').run(scenarioId, userId);
          }
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        sendJson(response, 200, { userVote: next, upvotes, downvotes });
        return true;
      }

      const scenarioAdoptMatch = pathname.match(/^\/api\/scenarios\/(\d+)\/adopt$/);
      if (scenarioAdoptMatch && method === 'POST') {
        const scenarioId = Number(scenarioAdoptMatch[1]);
        const body = await readJson(request);
        if (!db.prepare('SELECT id FROM scenarios WHERE id = ?').get(scenarioId)) {
          sendError(response, 404, 'Scenario not found.');
          return true;
        }
        const adopted = body.adopted !== false;
        if (adopted) {
          db.prepare('INSERT OR IGNORE INTO scenario_adoptions (scenario_id, user_id, created_at) VALUES (?, ?, ?)')
            .run(scenarioId, userId, new Date().toISOString());
        } else {
          db.prepare('DELETE FROM scenario_adoptions WHERE scenario_id = ? AND user_id = ?').run(scenarioId, userId);
        }
        sendJson(response, 200, { adopted });
        return true;
      }

      if (method === 'PUT' && pathname === '/api/scene-state') {
        const body = await readJson(request);
        const state = body.state && typeof body.state === 'object' ? body.state : {};
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO scene_states (user_id, state_json, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
        `).run(userId, JSON.stringify(state), now);
        sendJson(response, 200, { saved: true, updatedAt: now });
        return true;
      }

      if (method === 'GET' && pathname === '/api/profile') {
        sendJson(response, 200, { user: serializeUser(session.user) });
        return true;
      }

      if (method === 'PATCH' && pathname === '/api/profile') {
        const body = await readJson(request);
        const current = session.user;
        const updates = {};
        const fieldErrors = {};

        if ('fullName' in body) {
          const fullName = String(body.fullName || '').trim();
          if (fullName.length < 2) fieldErrors.fullName = 'Enter your full name.';
          else updates.full_name = fullName;
        }
        if ('email' in body) {
          const email = normalizeEmail(body.email);
          if (!isValidEmail(email)) fieldErrors.email = 'Enter a valid email address.';
          else if (db.prepare('SELECT id FROM users WHERE email = ? AND id <> ?').get(email, userId)) fieldErrors.email = 'Email is already registered.';
          else updates.email = email;
        }
        if ('phone' in body) {
          const phone = String(body.phone || '').trim();
          if (phone.length > 40) fieldErrors.phone = 'Telephone number is too long.';
          else updates.phone = phone;
        }
        if ('pilotSite' in body) {
          const pilotSite = String(body.pilotSite || '').trim();
          if (!pilotSite) fieldErrors.pilotSite = 'Select a pilot site.';
          else updates.pilot_site = pilotSite;
        }
        if ('locale' in body) {
          if (!LOCALES.has(body.locale)) fieldErrors.locale = 'Select a supported language.';
          else updates.locale = body.locale;
        }
        if ('profileVisibility' in body) {
          if (!['private', 'public'].includes(body.profileVisibility)) fieldErrors.profileVisibility = 'Select private or public.';
          else updates.profile_visibility = body.profileVisibility;
        }
        if ('usageAnalytics' in body) updates.usage_analytics = body.usageAnalytics ? 1 : 0;
        if ('personalizedRecommendations' in body) updates.personalized_recommendations = body.personalizedRecommendations ? 1 : 0;
        if ('avatarData' in body) {
          if (body.avatarData === null || body.avatarData === '') updates.avatar_data = null;
          else {
            const avatarData = String(body.avatarData);
            if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarData)) fieldErrors.avatarData = 'Choose a PNG, JPEG, or WebP image.';
            else if (avatarData.length > 750_000) fieldErrors.avatarData = 'Profile image must be 500 KB or smaller.';
            else updates.avatar_data = avatarData;
          }
        }

        if (body.newPassword) {
          const currentMatches = await verifyPassword(String(body.currentPassword || ''), current.password_hash);
          if (!currentMatches) fieldErrors.currentPassword = 'Current password is incorrect.';
          const passwordError = validatePassword(body.newPassword);
          if (passwordError) fieldErrors.newPassword = passwordError;
          if (!fieldErrors.currentPassword && !fieldErrors.newPassword) updates.password_hash = await hashPassword(body.newPassword);
        }

        if (Object.keys(fieldErrors).length) {
          sendError(response, 400, 'Please correct the highlighted fields.', fieldErrors);
          return true;
        }
        const keys = Object.keys(updates);
        if (keys.length) {
          updates.updated_at = new Date().toISOString();
          const assignments = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
          db.prepare(`UPDATE users SET ${assignments} WHERE id = ?`).run(...Object.values(updates), userId);
        }
        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        sendJson(response, 200, { user: serializeUser(updatedUser) });
        return true;
      }

      if (method === 'GET' && pathname === '/api/profile/export') {
        const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId).map(notificationFromRow);
        const proposals = db.prepare('SELECT id, title, description, status, created_at FROM forum_proposals WHERE user_id = ?').all(userId);
        const comments = db.prepare('SELECT proposal_id, body, created_at FROM forum_comments WHERE user_id = ?').all(userId);
        sendJson(response, 200, { exportedAt: new Date().toISOString(), user: serializeUser(session.user), notifications, proposals, comments });
        return true;
      }

      if (method === 'GET' && pathname === '/api/notifications') {
        const query = String(url.searchParams.get('q') || '').trim();
        const filter = url.searchParams.get('filter') || 'all';
        const clauses = ['user_id = ?'];
        const params = [userId];
        if (filter === 'unread') clauses.push('is_read = 0', 'archived = 0');
        else if (filter === 'archived') clauses.push('archived = 1');
        else clauses.push('archived = 0');
        if (query) {
          clauses.push('(title LIKE ? OR body LIKE ? OR tag LIKE ? OR pilot LIKE ?)');
          params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
        }
        const notifications = db.prepare(`SELECT * FROM notifications WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`).all(...params).map(notificationFromRow);
        const counts = db.prepare(`
          SELECT
            SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END) AS total,
            SUM(CASE WHEN archived = 0 AND is_read = 0 THEN 1 ELSE 0 END) AS unread,
            SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) AS archived
          FROM notifications WHERE user_id = ?
        `).get(userId);
        sendJson(response, 200, { notifications, counts: { total: Number(counts.total || 0), unread: Number(counts.unread || 0), archived: Number(counts.archived || 0) } });
        return true;
      }

      if (method === 'POST' && pathname === '/api/notifications/read-all') {
        const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND archived = 0 AND is_read = 0').run(userId);
        sendJson(response, 200, { updated: Number(result.changes) });
        return true;
      }

      const notificationMatch = pathname.match(/^\/api\/notifications\/(\d+)$/);
      if (notificationMatch && method === 'PATCH') {
        const notificationId = Number(notificationMatch[1]);
        const body = await readJson(request);
        const current = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(notificationId, userId);
        if (!current) { sendError(response, 404, 'Notification not found.'); return true; }
        const isRead = 'isRead' in body ? (body.isRead ? 1 : 0) : current.is_read;
        const archived = 'archived' in body ? (body.archived ? 1 : 0) : current.archived;
        db.prepare('UPDATE notifications SET is_read = ?, archived = ? WHERE id = ? AND user_id = ?').run(isRead, archived, notificationId, userId);
        const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId);
        sendJson(response, 200, { notification: notificationFromRow(updated) });
        return true;
      }

      if (method === 'GET' && pathname === '/api/insights') {
        const metrics = db.prepare('SELECT * FROM insight_metrics ORDER BY category, metric_key').all().map((row) => ({
          key: row.metric_key, value: Number(row.metric_value), label: row.metric_label,
          category: row.category, updatedAt: row.updated_at,
        }));
        const data = Object.fromEntries(db.prepare("SELECT data_key, payload_json FROM dashboard_data WHERE page = 'insights'").all().map((row) => [row.data_key, JSON.parse(row.payload_json)]));
        sendJson(response, 200, { metrics, data });
        return true;
      }

      if (method === 'GET' && pathname === '/api/citivoice') {
        const metrics = db.prepare('SELECT * FROM citivoice_metrics ORDER BY rowid').all().map((row) => ({
          key: row.metric_key, value: Number(row.metric_value), label: row.metric_label,
          periodLabel: row.period_label, updatedAt: row.updated_at,
        }));
        const data = Object.fromEntries(db.prepare("SELECT data_key, payload_json FROM dashboard_data WHERE page = 'citivoice'").all().map((row) => [row.data_key, JSON.parse(row.payload_json)]));
        sendJson(response, 200, { metrics, data });
        return true;
      }

      if (method === 'GET' && pathname === '/api/results') {
        const documentCount = Number(db.prepare('SELECT COUNT(*) AS count FROM repository_documents').get().count);
        const proposalCount = Number(db.prepare('SELECT COUNT(*) AS count FROM forum_proposals').get().count);
        const contributionMetric = db.prepare("SELECT metric_value FROM insight_metrics WHERE metric_key = 'contributions'").get();
        sendJson(response, 200, { documentCount, proposalCount, contributionCount: Number(contributionMetric?.metric_value || 0) });
        return true;
      }

      sendError(response, 404, 'API endpoint not found.');
      return true;
    } catch (error) {
      const status = Number(error?.status || 500);
      if (status >= 500) console.error('[SPICE API]', error);
      sendError(response, status, status >= 500 ? 'An unexpected server error occurred.' : error.message);
      return true;
    }
  };

  handler.db = db;
  return handler;
}
