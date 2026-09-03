const CITIZEN_PERMISSIONS = ['public:view','hub:view-public','hub:view-assigned','hub:participate','forum:view','forum:create-proposal','forum:comment','forum:vote','forum:edit-own-content','forum:withdraw-own-proposal','repository:view-public','repository:view-hub-resources','tools:view','tools:use-enabled','users:view-self'];

export const ROLE_PERMISSIONS = Object.freeze({
  citizen: new Set(CITIZEN_PERMISSIONS),
  facilitator: new Set([...CITIZEN_PERMISSIONS, 'hub:facilitate', 'hub:configure-tools', 'hub:view-participant-input', 'repository:upload']),
  municipality: new Set(['public:view','hub:view-public','hub:view-assigned','hub:participate','hub:create','hub:edit','hub:delete','hub:publish','hub:archive','hub:manage-phases','hub:facilitate','hub:configure-tools','hub:configure-participation','hub:view-participant-input','hub:view-analytics','hub:issue-official-response','hub:preview-citizen-view','forum:view','forum:create-proposal','forum:comment','forum:vote','forum:edit-own-content','forum:withdraw-own-proposal','forum:moderate','forum:official-decision','repository:view-public','repository:view-hub-resources','repository:upload','repository:manage','tools:view','tools:use-enabled','tools:configure','users:view-self']),
  admin: new Set(['admin:all']),
});

export function normalizeRole(value) {
  if (value === 'Admin' || value === 'Platform Administrator' || value === 'platform_admin') return 'admin';
  if (value === 'Municipality Staff' || value === 'Municipality' || value === 'Municipality / Pilot Coordinator' || value === 'Pilot Coordinator' || value === 'Pilot Admin' || value === 'Pilot User' || value === 'Pilot') return 'municipality';
  if (value === 'Facilitator') return 'facilitator';
  return 'citizen';
}

export function hasPermission(user, permission) {
  if (!user) return permission === 'public:view';
  const role = user.account_status && user.account_status !== 'active' ? 'citizen' : normalizeRole(user.role);
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.citizen;
  return permissions.has('admin:all') || permissions.has(permission);
}
