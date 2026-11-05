import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { useI18n } from '../context/I18nContext';
import type { ActivityCompletion } from '../lib/events';

export interface CompletionInput {
  summary: string;
  outcomes: string;
  discussionPoints: string;
  nextSteps: string;
  participants: string;
}

interface Props {
  activityTitle: string;
  initial?: ActivityCompletion | null;
  /** True when the activity is already completed and only its record is edited. */
  editOnly?: boolean;
  saving: boolean;
  onSubmit: (completion: CompletionInput) => void;
  onCancel: () => void;
}

const SUMMARY_MIN = 20;
const textareaClass = 'mt-2 w-full resize-y border-2 border-[#bfc0c5] bg-white p-3 text-[14px] font-normal focus:border-[#ca7428] focus:outline-none';
const hintClass = 'mt-1 block text-[12px] font-normal text-[#777]';

/** Shown when an activity is marked Completed: records what took place. The summary is published to citizens. */
export default function CompleteActivityDialog({ activityTitle, initial, editOnly = false, saving, onSubmit, onCancel }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState<CompletionInput>({
    summary: initial?.summary || '',
    outcomes: initial?.outcomes || '',
    discussionPoints: initial?.discussionPoints || '',
    nextSteps: initial?.nextSteps || '',
    participants: initial?.participants == null ? '' : String(initial.participants),
  });
  const [touched, setTouched] = useState(false);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const summaryTooShort = form.summary.trim().length < SUMMARY_MIN;

  useEffect(() => { summaryRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onCancel]);

  const field = (key: keyof CompletionInput) => ({
    id: `completion-${key}`,
    value: form[key],
    onChange: (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const submit = () => {
    setTouched(true);
    if (summaryTooShort) { summaryRef.current?.focus(); return; }
    onSubmit(form);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="complete-activity-title" className="relative mx-auto my-6 w-full max-w-[720px] border-2 border-[#b2b2b8] bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b-2 border-[#eee] p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#e7f2df] text-[#47662f]"><CheckCircle2 size={22} aria-hidden="true" /></span>
              <div>
                <h2 id="complete-activity-title" className="text-[22px] font-bold text-[#444]">{t(editOnly ? 'completion.editTitle' : 'completion.title')}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#666]">{t('completion.intro', { activity: activityTitle })}</p>
              </div>
            </div>
            <button type="button" onClick={onCancel} disabled={saving} className="grid h-10 w-10 flex-none cursor-pointer place-items-center hover:bg-[#f4f4f4]" aria-label={t('common.close')}><X size={20} /></button>
          </header>

          <div className="grid gap-5 p-6">
            <label htmlFor="completion-summary" className="block text-[14px] font-bold text-[#444]">
              {t('completion.summary')} *
              <span className={hintClass}>{t('completion.summaryHint')}</span>
              <textarea ref={summaryRef} rows={6} className={`${textareaClass} ${touched && summaryTooShort ? 'border-red-600' : ''}`} aria-invalid={touched && summaryTooShort ? true : undefined} aria-describedby="completion-summary-public" {...field('summary')} />
              <span id="completion-summary-public" className="mt-1 flex flex-wrap justify-between gap-2 text-[12px] font-normal">
                <span className="text-[#47662f]">{t('completion.summaryPublic')}</span>
                {touched && summaryTooShort && <span className="font-semibold text-red-700" role="alert">{t('completion.summaryTooShort', { count: SUMMARY_MIN })}</span>}
              </span>
            </label>
            <label htmlFor="completion-outcomes" className="block text-[13px] font-bold text-[#444]">
              {t('completion.outcomes')}
              <textarea rows={3} className={textareaClass} {...field('outcomes')} />
            </label>
            <label htmlFor="completion-discussionPoints" className="block text-[13px] font-bold text-[#444]">
              {t('completion.discussionPoints')}
              <textarea rows={3} className={textareaClass} {...field('discussionPoints')} />
            </label>
            <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
              <label htmlFor="completion-nextSteps" className="block text-[13px] font-bold text-[#444]">
                {t('completion.nextSteps')}
                <textarea rows={2} className={textareaClass} {...field('nextSteps')} />
              </label>
              <label htmlFor="completion-participants" className="block text-[13px] font-bold text-[#444]">
                {t('completion.participants')}
                <input type="number" min={0} inputMode="numeric" className="mt-2 min-h-11 w-full border-2 border-[#bfc0c5] bg-white px-3 text-[14px] font-normal focus:border-[#ca7428] focus:outline-none" {...field('participants')} />
              </label>
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t-2 border-[#eee] p-6 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 cursor-pointer border-2 border-[#444] px-5 text-[14px] font-semibold text-[#444] hover:bg-[#f4f4f4] disabled:opacity-50">{t('common.cancel')}</button>
            <button type="button" onClick={submit} disabled={saving} className="min-h-11 cursor-pointer bg-[#f68b2c] px-5 text-[14px] font-bold text-white hover:bg-[#e07a20] disabled:cursor-wait disabled:opacity-60">
              {saving ? t('common.saving') : t(editOnly ? 'completion.saveRecord' : 'completion.completeAndPublish')}
            </button>
          </footer>
        </section>
      </div>
    </ModalPortal>
  );
}
