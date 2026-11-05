import { FileCheck2 } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import type { ActivityCompletion } from '../lib/events';

/** The public record of a completed activity: what took place, its outcomes and key discussion points. */
export default function ActivitySummary({ completion, compact = false }: { completion: ActivityCompletion; compact?: boolean }) {
  const { t, formatDate } = useI18n();
  const details: Array<[string, string | null]> = [
    [t('completion.outcomes'), completion.outcomes],
    [t('completion.discussionPoints'), completion.discussionPoints],
    [t('completion.nextSteps'), completion.nextSteps],
  ];
  return (
    <div className={`border-l-4 border-[#58723d] bg-[#f4f8ef] text-[13px] leading-relaxed text-[#3d4a33] ${compact ? 'p-3' : 'p-4'}`}>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-wide text-[#47662f]">
        <span className="inline-flex items-center gap-1.5"><FileCheck2 size={14} aria-hidden="true" />{t('completion.whatHappened')}</span>
        {completion.participants != null && <span className="font-semibold normal-case tracking-normal">{t('completion.participantsCount', { count: completion.participants })}</span>}
        {completion.recordedAt && <span className="font-semibold normal-case tracking-normal text-[#66745a]">{formatDate(completion.recordedAt, { dateStyle: 'medium' })}</span>}
      </p>
      <p className="mt-2 whitespace-pre-line text-[#333]">{completion.summary}</p>
      {details.some(([, value]) => value) && (
        <dl className="mt-3 grid gap-2">
          {details.filter(([, value]) => value).map(([label, value]) => (
            <div key={label}><dt className="font-bold">{label}</dt><dd className="whitespace-pre-line">{value}</dd></div>
          ))}
        </dl>
      )}
    </div>
  );
}
