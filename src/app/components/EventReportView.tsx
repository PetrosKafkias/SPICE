import { FileText, Link2, Lock, Paperclip } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import type { EventReport } from '../lib/events';
import { ATTACHMENT_KIND_KEYS } from './EventReportDialog';

interface Props {
  eventId: number;
  report: EventReport;
  activities?: Array<{ id: number; title: string }>;
}

function Block({ label, children }: { label: string; children: string | null | undefined }) {
  if (!children) return null;
  return (
    <div>
      <p className="text-[12px] font-bold text-[#666]">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-[14px] leading-relaxed text-[#333]">{children}</p>
    </div>
  );
}

/**
 * An event report. Citizens receive only its public fields from the server, so the internal
 * part below appears only for the Municipality and facilitators.
 */
export default function EventReportView({ eventId, report, activities = [] }: Props) {
  const { t, formatDate } = useI18n();
  const internal = report.summaryScope !== undefined;
  const survey = report.survey || {};
  const surveyRows = ([
    ['influenceScore', 'eventReport.survey.influence', ''],
    ['underrepresentedPct', 'eventReport.survey.underrepresented', '%'],
    ['accessibilityPct', 'eventReport.survey.accessibility', '%'],
    ['trustScore', 'eventReport.survey.trust', ''],
    ['belongingPct', 'eventReport.survey.belonging', '%'],
    ['validationPct', 'eventReport.survey.validation', '%'],
  ] as const).filter(([key]) => survey[key] != null);
  const opening = report.openingCheck;
  const notes = (report.activityNotes || []).filter((note) => note.minutes || note.feedback);

  return (
    <div className="rounded-lg border border-[#cfe0c3] bg-[#f6faf2] p-4">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold uppercase tracking-wide text-[#47662f]">
        <span className="inline-flex items-center gap-1.5"><FileText size={14} aria-hidden="true" />{t('eventReport.viewTitle')}</span>
        <span className="font-semibold normal-case tracking-normal text-[#4f5d45]">
          {[report.date ? formatDate(report.date, { dateStyle: 'medium' }) : null, report.location, report.participants != null ? t('completion.participantsCount', { count: report.participants }) : null].filter(Boolean).join(' · ')}
        </span>
      </p>
      <div className="mt-3 grid gap-3">
        <Block label={t('eventReport.shortArticle')}>{report.shortArticle}</Block>
        <Block label={t('eventReport.insights')}>{report.insights}</Block>
      </div>

      {internal && (
        <div className="mt-4 grid gap-3 border-t border-[#d7e3cd] pt-4">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#555]"><Lock size={13} aria-hidden="true" />{t('eventReport.internalPart')}</p>
          <Block label={t('eventReport.summaryScope')}>{report.summaryScope}</Block>
          {notes.map((note) => (
            <div key={note.activityId} className="rounded-md bg-white p-3">
              <p className="text-[13px] font-bold text-[#333]">{activities.find((activity) => activity.id === note.activityId)?.title || t('eventReport.activity')}</p>
              <div className="mt-1 grid gap-2 md:grid-cols-2">
                <Block label={t('eventReport.minutes')}>{note.minutes}</Block>
                <Block label={t('eventReport.feedback')}>{note.feedback}</Block>
              </div>
            </div>
          ))}
          {opening && opening.respondents != null && (
            <Block label={t('eventReport.openingCheck')}>
              {t('eventReport.openingCheckSummary', {
                method: opening.method || '—',
                respondents: opening.respondents,
                first: opening.statement1Pct ?? '—',
                second: opening.statement2Pct ?? '—',
              })}
            </Block>
          )}
          {(surveyRows.length > 0 || survey.link) && (
            <div>
              <p className="text-[12px] font-bold text-[#666]">{t('eventReport.survey')}</p>
              <dl className="mt-1 grid gap-x-6 gap-y-1 text-[13px] text-[#333] sm:grid-cols-2">
                {surveyRows.map(([key, labelKey, unit]) => <div key={key} className="flex justify-between gap-3"><dt>{t(labelKey)}</dt><dd className="font-semibold tabular-nums">{survey[key]}{unit}</dd></div>)}
              </dl>
              {survey.link && <a href={survey.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#a85f20] underline underline-offset-2"><Link2 size={14} aria-hidden="true" />{t('eventReport.survey.link')}</a>}
            </div>
          )}
          {report.attachments && report.attachments.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-[#666]">{t('eventReport.annexes')}</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {report.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a href={attachment.hasFile ? `/api/hub/events/${eventId}/attachments/${attachment.id}/file` : attachment.linkUrl || '#'} target={attachment.hasFile ? undefined : '_blank'} rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#a85f20] ring-1 ring-[#d9dadd] hover:bg-[#fff4e9]">
                      {attachment.hasFile ? <Paperclip size={13} aria-hidden="true" /> : <Link2 size={13} aria-hidden="true" />}
                      {t(ATTACHMENT_KIND_KEYS[attachment.kind])}{attachment.title ? `: ${attachment.title}` : ''}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
