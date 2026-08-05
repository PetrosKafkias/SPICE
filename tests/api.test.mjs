import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApiHandler } from '../server/api.mjs';

async function request(baseUrl, path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  const setCookie = response.headers.get('set-cookie');
  return {
    status: response.status,
    payload,
    cookie: setCookie ? setCookie.split(';')[0] : null,
  };
}

test('SPICE API supports authentication, persistence, permissions, and state changes', async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'spice-api-'));
  let verificationToken = '';
  let verificationReturnTo = '';
  const api = await createApiHandler({
    databasePath: join(folder, 'test.db'),
    sendVerificationEmail: async ({ token, returnTo }) => {
      verificationToken = token;
      verificationReturnTo = returnTo;
      return { delivery: 'sent' };
    },
  });
  const server = createServer(async (req, res) => {
    const handled = await api(req, res);
    if (!handled && !res.headersSent) {
      res.writeHead(404).end();
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    api.db.close();
    await rm(folder, { recursive: true, force: true });
  });

  await t.test('public and protected endpoints enforce the expected boundary', async () => {
    const publicForum = await request(baseUrl, '/api/forum/proposals');
    assert.equal(publicForum.status, 200);
    assert.ok(publicForum.payload.proposals.length >= 3);

    const protectedInsights = await request(baseUrl, '/api/insights');
    assert.equal(protectedInsights.status, 401);

    const protectedForumAction = await request(baseUrl, '/api/forum/proposals', {
      method: 'POST',
      body: { title: 'A protected proposal', description: 'This action must require an authenticated account.', tags: ['Accessibility'] },
    });
    assert.equal(protectedForumAction.status, 401);
  });

  await t.test('feedback validates required fields and persists anonymous submissions', async () => {
    const invalid = await request(baseUrl, '/api/feedback', { method: 'POST', body: { category: '', rating: 0, message: '' } });
    assert.equal(invalid.status, 400);
    assert.ok(invalid.payload.fieldErrors.category);
    assert.ok(invalid.payload.fieldErrors.rating);
    assert.ok(invalid.payload.fieldErrors.message);

    const submitted = await request(baseUrl, '/api/feedback', {
      method: 'POST',
      body: { category: 'improvement', rating: 4, message: 'Please add more guidance for first-time participants.', source: 'footer' },
    });
    assert.equal(submitted.status, 201);
    assert.ok(submitted.payload.id);
  });

  await t.test('state-changing requests accept the loopback development proxy and reject foreign origins', async () => {
    const trustedLocalOrigin = await request(baseUrl, '/api/auth/signin', {
      method: 'POST',
      headers: { Origin: 'http://127.0.0.1:5173' },
      body: { email: 'pkafkias@dreven.gr', password: 'incorrect-password' },
    });
    assert.equal(trustedLocalOrigin.status, 401);

    const foreignOrigin = await request(baseUrl, '/api/auth/signin', {
      method: 'POST',
      headers: { Origin: 'https://example.invalid' },
      body: { email: 'pkafkias@dreven.gr', password: 'incorrect-password' },
    });
    assert.equal(foreignOrigin.status, 403);
  });

  let demoCookie;
  let citizenCookie;
  await t.test('seed user can sign in and the session can be restored', async () => {
    const signIn = await request(baseUrl, '/api/auth/signin', {
      method: 'POST',
      body: { email: 'pkafkias@dreven.gr', password: 'SpiceDemo2026!', rememberMe: true },
    });
    assert.equal(signIn.status, 200);
    assert.equal(signIn.payload.user.email, 'pkafkias@dreven.gr');
    assert.ok(signIn.cookie);
    demoCookie = signIn.cookie;

    const session = await request(baseUrl, '/api/auth/session', { cookie: demoCookie });
    assert.equal(session.status, 200);
    assert.equal(session.payload.user.fullName, 'Petros Kafkias');
  });

  await t.test('registration validates input and enforces unique email addresses', async () => {
    const invalid = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { fullName: 'A', email: 'not-an-email', password: 'weak', confirmPassword: 'different', acceptedTerms: false },
    });
    assert.equal(invalid.status, 400);
    assert.ok(invalid.payload.fieldErrors.email);
    assert.ok(invalid.payload.fieldErrors.password);

    const registration = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Test Citizen', email: 'citizen@example.test', password: 'StrongPass123', confirmPassword: 'StrongPass123',
        pilotSite: 'Rovaniemi', role: 'Citizen', locale: 'FI', acceptedTerms: true, returnTo: '/glossary?letter=C',
      },
    });
    assert.equal(registration.status, 201);
    assert.equal(registration.payload.email, 'citizen@example.test');
    assert.ok(verificationToken);
    assert.equal(verificationReturnTo, '/glossary?letter=C');

    const unverifiedSignIn = await request(baseUrl, '/api/auth/signin', { method: 'POST', body: { email: 'citizen@example.test', password: 'StrongPass123' } });
    assert.equal(unverifiedSignIn.status, 403);

    const verification = await request(baseUrl, '/api/auth/verify-email', { method: 'POST', body: { token: verificationToken } });
    assert.equal(verification.status, 200);
    const verifiedSignIn = await request(baseUrl, '/api/auth/signin', { method: 'POST', body: { email: 'citizen@example.test', password: 'StrongPass123' } });
    assert.equal(verifiedSignIn.status, 200);
    assert.equal(verifiedSignIn.payload.user.locale, 'FI');
    citizenCookie = verifiedSignIn.cookie;

    const duplicate = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Duplicate', email: 'CITIZEN@example.test', password: 'StrongPass123', confirmPassword: 'StrongPass123',
        pilotSite: 'Rovaniemi', role: 'Citizen', acceptedTerms: true,
      },
    });
    assert.equal(duplicate.status, 409);
  });

  await t.test('profile changes and notification read state persist in the database', async () => {
    const update = await request(baseUrl, '/api/profile', {
      method: 'PATCH', cookie: demoCookie,
      body: { phone: '+302310123456', locale: 'EL', profileVisibility: 'public' },
    });
    assert.equal(update.status, 200);
    assert.equal(update.payload.user.phone, '+302310123456');
    assert.equal(update.payload.user.locale, 'EL');

    const restored = await request(baseUrl, '/api/profile', { cookie: demoCookie });
    assert.equal(restored.payload.user.phone, '+302310123456');

    const before = await request(baseUrl, '/api/notifications?filter=unread', { cookie: demoCookie });
    assert.ok(before.payload.counts.unread > 0);

    const markAll = await request(baseUrl, '/api/notifications/read-all', { method: 'POST', cookie: demoCookie });
    assert.equal(markAll.status, 200);
    assert.ok(markAll.payload.updated > 0);

    const after = await request(baseUrl, '/api/notifications?filter=unread', { cookie: demoCookie });
    assert.equal(after.payload.counts.unread, 0);
    assert.equal(after.payload.notifications.length, 0);
  });

  await t.test('authenticated forum actions update durable proposal data', async () => {
    const existing = await request(baseUrl, '/api/forum/proposals');
    const existingProposalId = existing.payload.proposals[0].id;
    const participantComment = await request(baseUrl, `/api/forum/proposals/${existingProposalId}/comments`, {
      method: 'POST', cookie: citizenCookie, body: { body: 'Could the proposal also include accessible seating?' },
    });
    assert.equal(participantComment.status, 201);

    const ownerNotifications = await request(baseUrl, '/api/notifications?filter=unread', { cookie: demoCookie });
    const commentNotification = ownerNotifications.payload.notifications.find((item) => item.eventType === 'proposal_comment');
    assert.ok(commentNotification);
    assert.match(commentNotification.actionUrl, new RegExp(`proposal=${existingProposalId}`));

    const ownerReply = await request(baseUrl, `/api/forum/proposals/${existingProposalId}/comments`, {
      method: 'POST', cookie: demoCookie,
      body: { body: 'Yes, accessible seating is included in the next review.', parentCommentId: participantComment.payload.comment.id },
    });
    assert.equal(ownerReply.status, 201);
    assert.equal(ownerReply.payload.comment.parentCommentId, participantComment.payload.comment.id);

    const participantNotifications = await request(baseUrl, '/api/notifications?filter=unread', { cookie: citizenCookie });
    assert.ok(participantNotifications.payload.notifications.some((item) => item.eventType === 'comment_reply'));

    const created = await request(baseUrl, '/api/forum/proposals', {
      method: 'POST', cookie: demoCookie,
      body: {
        title: 'Create more shaded seating',
        description: 'Add accessible shaded seating beside the main pedestrian paths and gathering areas.',
        tags: ['Seating & Rest'],
      },
    });
    assert.equal(created.status, 201);

    const proposalId = created.payload.proposal.id;
    const comment = await request(baseUrl, `/api/forum/proposals/${proposalId}/comments`, {
      method: 'POST', cookie: demoCookie, body: { body: 'This would improve summer accessibility.' },
    });
    assert.equal(comment.status, 201);

    const vote = await request(baseUrl, `/api/forum/proposals/${proposalId}/vote`, {
      method: 'POST', cookie: demoCookie, body: { direction: 'up' },
    });
    assert.equal(vote.status, 200);
    assert.equal(vote.payload.userVote, 'up');
    assert.equal(vote.payload.upvotes, 1);
  });

  await t.test('scenario votes, roadmap adoption, scene state, and process drafts persist', async () => {
    const scenarios = await request(baseUrl, '/api/scenarios', { cookie: demoCookie });
    assert.equal(scenarios.status, 200);
    assert.ok(scenarios.payload.scenarios.length >= 3);
    const scenarioId = scenarios.payload.scenarios[0].id;

    const vote = await request(baseUrl, `/api/scenarios/${scenarioId}/vote`, {
      method: 'POST', cookie: demoCookie, body: { direction: 'up' },
    });
    assert.equal(vote.status, 200);
    assert.equal(vote.payload.userVote, 'up');

    const adopt = await request(baseUrl, `/api/scenarios/${scenarioId}/adopt`, {
      method: 'POST', cookie: demoCookie, body: { adopted: true },
    });
    assert.equal(adopt.status, 200);
    assert.equal(adopt.payload.adopted, true);

    const sceneSave = await request(baseUrl, '/api/scene-state', {
      method: 'PUT', cookie: demoCookie,
      body: { state: { scenarioId: 'cycle', zoom: 120, layers: { buildings: true } } },
    });
    assert.equal(sceneSave.status, 200);
    const sceneRead = await request(baseUrl, '/api/scene-state', { cookie: demoCookie });
    assert.equal(sceneRead.payload.state.zoom, 120);

    const draftSave = await request(baseUrl, '/api/process-draft', {
      method: 'PUT', cookie: demoCookie,
      body: { setup: { stage: 'underway', objectives: ['codesign'] }, tools: ['future-scenarios'] },
    });
    assert.equal(draftSave.status, 200);
    const draftRead = await request(baseUrl, '/api/process-draft', { cookie: demoCookie });
    assert.deepEqual(draftRead.payload.tools, ['future-scenarios']);
    assert.equal(draftRead.payload.setup.stage, 'underway');
  });

  await t.test('sign-out invalidates the server session', async () => {
    const signOut = await request(baseUrl, '/api/auth/signout', { method: 'POST', cookie: demoCookie });
    assert.equal(signOut.status, 200);

    const session = await request(baseUrl, '/api/auth/session', { cookie: demoCookie });
    assert.equal(session.payload.user, null);
  });
});
