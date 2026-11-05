import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

/**
 * Discuss and Decide is anonymous by default. Each citizen chooses whether other people see their
 * name and photo next to what they post; the choice applies to past and future posts.
 */
export default function ForumIdentityNotice({ onChanged }: { onChanged: () => void }) {
  const { user, updateProfile } = useAuth();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  if (!user) return null;
  const visible = user.preferences.profileVisibility === 'public';

  const toggle = async () => {
    setSaving(true);
    try {
      await updateProfile({ profileVisibility: visible ? 'private' : 'public' });
      toast.success(t(visible ? 'forum.identity.nowAnonymous' : 'forum.identity.nowVisible'));
      onChanged();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 border-l-4 border-[#4e789b] bg-[#f1f7fb] p-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="forum-identity-title">
      <div className="flex items-start gap-3">
        {visible ? <Eye size={20} className="mt-0.5 flex-none text-[#31556f]" aria-hidden="true" /> : <EyeOff size={20} className="mt-0.5 flex-none text-[#31556f]" aria-hidden="true" />}
        <div>
          <h2 id="forum-identity-title" className="text-[14px] font-bold text-[#24445c]">{t(visible ? 'forum.identity.visibleTitle' : 'forum.identity.anonymousTitle')}</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[#31556f]">{t(visible ? 'forum.identity.visibleText' : 'forum.identity.anonymousText')}</p>
        </div>
      </div>
      <button type="button" onClick={() => void toggle()} disabled={saving} aria-pressed={visible} className="min-h-11 flex-none cursor-pointer border-2 border-[#31556f] bg-white px-4 text-[13px] font-bold text-[#24445c] hover:bg-[#e6f0f7] disabled:cursor-wait disabled:opacity-60">
        {saving ? t('common.saving') : t(visible ? 'forum.identity.becomeAnonymous' : 'forum.identity.showMyName')}
      </button>
    </section>
  );
}
