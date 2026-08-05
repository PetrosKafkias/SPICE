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

const SESSION_COOKIE = 'spice_session';
const MAX_BODY_SIZE = 1_000_000;
const REGISTRATION_ROLES = new Set(['Citizen', 'Facilitator', 'Municipality Staff', 'Researcher']);
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

function sendError(response, status, message, fieldErrors) {
  sendJson(response, status, { error: message, ...(fieldErrors ? { fieldErrors } : {}) });
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
  createdAt = new Date().toISOString(),
}) {
  if (!userId || Number(userId) === Number(actorUserId)) return null;
  return db.prepare(`
    INSERT INTO notifications (
      user_id, actor_user_id, type, event_type, title, body, tag, pilot,
      action_url, is_read, archived, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `).run(userId, actorUserId, type, eventType, title, body, tag, pilot, actionUrl, createdAt);
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
    upvotes,
    downvotes,
    totalVotes,
    supportPct: Math.round((upvotes / Math.max(totalVotes, 1)) * 100),
    officialResponse: row.official_response,
    comments: Number(row.comments_count || 0),
    userVote: row.user_vote || null,
    author: row.author_name,
    authorRole: row.author_role,
    authorAvatar: row.author_avatar || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listProposals(db, userId = 0) {
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
    ORDER BY p.created_at DESC
  `).all(userId).map(proposalFromRow);
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
    userVote: row.user_vote || null,
    adopted: Boolean(row.adopted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listScenarios(db, userId) {
  return db.prepare(`
    SELECT
      s.*,
      v.direction AS user_vote,
      CASE WHEN a.scenario_id IS NULL THEN 0 ELSE 1 END AS adopted
    FROM scenarios s
    LEFT JOIN scenario_votes v ON v.scenario_id = s.id AND v.user_id = ?
    LEFT JOIN scenario_adoptions a ON a.scenario_id = s.id AND a.user_id = ?
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
          sendError(response, 409, 'An account with this email already exists.', { email: 'Email is already registered.' });
          return true;
        }

        const now = new Date().toISOString();
        const passwordHash = await hashPassword(password);
        const verificationToken = createSessionToken();
        db.exec('BEGIN IMMEDIATE');
        try {
        const result = db.prepare(`
          INSERT INTO users (
            full_name, email, password_hash, role, pilot_site, phone, locale, created_at, updated_at, email_verified_at
          ) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, NULL)
        `).run(fullName, email, passwordHash, role, pilotSite, locale, now, now);
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
          message: 'Account created successfully. Please check your email to verify your account.',
          email,
          delivery: delivery.delivery,
          ...(delivery.previewUrl ? { verificationPreviewUrl: delivery.previewUrl } : {}),
        });
        } catch (error) {
          db.exec('ROLLBACK');
          console.error('Unable to create account verification email:', error);
          sendError(response, 502, 'We could not send the verification email. Please try again.');
        }
        return true;
      }

      if (method === 'POST' && pathname === '/api/auth/verify-email') {
        const body = await readJson(request);
        const tokenHash = hashSessionToken(String(body.token || ''));
        const now = new Date().toISOString();
        const verification = db.prepare(`SELECT * FROM email_verification_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`).get(tokenHash, now);
        if (!verification) {
          sendError(response, 400, 'This verification link is invalid or has expired.');
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
          sendError(response, 429, 'Too many sign-in attempts. Please try again later.');
          return true;
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        const passwordMatches = await verifyPassword(password, user?.password_hash || dummyPasswordHash);
        if (!user || !passwordMatches) {
          const next = attempt && attempt.resetAt > Date.now()
            ? { count: attempt.count + 1, resetAt: attempt.resetAt }
            : { count: 1, resetAt: Date.now() + 15 * 60 * 1000 };
          signInAttempts.set(attemptKey, next);
          sendError(response, 401, 'The email or password is incorrect.');
          return true;
        }

        if (!user.email_verified_at) {
          sendError(response, 403, 'Please verify your email address before signing in.');
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
        const query = String(url.searchParams.get('q') || '').trim();
        const clauses = [];
        const params = [];
        if (phase >= 1 && phase <= 5) { clauses.push('phase = ?'); params.push(phase); }
        if (query) { clauses.push('(title LIKE ? OR description LIKE ? OR pilot LIKE ?)'); params.push(`%${query}%`, `%${query}%`, `%${query}%`); }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const documents = db.prepare(`SELECT * FROM repository_documents ${where} ORDER BY updated_at DESC`).all(...params).map((row) => ({
          id: Number(row.id), title: row.title, description: row.description, phase: Number(row.phase),
          documentType: row.document_type, pilot: row.pilot, fileFormat: row.file_format,
          tags: JSON.parse(row.tags_json || '[]'), updatedAt: row.updated_at,
        }));
        sendJson(response, 200, { documents, total: documents.length });
        return true;
      }

      if (method === 'GET' && pathname === '/api/forum/proposals') {
        const { user } = getSessionUser(db, request);
        sendJson(response, 200, { proposals: listProposals(db, user ? Number(user.id) : 0) });
        return true;
      }

      const commentsMatch = pathname.match(/^\/api\/forum\/proposals\/(\d+)\/comments$/);
      if (commentsMatch && method === 'GET') {
        const proposalId = Number(commentsMatch[1]);
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
        const session = requireUser(db, request, response);
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
        const result = db.prepare(`
          INSERT INTO forum_proposals (
            user_id, title, description, tags_json, status, upvotes, downvotes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'Open', 0, 0, ?, ?)
        `).run(session.user.id, title, description, JSON.stringify(tags), now, now);
        const proposal = listProposals(db, Number(session.user.id)).find((item) => item.id === Number(result.lastInsertRowid));
        sendJson(response, 201, { proposal });
        return true;
      }

      if (commentsMatch && method === 'POST') {
        const session = requireUser(db, request, response);
        if (!session) return true;
        const proposalId = Number(commentsMatch[1]);
        const body = await readJson(request);
        const comment = String(body.body || '').trim();
        if (comment.length < 2 || comment.length > 2000) {
          sendError(response, 400, 'Comment must be between 2 and 2,000 characters.', { body: 'Enter a valid comment.' });
          return true;
        }
        const proposal = db.prepare(`
          SELECT p.id, p.user_id, p.title, u.pilot_site
          FROM forum_proposals p JOIN users u ON u.id = p.user_id
          WHERE p.id = ?
        `).get(proposalId);
        if (!proposal) {
          sendError(response, 404, 'Proposal not found.');
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
        const actionUrl = `/forum-voting?proposal=${proposalId}#proposal-${proposalId}`;
        createNotification(db, {
          userId: proposal.user_id, actorUserId: session.user.id, type: 'comment', eventType: 'proposal_comment',
          title: 'New comment on your proposal',
          body: `${session.user.full_name} commented on “${proposal.title}”.`,
          tag: 'Comment', pilot: proposal.pilot_site, actionUrl, createdAt: now,
        });
        if (parentComment && Number(parentComment.user_id) !== Number(proposal.user_id)) {
          createNotification(db, {
            userId: parentComment.user_id, actorUserId: session.user.id, type: 'reply', eventType: 'comment_reply',
            title: 'New reply to your comment',
            body: `${session.user.full_name} replied in “${proposal.title}”.`,
            tag: 'Reply', pilot: proposal.pilot_site, actionUrl, createdAt: now,
          });
        }
        sendJson(response, 201, {
          comment: { id: Number(result.lastInsertRowid), body: comment, parentCommentId, createdAt: now, author: session.user.full_name, authorRole: session.user.role, authorAvatar: session.user.avatar_data || null },
        });
        return true;
      }

      const proposalStatusMatch = pathname.match(/^\/api\/forum\/proposals\/(\d+)\/status$/);
      if (proposalStatusMatch && method === 'PATCH') {
        const session = requireUser(db, request, response);
        if (!session) return true;
        if (!['Municipality Staff', 'Admin'].includes(session.user.role)) {
          sendError(response, 403, 'Only municipality staff can update proposal status.');
          return true;
        }
        const proposalId = Number(proposalStatusMatch[1]);
        const body = await readJson(request);
        const nextStatus = String(body.status || '');
        if (!['Open', 'Under Review', 'Implemented', 'Rejected'].includes(nextStatus)) {
          sendError(response, 400, 'Choose a valid proposal status.', { status: 'Select Open, Under Review, Implemented, or Rejected.' });
          return true;
        }
        const proposal = db.prepare(`
          SELECT p.id, p.user_id, p.title, p.status, u.pilot_site
          FROM forum_proposals p JOIN users u ON u.id = p.user_id WHERE p.id = ?
        `).get(proposalId);
        if (!proposal) { sendError(response, 404, 'Proposal not found.'); return true; }
        if (proposal.status !== nextStatus) {
          const now = new Date().toISOString();
          db.prepare('UPDATE forum_proposals SET status = ?, updated_at = ? WHERE id = ?').run(nextStatus, now, proposalId);
          createNotification(db, {
            userId: proposal.user_id, actorUserId: session.user.id, type: 'proposal', eventType: 'proposal_status',
            title: 'Proposal status updated',
            body: `“${proposal.title}” is now ${nextStatus}.`,
            tag: nextStatus, pilot: proposal.pilot_site,
            actionUrl: `/forum-voting?proposal=${proposalId}#proposal-${proposalId}`, createdAt: now,
          });
        }
        sendJson(response, 200, { proposal: listProposals(db, Number(session.user.id)).find((item) => item.id === proposalId) });
        return true;
      }

      const voteMatch = pathname.match(/^\/api\/forum\/proposals\/(\d+)\/vote$/);
      if (voteMatch && method === 'POST') {
        const session = requireUser(db, request, response);
        if (!session) return true;
        const proposalId = Number(voteMatch[1]);
        const body = await readJson(request);
        if (!['up', 'down', null].includes(body.direction)) {
          sendError(response, 400, 'Vote direction must be up, down, or null.');
          return true;
        }
        const proposal = db.prepare('SELECT * FROM forum_proposals WHERE id = ?').get(proposalId);
        if (!proposal) { sendError(response, 404, 'Proposal not found.'); return true; }
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

      const session = requireUser(db, request, response);
      if (!session) return true;
      const userId = Number(session.user.id);

      if (method === 'GET' && pathname === '/api/scenarios') {
        sendJson(response, 200, { scenarios: listScenarios(db, userId) });
        return true;
      }

      if (method === 'POST' && pathname === '/api/scenarios') {
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

      if (method === 'GET' && pathname === '/api/scene-state') {
        const row = db.prepare('SELECT state_json, updated_at FROM scene_states WHERE user_id = ?').get(userId);
        sendJson(response, 200, { state: row ? JSON.parse(row.state_json || '{}') : {}, updatedAt: row?.updated_at || null });
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

      if (method === 'GET' && pathname === '/api/process-draft') {
        const row = db.prepare('SELECT * FROM process_drafts WHERE user_id = ?').get(userId);
        sendJson(response, 200, {
          setup: row ? JSON.parse(row.setup_json || '{}') : {},
          tools: row ? JSON.parse(row.tools_json || '[]') : [],
          updatedAt: row?.updated_at || null,
        });
        return true;
      }

      if (method === 'PUT' && pathname === '/api/process-draft') {
        const body = await readJson(request);
        const setup = body.setup && typeof body.setup === 'object' ? body.setup : {};
        const tools = Array.isArray(body.tools) ? body.tools.map(String) : [];
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO process_drafts (user_id, setup_json, tools_json, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET setup_json = excluded.setup_json, tools_json = excluded.tools_json, updated_at = excluded.updated_at
        `).run(userId, JSON.stringify(setup), JSON.stringify(tools), now);
        sendJson(response, 200, { saved: true, updatedAt: now });
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
