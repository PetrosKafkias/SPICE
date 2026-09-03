import type { TranslationKey } from '../i18n/translations';

export const ROLES = ['citizen', 'facilitator', 'municipality', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'public:view',
  'hub:view-public', 'hub:view-assigned', 'hub:participate', 'hub:create', 'hub:edit',
  'hub:delete', 'hub:publish', 'hub:archive', 'hub:manage-phases', 'hub:configure-tools',
  'hub:facilitate', 'hub:configure-participation', 'hub:view-participant-input', 'hub:view-analytics',
  'hub:issue-official-response', 'hub:preview-citizen-view',
  'forum:view', 'forum:create-proposal', 'forum:comment', 'forum:vote',
  'forum:edit-own-content', 'forum:withdraw-own-proposal', 'forum:moderate', 'forum:official-decision',
  'repository:view-public', 'repository:view-hub-resources', 'repository:upload', 'repository:manage',
  'tools:view', 'tools:use-enabled', 'tools:configure',
  'users:view-self', 'users:manage', 'roles:manage', 'admin:access', 'admin:all',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const citizen: Permission[] = [
  'public:view', 'hub:view-public', 'hub:view-assigned', 'hub:participate',
  'forum:view', 'forum:create-proposal', 'forum:comment', 'forum:vote',
  'forum:edit-own-content', 'forum:withdraw-own-proposal',
  'repository:view-public', 'repository:view-hub-resources', 'tools:view',
  'tools:use-enabled', 'users:view-self',
];

const facilitator: Permission[] = [
  ...citizen, 'hub:facilitate', 'hub:configure-tools', 'hub:view-participant-input', 'repository:upload',
];

const municipality: Permission[] = [
  ...citizen, 'hub:create', 'hub:edit', 'hub:delete', 'hub:publish', 'hub:archive',
  'hub:manage-phases', 'hub:facilitate', 'hub:configure-tools', 'hub:configure-participation',
  'hub:view-participant-input', 'hub:view-analytics', 'hub:issue-official-response',
  'hub:preview-citizen-view', 'forum:moderate', 'forum:official-decision',
  'repository:upload', 'repository:manage', 'tools:configure',
];

export const ROLE_PERMISSION_MAP: Record<Role, ReadonlySet<Permission>> = {
  citizen: new Set(citizen),
  facilitator: new Set(facilitator),
  municipality: new Set(municipality),
  admin: new Set(PERMISSIONS),
};

export function normalizeRole(value?: string | null): Role {
  if (value === 'Admin' || value === 'Platform Administrator' || value === 'platform_admin') return 'admin';
  if (value === 'Municipality Staff' || value === 'Municipality' || value === 'Municipality / Pilot Coordinator' || value === 'Pilot Coordinator' || value === 'Pilot Admin' || value === 'Pilot User' || value === 'Pilot') return 'municipality';
  if (value === 'Facilitator') return 'facilitator';
  return 'citizen';
}

export function roleKey(role: Role): TranslationKey {
  if (role === 'admin') return 'role.PlatformAdministrator';
  if (role === 'municipality') return 'role.MunicipalityStaff';
  if (role === 'facilitator') return 'role.Facilitator';
  return 'role.Citizen';
}

export function can(role: Role | null | undefined, permission: Permission) {
  return role ? ROLE_PERMISSION_MAP[role].has(permission) : permission === 'public:view';
}
