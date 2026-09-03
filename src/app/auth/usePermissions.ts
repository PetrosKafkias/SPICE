import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { can, normalizeRole, roleKey, type Permission } from './permissions';
import { useI18n } from '../context/I18nContext';

export function usePermissions() {
  const { user } = useAuth();
  const { t } = useI18n();
  return useMemo(() => {
    const role = user ? (user.accountStatus === 'active' ? normalizeRole(user.role) : 'citizen') : null;
    return {
      role,
      roleLabel: role ? t(roleKey(role)) : t('role.Guest'),
      can: (permission: Permission) => can(role, permission),
      hasAny: (...permissions: Permission[]) => permissions.some((permission) => can(role, permission)),
    };
  }, [t, user]);
}
