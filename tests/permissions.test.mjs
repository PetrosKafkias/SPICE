import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPermission, normalizeRole } from '../server/permissions.mjs';

test('role permission matrix keeps guest, citizen, municipality, and admin boundaries explicit', () => {
  assert.equal(normalizeRole('Citizen'), 'citizen');
  assert.equal(normalizeRole('Municipality Staff'), 'municipality');
  assert.equal(normalizeRole('Admin'), 'admin');

  assert.equal(hasPermission(null, 'public:view'), true);
  assert.equal(hasPermission(null, 'forum:create-proposal'), false);

  const citizen = { role: 'Citizen' };
  assert.equal(hasPermission(citizen, 'hub:participate'), true);
  assert.equal(hasPermission(citizen, 'hub:create'), false);
  assert.equal(hasPermission(citizen, 'forum:official-decision'), false);

  const municipality = { role: 'Municipality Staff' };
  assert.equal(hasPermission(municipality, 'hub:create'), true);
  assert.equal(hasPermission(municipality, 'hub:manage-phases'), true);
  assert.equal(hasPermission(municipality, 'admin:access'), false);

  const admin = { role: 'Admin' };
  assert.equal(hasPermission(admin, 'admin:access'), true);
  assert.equal(hasPermission(admin, 'users:manage'), true);
  assert.equal(hasPermission(admin, 'hub:archive'), true);
});

test('facilitator can prepare tools and upload but cannot decide, publish, or moderate', () => {
  assert.equal(normalizeRole('Facilitator'), 'facilitator');

  const facilitator = { role: 'Facilitator', account_status: 'active' };
  assert.equal(hasPermission(facilitator, 'hub:participate'), true);
  assert.equal(hasPermission(facilitator, 'hub:configure-tools'), true);
  assert.equal(hasPermission(facilitator, 'hub:facilitate'), true);
  assert.equal(hasPermission(facilitator, 'hub:view-participant-input'), true);
  assert.equal(hasPermission(facilitator, 'repository:upload'), true);
  assert.equal(hasPermission(facilitator, 'forum:create-proposal'), true);

  assert.equal(hasPermission(facilitator, 'hub:manage-phases'), false);
  assert.equal(hasPermission(facilitator, 'hub:publish'), false);
  assert.equal(hasPermission(facilitator, 'hub:issue-official-response'), false);
  assert.equal(hasPermission(facilitator, 'forum:official-decision'), false);
  assert.equal(hasPermission(facilitator, 'forum:moderate'), false);
  assert.equal(hasPermission(facilitator, 'repository:manage'), false);
});

test('repository upload is staff-only and publishing stays a municipality action', () => {
  const citizen = { role: 'Citizen', account_status: 'active' };
  assert.equal(hasPermission(citizen, 'repository:upload'), false);
  assert.equal(hasPermission(citizen, 'repository:manage'), false);
  assert.equal(hasPermission(citizen, 'repository:view-public'), true);

  const facilitator = { role: 'Facilitator', account_status: 'active' };
  assert.equal(hasPermission(facilitator, 'repository:upload'), true);
  assert.equal(hasPermission(facilitator, 'repository:manage'), false);

  const municipality = { role: 'Municipality Staff', account_status: 'active' };
  assert.equal(hasPermission(municipality, 'repository:upload'), true);
  assert.equal(hasPermission(municipality, 'repository:manage'), true);
});

test('a pending-approval Municipality or Facilitator account is downgraded to citizen permissions', () => {
  const pendingMunicipality = { role: 'Municipality Staff', account_status: 'pending_approval' };
  assert.equal(hasPermission(pendingMunicipality, 'hub:create'), false);
  assert.equal(hasPermission(pendingMunicipality, 'hub:manage-phases'), false);
  assert.equal(hasPermission(pendingMunicipality, 'hub:participate'), true);

  const pendingFacilitator = { role: 'Facilitator', account_status: 'pending_approval' };
  assert.equal(hasPermission(pendingFacilitator, 'hub:configure-tools'), false);
  assert.equal(hasPermission(pendingFacilitator, 'repository:upload'), false);
  assert.equal(hasPermission(pendingFacilitator, 'hub:participate'), true);

  const activeFacilitator = { role: 'Facilitator', account_status: 'active' };
  assert.equal(hasPermission(activeFacilitator, 'hub:configure-tools'), true);

  const suspendedMunicipality = { role: 'Municipality Staff', account_status: 'suspended' };
  assert.equal(hasPermission(suspendedMunicipality, 'hub:create'), false);
});
