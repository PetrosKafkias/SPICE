import { useState } from 'react';
import { Accessibility, CalendarDays, CircleAlert, FileText, Landmark, Package, Pencil, Settings2 } from 'lucide-react';
import { DetailRow } from './EventDetailsHeader';
import ActivitySummary from './ActivitySummary';
import CompleteActivityDialog, { type CompletionInput } from './CompleteActivityDialog';
import ConfirmActionDialog from './ConfirmActionDialog';
import { toast } from 'sonner';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest, jsonBody } from '../lib/api';
import { statusKey } from '../lib/statusLabel';
import type { ActivityCompletion, HubEvent } from '../lib/events';

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
  eventId: number | null;
  completion: ActivityCompletion | null;
}

export type ImplementationDefaults = Partial<Omit<typeof EMPTY_FORM, 'startDate' | 'endDate' | 'facilitatorNotes' | 'eventId'>>;

interface ImplementationAction {
  status: ImplementationStatus;
  label: TranslationKey;
  primary?: boolean;
  confirm?: { title: TranslationKey; body: TranslationKey };
}

const CONFIRM_CLOSE = { title: 'phaseDetail.confirmCloseTitle', body: 'phaseDetail.confirmCloseBody' } as const;
const CONFIRM_REOPEN = { title: 'phaseDetail.confirmReopenTitle', body: 'phaseDetail.confirmReopenBody' } as const;
const CONFIRM_REVERT = { title: 'phaseDetail.confirmRevertTitle', body: 'phaseDetail.confirmRevertBody' } as const;

// Running an activity is operational and reversible for both roles; these mirror the server's
// transition rules (server/workflow.mjs), which reject anything else.
const OPERATIONAL_ACTIONS: Partial<Record<ImplementationStatus, ImplementationAction[]>> = {
  scheduled: [{ status: 'open', label: 'phaseDetail.openParticipation', primary: true }],
  open: [{ status: 'closed', label: 'phaseDetail.closeParticipation', primary: true, confirm: CONFIRM_CLOSE }],
  closed: [
    { status: 'open', label: 'phaseDetail.reopenContributions', confirm: CONFIRM_REOPEN },
    // Completing opens the completion record instead of a plain confirmation.
    { status: 'completed', label: 'phaseDetail.completeActivity', primary: true },
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
  /** The events of this Objective that the activity can belong to. */
  events?: HubEvent[];
  /** Shown inside its event's card, so the event's logistics are not repeated. */
  insideEvent?: boolean;
  canManage: boolean;
  canFacilitate: boolean;
  onChanged: () => Promise<void>;
}

const EMPTY_FORM = {
  instructions: '', startDate: '', endDate: '', location: '', participationMode: 'offline' as ToolImplementation['participationMode'],
  expectedParticipants: '', estimatedDuration: '', requiredMaterials: '', accessibilityNotes: '', languageSupport: '', supportContact: '', facilitatorNotes: '',
  eventId: '',
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
    eventId: implementation.eventId ? String(implementation.eventId) : '',
  };
}

const STATUS_PILL: Record<ImplementationStatus | 'none', string> = {
  none: 'bg-[#eef0f3] text-[#666]',
  draft: 'bg-[#eef0f3] text-[#444]',
  ready_for_review: 'bg-[#e8f0f7] text-[#254f72]',
  needs_revision: 'bg-[#fdecea] text-[#b3261e]',
  published: 'bg-[#e8f0f7] text-[#254f72]',
  scheduled: 'bg-[#e8f0f7] text-[#254f72]',
  open: 'bg-[#fff0e1] text-[#c4661b]',
  closed: 'bg-[#eef0f3] text-[#555]',
  completed: 'bg-[#eaf2e3] text-[#47662f]',
  cancelled: 'bg-[#eef0f3] text-[#888]',
};

const inputClass = 'mt-2 min-h-11 w-full border-2 border-[#bfc0c5] bg-white px-3 font-normal focus:border-[#ca7428] focus:outline-none';
const textareaClass = 'mt-2 w-full resize-y border-2 border-[#bfc0c5] bg-white p-3 font-normal focus:border-[#ca7428] focus:outline-none';


export default function ToolImplementationCard({ initiativeId, phaseNumber, toolKey, title, kindLabel, municipalityNote, implementation, defaults, events = [], insideEvent = false, canManage, canFacilitate, onChanged }: Props) {
  const { t, formatDate } = useI18n();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<ImplementationAction | null>(null);
  const [completing, setCompleting] = useState<'complete' | 'edit' | null>(null);
  const assignableEvents = events.filter((event) => event.status !== 'cancelled');
  const event = implementation?.eventId ? events.find((item) => item.id === implementation.eventId) || null : null;
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

  // Logistics (date, mode, duration, location...) come from the event; an activity keeps its own
  // instructions, required notes, team notes and accessibility notes.
  const save = async () => {
    setSaving(true);
    const adaptable = {
      instructions: form.instructions, requiredMaterials: form.requiredMaterials, facilitatorNotes: form.facilitatorNotes,
      accessibilityNotes: form.accessibilityNotes, eventId: form.eventId ? Number(form.eventId) : null,
    };
    const payload = { ...form, ...adaptable, startDate: form.startDate || null, endDate: form.endDate || null };
    try {
      if (implementation) {
        await apiRequest(`/api/hub/activities/${implementation.id}`, { method: 'PATCH', body: jsonBody(adaptable) });
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

  const transition = async (workflowStatus: ImplementationStatus, completion?: CompletionInput) => {
    if (!implementation) return;
    if (workflowStatus === 'needs_revision' && reviewNotes.trim().length < 10) {
      toast.error(t('phaseDetail.reviewNotesRequired'));
      return;
    }
    setSaving(true);
    try {
      await apiRequest(`/api/hub/activities/${implementation.id}`, {
        method: 'PATCH',
        body: jsonBody({ workflowStatus, reviewNotes: reviewNotes.trim() || undefined, completion }),
      });
      setReviewNotes('');
      setCompleting(null);
      await onChanged();
      toast.success(t(completion ? 'completion.savedToast' : 'phaseDetail.activityUpdated'));
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
    if (action.status === 'completed') setCompleting('complete');
    else if (action.confirm) setPendingAction(action);
    else void transition(action.status);
  };
  // Contributions follow the activity status: only an Open activity accepts them.
  const contributionStateKey: TranslationKey | null = status === 'open' ? 'phaseDetail.contributionsAccepted'
    : status === 'closed' || status === 'completed' ? 'phaseDetail.contributionsNotAccepted' : null;

  const isOpen = status === 'open';

  return (
    <article className={`flex flex-col rounded-xl border bg-white p-5 ${isOpen ? 'border-[#f68b2c] ring-1 ring-[#f68b2c]' : 'border-[#d5d6da]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[18px] font-bold text-[#333]">{title}</h3>
          <p className="mt-0.5 text-[12px] font-medium text-[#666]">{[kindLabel, toolKey ? t('phaseDetail.selectedByMunicipality') : null].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${STATUS_PILL[implementation?.workflowStatus || 'none']}`}>
          {implementation ? t(statusKey(implementation.workflowStatus)) : t('phaseDetail.notConfigured')}
        </span>
      </div>

      {toolKey && (
        <div className="mt-4 rounded-lg border-l-4 border-[#4e789b] bg-[#f1f7fb] p-4 text-[13px] leading-relaxed text-[#31556f]">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide"><Landmark size={14} aria-hidden="true" />{t('phaseDetail.municipalityInstructions')}</p>
          <p className="mt-1.5 whitespace-pre-line">{municipalityNote || t('phaseDetail.noMunicipalityInstructions')}</p>
        </div>
      )}

      {implementation && !editing && (
        <div className="mt-4 border-t border-[#e6e6e8] pt-4">
          <p className="flex items-center gap-2 text-[12px] font-bold text-[#a85f20]"><Settings2 size={14} aria-hidden="true" />{t('phaseDetail.implementation')}</p>
          {!insideEvent && (event ? (
            <p className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-full bg-[#fff0e1] px-3 py-1 text-[12px] font-semibold text-[#8a4b16]">
              <CalendarDays size={14} aria-hidden="true" />{t('activity.partOfEvent', { event: event.title })}
              {event.startAt && <span className="font-normal">· {formatDate(event.startAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>}
            </p>
          ) : (
            <p className="mt-2 text-[12px] font-semibold text-[#8a4b16]">{t('activity.noEvent')}</p>
          ))}
          <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-[#444]">{implementation.instructions || <span className="text-[#888]">{t('activity.notSet')}</span>}</p>
          {(implementation.requiredMaterials || implementation.accessibilityNotes || implementation.facilitatorNotes) && (
            <div className="mt-4 grid gap-3 border-t border-[#e6e6e8] pt-4">
              {implementation.requiredMaterials && <DetailRow icon={<Package size={18} />} label={t('activity.requiredNotes')}>{implementation.requiredMaterials}</DetailRow>}
              {implementation.accessibilityNotes && <DetailRow icon={<Accessibility size={18} />} label={t('activity.accessibilityNotes')}>{implementation.accessibilityNotes}</DetailRow>}
              {implementation.facilitatorNotes && <DetailRow icon={<FileText size={18} />} label={t('activity.teamNotes')}>{implementation.facilitatorNotes}</DetailRow>}
            </div>
          )}
          {implementation.workflowStatus === 'completed' && (
            <div className="mt-4">
              {implementation.completion ? <ActivitySummary completion={implementation.completion} compact /> : <p className="text-[12px] font-semibold text-[#8a4b16]">{t('completion.missing')}</p>}
              {canConfigure && (
                <button type="button" onClick={() => setCompleting('edit')} className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 text-[13px] font-bold text-[#47662f] underline underline-offset-4"><Pencil size={14} aria-hidden="true" />{t(implementation.completion ? 'completion.editSummary' : 'completion.addSummary')}</button>
              )}
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
          <div className="mt-3 grid items-start gap-4">
            <label htmlFor={`activity-event-${toolKey || implementation?.id}`} className="block text-sm font-bold text-[#444]">{t('activity.event')}
              <span className="mt-1 block text-[12px] font-normal text-[#777]">{t(assignableEvents.length ? 'activity.eventHint' : 'activity.noEventsYet')}</span>
              <select id={`activity-event-${toolKey || implementation?.id}`} className={inputClass} {...field('eventId')} disabled={!assignableEvents.length}>
                <option value="">{t('activity.noEventOption')}</option>
                {assignableEvents.map((item) => <option key={item.id} value={String(item.id)}>{item.title}{item.startAt ? ` · ${formatDate(item.startAt, { dateStyle: 'medium' })}` : ''}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-[#444]">{t('activity.instructions')}
              <span className="mt-1 block text-[12px] font-normal text-[#777]">{t('activity.instructionsHint')}</span>
              <textarea rows={3} className={textareaClass} {...field('instructions')} />
            </label>
            <label className="block text-sm font-bold text-[#444]">{t('activity.requiredNotes')}
              <span className="mt-1 block text-[12px] font-normal text-[#777]">{t('activity.requiredNotesHint')}</span>
              <textarea rows={2} className={textareaClass} {...field('requiredMaterials')} />
            </label>
            <label className="block text-sm font-bold text-[#444]">{t('activity.teamNotes')}
              <span className="mt-1 block text-[12px] font-normal text-[#777]">{t('activity.teamNotesHint')}</span>
              <textarea rows={2} className={textareaClass} {...field('facilitatorNotes')} />
            </label>
            <label className="block text-sm font-bold text-[#444]">{t('activity.accessibilityNotes')}
              <span className="mt-1 block text-[12px] font-normal text-[#777]">{t('activity.accessibilityNotesHint')}</span>
              <textarea rows={2} className={textareaClass} {...field('accessibilityNotes')} />
            </label>
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
        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-[#e6e6e8] pt-4 [&>button:last-child]:flex-1">
          {implementation && (
            <p className="w-full text-[13px] text-[#555]">
              <strong>{t('phaseDetail.statusLabel')}:</strong> {t(statusKey(implementation.workflowStatus))}
              {contributionStateKey && <span className="block text-[12px] text-[#777]">{t(contributionStateKey)}</span>}
            </p>
          )}
          {editable && (
            <button type="button" onClick={startEditing} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-[#444] bg-white px-4 py-2 text-sm font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">
              <Settings2 size={16} aria-hidden="true" />{t(implementation ? 'phaseDetail.editImplementation' : 'phaseDetail.configureImplementation')}
            </button>
          )}
          {actions.map((action) => (
            <button key={action.status} type="button" onClick={() => runAction(action)} disabled={saving} className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${action.primary ? 'bg-[#f68b2c] text-white hover:bg-[#df771d]' : 'border-2 border-[#ca7428] bg-white text-[#a85f20] hover:bg-[#fff4e9]'}`}>
              {t(action.label)}
            </button>
          ))}
        </div>
      )}

      {completing && implementation && (
        <CompleteActivityDialog
          activityTitle={title}
          initial={implementation.completion}
          editOnly={completing === 'edit'}
          saving={saving}
          onSubmit={(completion) => void transition('completed', completion)}
          onCancel={() => setCompleting(null)}
        />
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
