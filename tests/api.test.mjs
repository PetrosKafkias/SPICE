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
    assert.ok(publicForum.payload.proposals.length >= 2);

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

    // Account feedback no longer depends on the usability questionnaire, which is submitted on its own.
    const accountFeedback = await request(baseUrl, '/api/feedback', {
      method: 'POST', body: { category: 'general', rating: 5, message: 'The objective workspace is clear.', source: 'account' },
    });
    assert.equal(accountFeedback.status, 201);
    assert.equal((await request(baseUrl, '/api/feedback/sus', { method: 'POST', body: { answers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1] } })).status, 401);
    const citizen = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'citizen' } });
    const incomplete = await request(baseUrl, '/api/feedback/sus', { method: 'POST', cookie: citizen.cookie, body: { answers: [5, 1, 5] } });
    assert.equal(incomplete.status, 400);
    const sus = await request(baseUrl, '/api/feedback/sus', { method: 'POST', cookie: citizen.cookie, body: { answers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1] } });
    assert.equal(sus.status, 201);
    assert.equal(sus.payload.score, 100);
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
        pilotSite: 'Thessaloniki', role: 'Citizen', locale: 'FI', acceptedTerms: true, returnTo: '/glossary?letter=C',
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
    const existing = await request(baseUrl, '/api/forum/proposals?phaseScope=all', { cookie: citizenCookie });
    assert.ok(existing.payload.proposals.length > 0);
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
        votingMode: 'binary',
      },
    });
    assert.equal(created.status, 201);

    const proposalId = created.payload.proposal.id;
    const comment = await request(baseUrl, `/api/forum/proposals/${proposalId}/comments`, {
      method: 'POST', cookie: demoCookie, body: { body: 'This would improve summer accessibility.' },
    });
    assert.equal(comment.status, 201);

    const prematureVote = await request(baseUrl, `/api/forum/proposals/${proposalId}/vote`, {
      method: 'POST', cookie: demoCookie, body: { direction: 'up' },
    });
    assert.equal(prematureVote.status, 409);

    const votingProposal = existing.payload.proposals.find((proposal) => proposal.workflowStatus === 'voting_open');
    assert.ok(votingProposal);
    const vote = await request(baseUrl, `/api/forum/proposals/${votingProposal.id}/vote`, {
      method: 'POST', cookie: demoCookie, body: { direction: 'up' },
    });
    assert.equal(vote.status, 200);
    assert.equal(vote.payload.userVote, 'up');
    assert.ok(vote.payload.upvotes > votingProposal.upvotes);
  });

  await t.test('scenario votes, roadmap adoption, scene state, and process drafts persist', async () => {
    const now = new Date().toISOString();
    api.db.prepare(`
      INSERT INTO scenarios (
        slug, title, summary, tags_json, strengths_json, concerns_json,
        phase, status, guidance, publication_status, created_at, updated_at
      ) VALUES (?, ?, ?, '[]', '[]', '[]', 3, 'Published', '', 'published', ?, ?)
    `).run('test-scenario', 'Test Scenario', 'A documented scenario used for API test coverage.', now, now);

    const scenarios = await request(baseUrl, '/api/scenarios', { cookie: demoCookie });
    assert.equal(scenarios.status, 200);
    assert.ok(scenarios.payload.scenarios.length >= 1);
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
  });

  await t.test('role-based hub and administration APIs enforce scope on the server', async () => {
    const citizenLogin = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'citizen' } });
    const facilitatorLogin = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'facilitator' } });
    const municipalityLogin = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'municipality' } });
    const adminLogin = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'admin' } });
    assert.equal(citizenLogin.status, 200);
    assert.equal(facilitatorLogin.status, 200);
    assert.equal(municipalityLogin.status, 200);
    assert.equal(adminLogin.status, 200);
    assert.equal(citizenLogin.payload.user.role, 'Citizen');
    assert.equal(facilitatorLogin.payload.user.role, 'Facilitator');
    assert.equal(municipalityLogin.payload.user.role, 'Municipality Staff');
    assert.equal(adminLogin.payload.user.role, 'Admin');

    const citizenCreate = await request(baseUrl, '/api/hub/initiatives', {
      method: 'POST', cookie: citizenLogin.cookie,
      body: { title: 'Citizen draft', description: 'Citizens must not be able to create municipality initiatives.' },
    });
    assert.equal(citizenCreate.status, 403);

    // Each municipality is seeded with exactly one pilot-site initiative already —
    // a second creation attempt for the same organisation must be rejected.
    const duplicateCreate = await request(baseUrl, '/api/hub/initiatives', {
      method: 'POST', cookie: municipalityLogin.cookie,
      body: { title: 'A second pilot site', description: 'Municipalities may not create more than one pilot-site initiative.' },
    });
    assert.equal(duplicateCreate.status, 409);

    const municipalityInitiatives = await request(baseUrl, '/api/hub/initiatives', { cookie: municipalityLogin.cookie });
    assert.equal(municipalityInitiatives.status, 200);
    assert.equal(municipalityInitiatives.payload.initiatives.length, 1);
    const initiative = municipalityInitiatives.payload.initiatives[0];

    const toDraft = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { status: 'draft', version: initiative.version, reason: 'Temporarily draft for a permission test.' },
    });
    assert.equal(toDraft.status, 200);

    const citizenDraftView = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: citizenLogin.cookie });
    assert.equal(citizenDraftView.status, 403);
    const facilitatorDraftView = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: facilitatorLogin.cookie });
    assert.equal(facilitatorDraftView.status, 200);
    assert.equal(facilitatorDraftView.payload.access.canManage, false);
    assert.equal(facilitatorDraftView.payload.access.canFacilitate, true);
    assert.deepEqual(
      facilitatorDraftView.payload.initiative.phases.map((phase) => phase.title),
      ['Frame and assess readiness', 'Understand with the community', 'Imagine scenarios and solutions', 'Test using prototypes', 'Consolidate and learn'],
    );
    assert.ok(facilitatorDraftView.payload.initiative.phases.every((phase) => phase.eventTypes.length > 0 && phase.expectedOutputs.length > 0));

    const facilitatorPublish = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, {
      method: 'PATCH', cookie: facilitatorLogin.cookie,
      body: { status: 'published', version: toDraft.payload.initiative.version, reason: 'Facilitators must not publish initiatives.' },
    });
    assert.equal(facilitatorPublish.status, 403);

    const setupBeforeActivation = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: {
        version: toDraft.payload.initiative.version,
        stage: 'framing-readiness',
        setupObjectives: ['understand-needs'],
        participationLevel: 'co-design',
        goal: 'Build a shared and accessible pilot brief.',
        groupSize: '10-25',
        duration: 'half-day',
        facilitator: '2-3',
        mode: 'Hybrid',
        setupSelectedTools: ['hopes-and-fears'],
      },
    });
    assert.equal(setupBeforeActivation.status, 200);
    assert.equal(setupBeforeActivation.payload.initiative.lifecycleStatus, 'ready_to_activate');

    const citizenBeforeActivation = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: citizenLogin.cookie });
    assert.equal(citizenBeforeActivation.status, 403);

    const adminActivation = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/activate`, {
      method: 'POST', cookie: adminLogin.cookie,
      body: { version: setupBeforeActivation.payload.initiative.version, confirmed: true },
    });
    assert.equal(adminActivation.status, 403);
    assert.equal(adminActivation.payload.code, 'MUNICIPALITY_REQUIRED');

    const publish = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/activate`, {
      method: 'POST', cookie: municipalityLogin.cookie,
      body: { version: setupBeforeActivation.payload.initiative.version, confirmed: true, reason: 'Municipality reviewed the setup and activated the pilot.' },
    });
    assert.equal(publish.status, 200);
    assert.equal(publish.payload.initiative.lifecycleStatus, 'active');
    const citizenPublishedView = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: citizenLogin.cookie });
    assert.equal(citizenPublishedView.status, 200);
    assert.equal(citizenPublishedView.payload.access.canManage, false);

    const toolSelection = { enabledTools: ['hopes-and-fears', 'stakeholder-mapping', 'citivoice'], municipalityNotes: 'Focus on the park entrance.', municipalityToolNotes: { 'hopes-and-fears': 'Run it during the first workshop.' } };
    const facilitatorToolSelection = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/phases/1`, { method: 'PATCH', cookie: facilitatorLogin.cookie, body: toolSelection });
    assert.equal(facilitatorToolSelection.status, 403);
    const unknownToolSelection = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/phases/1`, { method: 'PATCH', cookie: municipalityLogin.cookie, body: { enabledTools: ['not-a-spice-tool'] } });
    assert.equal(unknownToolSelection.status, 400);
    const municipalityToolSelection = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/phases/1`, { method: 'PATCH', cookie: municipalityLogin.cookie, body: toolSelection });
    assert.equal(municipalityToolSelection.status, 200);
    assert.deepEqual(municipalityToolSelection.payload.phase.enabledTools, toolSelection.enabledTools);

    const facilitatorBrief = (await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: facilitatorLogin.cookie })).payload.initiative.phases[0];
    assert.equal(facilitatorBrief.municipalityNotes, 'Focus on the park entrance.');
    assert.equal(facilitatorBrief.municipalityToolNotes['hopes-and-fears'], 'Run it during the first workshop.');
    const citizenBrief = (await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: citizenLogin.cookie })).payload.initiative.phases[0];
    assert.equal(citizenBrief.municipalityNotes, undefined);
    assert.equal(citizenBrief.municipalityToolNotes, undefined);

    const citizenActivityCreate = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/activities`, {
      method: 'POST', cookie: citizenLogin.cookie,
      body: { phaseNumber: 1, toolKey: 'hopes-and-fears', status: 'open' },
    });
    assert.equal(citizenActivityCreate.status, 403);

    const activityCreate = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/activities`, {
      method: 'POST', cookie: municipalityLogin.cookie,
      body: {
        phaseNumber: 1,
        toolKey: 'hopes-and-fears',
        title: 'Ignored free-form title',
        description: 'Share the public-space priority that matters most to your neighbourhood.',
        workflowStatus: 'draft',
        contributionTypes: ['text'],
      },
    });
    assert.equal(activityCreate.status, 201);
    assert.equal(activityCreate.payload.activity.title, 'Hopes and fears');
    assert.equal(activityCreate.payload.activity.toolKey, 'hopes-and-fears');
    const activityId = activityCreate.payload.activity.id;

    const duplicateImplementation = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/activities`, {
      method: 'POST', cookie: facilitatorLogin.cookie, body: { phaseNumber: 1, toolKey: 'hopes-and-fears', workflowStatus: 'draft' },
    });
    assert.equal(duplicateImplementation.status, 409);
    const unselectedToolImplementation = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/activities`, {
      method: 'POST', cookie: facilitatorLogin.cookie, body: { phaseNumber: 1, toolKey: 'world-cafe', workflowStatus: 'draft' },
    });
    assert.equal(unselectedToolImplementation.status, 400);

    const facilitatorActivity = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/activities`, {
      method: 'POST', cookie: facilitatorLogin.cookie,
      body: {
        phaseNumber: 1,
        toolKey: 'stakeholder-mapping',
        description: 'Assigned facilitators can prepare and run participation activities.',
        workflowStatus: 'draft',
        contributionTypes: ['text'],
        facilitatorNotes: 'Bring large printed maps.',
        expectedParticipants: '15-20',
      },
    });
    assert.equal(facilitatorActivity.status, 201);
    assert.equal(facilitatorActivity.payload.activity.facilitatorNotes, 'Bring large printed maps.');
    assert.equal(facilitatorActivity.payload.activity.expectedParticipants, '15-20');
    const citizenBeforeInstructionPublication = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: citizenLogin.cookie });
    assert.equal(citizenBeforeInstructionPublication.status, 200);
    assert.ok(citizenBeforeInstructionPublication.payload.initiative.phases.every((phase) => (
      phase.activities.every((activity) => activity.id !== activityId && activity.id !== facilitatorActivity.payload.activity.id)
    )));
    const municipalityCitizenPreview = await request(baseUrl, `/api/hub/initiatives/${initiative.id}?view=citizen`, { cookie: municipalityLogin.cookie });
    assert.equal(municipalityCitizenPreview.status, 200);
    assert.equal(municipalityCitizenPreview.payload.access.canManage, false);
    assert.equal(municipalityCitizenPreview.payload.access.canManageLifecycle, false);
    assert.equal(municipalityCitizenPreview.payload.access.canFacilitate, false);
    assert.equal(municipalityCitizenPreview.payload.access.canParticipate, false);
    assert.ok(municipalityCitizenPreview.payload.initiative.phases.every((phase) => (
      phase.activities.every((activity) => activity.id !== activityId && activity.id !== facilitatorActivity.payload.activity.id)
    )));

    const submitActivity = await request(baseUrl, `/api/hub/activities/${activityId}`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { workflowStatus: 'ready_for_review', reason: 'Activity configuration is ready for review.' },
    });
    assert.equal(submitActivity.status, 200);
    const openActivity = await request(baseUrl, `/api/hub/activities/${activityId}`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: {
        workflowStatus: 'open',
        instructions: 'Share one clear neighbourhood priority and explain why it matters before the participation deadline.',
        reason: 'Municipality approved this activity and its citizen instructions for publication.',
      },
    });
    assert.equal(openActivity.status, 200);
    const citizenAfterInstructionPublication = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: citizenLogin.cookie });
    const publishedCitizenActivity = citizenAfterInstructionPublication.payload.initiative.phases[0].activities.find((activity) => activity.id === activityId);
    assert.equal(publishedCitizenActivity.workflowStatus, 'open');
    assert.match(publishedCitizenActivity.instructions, /neighbourhood priority/i);
    assert.equal(citizenAfterInstructionPublication.payload.initiative.phases[1].activities.length, 0);

    const contribution = await request(baseUrl, `/api/hub/activities/${activityId}/contributions`, {
      method: 'POST', cookie: citizenLogin.cookie,
      body: { contributionType: 'text', content: 'Accessible shaded seating beside the play area.' },
    });
    assert.equal(contribution.status, 201);

    const citizenContributions = await request(baseUrl, `/api/hub/activities/${activityId}/contributions`, { cookie: citizenLogin.cookie });
    assert.equal(citizenContributions.status, 200);
    assert.equal(citizenContributions.payload.contributions.length, 1);
    const municipalityContributions = await request(baseUrl, `/api/hub/activities/${activityId}/contributions`, { cookie: municipalityLogin.cookie });
    assert.equal(municipalityContributions.status, 200);
    assert.equal(municipalityContributions.payload.contributions.length, 1);
    const facilitatorContributions = await request(baseUrl, `/api/hub/activities/${activityId}/contributions`, { cookie: facilitatorLogin.cookie });
    assert.equal(facilitatorContributions.status, 200);
    assert.equal(facilitatorContributions.payload.contributions.length, 1);

    const citizenRepositoryUpload = await request(baseUrl, '/api/repository', {
      method: 'POST', cookie: citizenLogin.cookie,
      body: {
        title: 'Citizen-only upload attempt',
        description: 'Citizens must not upload official workshop outputs directly.',
        phase: 1,
        documentType: 'Workshop output',
        fileFormat: 'PDF',
      },
    });
    assert.equal(citizenRepositoryUpload.status, 403);

    const workshopOutput = await request(baseUrl, '/api/repository', {
      method: 'POST', cookie: facilitatorLogin.cookie,
      body: {
        title: 'Phase 1 workshop output',
        description: 'Documented hopes, concerns, accessibility needs, and agreed readiness actions.',
        phase: 1,
        documentType: 'Workshop output',
        fileFormat: 'PDF',
        resultType: 'workshop_summary',
        activityId,
        tags: ['Workshop', 'Readiness'],
      },
    });
    assert.equal(workshopOutput.status, 201);
    assert.equal(workshopOutput.payload.document.publicationStatus, 'draft');

    const submitWorkshopOutput = await request(baseUrl, `/api/repository/${workshopOutput.payload.document.id}/status`, {
      method: 'PATCH', cookie: facilitatorLogin.cookie,
      body: { publicationStatus: 'ready_for_review' },
    });
    assert.equal(submitWorkshopOutput.status, 200);
    assert.equal(submitWorkshopOutput.payload.document.publicationStatus, 'ready_for_review');

    const facilitatorPublishOutput = await request(baseUrl, `/api/repository/${workshopOutput.payload.document.id}/status`, {
      method: 'PATCH', cookie: facilitatorLogin.cookie,
      body: { publicationStatus: 'published' },
    });
    assert.equal(facilitatorPublishOutput.status, 403);

    const publishWorkshopOutput = await request(baseUrl, `/api/repository/${workshopOutput.payload.document.id}/status`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { publicationStatus: 'published' },
    });
    assert.equal(publishWorkshopOutput.status, 200);
    assert.equal(publishWorkshopOutput.payload.document.publicationStatus, 'published');

    const publicRepository = await request(baseUrl, '/api/repository?phase=1');
    assert.equal(publicRepository.status, 200);
    assert.ok(publicRepository.payload.documents.some((document) => document.id === workshopOutput.payload.document.id));
    const filteredPhaseResults = await request(baseUrl, `/api/repository?pilotId=${initiative.id}&phaseId=${publishedCitizenActivity.phaseId}&phase=1&contentType=result`);
    assert.equal(filteredPhaseResults.status, 200);
    assert.deepEqual(filteredPhaseResults.payload.documents.map((document) => document.id), [workshopOutput.payload.document.id]);

    const facilitatorPhaseAdvance = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/current-phase`, {
      method: 'PATCH', cookie: facilitatorLogin.cookie,
      body: { currentPhaseNumber: 2, version: publish.payload.initiative.version, reason: 'Only municipality staff may advance the formal process.' },
    });
    assert.equal(facilitatorPhaseAdvance.status, 403);

    const closeActivity = await request(baseUrl, `/api/hub/activities/${activityId}`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { workflowStatus: 'closed', reason: 'Participation period completed.' },
    });
    assert.equal(closeActivity.status, 200);
    const closedContribution = await request(baseUrl, `/api/hub/activities/${activityId}/contributions`, {
      method: 'POST', cookie: citizenLogin.cookie,
      body: { contributionType: 'text', content: 'This should be rejected because the activity is closed.' },
    });
    assert.equal(closedContribution.status, 409);

    // The facilitator runs the activity lifecycle, including reversible operational steps.
    const activityStep = (workflowStatus, cookie = facilitatorLogin.cookie) => request(baseUrl, `/api/hub/activities/${activityId}`, {
      method: 'PATCH', cookie, body: { workflowStatus },
    });
    const citizenContribute = () => request(baseUrl, `/api/hub/activities/${activityId}/contributions`, {
      method: 'POST', cookie: citizenLogin.cookie, body: { contributionType: 'text', content: 'Lifecycle contribution check.' },
    });
    const reopened = await activityStep('open');
    assert.equal(reopened.status, 200);
    assert.equal(reopened.payload.activity.status, 'open');
    assert.equal((await citizenContribute()).status, 201);
    assert.equal((await activityStep('scheduled')).payload.code, 'INVALID_ACTIVITY_TRANSITION');
    assert.equal((await activityStep('closed')).status, 200);
    const completedByFacilitator = await activityStep('completed');
    assert.equal(completedByFacilitator.status, 200);
    assert.equal(completedByFacilitator.payload.activity.status, 'completed');
    assert.equal((await citizenContribute()).status, 409);
    assert.equal((await activityStep('open')).payload.code, 'INVALID_ACTIVITY_TRANSITION');
    assert.equal((await activityStep('open', adminLogin.cookie)).payload.code, 'INVALID_ACTIVITY_TRANSITION');
    const revertedCompletion = await activityStep('closed');
    assert.equal(revertedCompletion.status, 200);
    assert.equal(revertedCompletion.payload.activity.workflowStatus, 'closed');
    assert.equal((await citizenContribute()).status, 409);
    assert.equal((await activityStep('draft')).payload.code, 'INVALID_ACTIVITY_TRANSITION');
    const lifecycleAudit = api.db.prepare("SELECT actor_user_id, timestamp, previous_value, new_value FROM audit_log WHERE action = 'hub.activity.update' AND target_id = ? ORDER BY timestamp, rowid").all(String(activityId))
      .map((row) => ({ actor: row.actor_user_id, timestamp: row.timestamp, from: JSON.parse(row.previous_value).workflowStatus, ...JSON.parse(row.new_value) }));
    assert.deepEqual(lifecycleAudit.slice(-4).map((entry) => [entry.from, entry.workflowStatus, entry.transition]), [
      ['closed', 'open', 'reopened'], ['open', 'closed', 'closed'], ['closed', 'completed', 'completed'], ['completed', 'closed', 'reverted_from_completed'],
    ]);
    assert.ok(lifecycleAudit.every((entry) => entry.actor && entry.timestamp));

    const municipalityAdmin = await request(baseUrl, '/api/admin/overview', { cookie: municipalityLogin.cookie });
    assert.equal(municipalityAdmin.status, 403);
    const adminOverview = await request(baseUrl, '/api/admin/overview', { cookie: adminLogin.cookie });
    assert.equal(adminOverview.status, 200);
    assert.ok(adminOverview.payload.summary.totalUsers >= 3);
    const municipalityWorkspace = await request(baseUrl, '/api/admin/workspace', { cookie: municipalityLogin.cookie });
    assert.equal(municipalityWorkspace.status, 403);
    const adminWorkspace = await request(baseUrl, '/api/admin/workspace', { cookie: adminLogin.cookie });
    assert.equal(adminWorkspace.status, 200);
    assert.ok(Array.isArray(adminWorkspace.payload.integrations));
    const adminSettings = await request(baseUrl, '/api/admin/settings', {
      method: 'PATCH', cookie: adminLogin.cookie,
      body: { settings: { maintenanceBanner: 'Scheduled platform maintenance.' }, reason: 'Automated permission test' },
    });
    assert.equal(adminSettings.status, 200);
    assert.equal(adminSettings.payload.settings.maintenanceBanner, 'Scheduled platform maintenance.');

    const proposal = await request(baseUrl, '/api/forum/proposals', {
      method: 'POST', cookie: citizenLogin.cookie,
      body: {
        initiativeId: initiative.id,
        title: 'Add shade beside the play area',
        description: 'Plant mature trees and add accessible shaded seating beside the public play area.',
        tags: ['Greenery & Nature'],
      },
    });
    assert.equal(proposal.status, 201);
    const openVoting = await request(baseUrl, `/api/forum/proposals/${proposal.payload.proposal.id}/workflow`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { workflowStatus: 'voting_open', version: proposal.payload.proposal.version },
    });
    assert.equal(openVoting.status, 200);
    const closeParticipation = await request(baseUrl, `/api/forum/proposals/${proposal.payload.proposal.id}/workflow`, {
      method: 'PATCH', cookie: facilitatorLogin.cookie,
      body: { workflowStatus: 'participation_closed', version: openVoting.payload.proposal.version },
    });
    assert.equal(closeParticipation.status, 200);
    const requestDecision = await request(baseUrl, `/api/forum/proposals/${proposal.payload.proposal.id}/workflow`, {
      method: 'PATCH', cookie: facilitatorLogin.cookie,
      body: {
        workflowStatus: 'decision_pending',
        participationSummary: 'Citizens supported accessible shade and highlighted long-term maintenance needs.',
        version: closeParticipation.payload.proposal.version,
      },
    });
    assert.equal(requestDecision.status, 200);
    const officialDecision = await request(baseUrl, `/api/forum/proposals/${proposal.payload.proposal.id}/status`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { status: 'Implemented', rationale: 'The parks department approved the proposal and will publish the delivery schedule.', version: requestDecision.payload.proposal.version },
    });
    assert.equal(officialDecision.status, 200);
    assert.equal(officialDecision.payload.proposal.workflowStatus, 'approved');
    assert.match(officialDecision.payload.proposal.officialResponse, /approved/i);

    const completeActivity = await request(baseUrl, `/api/hub/activities/${activityId}`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { workflowStatus: 'completed', reason: 'Workshop evidence and participation outputs were documented.' },
    });
    assert.equal(completeActivity.status, 200);

    const completeSetup = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: {
        version: publish.payload.initiative.version,
        stage: 'framing-readiness',
        setupObjectives: ['understand-needs'],
        participationLevel: 'co-design',
        goal: 'Build a shared and accessible pilot brief.',
        setupSelectedTools: ['hopes-and-fears'],
        reason: 'Complete the Phase 1 setup and preserve its selected tools.',
      },
    });
    assert.equal(completeSetup.status, 200);

    const unconfirmedAdvance = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/current-phase`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { currentPhaseNumber: 2, version: completeSetup.payload.initiative.version },
    });
    assert.equal(unconfirmedAdvance.status, 400);
    assert.equal(unconfirmedAdvance.payload.code, 'PHASE_CONFIRMATION_REQUIRED');

    const advancePhase = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/current-phase`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: {
        currentPhaseNumber: 2,
        version: completeSetup.payload.initiative.version,
        confirmed: true,
        reason: 'Phase 1 requirements are complete and the Municipality is opening Phase 2.',
      },
    });
    assert.equal(advancePhase.status, 200);
    assert.equal(advancePhase.payload.initiative.currentPhaseNumber, 2);
    assert.equal(advancePhase.payload.initiative.phases[0].status, 'completed');
    assert.equal(advancePhase.payload.initiative.phases[1].status, 'open');
    const completedPhaseCitizenView = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: citizenLogin.cookie });
    assert.ok(completedPhaseCitizenView.payload.initiative.phases[0].results.some((result) => result.id === workshopOutput.payload.document.id));
    assert.ok(completedPhaseCitizenView.payload.initiative.phases[0].myContributions.some((item) => item.id === contribution.payload.contribution.id));

    // Only the 3 <-> 4 iteration loop may go backwards, and no role may skip ahead.
    for (const [cookie, target] of [[municipalityLogin.cookie, 1], [municipalityLogin.cookie, 4], [adminLogin.cookie, 1], [adminLogin.cookie, 5]]) {
      const invalidTransition = await request(baseUrl, `/api/hub/initiatives/${initiative.id}/current-phase`, {
        method: 'PATCH', cookie,
        body: { currentPhaseNumber: target, version: advancePhase.payload.initiative.version, confirmed: true, reason: 'Attempt an objective transition outside the SPICE sequence.' },
      });
      assert.equal(invalidTransition.status, 409);
      assert.equal(invalidTransition.payload.code, 'INVALID_PHASE_TRANSITION');
    }

    const report = await request(baseUrl, `/api/forum/proposals/${proposal.payload.proposal.id}/report`, {
      method: 'POST', cookie: citizenLogin.cookie,
      body: { reason: 'other', details: 'Please review whether this proposal is still current.' },
    });
    assert.equal(report.status, 201);
    const citizenModeration = await request(baseUrl, `/api/forum/proposals/${proposal.payload.proposal.id}/moderation`, {
      method: 'PATCH', cookie: citizenLogin.cookie,
      body: { moderationStatus: 'locked', reason: 'Citizens cannot moderate discussions.' },
    });
    assert.equal(citizenModeration.status, 403);
    const lockProposal = await request(baseUrl, `/api/forum/proposals/${proposal.payload.proposal.id}/moderation`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { moderationStatus: 'locked', reason: 'Discussion closed while the official review is in progress.' },
    });
    assert.equal(lockProposal.status, 200);
    const lockedComment = await request(baseUrl, `/api/forum/proposals/${proposal.payload.proposal.id}/comments`, {
      method: 'POST', cookie: citizenLogin.cookie,
      body: { body: 'This comment should be rejected while the proposal is locked.' },
    });
    assert.equal(lockedComment.status, 409);
    const restoreProposal = await request(baseUrl, `/api/forum/proposals/${proposal.payload.proposal.id}/moderation`, {
      method: 'PATCH', cookie: municipalityLogin.cookie,
      body: { moderationStatus: 'visible', reason: 'Review completed and public discussion restored.' },
    });
    assert.equal(restoreProposal.status, 200);
  });

  await t.test('resource photos follow the facilitator-uploads, municipality-publishes workflow', async () => {
    const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const citizen = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'citizen' } });
    const facilitator = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'facilitator' } });
    const municipality = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'municipality' } });
    const photosPath = '/api/resources/governance-log/photos';

    assert.equal((await request(baseUrl, photosPath)).status, 401);
    const citizenUpload = await request(baseUrl, photosPath, { method: 'POST', cookie: citizen.cookie, body: { imageData: pixel } });
    assert.equal(citizenUpload.status, 403);
    const invalidUpload = await request(baseUrl, photosPath, { method: 'POST', cookie: facilitator.cookie, body: { imageData: 'data:text/html;base64,PGgxPg==' } });
    assert.equal(invalidUpload.status, 400);
    assert.ok(invalidUpload.payload.fieldErrors.imageData);

    const facilitatorView = await request(baseUrl, photosPath, { cookie: facilitator.cookie });
    assert.deepEqual(facilitatorView.payload.access, { canUpload: true, publishesDirectly: false });
    const uploaded = await request(baseUrl, photosPath, { method: 'POST', cookie: facilitator.cookie, body: { imageData: pixel, caption: 'Workshop wall' } });
    assert.equal(uploaded.status, 201);
    assert.equal(uploaded.payload.photo.status, 'pending');
    assert.equal(uploaded.payload.photo.pilot, 'Thessaloniki');
    const photoId = uploaded.payload.photo.id;

    const citizenBeforePublish = await request(baseUrl, photosPath, { cookie: citizen.cookie });
    assert.equal(citizenBeforePublish.payload.photos.length, 0);
    assert.equal(citizenBeforePublish.payload.access.canUpload, false);
    const hiddenImage = await fetch(`${baseUrl}/api/resources/photos/${photoId}/image`, { headers: { Cookie: citizen.cookie } });
    assert.equal(hiddenImage.status, 404);
    await hiddenImage.body?.cancel();
    const facilitatorPublish = await request(baseUrl, `/api/resources/photos/${photoId}`, { method: 'PATCH', cookie: facilitator.cookie, body: { status: 'published' } });
    assert.equal(facilitatorPublish.status, 403);

    const municipalityView = await request(baseUrl, photosPath, { cookie: municipality.cookie });
    assert.deepEqual(municipalityView.payload.access, { canUpload: true, publishesDirectly: true });
    assert.equal(municipalityView.payload.photos[0].canPublish, true);
    const published = await request(baseUrl, `/api/resources/photos/${photoId}`, { method: 'PATCH', cookie: municipality.cookie, body: { status: 'published' } });
    assert.equal(published.status, 200);
    assert.equal(published.payload.photo.status, 'published');

    const citizenAfterPublish = await request(baseUrl, photosPath, { cookie: citizen.cookie });
    assert.equal(citizenAfterPublish.payload.photos.length, 1);
    assert.equal(citizenAfterPublish.payload.photos[0].caption, 'Workshop wall');
    assert.equal(citizenAfterPublish.payload.photos[0].canDelete, false);
    const visibleImage = await fetch(`${baseUrl}/api/resources/photos/${photoId}/image`, { headers: { Cookie: citizen.cookie } });
    assert.equal(visibleImage.status, 200);
    assert.equal(visibleImage.headers.get('content-type'), 'image/png');
    assert.equal(visibleImage.headers.get('cache-control'), 'private, no-cache');
    await visibleImage.arrayBuffer();
    const etag = visibleImage.headers.get('etag');
    const revalidated = await fetch(`${baseUrl}/api/resources/photos/${photoId}/image`, { headers: { Cookie: citizen.cookie, 'If-None-Match': etag } });
    assert.equal(revalidated.status, 304);
    const guestRevalidate = await fetch(`${baseUrl}/api/resources/photos/${photoId}/image`, { headers: { 'If-None-Match': etag } });
    assert.equal(guestRevalidate.status, 401);
    await guestRevalidate.body?.cancel();

    const citizenDelete = await request(baseUrl, `/api/resources/photos/${photoId}`, { method: 'DELETE', cookie: citizen.cookie });
    assert.equal(citizenDelete.status, 403);
    const facilitatorDeletePublished = await request(baseUrl, `/api/resources/photos/${photoId}`, { method: 'DELETE', cookie: facilitator.cookie });
    assert.equal(facilitatorDeletePublished.status, 403);
    const municipalityDelete = await request(baseUrl, `/api/resources/photos/${photoId}`, { method: 'DELETE', cookie: municipality.cookie });
    assert.equal(municipalityDelete.status, 200);
    assert.equal((await request(baseUrl, photosPath, { cookie: citizen.cookie })).payload.photos.length, 0);
  });

  await t.test('objective transitions follow the SPICE sequence with a 3-4 iteration loop', async () => {
    const { allowedObjectiveTransitions } = await import('../server/workflow.mjs');
    assert.deepEqual([1, 2, 3, 4, 5].map(allowedObjectiveTransitions), [[2], [3], [4], [3, 5], []]);

    const municipality = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'municipality' } });
    const facilitator = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'facilitator' } });
    const initiative = (await request(baseUrl, '/api/hub/initiatives', { cookie: municipality.cookie })).payload.initiatives[0];
    api.db.prepare('UPDATE hub_initiatives SET current_phase_number = 4 WHERE id = ?').run(initiative.id);
    const version = () => Number(api.db.prepare('SELECT version FROM hub_initiatives WHERE id = ?').get(initiative.id).version);
    const move = (cookie, target) => request(baseUrl, `/api/hub/initiatives/${initiative.id}/current-phase`, {
      method: 'PATCH', cookie, body: { currentPhaseNumber: target, version: version(), confirmed: true },
    });

    assert.equal((await move(facilitator.cookie, 3)).status, 403);
    const workflowAtFour = (await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: municipality.cookie })).payload.workflow;
    assert.deepEqual(workflowAtFour.allowedPhaseTransitions, [3, 5]);
    const iterate = await move(municipality.cookie, 3);
    assert.equal(iterate.status, 200);
    assert.equal(iterate.payload.initiative.currentPhaseNumber, 3);
    assert.deepEqual(iterate.payload.workflow.allowedPhaseTransitions, [4]);
    assert.equal((await move(municipality.cookie, 5)).payload.code, 'INVALID_PHASE_TRANSITION');
    assert.equal((await move(municipality.cookie, 2)).payload.code, 'INVALID_PHASE_TRANSITION');
    // Moving forward is allowed by the sequence; it may still wait for the Objective's readiness checks.
    assert.notEqual((await move(municipality.cookie, 4)).payload.code, 'INVALID_PHASE_TRANSITION');
  });

  await t.test('an initiative can have several facilitators, managed only by the municipality', async () => {
    const { hashPassword } = await import('../server/security.mjs');
    const now = new Date().toISOString();
    api.db.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, roles_json, pilot_site, phone, locale, account_status, created_at, updated_at, email_verified_at)
      VALUES ('Second Facilitator', 'second.facilitator@spice.local', ?, 'Facilitator', '["Facilitator"]', 'Thessaloniki', '', 'EN', 'active', ?, ?, ?)
    `).run(await hashPassword('SpiceDemo2026!'), now, now, now);
    const municipality = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'municipality' } });
    const firstFacilitator = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'facilitator' } });
    const initiative = (await request(baseUrl, '/api/hub/initiatives', { cookie: municipality.cookie })).payload.initiatives[0];
    const facilitatorsPath = `/api/hub/initiatives/${initiative.id}/facilitators`;

    assert.equal((await request(baseUrl, facilitatorsPath, { method: 'POST', cookie: firstFacilitator.cookie, body: { email: 'second.facilitator@spice.local' } })).status, 403);
    const added = await request(baseUrl, facilitatorsPath, { method: 'POST', cookie: municipality.cookie, body: { email: 'second.facilitator@spice.local' } });
    assert.equal(added.status, 201);
    assert.deepEqual(added.payload.facilitators.map((item) => item.email).sort(), ['facilitator.demo@spice.local', 'second.facilitator@spice.local']);
    assert.equal((await request(baseUrl, facilitatorsPath, { method: 'POST', cookie: municipality.cookie, body: { email: 'second.facilitator@spice.local' } })).status, 409);

    const brief = { municipalityNotes: 'Every facilitator should see this briefing.' };
    assert.equal((await request(baseUrl, `/api/hub/initiatives/${initiative.id}/phases/2`, { method: 'PATCH', cookie: municipality.cookie, body: brief })).status, 200);
    const secondSignIn = await request(baseUrl, '/api/auth/signin', { method: 'POST', body: { email: 'second.facilitator@spice.local', password: 'SpiceDemo2026!', rememberMe: false } });
    assert.equal(secondSignIn.status, 200);
    for (const cookie of [firstFacilitator.cookie, secondSignIn.cookie]) {
      const view = await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie });
      assert.equal(view.status, 200);
      assert.equal(view.payload.initiative.phases[1].municipalityNotes, brief.municipalityNotes);
      assert.equal(view.payload.initiative.facilitators.length, 2);
    }

    const secondId = added.payload.facilitators.find((item) => item.email === 'second.facilitator@spice.local').id;
    assert.equal((await request(baseUrl, `${facilitatorsPath}/${secondId}`, { method: 'DELETE', cookie: firstFacilitator.cookie })).status, 403);
    const removed = await request(baseUrl, `${facilitatorsPath}/${secondId}`, { method: 'DELETE', cookie: municipality.cookie });
    assert.equal(removed.status, 200);
    assert.deepEqual(removed.payload.facilitators.map((item) => item.email), ['facilitator.demo@spice.local']);
    assert.equal((await request(baseUrl, `${facilitatorsPath}/${secondId}`, { method: 'DELETE', cookie: municipality.cookie })).status, 404);
    assert.equal((await request(baseUrl, `/api/hub/initiatives/${initiative.id}`, { cookie: secondSignIn.cookie })).payload.initiative.phases[1].municipalityNotes, undefined);
  });

  await t.test('objective completion counts Discuss and Decide posts and needs no wrap-up report', async () => {
    const { phaseReadiness } = await import('../server/workflow.mjs');
    const initiative = api.db.prepare('SELECT * FROM hub_initiatives ORDER BY id LIMIT 1').get();
    assert.ok(!phaseReadiness(api.db, initiative, 5).requirements.some((item) => item.code === 'completion_summary'));

    const discussionPosts = () => Number(api.db.prepare(`
      SELECT (SELECT COUNT(*) FROM forum_proposals p WHERE p.initiative_id = ? AND p.phase_number = 2 AND COALESCE(p.moderation_status, 'visible') != 'hidden')
        + (SELECT COUNT(*) FROM forum_comments c JOIN forum_proposals p ON p.id = c.proposal_id
           WHERE p.initiative_id = ? AND p.phase_number = 2 AND COALESCE(p.moderation_status, 'visible') != 'hidden') AS count
    `).get(initiative.id, initiative.id).count);
    const objective2 = () => phaseReadiness(api.db, initiative, 2).requirements.find((item) => item.code === 'contributions_documented');
    assert.equal(objective2().detail, discussionPosts());

    const before = objective2().detail;
    const user = api.db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
    const now = new Date().toISOString();
    const proposalId = Number(api.db.prepare('INSERT INTO forum_proposals (user_id, title, description, initiative_id, phase_number, created_at, updated_at) VALUES (?, ?, ?, ?, 2, ?, ?)')
      .run(user.id, 'Readiness test proposal', 'Posted in Discuss and Decide for Objective 2.', initiative.id, now, now).lastInsertRowid);
    api.db.prepare('INSERT INTO forum_comments (proposal_id, user_id, body, created_at) VALUES (?, ?, ?, ?)').run(proposalId, user.id, 'Readiness test comment.', now);
    assert.equal(objective2().detail, before + 2);
    assert.equal(objective2().met, true);
    api.db.prepare('DELETE FROM forum_proposals WHERE id = ?').run(proposalId);
  });

  await t.test('demo sign-in is opt-in for production deployments', async () => {
    const original = { nodeEnv: process.env.NODE_ENV, flag: process.env.VITE_ENABLE_DEMO_LOGIN, vercel: process.env.VERCEL };
    const demoLogin = () => request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'admin' } });
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.VITE_ENABLE_DEMO_LOGIN;
      delete process.env.VERCEL;
      assert.equal((await demoLogin()).status, 404);
      assert.equal((await request(baseUrl, '/api/auth/demo-login')).payload.enabled, false);
      process.env.VITE_ENABLE_DEMO_LOGIN = 'true';
      assert.equal((await request(baseUrl, '/api/auth/demo-login')).payload.enabled, true);
      const enabled = await demoLogin();
      assert.equal(enabled.status, 200);
      assert.equal(enabled.payload.user.role, 'Admin');
      // The Vercel demo deployment enables it by default, but an explicit 'false' still wins.
      delete process.env.VITE_ENABLE_DEMO_LOGIN;
      process.env.VERCEL = '1';
      assert.equal((await demoLogin()).status, 200);
      process.env.VITE_ENABLE_DEMO_LOGIN = 'false';
      assert.equal((await demoLogin()).status, 404);
    } finally {
      if (original.nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original.nodeEnv;
      if (original.flag === undefined) delete process.env.VITE_ENABLE_DEMO_LOGIN; else process.env.VITE_ENABLE_DEMO_LOGIN = original.flag;
      if (original.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = original.vercel;
    }
  });

  await t.test('CitiVoice data and resource photos follow the selected pilot', async () => {
    const thessaloniki = await request(baseUrl, '/api/citivoice?pilot=thessaloniki');
    assert.equal(thessaloniki.status, 200);
    assert.equal(thessaloniki.payload.available, true);
    assert.equal(thessaloniki.payload.areaName, 'Parko Kritis');
    assert.equal(thessaloniki.payload.metrics.length, 5);
    const rovaniemi = await request(baseUrl, '/api/citivoice?pilot=rovaniemi');
    assert.equal(rovaniemi.payload.available, false);
    assert.deepEqual(rovaniemi.payload.metrics, []);
    assert.equal((await request(baseUrl, '/api/citivoice?pilot=..%2Fsecret')).status, 400);

    const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const facilitator = await request(baseUrl, '/api/auth/demo-login', { method: 'POST', body: { role: 'facilitator' } });
    const assigned = await request(baseUrl, '/api/hub/facilitator-assignments', { cookie: facilitator.cookie });
    const initiativeId = assigned.payload.initiatives[0].id;
    const photosPath = '/api/resources/scenario-building/photos';
    const toAssignedPilot = await request(baseUrl, photosPath, { method: 'POST', cookie: facilitator.cookie, body: { imageData: pixel, initiativeId } });
    assert.equal(toAssignedPilot.status, 201);
    const toOtherPilot = await request(baseUrl, photosPath, { method: 'POST', cookie: facilitator.cookie, body: { imageData: pixel, initiativeId: 999999 } });
    assert.equal(toOtherPilot.status, 403);
  });

  await t.test('sign-out invalidates the server session', async () => {
    const signOut = await request(baseUrl, '/api/auth/signout', { method: 'POST', cookie: demoCookie });
    assert.equal(signOut.status, 200);

    const session = await request(baseUrl, '/api/auth/session', { cookie: demoCookie });
    assert.equal(session.payload.user, null);
  });
});
