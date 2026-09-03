import { useI18n } from '../context/I18nContext';
import LoadingState from './LoadingState';

// Shown while a route's code chunk downloads or its auth/permission check resolves —
// this fires for every route indiscriminately, so it deliberately stays a plain
// spinner rather than a fake per-page skeleton (no single layout would fit all routes).
export default function PageLoadingSkeleton() {
  const { t } = useI18n();

  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#f7f7f7]">
      <LoadingState message={t('common.loading')} minHeight="calc(100vh - 76px)" size="lg" />
    </div>
  );
}
