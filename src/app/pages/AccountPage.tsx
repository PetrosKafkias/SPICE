import { useCallback, useEffect, useState, type ElementType, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Archive,
  ArrowRight,
  Bell,
  CheckCheck,
  Clock,
  Download,
  Eye,
  ImagePlus,
  LockKeyhole,
  Mail,
  Map,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import FeedbackForm from '../components/FeedbackForm';
import { FieldMessage, FormField, FormGrid } from '../components/FormLayout';
import { useAuth, type AuthUser } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest, ApiError, jsonBody } from '../lib/api';
import cityImage from '../../imports/UserDetails/be2976c93a8eb6ace1815c8325f750a633bc4ba8.png';

type AccountTab = 'details' | 'notifications' | 'privacy' | 'rate';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  tag: string;
  pilot: string;
  isRead: boolean;
  archived: boolean;
  createdAt: string;
  eventType: string;
  actionUrl: string | null;
}

interface NotificationCounts {
  total: number;
  unread: number;
  archived: number;
}

const PILOT_SITES = ['Thessaloniki', 'Rovaniemi', 'Bielsko-Biala', 'Cuba'];

function pilotSlug(pilotSite: string) {
  return pilotSite.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function useAccountTab(): AccountTab {
  const { pathname } = useLocation();
  if (pathname.includes('/notifications')) return 'notifications';
  if (pathname.includes('/privacy')) return 'privacy';
  if (pathname.includes('/rate-us')) return 'rate';
  return 'details';
}

function Sidebar({ tab }: { tab: AccountTab }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const items: Array<{ id: AccountTab; labelKey: TranslationKey; path: string; icon: ElementType }> = [
    { id: 'details', labelKey: 'account.details', path: '/account', icon: User },
    { id: 'notifications', labelKey: 'notifications.title', path: '/account/notifications', icon: Bell },
    { id: 'privacy', labelKey: 'account.privacy', path: '/account/privacy', icon: Eye },
    { id: 'rate', labelKey: 'feedback.accountTitle', path: '/account/rate-us', icon: Star },
  ];

  return (
    <aside className="w-full border-2 border-[#b2b2b8] bg-white p-5 md:w-[236px] md:flex-shrink-0 md:p-6 lg:w-[300px]">
      <h2 className="mb-5 text-[20px] font-semibold text-[#444] md:mb-7 md:text-[22px]">{t('account.navigation')}</h2>
      <nav className="grid gap-2 sm:grid-cols-2 md:grid-cols-1" aria-label={t('account.navigation')}>
        {items.map(({ id, labelKey, path, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => navigate(path)}
            className={`flex min-h-11 cursor-pointer items-center gap-3 px-4 py-3 text-left text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] md:gap-5 md:text-[16px] ${tab === id ? 'bg-[#fde8d5] text-[#ca7428]' : 'text-[#444] hover:bg-[#f6f6f6]'}`}
            aria-current={tab === id ? 'page' : undefined}
          >
            <Icon size={21} className="flex-shrink-0" />
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-[14px] font-bold text-[#444]">{label}</p>
      <div className="flex min-w-0 items-center gap-3 text-[16px] font-medium text-[#637948]">
        <Icon size={21} className="flex-shrink-0" />
        <span className="break-words">{value || '-'}</span>
      </div>
    </div>
  );
}

function ProfileForm({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const { updateProfile } = useAuth();
  const { t } = useI18n();
  const [form, setForm] = useState({
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    pilotSite: user.pilotSite,
    currentPassword: '',
    newPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      await updateProfile({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        pilotSite: form.pilotSite,
        ...(form.newPassword ? { currentPassword: form.currentPassword, newPassword: form.newPassword } : {}),
      });
      toast.success(t('account.saved'));
      onClose();
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || t('common.error'));
      setFieldErrors(apiError.fieldErrors || {});
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field: string) => `w-full border-2 bg-white px-4 py-3 text-[15px] font-medium text-[#444] outline-none focus:border-[#ca7428] ${fieldErrors[field] ? 'border-red-600' : 'border-[#b2b2b8]'}`;

  return (
    <form onSubmit={submit} className="mt-7 border-t-2 border-[#e5e5e5] pt-7" noValidate>
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-[23px] font-bold text-[#444]">{t('account.profileDetails')}</h2><p className="mt-1 text-[14px] text-[#666]">{t('account.profileText')}</p></div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 cursor-pointer place-items-center text-[#444] hover:bg-[#f4f4f4]" aria-label={t('common.close')}><X size={20} /></button>
      </div>

      {error && <div className="mt-5 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-800" role="alert">{error}</div>}

      <FormGrid className="mt-6 gap-5 md:grid-cols-2">
        <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('account.fullName')}<input value={form.fullName} onChange={update('fullName')} className={inputClass('fullName')} aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? 'account-fullName-error' : undefined} />{fieldErrors.fullName && <FieldMessage id="account-fullName-error" tone="error">{fieldErrors.fullName}</FieldMessage>}</FormField>
        <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('account.email')}<input type="email" value={form.email} onChange={update('email')} className={inputClass('email')} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'account-email-error' : undefined} />{fieldErrors.email && <FieldMessage id="account-email-error" tone="error">{fieldErrors.email}</FieldMessage>}</FormField>
        <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('account.phone')}<input type="tel" value={form.phone} onChange={update('phone')} className={inputClass('phone')} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'account-phone-error' : undefined} />{fieldErrors.phone && <FieldMessage id="account-phone-error" tone="error">{fieldErrors.phone}</FieldMessage>}</FormField>
        <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('account.pilotSite')}<select value={form.pilotSite} onChange={update('pilotSite')} className={`${inputClass('pilotSite')} cursor-pointer`}>{PILOT_SITES.map((site) => <option key={site}>{site}</option>)}</select></FormField>
      </FormGrid>

      <section className="mt-7 bg-[#f7f7f7] p-5">
        <div className="flex items-start gap-3"><LockKeyhole size={23} className="mt-0.5 flex-shrink-0 text-[#ca7428]" /><div><h3 className="text-[18px] font-bold text-[#444]">{t('account.securityTitle')}</h3><p className="mt-1 text-[13px] text-[#666]">{t('account.securityText')}</p></div></div>
        <p className="mt-4 text-[12px] text-[#777]">{t('account.passwordOptional')}</p>
        <FormGrid className="mt-4 gap-5 md:grid-cols-2">
          <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('account.currentPassword')}<input type="password" autoComplete="current-password" value={form.currentPassword} onChange={update('currentPassword')} className={inputClass('currentPassword')} aria-invalid={Boolean(fieldErrors.currentPassword)} aria-describedby={fieldErrors.currentPassword ? 'account-currentPassword-error' : undefined} />{fieldErrors.currentPassword && <FieldMessage id="account-currentPassword-error" tone="error">{fieldErrors.currentPassword}</FieldMessage>}</FormField>
          <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('account.newPassword')}<input type="password" autoComplete="new-password" value={form.newPassword} onChange={update('newPassword')} className={inputClass('newPassword')} aria-invalid={Boolean(fieldErrors.newPassword)} aria-describedby={fieldErrors.newPassword ? 'account-newPassword-error' : undefined} />{fieldErrors.newPassword && <FieldMessage id="account-newPassword-error" tone="error">{fieldErrors.newPassword}</FieldMessage>}</FormField>
        </FormGrid>
      </section>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} className="cursor-pointer border-2 border-[#444] px-6 py-3 text-[15px] font-semibold text-[#444] hover:bg-[#f4f4f4]">{t('common.cancel')}</button>
        <button type="submit" disabled={saving} className="flex cursor-pointer items-center gap-2 bg-[#f68b2c] px-6 py-3 text-[15px] font-semibold text-white hover:bg-[#e07a20] disabled:cursor-wait disabled:opacity-60"><Save size={18} />{saving ? t('common.saving') : t('common.save')}</button>
      </div>
    </form>
  );
}

function ProfilePicture({ user, initials, children }: { user: AuthUser; initials: string; children: ReactNode }) {
  const { updateProfile } = useAuth();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveImage = async (avatarData: string | null) => {
    setSaving(true); setError('');
    try { await updateProfile({ avatarData }); toast.success(avatarData ? t('account.photoSaved') : t('account.photoRemoved')); }
    catch (caught) { const apiError = caught as ApiError; setError(apiError.fieldErrors?.avatarData || apiError.message || t('common.error')); }
    finally { setSaving(false); }
  };

  const chooseImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError(t('account.photoType')); return; }
    if (file.size > 500_000) { setError(t('account.photoSize')); return; }
    const reader = new FileReader();
    reader.onload = () => void saveImage(String(reader.result));
    reader.onerror = () => setError(t('common.error'));
    reader.readAsDataURL(file);
  };

  return <div className="flex flex-wrap items-center gap-3" aria-busy={saving}>
    <div className="grid h-[72px] w-[72px] flex-none place-items-center overflow-hidden rounded-full border-2 border-[#ca7428] bg-[rgba(246,139,44,0.18)] text-[21px] font-semibold text-[#ca7428]">{user.avatarData ? <img src={user.avatarData} alt={t('account.profilePhoto')} className="h-full w-full object-cover"/> : <span aria-label={t('account.defaultAvatar')}>{initials}</span>}</div>
    {children}
    <div className="flex flex-wrap justify-center gap-2 sm:justify-start"><label className="flex min-h-10 cursor-pointer items-center gap-2 border-2 border-[#ca7428] bg-white px-3 text-[13px] font-semibold text-[#ca7428] hover:bg-[#fff4e9] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#444]"><ImagePlus size={17} aria-hidden="true"/><span>{user.avatarData ? t('account.changePhoto') : t('account.uploadPhoto')}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} disabled={saving} className="sr-only"/></label>{user.avatarData && <button type="button" onClick={() => void saveImage(null)} disabled={saving} className="grid h-10 w-10 cursor-pointer place-items-center border-2 border-[#777] text-[#555] hover:border-red-700 hover:text-red-700 disabled:cursor-wait disabled:opacity-60" aria-label={t('account.removePhoto')} title={t('account.removePhoto')}><Trash2 size={17}/></button>}</div>
    {error && <p className="max-w-[220px] text-[12px] font-medium text-red-800" role="alert">{error}</p>}
  </div>;
}

function DetailsTab({ user }: { user: AuthUser }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const initials = user.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const roleKey = `role.${user.role.replaceAll(' ', '')}` as TranslationKey;

  return (
    <div className="flex flex-col gap-6">
      <section className="border-2 border-[#b2b2b8] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[31px] font-semibold text-[#444] md:text-[34px]">{t('account.manageTitle')}</h1>
            <p className="mt-2 max-w-[620px] text-[15px] leading-relaxed text-[#666]">{t('account.manageText')}</p>
          </div>
          <button type="button" onClick={() => setEditing((value) => !value)} className="w-fit cursor-pointer bg-[#f68b2c] px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]">{editing ? t('common.close') : t('account.edit')}</button>
        </div>

        <div className="mt-5 border-t border-[#e5e5e5] pt-5">
          <ProfilePicture user={user} initials={initials}><div className="min-w-[180px] flex-1"><p className="break-words text-[22px] font-bold text-[#444]">{user.fullName}</p><p className="mt-2 flex items-center gap-2 text-[14px] font-medium text-[#666]"><User size={16} />{t(roleKey)}</p></div></ProfilePicture>
        </div>

        <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-[#ededed] pt-5 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem icon={Mail} label={t('account.email')} value={user.email} />
          <DetailItem icon={MapPin} label={t('account.pilot')} value={user.pilotSite} />
          <DetailItem icon={Phone} label={t('account.phone')} value={user.phone} />
        </div>

        {editing && <ProfileForm user={user} onClose={() => setEditing(false)} />}
      </section>

      <section className="border-2 border-[#b2b2b8] bg-white p-6 md:p-8">
        <div className="mb-6 flex items-start justify-between gap-6"><div><h2 className="text-[30px] font-semibold text-[#444] md:text-[34px]">{t('account.context')}</h2><p className="mt-2 text-[18px] font-medium text-[#555]">{t('account.activeLocation', { pilot: user.pilotSite })}</p></div><Map size={38} className="mt-1 flex-shrink-0 text-[#ca7428]" /></div>
        <div className="relative h-[300px] overflow-hidden md:h-[440px]"><img src={cityImage} alt={`${user.pilotSite} pilot site`} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#713300]/95 via-[#9d4d05]/15 to-transparent" /><div className="absolute inset-x-7 bottom-7 flex flex-col items-start gap-5 text-white sm:flex-row sm:items-end sm:justify-between md:inset-x-10 md:bottom-10"><div><p className="text-[18px] font-bold">{t('account.pilot')}</p><p className="mt-1 text-[27px] font-bold md:text-[34px]">{user.pilotSite}</p></div><Link to={`/pilot-sites/${pilotSlug(user.pilotSite)}`} className="flex min-h-11 cursor-pointer items-center gap-2 border-2 border-white bg-white px-5 py-3 text-[14px] font-bold text-[#9b4e13] transition-colors hover:bg-[#f68b2c] hover:text-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-white">{t('account.viewPilot')}<ArrowRight size={18} aria-hidden="true" /></Link></div></div>
      </section>
    </div>
  );
}

function NotificationsTab() {
  const navigate = useNavigate();
  const { refreshNotificationCounts } = useAuth();
  const { t, formatDate } = useI18n();
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, unread: 0, archived: 0 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await apiRequest<{ notifications: NotificationItem[]; counts: NotificationCounts }>(`/api/notifications?filter=${filter}&q=${encodeURIComponent(query)}`);
      setNotifications(result.notifications);
      setCounts(result.counts);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [filter, query]);

  useEffect(() => { void load(); }, [load]);

  const markAll = async () => {
    await apiRequest('/api/notifications/read-all', { method: 'POST' });
    await Promise.all([load(), refreshNotificationCounts()]);
    toast.success(t('notifications.markAll'));
  };

  const updateNotification = async (notification: NotificationItem, patch: { isRead?: boolean; archived?: boolean }) => {
    const result = await apiRequest<{ notification: NotificationItem }>(`/api/notifications/${notification.id}`, { method: 'PATCH', body: jsonBody(patch) });
    setNotifications((items) => patch.archived && filter !== 'archived' ? items.filter((item) => item.id !== notification.id) : items.map((item) => item.id === notification.id ? result.notification : item));
    await Promise.all([load(), refreshNotificationCounts()]);
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.actionUrl) return;
    if (!notification.isRead) {
      await apiRequest(`/api/notifications/${notification.id}`, { method: 'PATCH', body: jsonBody({ isRead: true }) });
      await refreshNotificationCounts();
    }
    navigate(notification.actionUrl);
  };

  const filterOptions: Array<{ value: typeof filter; key: TranslationKey; count: number }> = [
    { value: 'all', key: 'notifications.all', count: counts.total },
    { value: 'unread', key: 'notifications.unread', count: counts.unread },
    { value: 'archived', key: 'notifications.archived', count: counts.archived },
  ];

  return (
    <section className="border-2 border-[#b2b2b8] bg-white p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div><h1 className="text-[31px] font-semibold text-[#444] md:text-[34px]">{t('notifications.title')}</h1><p className="mt-2 max-w-[720px] text-[15px] leading-relaxed text-[#555]">{t('notifications.subtitle')}</p></div>
        <button type="button" onClick={markAll} disabled={counts.unread === 0} className="flex w-fit cursor-pointer items-center justify-center gap-2 border-2 border-[#ca7428] px-5 py-3 text-[14px] font-semibold text-[#ca7428] hover:bg-[#fff4e9] disabled:cursor-default disabled:opacity-45"><CheckCheck size={19} />{t('notifications.markAll')}</button>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <label className="flex items-center gap-3 border-2 border-[#444] bg-white px-4 py-3 focus-within:border-[#ca7428]"><Search size={20} className="text-[#444]" /><span className="sr-only">{t('notifications.search')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('notifications.search')} className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none" /></label>
        <div className="grid grid-cols-3 gap-2 bg-[#e9e9e9] p-2">
          {filterOptions.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 px-2 text-[13px] font-bold ${filter === item.value ? 'bg-white text-black' : 'text-[#555] hover:bg-white/60'}`} aria-pressed={filter === item.value}>{t(item.key)}<span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#637948] px-1 text-[11px] text-white">{item.count}</span></button>)}
        </div>
      </div>

      {status === 'loading' && <div className="grid min-h-[220px] place-items-center font-semibold text-[#555]" role="status">{t('common.loading')}</div>}
      {status === 'error' && <div className="mt-7 border-l-4 border-red-600 bg-red-50 p-5" role="alert"><p className="font-semibold text-red-800">{t('common.error')}</p><button type="button" onClick={load} className="mt-3 cursor-pointer text-[#ca7428] underline">{t('common.retry')}</button></div>}
      {status === 'ready' && notifications.length === 0 && <div className="mt-8 border-2 border-dashed border-[#b2b2b8] p-10 text-center text-[15px] font-semibold text-[#666]">{t('notifications.empty')}</div>}

      {status === 'ready' && notifications.length > 0 && (
        <div className="mt-8 divide-y-2 divide-[#e4e4e4]">
          {notifications.map((notification) => {
            const Icon = notification.type === 'comment' ? MessageSquare : notification.type === 'proposal' ? MapPin : Bell;
            return (
              <article key={notification.id} className={`flex flex-col gap-5 py-7 sm:flex-row ${notification.isRead ? 'opacity-70' : ''}`}>
                <div className="grid h-[54px] w-[54px] flex-shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)]"><Icon size={28} className="text-[#637948]" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"><h2 className="text-[19px] font-bold text-[#222] md:text-[21px]">{notification.title}{!notification.isRead && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#f68b2c] align-middle" aria-label={t('notifications.unread')} />}</h2><p className="flex items-center gap-2 whitespace-nowrap text-[12px] font-medium text-[#555]"><Clock size={14} />{formatDate(notification.createdAt)}</p></div>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#444]">{notification.body}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3"><span className="bg-[#e9e9e9] px-3 py-1.5 text-[13px] font-medium text-black">{notification.tag}</span><span className="text-[13px] font-medium text-[#637948]">{notification.pilot}</span></div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {notification.actionUrl && <button type="button" onClick={() => void openNotification(notification)} className="flex cursor-pointer items-center gap-2 bg-[#f68b2c] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#d8731d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]">{t('notifications.viewDiscussion')}<ArrowRight size={14} aria-hidden="true" /></button>}
                    <button type="button" onClick={() => updateNotification(notification, { isRead: !notification.isRead })} className="cursor-pointer border border-[#637948] px-3 py-2 text-[12px] font-semibold text-[#637948] hover:bg-[#edf4e8]">{notification.isRead ? t('notifications.markUnread') : t('notifications.markRead')}</button>
                    <button type="button" onClick={() => updateNotification(notification, { archived: !notification.archived })} className="flex cursor-pointer items-center gap-2 border border-[#777] px-3 py-2 text-[12px] font-semibold text-[#555] hover:bg-[#f4f4f4]"><Archive size={14} />{t('notifications.archive')}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PreferenceToggle({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" onClick={() => onChange(!value)} className="relative h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]" style={{ backgroundColor: value ? '#ca7428' : 'white' }} aria-pressed={value} aria-label={label}><span className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-[left,background-color]" style={{ left: value ? 27 : 4, backgroundColor: value ? 'white' : '#ca7428' }} /></button>;
}

function PrivacyTab({ user }: { user: AuthUser }) {
  const { updateProfile } = useAuth();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  const savePreference = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try { await updateProfile(patch); toast.success(t('account.preferenceSaved')); }
    catch { toast.error(t('common.error')); }
    finally { setSaving(false); }
  };

  const exportData = async () => {
    try {
      const data = await apiRequest<Record<string, unknown>>('/api/profile/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `spice-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t('account.exportReady'));
    } catch { toast.error(t('common.error')); }
  };

  return (
    <div className="flex flex-col gap-7">
      <section className="border-2 border-[#b2b2b8] bg-white p-6 md:p-8" aria-busy={saving}>
        <h1 className="text-[31px] font-semibold text-[#444] md:text-[34px]">{t('account.privacy')}</h1>
        <p className="mt-2 max-w-[780px] text-[15px] leading-relaxed text-[#555]">{t('account.visibilityText')}</p>

        <div className="mt-8 flex items-start gap-5"><span className="grid h-[56px] w-[56px] flex-shrink-0 place-items-center rounded-full border border-[#ca7428] bg-[#fff0e2] text-[#ca7428]"><Eye size={27} /></span><div className="min-w-0 flex-1"><h2 className="text-[21px] font-bold text-[#444]">{t('account.visibility')}</h2><div className="mt-5 flex flex-wrap gap-6">{(['private', 'public'] as const).map((option) => <label key={option} className="flex cursor-pointer items-center gap-3 text-[15px] font-medium text-black"><input type="radio" checked={user.preferences.profileVisibility === option} onChange={() => savePreference({ profileVisibility: option })} className="h-5 w-5 cursor-pointer accent-[#ca7428]" />{t(`account.${option}` as TranslationKey)}</label>)}</div></div></div>

        <div className="mt-9 flex items-start gap-5"><span className="grid h-[56px] w-[56px] flex-shrink-0 place-items-center rounded-full border border-[#ca7428] bg-[#fff0e2] text-[#ca7428]"><ShieldCheck size={27} /></span><div className="min-w-0 flex-1"><h2 className="text-[21px] font-bold text-[#444]">{t('account.dataUsage')}</h2><div className="mt-5 grid gap-4">
          <div className="flex items-center justify-between gap-5 bg-[#ededed] p-5"><div><p className="text-[16px] font-bold text-black">{t('account.analytics')}</p><p className="mt-1 text-[14px] leading-relaxed text-[#555]">{t('account.analyticsText')}</p></div><PreferenceToggle value={user.preferences.usageAnalytics} onChange={(value) => savePreference({ usageAnalytics: value })} label={t('account.analytics')} /></div>
          <div className="flex items-center justify-between gap-5 bg-[#ededed] p-5"><div><p className="text-[16px] font-bold text-black">{t('account.recommendations')}</p><p className="mt-1 text-[14px] leading-relaxed text-[#555]">{t('account.recommendationsText')}</p></div><PreferenceToggle value={user.preferences.personalizedRecommendations} onChange={(value) => savePreference({ personalizedRecommendations: value })} label={t('account.recommendations')} /></div>
        </div></div></div>

        <div className="mt-9 flex flex-col gap-5 border-t-2 border-[#e4e4e4] pt-7 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><Download size={28} className="mt-1 flex-shrink-0 text-[#ca7428]" /><div><h2 className="text-[21px] font-bold text-[#444]">{t('account.export')}</h2><p className="mt-1 text-[14px] leading-relaxed text-[#555]">{t('account.exportText')}</p></div></div><button type="button" onClick={exportData} className="flex w-fit cursor-pointer items-center gap-2 border-2 border-[#ca7428] px-5 py-3 text-[14px] font-semibold text-[#ca7428] hover:bg-[#fff4e9]"><Download size={18} />{t('account.download')}</button></div>
      </section>

      <div className="border-t-2 border-[#b2b2b8] pt-7 text-center text-[15px] font-medium leading-relaxed text-[#444]">{t('cookie.accountNotice')} <Link to="/privacy-policy" className="cursor-pointer font-semibold text-[#ca7428] underline decoration-2 underline-offset-3 hover:text-[#9b4e13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]">{t('cookie.viewPolicy')}</Link></div>
    </div>
  );
}

function RateUsTab() {
  const { t } = useI18n();
  return <section className="border-2 border-[#b2b2b8] bg-white p-6 md:p-8" aria-labelledby="account-feedback-title"><div className="mb-7 flex items-start gap-4"><span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><Star size={24} aria-hidden="true" /></span><div><h1 id="account-feedback-title" className="text-[30px] font-semibold text-[#444] md:text-[34px]">{t('feedback.accountTitle')}</h1><p className="mt-2 max-w-[760px] text-[15px] leading-relaxed text-[#555]">{t('feedback.accountText')}</p></div></div><FeedbackForm source="account" includeSus /></section>;
}

export default function AccountPage() {
  const tab = useAccountTab();
  const { user } = useAuth();
  const { t } = useI18n();

  if (!user) return <div className="grid min-h-screen place-items-center">{t('common.loading')}</div>;

  return (
    <SpicePublicShell>
      <div className="mx-auto flex max-w-[1360px] flex-col gap-7 px-5 py-10 md:flex-row md:px-8 md:py-14 xl:px-12">
        <Sidebar tab={tab} />
        <main className="min-w-0 flex-1">
          {tab === 'details' && <DetailsTab user={user} />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'privacy' && <PrivacyTab user={user} />}
          {tab === 'rate' && <RateUsTab />}
        </main>
      </div>
    </SpicePublicShell>
  );
}
