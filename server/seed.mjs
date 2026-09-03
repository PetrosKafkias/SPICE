import { hashPassword } from './security.mjs';

const NOW = '2026-06-17T09:00:00.000Z';

const PHASE_BLUEPRINTS = [
  {
    title: 'Frame and assess readiness',
    description: 'Agree the scope, participation boundaries, decision links, stakeholders, competences, and resources before public activities begin.',
    eventTypes: ['EV1 Opening and local dissemination', 'EV2 Framing and readiness'],
    expectedOutputs: ['Agreed process frame', 'Participation ambition and decision boundaries', 'Stakeholder and competence map', 'Organisational conditions and responsibilities'],
  },
  {
    title: 'Understand with the community',
    description: 'Combine technical context with lived experience, local knowledge, needs, attachments, conflicts, and environmental perspectives.',
    eventTypes: ['EV3 Collective understanding: challenges, needs and opportunities'],
    expectedOutputs: ['Shared diagnosis', 'Recognised needs and qualities', 'Priority challenges', 'Social, spatial, and environmental evidence'],
  },
  {
    title: 'Imagine scenarios and solutions',
    description: 'Generate alternatives before converging, make trade-offs visible, and document why participants prefer particular directions.',
    eventTypes: ['EV4 Co-design and scenario building'],
    expectedOutputs: ['Co-developed scenarios', 'Design concepts or principles', 'Documented choices and trade-offs', 'Questions requiring further testing'],
  },
  {
    title: 'Test using prototypes',
    description: 'Use reversible prototypes, temporary activities, observations, and feedback to test assumptions in the real context.',
    eventTypes: ['EV5 Prototyping and real-life testing'],
    expectedOutputs: ['Situated testing evidence', 'Observed intended and unintended uses', 'Participant feedback', 'Documented revisions and lessons'],
  },
  {
    title: 'Consolidate and learn',
    description: 'Connect outcomes to responsibilities, governance, policy, implementation, stewardship, and continued community involvement.',
    eventTypes: ['EV6 Activation, care and governance', 'EV7 Final event, restitution and future commitments'],
    expectedOutputs: ['Agreed next steps', 'Governance or stewardship arrangements', 'Documented learning', 'Responsibilities and commitments', 'Connection to planning and implementation'],
  },
];

function insertMany(db, sql, rows) {
  const statement = db.prepare(sql);
  for (const row of rows) statement.run(...row);
}

export async function seedDatabase(db) {
  let demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('pkafkias@dreven.gr');

  if (!demoUser) {
    const passwordHash = await hashPassword(process.env.SPICE_SEED_PASSWORD || 'SpiceDemo2026!');
    const result = db.prepare(`
      INSERT INTO users (
        full_name, email, password_hash, role, pilot_site, phone, locale, created_at, updated_at, email_verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Petros Kafkias',
      'pkafkias@dreven.gr',
      passwordHash,
      'Citizen',
      'Thessaloniki',
      '+306999999999',
      'EN',
      NOW,
      NOW,
      NOW,
    );
    demoUser = { id: Number(result.lastInsertRowid) };
  }

  const userId = Number(demoUser.id);

  const passwordHash = await hashPassword(process.env.SPICE_SEED_PASSWORD || 'SpiceDemo2026!');
  const ensureDemoUser = (email, fullName, role, pilotSite) => {
    let row = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!row) {
      const result = db.prepare(`
        INSERT INTO users (
          full_name, email, password_hash, role, roles_json, pilot_site, phone, locale,
          account_status, created_at, updated_at, email_verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, '', 'EN', 'active', ?, ?, ?)
      `).run(fullName, email, passwordHash, role, JSON.stringify([role]), pilotSite, NOW, NOW, NOW);
      row = { id: Number(result.lastInsertRowid) };
    }
    return Number(row.id);
  };

  const citizenDemoId = ensureDemoUser('citizen.demo@spice.local', 'Citizen Demo User', 'Citizen', 'Thessaloniki');
  const municipalityDemoId = ensureDemoUser('municipality.demo@spice.local', 'Municipality Demo User', 'Municipality Staff', 'Thessaloniki');
  const facilitatorDemoId = ensureDemoUser('facilitator.demo@spice.local', 'Facilitator Demo User', 'Facilitator', 'Thessaloniki');
  const adminDemoId = ensureDemoUser('admin.demo@spice.local', 'Platform Admin Demo User', 'Admin', 'All pilots');

  let organisation = db.prepare('SELECT id FROM organisations WHERE municipality = ?').get('Thessaloniki');
  if (!organisation) {
    const result = db.prepare(`INSERT INTO organisations (name, municipality, pilot_slug, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)`)
      .run('Municipality of Thessaloniki', 'Thessaloniki', 'thessaloniki', NOW, NOW);
    organisation = { id: Number(result.lastInsertRowid) };
  }
  const organisationId = Number(organisation.id);
  db.prepare('UPDATE users SET organisation_id = ?, roles_json = ? WHERE id = ?')
    .run(organisationId, JSON.stringify(['Municipality Staff']), municipalityDemoId);
  db.prepare('UPDATE users SET roles_json = ? WHERE id = ?').run(JSON.stringify(['Citizen']), citizenDemoId);
  db.prepare('UPDATE users SET roles_json = ? WHERE id = ?').run(JSON.stringify(['Facilitator']), facilitatorDemoId);
  db.prepare('UPDATE users SET roles_json = ? WHERE id = ?').run(JSON.stringify(['Admin']), adminDemoId);

  if (Number(db.prepare('SELECT COUNT(*) AS count FROM hub_initiatives').get().count) === 0) {
    const insertInitiative = db.prepare(`
      INSERT INTO hub_initiatives (
        organisation_id, pilot_slug, owner_user_id, title, description, objectives, location,
        status, visibility, participation_rules, enabled_tools_json, start_date, end_date,
        current_phase_number, published_at, created_at, updated_at
      ) VALUES (?, 'thessaloniki', ?, ?, ?, ?, ?, ?, 'public', ?, ?, ?, ?, 1, ?, ?, ?)
    `);
    const published = insertInitiative.run(
      organisationId, municipalityDemoId, 'Parko Kritis Co-Creation Pilot Site',
      'Residents and the municipality are shaping a greener, safer, and more accessible neighbourhood park.',
      'Improve shade, accessibility, safety, and everyday community use.', 'Thessaloniki - Parko Kritis',
      'active', 'Participation is open to residents linked to the Thessaloniki pilot.',
      JSON.stringify(['citivoice', 'forum', 'analogue-tools', 'scenario-comparison']),
      '2026-05-01', '2026-10-31', NOW, NOW, NOW,
    );
    const initiativeId = Number(published.lastInsertRowid);
    const insertPhase = db.prepare(`INSERT INTO hub_phases (initiative_id, phase_number, title, description, status, enabled_tools_json, instructions, results_visible, start_date, end_date, event_types_json, expected_outputs_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (let index = 0; index < PHASE_BLUEPRINTS.length; index += 1) {
      const phaseNumber = index + 1;
      const blueprint = PHASE_BLUEPRINTS[index];
      const status = phaseNumber === 1 ? 'open' : 'not_started';
      insertPhase.run(initiativeId, phaseNumber, blueprint.title, blueprint.description, status, JSON.stringify([]), phaseNumber === 1 ? 'Share your hopes and concerns about the pilot using the Hopes and Fears activity, and follow the discussion as your municipality reviews the initial input.' : '', 0, null, null, JSON.stringify(blueprint.eventTypes), JSON.stringify(blueprint.expectedOutputs));
    }
    const openPhase = db.prepare('SELECT id FROM hub_phases WHERE initiative_id = ? AND phase_number = 1').get(initiativeId);
    db.prepare(`INSERT INTO hub_activities (initiative_id, phase_id, title, description, status, workflow_status, tool_key, contribution_types_json, voting_enabled, forum_enabled, results_visible, created_at, updated_at) VALUES (?, ?, ?, ?, 'open', 'open', 'forum', ?, 1, 1, 0, ?, ?)`)
      .run(initiativeId, openPhase.id, 'Share and prioritise design ideas', 'Submit a proposal, join the discussion, and vote on community priorities.', JSON.stringify(['text','image','vote','comment']), NOW, NOW);
    db.prepare('INSERT OR IGNORE INTO hub_participants (initiative_id, user_id, invited_at) VALUES (?, ?, ?)').run(initiativeId, citizenDemoId, NOW);
    db.prepare('UPDATE forum_proposals SET initiative_id = ?, organisation_id = ?').run(initiativeId, organisationId);
  }

  const demoInitiative = db.prepare('SELECT id FROM hub_initiatives WHERE organisation_id = ?').get(organisationId);
  if (demoInitiative) {
    const initiativeId = Number(demoInitiative.id);
    db.prepare(`
      INSERT INTO hub_participants (initiative_id, user_id, invited_at, assignment_role) VALUES (?, ?, ?, 'facilitator')
      ON CONFLICT(initiative_id, user_id) DO UPDATE SET assignment_role = 'facilitator'
    `).run(initiativeId, facilitatorDemoId, NOW);
    db.prepare(`
      INSERT INTO hub_participants (initiative_id, user_id, invited_at) VALUES (?, ?, ?)
      ON CONFLICT(initiative_id, user_id) DO NOTHING
    `).run(initiativeId, citizenDemoId, NOW);

    const demoFixture = process.env.SPICE_DEMO_FIXTURE || 'baseline';
    if (demoFixture === 'initial') {
      db.prepare(`
        UPDATE hub_initiatives SET status = 'draft', lifecycle_status = 'setup_required',
          current_phase_number = 1, setup_completed_at = NULL, setup_selected_tools_json = '[]',
          activated_at = NULL, updated_at = ? WHERE id = ?
      `).run(NOW, initiativeId);
      db.prepare(`
        UPDATE hub_phases SET status = 'not_started', enabled_tools_json = '[]', instructions = '',
          results_visible = 0, completion_summary = NULL, completed_at = NULL,
          start_date = NULL, end_date = NULL WHERE initiative_id = ?
      `).run(initiativeId);
      db.prepare('DELETE FROM hub_contributions WHERE initiative_id = ?').run(initiativeId);
      db.prepare('DELETE FROM repository_documents WHERE initiative_id = ?').run(initiativeId);
      db.prepare('DELETE FROM hub_activities WHERE initiative_id = ?').run(initiativeId);
    } else if (demoFixture === 'participation' || demoFixture === 'completed-phase-showcase') {
      db.prepare(`
        UPDATE hub_initiatives SET status = 'active', lifecycle_status = 'active',
          current_phase_number = 3, setup_stage = 'project_active',
          setup_objectives_json = ?, setup_participation_level = 'collaboration',
          setup_goal = 'Create and compare inclusive park futures with residents',
          setup_completed_at = COALESCE(setup_completed_at, ?),
          setup_selected_tools_json = ?, activated_at = COALESCE(activated_at, ?), updated_at = ?
        WHERE id = ?
      `).run(
        JSON.stringify(['inclusive_design', 'community_priorities']), NOW,
        JSON.stringify(['hopes-and-fears', 'key-informant-interviews', 'scenario-building', 'top-10-design-principles-manifesto']),
        NOW, NOW, initiativeId,
      );

      const phaseRows = db.prepare('SELECT id, phase_number FROM hub_phases WHERE initiative_id = ? ORDER BY phase_number').all(initiativeId);
      const phases = new Map(phaseRows.map((row) => [Number(row.phase_number), Number(row.id)]));
      const phaseUpdates = [
        [1, 'completed', ['hopes-and-fears'], 1, 'Residents and municipal staff agreed the participation scope, documented accessibility priorities, and identified shade and safer access as the first shared needs.', '2026-05-01', '2026-05-20', '2026-05-20T16:00:00.000Z'],
        [2, 'completed', ['key-informant-interviews'], 1, 'Interviews and local observations built a shared evidence base around heat, movement, play, accessibility, and everyday stewardship of Parko Kritis.', '2026-05-21', '2026-06-30', '2026-06-30T16:00:00.000Z'],
        [3, 'open', ['scenario-building', 'top-10-design-principles-manifesto'], 0, null, '2026-07-01', '2026-09-18', null],
        [4, 'not_started', [], 0, null, null, null, null],
        [5, 'not_started', [], 0, null, null, null, null],
      ];
      const updatePhase = db.prepare(`
        UPDATE hub_phases SET status = ?, enabled_tools_json = ?, results_visible = ?,
          completion_summary = ?, start_date = ?, end_date = ?, completed_at = ?, instructions = ''
        WHERE initiative_id = ? AND phase_number = ?
      `);
      for (const [phaseNumber, status, toolIds, resultsVisible, summary, startDate, endDate, completedAt] of phaseUpdates) {
        updatePhase.run(status, JSON.stringify(toolIds), resultsVisible, summary, startDate, endDate, completedAt, initiativeId, phaseNumber);
      }

      db.prepare("DELETE FROM hub_activities WHERE initiative_id = ? AND title = 'Share and prioritise design ideas'").run(initiativeId);
      const ensureActivity = (activity) => {
        let row = db.prepare('SELECT id FROM hub_activities WHERE initiative_id = ? AND title = ?').get(initiativeId, activity.title);
        if (!row) {
          const result = db.prepare(`
            INSERT INTO hub_activities (
              initiative_id, phase_id, title, description, status, workflow_status,
              assigned_to_user_id, tool_key, selected_tool_ids_json, activity_type, instructions,
              start_date, end_date, location, participation_mode, estimated_duration,
              required_materials, eligibility, submission_type, submission_deadline, visibility,
              allow_anonymous_participation, allow_editing, accessibility_notes, language_support,
              support_contact, published_by_user_id, contribution_types_json, voting_enabled,
              forum_enabled, results_visible, submitted_at, published_at, completed_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            initiativeId, phases.get(activity.phase), activity.title, activity.description,
            activity.status, activity.workflowStatus, facilitatorDemoId, activity.toolIds[0],
            JSON.stringify(activity.toolIds), activity.activityType, activity.instructions,
            activity.startDate, activity.endDate, activity.location, activity.mode,
            activity.duration, activity.materials, activity.eligibility, activity.submissionType,
            activity.deadline, activity.allowEditing ? 1 : 0, activity.accessibility,
            activity.languages, activity.supportContact, municipalityDemoId,
            JSON.stringify(activity.contributionTypes), activity.voting ? 1 : 0,
            activity.forum ? 1 : 0, activity.resultsVisible ? 1 : 0,
            activity.submittedAt, activity.publishedAt, activity.completedAt, activity.createdAt, NOW,
          );
          row = { id: Number(result.lastInsertRowid) };
        } else {
          db.prepare(`
            UPDATE hub_activities SET phase_id = ?, description = ?, status = ?, workflow_status = ?,
              assigned_to_user_id = ?, tool_key = ?, selected_tool_ids_json = ?, activity_type = ?,
              instructions = ?, start_date = ?, end_date = ?, location = ?, participation_mode = ?,
              estimated_duration = ?, required_materials = ?, eligibility = ?, submission_type = ?,
              submission_deadline = ?, visibility = 'public', allow_editing = ?, accessibility_notes = ?,
              language_support = ?, support_contact = ?, published_by_user_id = ?,
              contribution_types_json = ?, voting_enabled = ?, forum_enabled = ?, results_visible = ?,
              submitted_at = ?, published_at = ?, completed_at = ?, updated_at = ? WHERE id = ?
          `).run(
            phases.get(activity.phase), activity.description, activity.status, activity.workflowStatus,
            facilitatorDemoId, activity.toolIds[0], JSON.stringify(activity.toolIds), activity.activityType,
            activity.instructions, activity.startDate, activity.endDate, activity.location, activity.mode,
            activity.duration, activity.materials, activity.eligibility, activity.submissionType,
            activity.deadline, activity.allowEditing ? 1 : 0, activity.accessibility, activity.languages,
            activity.supportContact, municipalityDemoId, JSON.stringify(activity.contributionTypes),
            activity.voting ? 1 : 0, activity.forum ? 1 : 0, activity.resultsVisible ? 1 : 0,
            activity.submittedAt, activity.publishedAt, activity.completedAt, NOW, row.id,
          );
        }
        return Number(row.id);
      };

      const phase1ActivityId = ensureActivity({
        phase: 1, title: 'Community hopes and concerns workshop',
        description: 'Residents identified hopes, concerns, decision boundaries, and participation needs for Parko Kritis.',
        status: 'completed', workflowStatus: 'completed', toolIds: ['hopes-and-fears'], activityType: 'workshop',
        instructions: 'This workshop has ended. Review the published workshop summary and Municipality response in the Repository.',
        startDate: '2026-05-12T16:00:00.000Z', endDate: '2026-05-12T17:00:00.000Z',
        location: 'Parko Kritis community room', mode: 'offline', duration: '60 minutes',
        materials: 'Sticky notes, pens, accessible large-print templates', eligibility: 'Residents and local stakeholders',
        submissionType: 'workshop contribution', deadline: '2026-05-12T17:00:00.000Z', allowEditing: false,
        accessibility: 'Step-free venue, large-print templates, and support available on request.',
        languages: 'Greek and English', supportContact: 'participation@thessaloniki.gr',
        contributionTypes: ['text'], voting: false, forum: false, resultsVisible: true,
        submittedAt: '2026-05-08T12:00:00.000Z', publishedAt: '2026-05-09T12:00:00.000Z',
        completedAt: '2026-05-12T17:00:00.000Z', createdAt: '2026-05-05T09:00:00.000Z',
      });
      const phase2ActivityId = ensureActivity({
        phase: 2, title: 'Local knowledge interviews',
        description: 'Semi-structured interviews captured everyday knowledge about movement, shade, safety, play, and accessibility.',
        status: 'completed', workflowStatus: 'completed', toolIds: ['key-informant-interviews'], activityType: 'interview',
        instructions: 'The interview round has ended. Read the published evidence summary and prioritised issues in the Repository.',
        startDate: '2026-06-02T08:00:00.000Z', endDate: '2026-06-20T18:00:00.000Z',
        location: 'Parko Kritis and online', mode: 'hybrid', duration: '45-90 minutes',
        materials: 'Interview guide and consent form', eligibility: 'Residents, local services, schools, and accessibility representatives',
        submissionType: 'facilitated interview', deadline: '2026-06-20T18:00:00.000Z', allowEditing: false,
        accessibility: 'Telephone, online, and in-person formats were available with language support.',
        languages: 'Greek and English', supportContact: 'participation@thessaloniki.gr',
        contributionTypes: ['text'], voting: false, forum: false, resultsVisible: true,
        submittedAt: '2026-05-27T12:00:00.000Z', publishedAt: '2026-05-29T12:00:00.000Z',
        completedAt: '2026-06-20T18:00:00.000Z', createdAt: '2026-05-25T09:00:00.000Z',
      });
      const phase3ActivityId = ensureActivity({
        phase: 3, title: 'Parko Kritis future scenarios workshop',
        description: 'Compare plausible park futures, test them against New European Bauhaus values, and agree design principles for the next prototype.',
        status: 'open', workflowStatus: 'open', toolIds: ['scenario-building', 'top-10-design-principles-manifesto'], activityType: 'co_design_workshop',
        instructions: 'Review the background map before attending. At the workshop, help build four future scenarios and test the proposed design principles. Online participants can submit one scenario observation by 18 September.',
        startDate: '2026-09-12T15:00:00.000Z', endDate: '2026-09-18T20:00:00.000Z',
        location: 'Parko Kritis community room and online', mode: 'hybrid', duration: '90-150 minutes',
        materials: 'Background map and scenario driver cards are provided', eligibility: 'Residents and stakeholders linked to the Thessaloniki pilot',
        submissionType: 'text or image observation', deadline: '2026-09-18T20:00:00.000Z', allowEditing: true,
        accessibility: 'Step-free venue, accessible digital form, large-print materials, and facilitator support are available.',
        languages: 'Greek and English', supportContact: 'participation@thessaloniki.gr',
        contributionTypes: ['text', 'image'], voting: false, forum: true, resultsVisible: false,
        submittedAt: '2026-08-18T10:00:00.000Z', publishedAt: '2026-08-22T10:00:00.000Z',
        completedAt: null, createdAt: '2026-08-15T09:00:00.000Z',
      });

      const ensureResult = (item) => {
        const existing = db.prepare('SELECT id FROM repository_documents WHERE initiative_id = ? AND title = ?').get(initiativeId, item.title);
        if (existing) {
          db.prepare(`
            UPDATE repository_documents SET description = ?, phase = ?, document_type = ?, pilot = 'Thessaloniki',
              file_format = ?, tags_json = ?, publication_status = 'published', access_level = 'public',
              organisation_id = ?, uploaded_by_user_id = ?, tool_key = ?, phase_id = ?, activity_id = ?,
              result_type = ?, author_role = 'municipality', published_at = ?, published_by_user_id = ?, updated_at = ?
            WHERE id = ?
          `).run(item.description, item.phase, item.documentType, item.fileFormat, JSON.stringify(item.tags), organisationId,
            municipalityDemoId, item.toolKey, phases.get(item.phase), item.activityId, item.resultType,
            item.publishedAt, municipalityDemoId, item.publishedAt, existing.id);
          return Number(existing.id);
        }
        const result = db.prepare(`
          INSERT INTO repository_documents (
            title, description, phase, document_type, pilot, file_format, tags_json,
            publication_status, access_level, initiative_id, organisation_id, uploaded_by_user_id,
            tool_key, phase_id, activity_id, result_type, author_role, published_at,
            published_by_user_id, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'Thessaloniki', ?, ?, 'published', 'public', ?, ?, ?, ?, ?, ?, ?, 'municipality', ?, ?, 1, ?, ?)
        `).run(item.title, item.description, item.phase, item.documentType, item.fileFormat, JSON.stringify(item.tags),
          initiativeId, organisationId, municipalityDemoId, item.toolKey, phases.get(item.phase), item.activityId,
          item.resultType, item.publishedAt, municipalityDemoId, item.publishedAt, item.publishedAt);
        return Number(result.lastInsertRowid);
      };
      ensureResult({
        title: 'Phase 1 participation and readiness summary', phase: 1, documentType: 'Workshop outputs',
        description: 'Published summary of participation boundaries, accessibility priorities, hopes, concerns, and agreed responsibilities.',
        fileFormat: 'PDF', tags: ['Readiness', 'Municipality summary'], toolKey: 'hopes-and-fears',
        activityId: phase1ActivityId, resultType: 'participation_summary', publishedAt: '2026-05-20T16:00:00.000Z',
      });
      ensureResult({
        title: 'Phase 2 shared diagnosis and priority issues', phase: 2, documentType: 'Summary',
        description: 'Interview evidence and local observations consolidated into a shared diagnosis for the co-design phase.',
        fileFormat: 'PDF', tags: ['Collective understanding', 'Citizen evidence'], toolKey: 'key-informant-interviews',
        activityId: phase2ActivityId, resultType: 'citizen_contribution_summary', publishedAt: '2026-06-30T16:00:00.000Z',
      });
      ensureResult({
        title: 'Future scenarios participation guide', phase: 3, documentType: 'Method',
        description: 'Published workshop information, background map guidance, accessibility arrangements, and ways to participate.',
        fileFormat: 'PDF', tags: ['Participation guide', 'Accessibility'], toolKey: 'scenario-building',
        activityId: phase3ActivityId, resultType: null, publishedAt: '2026-08-22T10:00:00.000Z',
      });

      if (!db.prepare('SELECT 1 FROM hub_contributions WHERE activity_id = ? AND user_id = ?').get(phase1ActivityId, citizenDemoId)) {
        db.prepare(`
          INSERT INTO hub_contributions (
            initiative_id, phase_id, activity_id, user_id, contribution_type, content, status,
            municipality_response, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'text', ?, 'incorporated', ?, ?, ?)
        `).run(initiativeId, phases.get(1), phase1ActivityId, citizenDemoId,
          'Keep the northern path step-free and provide shade near the playground.',
          'Included in the Phase 1 summary and carried into the shared diagnosis.',
          '2026-05-12T16:30:00.000Z', '2026-05-20T16:00:00.000Z');
      }
    }
  }

  if (Number(db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?').get(userId).count) === 0) {
    insertMany(db, `
      INSERT INTO notifications (
        user_id, type, title, body, tag, pilot, is_read, archived, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      [userId, 'proposal', 'New 3D Variant Proposed', 'A new layout for Parko Kritis has been submitted for review.', 'Proposal', 'Thessaloniki Parko Kritis', 0, 0, '2026-06-17T08:50:00.000Z'],
      [userId, 'comment', 'Reply to your map pin', 'A participant replied to your lighting suggestion near the bike path.', 'Comment', 'Thessaloniki Parko Kritis', 0, 0, '2026-06-17T07:00:00.000Z'],
      [userId, 'repository', 'Workshop summary available', 'The latest co-design workshop summary is ready in the repository.', 'Repository', 'Thessaloniki', 1, 0, '2026-06-15T11:30:00.000Z'],
      [userId, 'forum', 'Proposal status updated', 'Your accessibility proposal has moved to technical review.', 'Forum', 'Thessaloniki Parko Kritis', 1, 0, '2026-06-14T09:20:00.000Z'],
      [userId, 'system', 'Profile preferences saved', 'Your language and accessibility preferences were updated.', 'Account', 'SPICE Platform', 1, 1, '2026-06-12T12:00:00.000Z'],
    ]);
  }

  if (Number(db.prepare('SELECT COUNT(*) AS count FROM pilots').get().count) === 0) {
    insertMany(db, `
      INSERT INTO pilots (slug, city, country, country_code, title, description, focus, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ['thessaloniki', 'Thessaloniki', 'Greece', 'GR', 'Parko Kritis', 'Citizens and municipal teams are co-designing a greener, safer, and more accessible neighborhood park.', 'Urban greenery, accessibility, and public-space comfort', 'Active'],
      ['rovaniemi', 'Rovaniemi', 'Finland', 'FI', 'Winter City Public Spaces', 'The pilot explores inclusive participation and resilient public-space use across long winter seasons.', 'Seasonal accessibility and climate-responsive design', 'Active'],
      ['bielsko-biala', 'Bielsko-Biala', 'Poland', 'PL', 'Connected Neighborhoods', 'Local communities are shaping walkable links and welcoming shared spaces between neighborhoods.', 'Mobility, social connection, and inclusive streets', 'Active'],
      ['cuba', 'Cuba', 'Portugal', 'PT', 'Cuba Civic Spaces', 'Residents are contributing local knowledge to improve everyday civic and cultural gathering spaces.', 'Community identity, participation, and heritage', 'Active'],
    ]);
  }

  if (Number(db.prepare('SELECT COUNT(*) AS count FROM forum_proposals').get().count) === 0) {
    insertMany(db, `
      INSERT INTO forum_proposals (
        user_id, title, description, tags_json, status, workflow_status, phase_number, upvotes, downvotes, official_response, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      [userId, 'Plant native Mediterranean trees along the park', 'Replace concrete planters with native olive trees, oleanders, and aromatic herbs to provide shade, reduce heat, and attract pollinators.', JSON.stringify(['Greenery & Nature']), 'Under Review', 'municipality_review', 1, 189, 12, 'This proposal has been referred to the Green Infrastructure Department for technical assessment. We will report back by 30 June.', '2026-06-17T08:00:00.000Z', '2026-06-17T08:00:00.000Z'],
      [userId, 'Install tactile paving on all paths', 'Add tactile guide paths and kerb ramps throughout the park to improve accessibility for blind and visually impaired visitors.', JSON.stringify(['Accessibility']), 'Open', 'voting_open', 1, 116, 18, null, '2026-06-16T10:00:00.000Z', '2026-06-16T10:00:00.000Z'],
      [userId, 'Upgrade lighting at northern pedestrian entrance', 'Install energy-efficient LED lighting at the northern pedestrian entrance to improve safety after dark.', JSON.stringify(['Safety & Lighting']), 'Implemented', 'approved', 1, 284, 3, 'Lighting upgrade approved and scheduled for installation in September 2026.', '2026-06-12T09:00:00.000Z', '2026-06-12T09:00:00.000Z'],
    ]);

    if (demoInitiative) {
      db.prepare('UPDATE forum_proposals SET initiative_id = ?, organisation_id = ? WHERE initiative_id IS NULL')
        .run(Number(demoInitiative.id), organisationId);
    }

    const proposalId = Number(db.prepare('SELECT id FROM forum_proposals ORDER BY id LIMIT 1').get().id);
    insertMany(db, `
      INSERT INTO forum_comments (proposal_id, user_id, body, created_at) VALUES (?, ?, ?, ?)
    `, [
      [proposalId, userId, 'The current promenade needs more shade during summer afternoons.', '2026-06-17T08:20:00.000Z'],
      [proposalId, userId, 'Native species would also reduce irrigation requirements.', '2026-06-17T08:35:00.000Z'],
    ]);
  }

  if (Number(db.prepare('SELECT COUNT(*) AS count FROM repository_documents').get().count) === 0) {
    insertMany(db, `
      INSERT INTO repository_documents (
        title, description, phase, document_type, pilot, file_format, tags_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ['Thessaloniki Pilot - Diagnostic Report', 'Readiness findings and baseline conditions for Parko Kritis.', 1, 'Report', 'Thessaloniki', 'PDF', JSON.stringify(['Assessment', 'Readiness']), '2026-05-08T10:00:00.000Z'],
      ['Stakeholder Mapping Workshop - Notes', 'Facilitation notes and stakeholder-map outputs.', 1, 'Workshop notes', 'Thessaloniki', 'PDF', JSON.stringify(['Facilitation']), '2026-05-08T10:00:00.000Z'],
      ['CitiVoice Campaign Summary - May-Jun 2026', 'Citizen feedback themes, locations, and participation summary.', 2, 'Summary', 'Thessaloniki', 'ZIP', JSON.stringify(['Heatmap', 'Feedback']), '2026-06-15T10:00:00.000Z'],
      ['Spatial Feedback Walk - Photojournal', 'Participatory photo documentation and field observations.', 2, 'Method', 'Thessaloniki', 'PDF', JSON.stringify(['Photos', 'Walk']), '2026-06-14T10:00:00.000Z'],
      ['Co-Design Workshop Outputs', 'Prioritized design options and workshop decisions.', 3, 'Workshop outputs', 'Rovaniemi', 'PDF', JSON.stringify(['Co-design']), '2026-06-12T10:00:00.000Z'],
      ['3D Scene Editor Export - Cycle Lane', 'Interactive scenario export for the selected cycle-lane option.', 4, '3D export', 'Thessaloniki', 'GLTF', JSON.stringify(['Scenario', '3D']), '2026-06-10T10:00:00.000Z'],
      ['Pilot Evaluation and Lessons', 'Evaluation results, participation indicators, and lessons learned.', 5, 'Evaluation', 'All pilots', 'PDF', JSON.stringify(['Impact', 'Lessons']), '2026-06-17T10:00:00.000Z'],
    ]);
  }

  if (Number(db.prepare('SELECT COUNT(*) AS count FROM insight_metrics').get().count) === 0) {
    insertMany(db, `
      INSERT INTO insight_metrics (metric_key, metric_value, metric_label, category, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      ['contributions', 1247, 'Contributions', 'participation', NOW],
      ['participants', 847, 'Unique participants', 'participation', NOW],
      ['active_pilots', 4, 'Active pilot sites', 'pilots', NOW],
      ['tools_used', 9, 'Tools used', 'tools', NOW],
      ['repository_outputs', 37, 'Repository outputs', 'outputs', NOW],
      ['multilingual_share', 68, 'Multilingual participation (%)', 'languages', NOW],
      ['accessible_sessions', 92, 'Accessible sessions (%)', 'accessibility', NOW],
      ['positive_feedback', 79, 'Positive or constructive feedback (%)', 'feedback', NOW],
    ]);
  }

  if (Number(db.prepare('SELECT COUNT(*) AS count FROM citivoice_metrics').get().count) === 0) {
    insertMany(db, `
      INSERT INTO citivoice_metrics (metric_key, metric_value, metric_label, period_label, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      ['contributions', 1247, 'Contributions received', '+47 today', NOW],
      ['participants', 847, 'Unique participants', '+12 this week', NOW],
      ['votes', 856, 'Votes cast', '+23 today', NOW],
      ['photos', 312, 'Photos uploaded', '+47 today', NOW],
      ['issues', 71, 'Issues flagged', '14 need action', NOW],
    ]);
  }

  if (Number(db.prepare('SELECT COUNT(*) AS count FROM dashboard_data').get().count) === 0) {
    const dashboardRows = [
      ['citivoice', 'engagement', [{ week: 'W1', value: 28 }, { week: 'W2', value: 95 }, { week: 'W3', value: 180 }, { week: 'W4', value: 290 }, { week: 'W5', value: 340 }, { week: 'W6', value: 310 }]],
      ['citivoice', 'sentiment', [{ name: 'Positive', value: 38, color: '#2e6e45' }, { name: 'Constructive', value: 41, color: '#1b3a5c' }, { name: 'Concerned', value: 15, color: '#f68b2c' }, { name: 'Negative', value: 6, color: '#c0392b' }]],
      ['citivoice', 'categories', [{ name: 'Safety & lighting', value: 312 }, { name: 'Greenery & nature', value: 278 }, { name: 'Seating & rest', value: 201 }, { name: 'Play & sport', value: 155 }, { name: 'Accessibility', value: 97 }, { name: 'Events & activity', value: 64 }]],
      ['citivoice', 'ideas', [{ name: 'Add cycle lane', votes: 224, support: true }, { name: 'Community garden', votes: 198, support: true }, { name: 'Covered seating', votes: 178, support: true }, { name: 'Water feature', votes: 142, support: true }, { name: 'Remove parking', votes: 107, support: false }]],
      ['citivoice', 'locations', [{ name: 'Central plaza (eastern section)', description: 'Lack of shade and seating', count: 412, color: '#c0392b' }, { name: 'Northern pedestrian entrance', description: 'Safety at night - poor lighting', count: 234, color: '#f68b2c' }, { name: 'Waterfront promenade', description: 'Damaged paving - accessibility issue', count: 198, color: '#2e6e45' }, { name: "Children's play area", description: 'Outdated equipment', count: 187, color: '#637948' }]],
      ['insights', 'activePilots', [{ label: 'Thessaloniki', value: 72 }, { label: 'Rovaniemi', value: 54 }, { label: 'Cuba', value: 46 }, { label: 'Bielsko-Biala', value: 38 }]],
      ['insights', 'toolUsage', [{ label: 'CitiVoice Map', value: 78 }, { label: 'Co-Creation Guide', value: 61 }, { label: 'Repository', value: 48 }, { label: '3D Scene Editor', value: 36 }]],
      ['insights', 'phaseEngagement', [{ label: 'Phase 1', value: 18 }, { label: 'Phase 2', value: 31 }, { label: 'Phase 3', value: 44 }, { label: 'Phase 4', value: 22 }, { label: 'Phase 5', value: 15 }]],
      ['insights', 'feedbackTrend', [{ label: 'Apr', value: 42 }, { label: 'May', value: 61 }, { label: 'Jun', value: 79 }]],
    ];
    insertMany(db, 'INSERT INTO dashboard_data (page, data_key, payload_json, updated_at) VALUES (?, ?, ?, ?)', dashboardRows.map(([page, key, payload]) => [page, key, JSON.stringify(payload), NOW]));
  }
}
