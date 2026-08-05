import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigation } from 'react-router';
import { useI18n } from '../context/I18nContext';
import PageLoadingSkeleton from './PageLoadingSkeleton';

export default function RouteExperience() {
  const location = useLocation();
  const navigation = useNavigation();
  const { t } = useI18n();
  const [announcement, setAnnouncement] = useState('');
  const isNavigating = navigation.state !== 'idle';

  useEffect(() => {
    setAnnouncement('');
    const timer = window.setTimeout(() => setAnnouncement(t('navigation.ready')), 100);
    return () => window.clearTimeout(timer);
  }, [location.pathname, t]);

  return (
    <>
      <div className={`spice-route-progress ${isNavigating ? 'is-visible' : ''}`} aria-hidden="true" />
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isNavigating ? t('navigation.loading') : announcement}
      </div>
      <div key={location.key} className="spice-route-view">
        <Suspense fallback={<PageLoadingSkeleton />}>
          <Outlet />
        </Suspense>
      </div>
    </>
  );
}
