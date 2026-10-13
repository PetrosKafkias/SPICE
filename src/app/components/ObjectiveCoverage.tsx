import { CheckCircle2, CircleDashed } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { PROCESS_PHASES } from '../data/processFramework';
import { selectionsComplete, type ObjectiveSelections } from '../lib/objectiveResources';

// Shows, per Objective, whether the Municipality has chosen at least one resource for its process.
export default function ObjectiveCoverage({ selections, onSelectObjective }: {
  selections: ObjectiveSelections;
  onSelectObjective?: (phaseNumber: number) => void;
}) {
  const { t } = useI18n();
  const complete = selectionsComplete(selections);
  return (
    <section className="border-2 border-[#e4c9a4] bg-[#fffaf4] p-5" aria-labelledby="objective-coverage-title">
      <h2 id="objective-coverage-title" className="text-[17px] font-bold text-[#444]">{t('coverage.title')}</h2>
      <p className="mt-1 max-w-3xl text-[13px] font-medium leading-relaxed text-[#666]" aria-live="polite">
        {t(complete ? 'coverage.complete' : 'coverage.text')}
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PROCESS_PHASES.map((phase) => {
          const count = (selections[phase.number] || []).length;
          const done = count > 0;
          const content = (
            <>
              <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-[#a85f20]">
                {done ? <CheckCircle2 size={16} className="text-[#2f7d4f]" aria-hidden="true" /> : <CircleDashed size={16} className="text-[#a85f20]" aria-hidden="true" />}
                {t('resources.objectiveNumber', { objective: phase.number })}
              </span>
              <span className="mt-1 block text-[13px] font-bold leading-snug text-[#444]">{t(phase.objectiveKey)}</span>
              <span className={`mt-2 block text-[12px] font-semibold ${done ? 'text-[#2f7d4f]' : 'text-[#8a4b16]'}`}>
                {done ? t('coverage.count', { count }) : t('coverage.missing')}
              </span>
            </>
          );
          const className = `block h-full w-full border-2 bg-white p-3 text-left ${done ? 'border-[#9cc7a8]' : 'border-[#e4c9a4]'}`;
          return (
            <li key={phase.number}>
              {onSelectObjective ? (
                <button type="button" onClick={() => onSelectObjective(phase.number)} className={`${className} cursor-pointer transition-colors hover:border-[#f68b2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]`}>
                  {content}
                </button>
              ) : <div className={className}>{content}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
