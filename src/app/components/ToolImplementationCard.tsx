import { useState, type ReactNode } from 'react';
import { CircleAlert, ClipboardList, Landmark, Settings2 } from 'lucide-react';
import ConfirmActionDialog from './ConfirmActionDialog';
import { toast } from 'sonner';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest, jsonBody } from '../lib/api';
import { statusKey } from '../lib/statusLabel';

export type ImplementationStatus = 'draft' | 'ready_for_review' | 'needs_revision' | 'published' | 'scheduled' | 'open' | 'closed' | 'completed' | 'cancelled';

export interface ToolImplementation {
  id: number;
  toolKey: string | null;
  title: string;
  workflowStatus: ImplementationStatus;
  reviewNotes: string | null;
  instructions: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  participationMode: 'online' | 'offline' | 'hybrid';
  estimatedDuration: string | null;
  requiredMaterials: string | null;
  accessibilityNotes: string | null;
  languageSupport: string | null;
  supportContact: string | null;
  expectedParticipants: string | null;
  facilitatorNotes: string | null;
}

export type ImplementationDefaults = Partial<Omit<typeof EMPTY_FORM, 'startDate' | 'endDate' | 'facilitatorNotes'>>;

interface ImplementationAction {
  status: ImplementationStatus;
  label: TranslationKey;
  primary?: boolean;
  confirm?: { title: TranslationKey; body: TranslationKey };
}

const CONFIRM_CLOSE = { title: 'phaseDetail.confirmCloseTitle', body: 'phaseDetail.confirmCloseBody' } as const;
const CONFIRM_REOPEN = { title: 'phaseDetail.confirmReopenTitle', body: 'phaseDetail.confirmReopenBody' } as const;
const CONFIRM_COMPLETE = { title: 'phaseDetail.confirmCompleteTitle', body: 'phaseDetail.confirmCompleteBody' } as const;
const CONFIRM_REVERT = { title: 'phaseDetail.confirmRevertTitle', body: 'phaseDetail.confirmRevertBody' } as const;

// Running an activity is operational and reversible for both roles; these mirror the server's
// transition rules (server/workflow.mjs), which reject anything else.
const OPERATIONAL_ACTIONS: Partial<Record<ImplementationStatus, ImplementationAction[]>> = {
  scheduled: [{ status: 'open', label: 'phaseDetail.openParticipation', primary: true }],
  open: [{ status: 'closed', label: 'phaseDetail.closeParticipation', primary: true, confirm: CONFIRM_CLOSE }],
  closed: [
    { status: 'open', label: 'phaseDetail.reopenContributions', confirm: CONFIRM_REOPEN },
    { status: 'completed', label: 'phaseDetail.completeActivity', primary: true, confirm: CONFIRM_COMPLETE },
  ],
  completed: [{ status: 'closed', label: 'phaseDetail.revertToClosed', confirm: CONFIRM_REVERT }],
};

const MUNICIPALITY_ACTIONS: Partial<Record<ImplementationStatus, ImplementationAction[]>> = {
  ...OPERATIONAL_ACTIONS,
  draft: [{ status: 'ready_for_review', label: 'phaseDetail.submitForReview', primary: true }],
  ready_for_review: [{ status: 'needs_revision', label: 'phaseDetail.requestRevision' }, { status: 'published', label: 'phaseDetail.approveAndPublish', primary: true }],
  needs_revision: [{ status: 'draft', label: 'phaseDetail.returnToDraft' }],
  published: [{ status: 'scheduled', label: 'phaseDetail.scheduleActivity', primary: true }],
};

const FACILITATOR_ACTIONS: Partial<Record<ImplementationStatus, ImplementationAction[]>> = {
  ...OPERATIONAL_ACTIONS,
  draft: [{ status: 'ready_for_review', label: 'phaseDetail.submitForReview', primary: true }],
  needs_revision: [{ status: 'ready_for_review', label: 'phaseDetail.submitForReview', primary: true }],
  published: [{ status: 'scheduled', label: 'phaseDetail.scheduleActivity', primary: true }],
};

interface Props {
  initiativeId: number;
  phaseNumber: number;
  toolKey: string | null;
  title: string;
  kindLabel?: string;
  municipalityNote?: string;
  implementation?: ToolImplementation;
  defaults?: ImplementationDefaults;
  canManage: boolean;
  canFacilitate: boolean;
  onChanged: () => Promise<void>;
}

const EMPTY_FORM = {
  instructions: '', startDate: '', endDate: '', location: '', participationMode: 'offline' as ToolImplementation['participationMode'],
  expectedParticipants: '', estimatedDuration: '', requiredMaterials: '', accessibilityNotes: '', languageSupport: '', supportContact: '', facilitatorNotes: '',
};

function toLocalInput(value: string | null) {
  return value ? value.slice(0, 16) : '';
}

function formFrom(implementation?: ToolImplementation, defaults?: ImplementationDefaults) {
  if (!implementation) return { ...EMPTY_FORM, ...defaults };
  return {
    instructions: implementation.instructions || '',
    startDate: toLocalInput(implementation.startDate),
    endDate: toLocalInput(implementation.endDate),
    location: implementation.location || '',
    participationMode: implementation.participationMode,
    expectedParticipants: implementation.expectedParticipants || '',
    estimatedDuration: implementation.estimatedDuration || '',
    requiredMaterials: implementation.requiredMaterials || '',
    accessibilityNotes: implementation.accessibilityNotes || '',
    languageSupport: implementation.languageSupport || '',
    supportContact: implementation.supportContact || '',
    facilitatorNotes: implementation.facilitatorNotes || '',
  };
}

const inputClass = 'mt-2 min-h-11 w-full border-2 border-[#bfc0c5] bg-white px-3 font-normal focus:border-[#ca7428] focus:outline-none';
const textareaClass = 'mt-2 w-full resize-y border-2 border-[#bfc0c5] bg-white p-3 font-normal focus:border-[#ca7428] focus:outline-none';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="inline font-bold">{label}: </dt><dd className="inline">{children}</dd></div>;
}

export default function ToolImplementationCard({ initiativeId, phaseNumber, toolKey, title, kindLabel, municipalityNote, implementation, defaults, canManage, canFacilitate, onChanged }: Props) {
  const { t, formatDate } = useI18n();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<ImplementationAction | null>(null);
  const canConfigure = canManage || canFacilitate;
  const status = implementation?.workflowStatus;
  const editable = canConfigure && status !== 'completed' && status !== 'cancelled' && (Boolean(implementation) || Boolean(toolKey));

  const field = (key: keyof typeof EMPTY_FORM) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const startEditing = () => {
    setForm(formFrom(implementation, defaults));
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, startDate: form.startDate || null, endDate: form.endDate || null };
    try {
      if (implementation) {
        await apiRequest(`/api/hub/activities/${implementation.id}`, { method: 'PATCH', body: jsonBody(payload) });
      } else {
        await apiRequest(`/api/hub/initiatives/${initiativeId}/activities`, {
          method: 'POST',
          body: jsonBody({ ...payload, phaseNumber, toolKey, workflowStatus: 'draft', contributionTypes: ['text'] }),
        });
      }
      await onChanged();
      setEditing(false);
      toast.success(t('phaseDetail.implementationSaved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const transition = async (workflowStatus: ImplementationStatus) => {
    if (!implementation) return;
    if (workflowStatus === 'needs_revision' && reviewNotes.trim().length < 10) {
      toast.error(t('phaseDetail.reviewNotesRequired'));
      return;
    }
    setSaving(true);
    try {
      await apiRequest(`/api/hub/activities/${implementation.id}`, {
        method: 'PATCH',
        body: jsonBody({ workflowStatus, reviewNotes: reviewNotes.trim() || undefined }),
      });
      setReviewNotes('');
      await onChanged();
      toast.success(t('phaseDetail.activityUpdated'));
    } catch {
      toast.error(t('phaseDetail.activityUpdateFailed'));
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  };

  const actions: ImplementationAction[] = !implementation ? []
    : (canManage ? MUNICIPALITY_ACTIONS : canFacilitate ? FACILITATOR_ACTIONS : {})[implementation.workflowStatus] || [];
  const runAction = (action: ImplementationAction) => {
    if (action.confirm) setPendingAction(action);
    else void transition(action.status);
  };
  // Contributions follow the activity status: only an Open activity accepts them.
  const contributionStateKey: TranslationKey | null = status === 'open' ? 'phaseDetail.contributionsAccepted'
    : status === 'closed' || status === 'completed' ? 'phaseDetail.contributionsNotAccepted' : null;

  const isOpen = status === 'open';

  return (
    <article className={`border-2 bg-white p-5 ${isOpen ? 'border-[#f68b2c]' : 'border-[#d5d6da]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-[#444]">{title}</h3>
          <p className="mt-1 text-[12px] font-semibold text-[#777]">{[kindLabel, toolKey ? t('phaseDetail.selectedByMunicipality') : null].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-bold uppercase ${implementation ? (isOpen ? 'bg-[#fff0e1] text-[#a85f20]' : 'bg-[#eee] text-[#555]') : 'bg-[#f3f3f4] text-[#777]'}`}>
          {implementation ? t(statusKey(implementation.workflowStatus)) : t('phaseDetail.notConfigured')}
        </span>
      </div>

      {toolKey && (
        <div className="mt-4 border-l-4 border-[#4e789b] bg-[#f1f7fb] p-4 text-[13px] leading-relaxed text-[#31556f]">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide"><Landmark size={14} aria-hidden="true" />{t('phaseDetail.municipalityInstructions')}</p>
          <p className="mt-1.5 whitespace-pre-line">{municipalityNote || t('phaseDetail.noMunicipalityInstructions')}</p>
        </div>
      )}

      {implementation && !editing && (
        <div className="mt-4 border-t border-[#eee] pt-4 text-[13px] leading-relaxed text-[#555]">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#a85f20]"><Settings2 size={14} aria-hidden="true" />{t('phaseDetail.implementation')}</p>
          {implementation.instructions && <p className="mt-2">{implementation.instructions}</p>}
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {implementation.startDate && <Detail label={t('phaseDetail.startDate')}>{formatDate(implementation.startDate, { dateStyle: 'medium', timeStyle: 'short' })}</Detail>}
            {implementation.endDate && <Detail label={t('phaseDetail.endDate')}>{formatDate(implementation.endDate, { dateStyle: 'medium', timeStyle: 'short' })}</Detail>}
            <Detail label={t('phaseDetail.mode')}>{t(`resources.${implementation.participationMode}` as TranslationKey)}</Detail>
            {implementation.location && <Detail label={t('phaseDetail.location')}>{implementation.location}</Detail>}
            {implementation.expectedParticipants && <Detail label={t('phaseDetail.expectedParticipants')}>{implementation.expectedParticipants}</Detail>}
            {implementation.estimatedDuration && <Detail label={t('phaseDetail.duration')}>{implementation.estimatedDuration}</Detail>}
            {implementation.requiredMaterials && <Detail label={t('phaseDetail.requiredMaterials')}>{implementation.requiredMaterials}</Detail>}
            {implementation.accessibilityNotes && <Detail label={t('phaseDetail.accessibilityNotes')}>{implementation.accessibilityNotes}</Detail>}
            {implementation.languageSupport && <Detail label={t('phaseDetail.languageSupport')}>{implementation.languageSupport}</Detail>}
            {implementation.supportContact && <Detail label={t('phaseDetail.supportContact')}>{implementation.supportContact}</Detail>}
          </dl>
          {implementation.facilitatorNotes && (
            <div className="mt-4 border-l-4 border-[#ca7428] bg-[#fff8f2] p-4 text-[#5f4630]">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#a85f20]"><ClipboardList size={14} aria-hidden="true" />{t('phaseDetail.facilitatorNotes')}</p>
              <p className="mt-1.5 whitespace-pre-line">{implementation.facilitatorNotes}</p>
            </div>
          )}
        </div>
      )}

      {implementation?.reviewNotes && implementation.workflowStatus === 'needs_revision' && (
        <div className="mt-4 flex items-start gap-2 border-l-4 border-[#ca7428] bg-[#fff7ef] p-3 text-sm text-[#65401f]" role="status">
          <CircleAlert size={17} className="mt-0.5 flex-none" aria-hidden="true" />
          <p><strong>{t('phaseDetail.revisionRequested')}:</strong> {implementation.reviewNotes}</p>
        </div>
      )}

      {editing && (
        <div className="mt-4 border-t border-[#eee] pt-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#a85f20]"><Settings2 size={14} aria-hidden="true" />{t('phaseDetail.implementation')}</p>
          {!implementation && <p className="mt-2 text-[13px] leading-relaxed text-[#666]">{t('phaseDetail.prefilledHint')}</p>}
          <div className="mt-3 grid items-start gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold text-[#444] md:col-span-2">{t('phaseDetail.instructions')}<textarea rows={3} className={textareaClass} placeholder={t('phaseDetail.instructionsPlaceholder')} {...field('instructions')} /></label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.startDate')}<input type="datetime-local" className={inputClass} {...field('startDate')} /></label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.endDate')}<input type="datetime-local" className={inputClass} {...field('endDate')} /></label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.mode')}
              <select className={inputClass} {...field('participationMode')}>
                <option value="offline">{t('resources.offline')}</option>
                <option value="online">{t('resources.online')}</option>
                <option value="hybrid">{t('resources.hybrid')}</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.location')}<input className={inputClass} {...field('location')} /></label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.expectedParticipants')}<input className={inputClass} {...field('expectedParticipants')} /></label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.duration')}<input className={inputClass} {...field('estimatedDuration')} /></label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.requiredMaterials')}<input className={inputClass} {...field('requiredMaterials')} /></label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.supportContact')}<input className={inputClass} {...field('supportContact')} /></label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.accessibilityNotes')}<input className={inputClass} {...field('accessibilityNotes')} /></label>
            <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.languageSupport')}<input className={inputClass} {...field('languageSupport')} /></label>
            <label className="block text-sm font-bold text-[#444] md:col-span-2">{t('phaseDetail.facilitatorNotes')}<textarea rows={3} className={textareaClass} placeholder={t('phaseDetail.facilitatorNotesPlaceholder')} {...field('facilitatorNotes')} /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#df771d] disabled:cursor-wait disabled:opacity-60">{t('phaseDetail.saveImplementation')}</button>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="inline-flex min-h-11 cursor-pointer items-center border-2 border-[#bfc0c5] bg-white px-5 py-2.5 text-sm font-bold text-[#444] hover:border-[#444]">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {canManage && implementation?.workflowStatus === 'ready_for_review' && !editing && (
        <label className="mt-4 block text-sm font-bold text-[#444]">
          {t('phaseDetail.reviewNotes')}
          <textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} rows={2} className={textareaClass} placeholder={t('phaseDetail.reviewNotesPlaceholder')} />
        </label>
      )}

      {!editing && (editable || actions.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-[#eee] pt-4">
          {implementation && (
            <p className="mr-auto text-[13px] text-[#555]">
              <strong>{t('phaseDetail.statusLabel')}:</strong> {t(statusKey(implementation.workflowStatus))}
              {contributionStateKey && <span className="block text-[12px] text-[#777]">{t(contributionStateKey)}</span>}
            </p>
          )}
          {editable && (
            <button type="button" onClick={startEditing} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-4 py-2 text-sm font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">
              <Settings2 size={16} aria-hidden="true" />{t(implementation ? 'phaseDetail.editImplementation' : 'phaseDetail.configureImplementation')}
            </button>
          )}
          {actions.map((action) => (
            <button key={action.status} type="button" onClick={() => runAction(action)} disabled={saving} className={`inline-flex min-h-11 cursor-pointer items-center justify-center px-4 py-2 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${action.primary ? 'bg-[#f68b2c] text-white hover:bg-[#df771d]' : 'border-2 border-[#ca7428] bg-white text-[#a85f20] hover:bg-[#fff4e9]'}`}>
              {t(action.label)}
            </button>
          ))}
        </div>
      )}

      {pendingAction?.confirm && (
        <ConfirmActionDialog
          title={t(pendingAction.confirm.title)}
          body={t(pendingAction.confirm.body)}
          confirmLabel={t(pendingAction.label)}
          saving={saving}
          onConfirm={() => void transition(pendingAction.status)}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </article>
  );
}
