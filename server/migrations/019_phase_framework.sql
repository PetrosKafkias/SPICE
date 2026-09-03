ALTER TABLE hub_phases ADD COLUMN event_types_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE hub_phases ADD COLUMN expected_outputs_json TEXT NOT NULL DEFAULT '[]';

UPDATE hub_phases SET
  title = 'Frame and assess readiness',
  description = 'Agree the scope, participation boundaries, decision links, stakeholders, competences, and resources before public activities begin.',
  event_types_json = '["EV1 Opening and local dissemination","EV2 Framing and readiness"]',
  expected_outputs_json = '["Agreed process frame","Participation ambition and decision boundaries","Stakeholder and competence map","Organisational conditions and responsibilities"]'
WHERE phase_number = 1;

UPDATE hub_phases SET
  title = 'Understand with the community',
  description = 'Combine technical context with lived experience, local knowledge, needs, attachments, conflicts, and environmental perspectives.',
  event_types_json = '["EV3 Collective understanding: challenges, needs and opportunities"]',
  expected_outputs_json = '["Shared diagnosis","Recognised needs and qualities","Priority challenges","Social, spatial, and environmental evidence"]'
WHERE phase_number = 2;

UPDATE hub_phases SET
  title = 'Imagine scenarios and solutions',
  description = 'Generate alternatives before converging, make trade-offs visible, and document why participants prefer particular directions.',
  event_types_json = '["EV4 Co-design and scenario building"]',
  expected_outputs_json = '["Co-developed scenarios","Design concepts or principles","Documented choices and trade-offs","Questions requiring further testing"]'
WHERE phase_number = 3;

UPDATE hub_phases SET
  title = 'Test using prototypes',
  description = 'Use reversible prototypes, temporary activities, observations, and feedback to test assumptions in the real context.',
  event_types_json = '["EV5 Prototyping and real-life testing"]',
  expected_outputs_json = '["Situated testing evidence","Observed intended and unintended uses","Participant feedback","Documented revisions and lessons"]'
WHERE phase_number = 4;

UPDATE hub_phases SET
  title = 'Consolidate and learn',
  description = 'Connect outcomes to responsibilities, governance, policy, implementation, stewardship, and continued community involvement.',
  event_types_json = '["EV6 Activation, care and governance","EV7 Final event, restitution and future commitments"]',
  expected_outputs_json = '["Agreed next steps","Governance or stewardship arrangements","Documented learning","Responsibilities and commitments","Connection to planning and implementation"]'
WHERE phase_number = 5;
