import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Building2, CircleAlert, FileText, RefreshCw, Search, Settings, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import LoadingState from '../components/LoadingState';
import { apiRequest, jsonBody } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { normalizeRole, roleKey } from '../auth/permissions';
import { statusKey } from '../lib/statusLabel';
import type { TranslationKey } from '../i18n/translations';

type Tab = 'overview' | 'users' | 'municipalities' | 'initiatives' | 'forum' | 'repository' | 'integrations' | 'audit' | 'settings';
interface Summary { totalUsers: number; municipalities: number; activeInitiatives: number; setupRequiredInitiatives: number; readyToActivateInitiatives: number; completedInitiatives: number; pendingApprovals: number; openProposals: number; repositoryItems: number; usersByRole: { role: string; count: number }[] }
interface AdminUser { id: number; fullName: string; email: string; role: string; accountStatus: string; organisationId: number | null; organisationName: string | null; pilotSite: string }
interface Organisation { id: number; name: string; municipality: string; pilotSlug: string; status: string }
interface Initiative { id: number; title: string; status: string; lifecycleStatus: string; organisationName: string; version: number; currentPhaseNumber: number | null }
interface Proposal { id: number; title: string; status: string; moderationStatus: string; moderationReason: string | null; openReports: number; author: string }
interface RepositoryItem { id: number; title: string; publicationStatus: string; pilot: string; phase: number }
interface Integration { key: string; label: string; status: string; detail: string }
interface AuditEntry { eventId: string; timestamp: string; actorRole: string; action: string; targetType: string; targetId: string; reason: string | null }
interface Workspace { initiatives: Initiative[]; proposals: Proposal[]; repository: RepositoryItem[]; integrations: Integration[]; settings: Record<string, unknown> }

const EMPTY_SUMMARY: Summary = { totalUsers: 0, municipalities: 0, activeInitiatives: 0, setupRequiredInitiatives: 0, readyToActivateInitiatives: 0, completedInitiatives: 0, pendingApprovals: 0, openProposals: 0, repositoryItems: 0, usersByRole: [] };
const EMPTY_WORKSPACE: Workspace = { initiatives: [], proposals: [], repository: [], integrations: [], settings: {} };
const TABS: Array<{ id: Tab; key: TranslationKey }> = [
  { id: 'overview', key: 'admin.tab.overview' }, { id: 'users', key: 'admin.tab.users' }, { id: 'municipalities', key: 'admin.tab.municipalities' },
  { id: 'initiatives', key: 'admin.tab.initiatives' }, { id: 'forum', key: 'admin.tab.forum' }, { id: 'repository', key: 'admin.tab.repository' },
  { id: 'integrations', key: 'admin.tab.integrations' }, { id: 'audit', key: 'admin.tab.audit' }, { id: 'settings', key: 'admin.tab.settings' },
];
const fieldClass = 'mt-2 min-h-11 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none';
const publicationStatuses = ['draft', 'ready_for_review', 'published', 'archived'];
const AUDIT_ACTION_KEYS: Record<string, TranslationKey> = {
  'hub.initiative.create': 'admin.auditAction.initiativeCreate',
  'hub.facilitator.assign': 'admin.auditAction.facilitatorAssign',
  'hub.facilitator.unassign': 'admin.auditAction.facilitatorUnassign',
  'hub.phase.advance': 'admin.auditAction.phaseAdvance',
  'hub.phase.update': 'admin.auditAction.phaseUpdate',
  'hub.activity.create': 'admin.auditAction.activityCreate',
  'hub.activity.update': 'admin.auditAction.activityUpdate',
  'hub.contribution.submit': 'admin.auditAction.contributionSubmit',
  'admin.user.update': 'admin.auditAction.userUpdate',
  'admin.organisation.create': 'admin.auditAction.organisationCreate',
  'admin.organisation.update': 'admin.auditAction.organisationUpdate',
  'admin.settings.update': 'admin.auditAction.settingsUpdate',
  'repository.item.upload': 'admin.auditAction.repositoryUpload',
  'repository.item.status': 'admin.auditAction.repositoryStatus',
  'forum.proposal.official_decision': 'admin.auditAction.officialDecision',
  'forum.proposal.moderate': 'admin.auditAction.proposalModerate',
};
const AUDIT_TARGET_KEYS: Record<string, TranslationKey> = {
  hub_initiative: 'admin.auditTarget.initiative', hub_phase: 'admin.auditTarget.phase', hub_activity: 'admin.auditTarget.activity',
  hub_contribution: 'admin.auditTarget.contribution', user: 'admin.auditTarget.user', organisation: 'admin.auditTarget.organisation',
  platform_settings: 'admin.auditTarget.settings', repository_document: 'admin.auditTarget.repository', forum_proposal: 'admin.auditTarget.proposal',
};
const AUDIT_REASON_KEYS: Record<string, TranslationKey> = {
  role_update: 'admin.auditReason.roleUpdate',
  account_status_update: 'admin.auditReason.accountStatusUpdate',
  organisation_status_update: 'admin.auditReason.organisationStatusUpdate',
  organisation_assignment: 'admin.auditReason.organisationAssignment',
  settings_update: 'admin.auditReason.settingsUpdate',
  lifecycle_update: 'admin.auditReason.lifecycleUpdate',
  moderation_review: 'admin.auditReason.moderationReview',
  moderation_review_completed: 'admin.auditReason.moderationReviewCompleted',
};
const INTEGRATION_KEYS: Record<string, { label: TranslationKey; detail: TranslationKey }> = {
  authentication: { label: 'admin.integration.authentication', detail: 'admin.integration.authenticationDetail' },
  database: { label: 'admin.integration.database', detail: 'admin.integration.databaseDetail' },
  citivoice: { label: 'nav.citivoice', detail: 'admin.integration.protectedModule' },
  chatbot: { label: 'nav.coCreationGuide', detail: 'admin.integration.guideDetail' },
  'scene-editor': { label: 'nav.sceneEditor', detail: 'admin.integration.protectedModule' },
};

function auditActionKey(action: string): TranslationKey {
  if (AUDIT_ACTION_KEYS[action]) return AUDIT_ACTION_KEYS[action];
  if (action.startsWith('hub.initiative.')) return 'admin.auditAction.initiativeUpdate';
  return 'admin.auditAction.updated';
}

function localizeAuditReason(t: (key: TranslationKey) => string, reason: string | null) {
  if (!reason) return '';
  const key = AUDIT_REASON_KEYS[reason];
  return key ? t(key) : reason;
}

export default function AdminPage() {
  const { t, formatDate } = useI18n();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [workspace, setWorkspace] = useState(EMPTY_WORKSPACE);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newOrganisation, setNewOrganisation] = useState({ name: '', municipality: '', pilotSlug: '' });
  const [settings, setSettings] = useState({ maintenanceBanner: '', defaultVisibility: 'public', notificationsEnabled: true, demoContentEnabled: true });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [overview, userData, organisationData, auditData, workspaceData] = await Promise.all([
        apiRequest<{ summary: Summary }>('/api/admin/overview'), apiRequest<{ users: AdminUser[] }>('/api/admin/users'),
        apiRequest<{ organisations: Organisation[] }>('/api/admin/organisations'), apiRequest<{ audit: AuditEntry[] }>('/api/admin/audit'), apiRequest<Workspace>('/api/admin/workspace'),
      ]);
      setSummary(overview.summary); setUsers(userData.users); setOrganisations(organisationData.organisations); setAudit(auditData.audit); setWorkspace(workspaceData);
      setSettings({ maintenanceBanner: String(workspaceData.settings.maintenanceBanner || ''), defaultVisibility: String(workspaceData.settings.defaultVisibility || 'public'), notificationsEnabled: workspaceData.settings.notificationsEnabled !== false, demoContentEnabled: workspaceData.settings.demoContentEnabled !== false });
    } catch { setError(t('admin.loadError')); } finally { setLoading(false); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  const mutate = async (url: string, body: unknown, successKey: TranslationKey) => {
    try { await apiRequest(url, { method: 'PATCH', body: jsonBody(body) }); toast.success(t(successKey)); await load(); }
    catch { toast.error(t('admin.saveError')); }
  };
  const createOrganisation = async () => {
    try { await apiRequest('/api/admin/organisations', { method: 'POST', body: jsonBody(newOrganisation) }); setNewOrganisation({ name: '', municipality: '', pilotSlug: '' }); toast.success(t('admin.organisationCreated')); await load(); }
    catch { toast.error(t('admin.organisationCreateError')); }
  };
  const filteredUsers = useMemo(() => users.filter((user) => `${user.fullName} ${user.email} ${user.organisationName || ''}`.toLowerCase().includes(query.toLowerCase())), [query, users]);
  const stats = [
    ['admin.stats.users', summary.totalUsers, Users], ['admin.stats.municipalities', summary.municipalities, Building2], ['admin.stats.activePilots', summary.activeInitiatives, Activity],
    ['admin.stats.setupRequired', summary.setupRequiredInitiatives, FileText], ['admin.stats.readyToActivate', summary.readyToActivateInitiatives, ShieldCheck], ['admin.stats.pendingApprovals', summary.pendingApprovals, Users],
  ] as const;

  return <SpicePublicShell>
    <StandardPageHeader icon={ShieldCheck} eyebrow={t('admin.eyebrow')} title={t('admin.title')} description={t('admin.description')} />
    <div className="spice-page spice-wide-page">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#ddd] pb-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('admin.sections')}>{TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`min-h-11 cursor-pointer px-4 font-bold ${activeTab === tab.id ? 'bg-[#f68b2c] text-white' : 'spice-card text-[#444]'}`}>{t(tab.key)}</button>)}</div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-4 font-bold"><RefreshCw size={17}/>{t('common.refresh')}</button>
      </div>
      {error && <div className="mt-6 flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 font-semibold text-red-800" role="alert"><CircleAlert size={20}/>{error}</div>}
      {loading && <LoadingState message={t('admin.loading')} minHeight="224px" />}

      {!loading && activeTab === 'overview' && <section className="mt-7"><h2 className="text-[28px] font-bold">{t('admin.overview')}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stats.map(([key, value, Icon]) => <div key={key} className="flex items-center gap-3 border-2 border-[#eee] bg-white px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]"><Icon size={17}/></span><div><p className="text-[19px] font-bold">{value}</p><p className="text-[12px] text-[#666]">{t(key)}</p></div></div>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="spice-card p-6"><h3 className="text-xl font-bold">{t('admin.usersByRole')}</h3><div className="mt-4 flex flex-wrap gap-3">{summary.usersByRole.map((item) => <span key={item.role} className="bg-[#fff0e1] px-4 py-2 font-semibold text-[#8f501b]">{t(roleKey(normalizeRole(item.role)))}: {item.count}</span>)}</div></div><div className="spice-card p-6"><h3 className="text-xl font-bold">{t('admin.recentActivity')}</h3><div className="mt-4 grid gap-3">{audit.slice(0, 5).map((entry) => <div key={entry.eventId} className="border-l-2 border-[#f68b2c] pl-3"><p className="text-sm font-bold">{t(auditActionKey(entry.action))}</p><p className="text-xs text-[#666]">{formatDate(entry.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}</p></div>)}</div></div></div></section>}

      {!loading && activeTab === 'users' && <section className="mt-7"><h2 className="text-[28px] font-bold">{t('admin.usersAccess')}</h2><label className="mt-5 flex max-w-xl items-center gap-2 border-2 border-[#bfc0c5] bg-white px-3"><Search size={18}/><span className="sr-only">{t('admin.searchUsers')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-12 w-full outline-none" placeholder={t('admin.searchUsersPlaceholder')}/></label><div className="mt-5 overflow-x-auto spice-card"><table className="min-w-[900px] w-full text-left"><thead className="bg-[#f2f2f2]"><tr>{(['admin.user', 'admin.pilotOrganisation', 'admin.role', 'admin.accountStatus'] as TranslationKey[]).map((key) => <th key={key} className="p-4 text-sm">{t(key)}</th>)}</tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id} className="border-t border-[#ddd]"><td className="p-4"><strong className="block">{user.fullName}</strong><span className="text-sm text-[#666]">{user.email}</span></td><td className="p-4"><select value={user.organisationId || ''} aria-label={t('admin.organisationFor', { name: user.fullName })} onChange={(event) => void mutate(`/api/admin/users/${user.id}`, { organisationId: event.target.value ? Number(event.target.value) : null, reason: 'organisation_assignment' }, 'admin.accessUpdated')} className="min-h-11 max-w-[240px] cursor-pointer border-2 border-[#bfc0c5] bg-white px-3 text-sm"><option value="">{t('admin.notAssigned')}</option>{organisations.map((organisation) => <option key={organisation.id} value={organisation.id}>{organisation.name}</option>)}</select></td><td className="p-4"><select value={user.role} aria-label={t('admin.roleFor', { name: user.fullName })} onChange={(event) => void mutate(`/api/admin/users/${user.id}`, { role: event.target.value, reason: 'role_update' }, 'admin.roleUpdated')} className="min-h-11 cursor-pointer border-2 border-[#bfc0c5] bg-white px-3">{['citizen', 'facilitator', 'municipality', 'admin'].map((role) => <option key={role} value={role}>{t(roleKey(normalizeRole(role)))}</option>)}</select></td><td className="p-4"><button type="button" onClick={() => void mutate(`/api/admin/users/${user.id}`, { accountStatus: user.accountStatus === 'active' ? 'suspended' : 'active', reason: 'account_status_update' }, 'admin.accessUpdated')} className="min-h-11 cursor-pointer border-2 border-[#ca7428] bg-white px-4 font-bold text-[#a85f20]">{user.accountStatus === 'active' ? t('admin.suspend') : user.accountStatus === 'pending_approval' ? t('admin.approve') : t('admin.reactivate')}</button></td></tr>)}</tbody></table></div></section>}

      {!loading && activeTab === 'municipalities' && <section className="mt-7"><h2 className="text-[28px] font-bold">{t('admin.municipalitiesTitle')}</h2><div className="mt-5 grid items-end gap-3 border-2 border-[#ca7428] bg-[#fff7ef] p-5 md:grid-cols-4"><label className="text-sm font-bold">{t('admin.workspaceName')}<input value={newOrganisation.name} onChange={(e) => setNewOrganisation((v) => ({ ...v, name: e.target.value }))} className={fieldClass}/></label><label className="text-sm font-bold">{t('admin.municipality')}<input value={newOrganisation.municipality} onChange={(e) => setNewOrganisation((v) => ({ ...v, municipality: e.target.value }))} className={fieldClass}/></label><label className="text-sm font-bold">{t('admin.pilotSlug')}<input value={newOrganisation.pilotSlug} onChange={(e) => setNewOrganisation((v) => ({ ...v, pilotSlug: e.target.value }))} className={fieldClass}/></label><button type="button" onClick={() => void createOrganisation()} className="min-h-11 cursor-pointer bg-[#f68b2c] px-4 font-bold text-white">{t('admin.createWorkspace')}</button></div><div className="mt-5 grid gap-4 md:grid-cols-2">{organisations.map((organisation) => <article key={organisation.id} className="spice-card p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{organisation.name}</h3><p className="mt-1 text-sm text-[#666]">{organisation.municipality} · {organisation.pilotSlug}</p></div><span className="bg-[#eee] px-2 py-1 text-xs font-bold uppercase">{t(statusKey(organisation.status))}</span></div><button type="button" onClick={() => void mutate(`/api/admin/organisations/${organisation.id}`, { status: organisation.status === 'active' ? 'disabled' : 'active', reason: 'organisation_status_update' }, 'admin.municipalityAccessUpdated')} className="mt-4 min-h-11 cursor-pointer border-2 border-[#ca7428] px-4 font-bold text-[#a85f20]">{organisation.status === 'active' ? t('admin.disable') : t('admin.enable')}</button></article>)}</div></section>}

      {!loading && activeTab === 'initiatives' && <section className="mt-7"><h2 className="text-[28px] font-bold">{t('admin.pilotLifecycle')}</h2><p className="mt-2 max-w-3xl text-[#666]">{t('admin.pilotLifecycleReadOnly')}</p><div className="mt-5 grid gap-4 md:grid-cols-2">{workspace.initiatives.map((initiative) => <article key={initiative.id} className="spice-card p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{initiative.title}</h3><p className="mt-1 text-sm text-[#666]">{initiative.organisationName} · {initiative.currentPhaseNumber ? t('admin.phaseNumber', { number: initiative.currentPhaseNumber }) : t('admin.notStarted')}</p></div><span className="bg-[#fff0e1] px-2 py-1 text-xs font-bold uppercase text-[#8f501b]">{t(`hub.lifecycle.${initiative.lifecycleStatus}` as TranslationKey)}</span></div><Link to={`/hub/${initiative.id}`} className="mt-4 inline-flex min-h-11 items-center border-2 border-[#444] px-4 font-bold">{t('admin.inspectPilot')}</Link></article>)}</div></section>}

      {!loading && activeTab === 'forum' && <section className="mt-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[28px] font-bold">{t('admin.forumGovernance')}</h2><p className="mt-2 text-[#666]">{t('admin.forumGovernanceText')}</p></div><Link to="/forum-voting" className="inline-flex min-h-11 items-center bg-[#f68b2c] px-5 font-bold text-white">{t('admin.openForum')}</Link></div><div className="mt-5 space-y-3">{workspace.proposals.map((proposal) => <article key={proposal.id} className="grid gap-3 spice-card p-4 md:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{proposal.title}</h3><span className="bg-[#eee] px-2 py-1 text-xs font-bold uppercase">{t(statusKey(proposal.moderationStatus))}</span>{proposal.openReports > 0 && <span className="bg-red-50 px-2 py-1 text-xs font-bold text-red-800">{t(proposal.openReports === 1 ? 'admin.openReport.one' : 'admin.openReport.other', { count: proposal.openReports })}</span>}</div><p className="mt-1 text-sm text-[#666]">{t('admin.byAuthor', { author: proposal.author })} · {t(statusKey(proposal.status))}</p>{proposal.moderationReason && <p className="mt-2 text-sm text-[#8a3c1b]">{t('admin.moderationNote', { note: localizeAuditReason(t, proposal.moderationReason) })}</p>}</div><div className="flex flex-wrap items-start gap-2"><Link to={`/forum-voting?proposal=${proposal.id}`} className="inline-flex min-h-11 items-center border-2 border-[#444] px-4 font-bold">{t('admin.review')}</Link>{proposal.moderationStatus !== 'locked' && <button type="button" onClick={() => void mutate(`/api/forum/proposals/${proposal.id}/moderation`, { moderationStatus: 'locked', reason: 'moderation_review' }, 'admin.discussionLocked')} className="min-h-11 cursor-pointer border-2 border-[#ca7428] px-3 font-bold text-[#a85f20]">{t('admin.lock')}</button>}{proposal.moderationStatus !== 'hidden' && <button type="button" onClick={() => void mutate(`/api/forum/proposals/${proposal.id}/moderation`, { moderationStatus: 'hidden', reason: 'moderation_review' }, 'admin.proposalHidden')} className="min-h-11 cursor-pointer border-2 border-red-700 px-3 font-bold text-red-800">{t('admin.hide')}</button>}{proposal.moderationStatus !== 'visible' && <button type="button" onClick={() => void mutate(`/api/forum/proposals/${proposal.id}/moderation`, { moderationStatus: 'visible', reason: 'moderation_review_completed' }, 'admin.proposalRestored')} className="min-h-11 cursor-pointer border-2 border-[#55743d] px-3 font-bold text-[#47662f]">{t('admin.restore')}</button>}</div></article>)}</div></section>}

      {!loading && activeTab === 'repository' && <section className="mt-7"><h2 className="text-[28px] font-bold">{t('admin.repositoryGovernance')}</h2><div className="mt-5 space-y-3">{workspace.repository.map((item) => <article key={item.id} className="grid gap-4 spice-card p-4 md:grid-cols-[1fr_auto]"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-sm text-[#666]">{item.pilot} · {t('admin.phaseNumber', { number: item.phase })} · {t(statusKey(item.publicationStatus))}</p></div><div className="flex flex-wrap gap-2">{publicationStatuses.filter((status) => status !== item.publicationStatus).map((status) => <button key={status} type="button" onClick={() => void mutate(`/api/repository/${item.id}/status`, { publicationStatus: status }, 'admin.repositoryStatusUpdated')} className="min-h-11 cursor-pointer border-2 border-[#ca7428] px-3 text-sm font-bold text-[#a85f20]">{t(statusKey(status))}</button>)}</div></article>)}</div></section>}

      {!loading && activeTab === 'integrations' && <section className="mt-7"><h2 className="text-[28px] font-bold">{t('admin.integrations')}</h2><p className="mt-2 text-[#666]">{t('admin.integrationsText')}</p><div className="mt-5 grid gap-4 md:grid-cols-2">{workspace.integrations.map((integration) => { const keys = INTEGRATION_KEYS[integration.key]; return <article key={integration.key} className="spice-card p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{keys ? t(keys.label) : integration.label}</h3><span className="bg-[#e7f2df] px-2 py-1 text-xs font-bold uppercase text-[#47662f]">{t(statusKey(integration.status))}</span></div><p className="mt-3 text-sm text-[#666]">{keys ? t(keys.detail) : integration.detail}</p></article>; })}</div></section>}

      {!loading && activeTab === 'audit' && <section className="mt-7"><h2 className="text-[28px] font-bold">{t('admin.auditActivity')}</h2><div className="mt-5 space-y-3">{audit.length === 0 ? <p className="spice-card-dashed p-7 text-center text-[#666]">{t('admin.auditEmpty')}</p> : audit.map((entry) => <article key={entry.eventId} className="grid gap-3 spice-card p-4 md:grid-cols-[190px_1fr_auto]"><time className="text-sm text-[#666]">{formatDate(entry.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}</time><div><h3 className="font-bold">{t(auditActionKey(entry.action))}</h3><p className="mt-1 text-sm text-[#666]">{t(AUDIT_TARGET_KEYS[entry.targetType] || 'admin.auditTarget.record')} #{entry.targetId}{entry.reason ? ` - ${localizeAuditReason(t, entry.reason)}` : ''}</p></div><span className="text-sm font-semibold text-[#a85f20]">{t(roleKey(normalizeRole(entry.actorRole)))}</span></article>)}</div></section>}

      {!loading && activeTab === 'settings' && <section className="mt-7 max-w-4xl"><h2 className="flex items-center gap-2 text-[28px] font-bold"><Settings/>{t('admin.platformSettings')}</h2><div className="mt-5 space-y-5 spice-card p-6"><label className="block font-bold">{t('admin.maintenanceBanner')}<textarea value={settings.maintenanceBanner} onChange={(e) => setSettings((v) => ({ ...v, maintenanceBanner: e.target.value }))} rows={3} className="mt-2 w-full border-2 border-[#bfc0c5] p-3"/></label><label className="block font-bold">{t('admin.defaultVisibility')}<select value={settings.defaultVisibility} onChange={(e) => setSettings((v) => ({ ...v, defaultVisibility: e.target.value }))} className={fieldClass}>{['public', 'private', 'invitation_only'].map((status) => <option key={status} value={status}>{t(statusKey(status))}</option>)}</select></label><label className="flex items-center gap-3 font-bold"><input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => setSettings((v) => ({ ...v, notificationsEnabled: e.target.checked }))} className="h-5 w-5"/>{t('admin.notificationsEnabled')}</label><label className="flex items-center gap-3 font-bold"><input type="checkbox" checked={settings.demoContentEnabled} onChange={(e) => setSettings((v) => ({ ...v, demoContentEnabled: e.target.checked }))} className="h-5 w-5"/>{t('admin.demoContentEnabled')}</label><button type="button" onClick={() => void mutate('/api/admin/settings', { settings, reason: 'settings_update' }, 'admin.settingsSaved')} className="min-h-12 cursor-pointer bg-[#f68b2c] px-6 font-bold text-white">{t('admin.saveSettings')}</button></div></section>}
    </div>
  </SpicePublicShell>;
}
