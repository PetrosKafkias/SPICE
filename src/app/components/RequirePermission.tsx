import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../auth/usePermissions';
import type { Permission } from '../auth/permissions';
import PageLoadingSkeleton from './PageLoadingSkeleton';
import SpicePublicShell from './SpicePublicShell';
import { useI18n } from '../context/I18nContext';

export default function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { status } = useAuth();
  const { can } = usePermissions();
  const { t } = useI18n();
  const location = useLocation();
  if (status === 'loading') return <PageLoadingSkeleton />;
  if (status === 'anonymous') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/signin?reason=auth&returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  if (!can(permission)) return (
    <SpicePublicShell>
      <main className="spice-page spice-wide-page">
        <section className="mx-auto max-w-2xl border-2 border-[#d7d8dc] bg-white p-8 text-center" role="alert">
          <ShieldX className="mx-auto text-[#ca7428]" size={44} aria-hidden="true" />
          <h1 className="mt-4 text-[30px] font-bold text-[#444]">{t('permission.deniedTitle')}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{t('permission.deniedText')}</p>
          <a href="/co-creation-hub" className="mt-6 inline-flex min-h-12 items-center bg-[#f68b2c] px-6 py-3 font-bold text-white">{t('permission.openHub')}</a>
        </section>
      </main>
    </SpicePublicShell>
  );
  return <>{children}</>;
}
