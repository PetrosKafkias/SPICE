import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import ObjectiveWorkspace from '../components/ObjectiveWorkspace';
import { useI18n } from '../context/I18nContext';
import { usePermissions } from '../auth/usePermissions';

// Objectives are worked on inside the Co-Creation Hub. This route keeps old links and notifications
// working; administrators, who have no pilot of their own in the hub, still get a standalone view.
export default function HubPhaseDetailPage() {
  const { role } = usePermissions();
  const { t } = useI18n();
  const { initiativeId, phaseNumber } = useParams();
  const phase = Number(phaseNumber) || 1;
  if (role !== 'admin') return <Navigate to={`/co-creation-hub?initiative=${initiativeId}&phase=${phase}#objective-workspace`} replace />;
  return (
    <SpicePublicShell variant="public">
      <div className="spice-page spice-wide-page">
        <Link to={`/hub/${initiativeId}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-bold text-[#a85f20] hover:underline">
          <ArrowLeft size={18} /> {t('phaseDetail.back', { pilot: t('phaseDetail.defaultPilot') })}
        </Link>
        <ObjectiveWorkspace initiativeId={Number(initiativeId)} phaseNumber={phase} />
      </div>
    </SpicePublicShell>
  );
}
