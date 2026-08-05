import { hashPassword } from './security.mjs';

const NOW = '2026-06-17T09:00:00.000Z';

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
        user_id, title, description, tags_json, status, upvotes, downvotes, official_response, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      [userId, 'Plant native Mediterranean trees along the park', 'Replace concrete planters with native olive trees, oleanders, and aromatic herbs to provide shade, reduce heat, and attract pollinators.', JSON.stringify(['Greenery & Nature']), 'Under Review', 189, 12, 'This proposal has been referred to the Green Infrastructure Department for technical assessment. We will report back by 30 June.', '2026-06-17T08:00:00.000Z', '2026-06-17T08:00:00.000Z'],
      [userId, 'Install tactile paving on all paths', 'Add tactile guide paths and kerb ramps throughout the park to improve accessibility for blind and visually impaired visitors.', JSON.stringify(['Accessibility']), 'Open', 116, 18, null, '2026-06-16T10:00:00.000Z', '2026-06-16T10:00:00.000Z'],
      [userId, 'Upgrade lighting at northern pedestrian entrance', 'Install energy-efficient LED lighting at the northern pedestrian entrance to improve safety after dark.', JSON.stringify(['Safety & Lighting']), 'Implemented', 284, 3, 'Lighting upgrade approved and scheduled for installation in September 2026.', '2026-06-12T09:00:00.000Z', '2026-06-12T09:00:00.000Z'],
    ]);

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

  if (Number(db.prepare('SELECT COUNT(*) AS count FROM scenarios').get().count) === 0) {
    insertMany(db, `
      INSERT INTO scenarios (
        user_id, slug, title, summary, color, background, border_color,
        tags_json, strengths_json, concerns_json, upvotes, downvotes,
        rating, rating_count, contributors, phase, status, guidance,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      [
        userId, 'green-mobility-hub', 'Green Mobility Hub',
        'Transform the waterfront into a car-free mobility corridor with cycling paths, shared mobility, urban greenery, and rest zones.',
        '#2e6e45', '#eaf4ef', '#b6ddc6',
        JSON.stringify(['Mobility', 'Green Space', 'Climate-Resilient']),
        JSON.stringify(['Reduces car dependency', 'Supports climate adaptation', 'Serves commuters and younger residents']),
        JSON.stringify(['Accessible drop-off points are required', 'Infrastructure costs need phasing']),
        134, 22, 4.1, 89, 58, 3, 'Under Review',
        'Strong alignment with the Thessaloniki mobility plan. Validate accessible access and phased delivery before adoption.',
        NOW, NOW,
      ],
      [
        userId, 'cultural-gathering-square', 'Cultural Gathering Square',
        'Create a flexible open-air stage with permanent seating, public art, and a rotating cultural programme managed with local associations.',
        '#5a3f7a', '#f2eef9', '#cdb8e8',
        JSON.stringify(['Cultural', 'Social', 'Youth-Focused']),
        JSON.stringify(['Builds community identity', 'Supports flexible use', 'Can start with low-cost programming']),
        JSON.stringify(['Noise management is needed', 'A shared governance model is required']),
        98, 17, 3.8, 67, 41, 3, 'Community Voting',
        'Community support is positive. A stakeholder workshop should resolve programming and noise-management responsibilities.',
        NOW, NOW,
      ],
      [
        userId, 'multi-generational-park', 'Multi-Generational Park',
        'Combine senior fitness, natural play, a small youth activity area, and shared picnic lawns in one inclusive park layout.',
        '#8a6b00', '#fdf8e6', '#e8d87e',
        JSON.stringify(['Social', 'Green Space', 'Youth-Focused']),
        JSON.stringify(['Inclusive across age groups', 'Can be delivered in phases', 'Supports everyday community use']),
        JSON.stringify(['Space allocation must be agreed', 'Ongoing maintenance needs ownership']),
        162, 14, 4.5, 112, 76, 3, 'Recommended',
        'This option has the broadest support. Confirm accessible circulation and maintenance responsibilities in the next workshop.',
        NOW, NOW,
      ],
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
