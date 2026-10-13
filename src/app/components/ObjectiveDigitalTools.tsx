import { Link } from 'react-router';
import { CheckCircle2, Lock, MonitorSmartphone } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { processPhase } from '../data/processFramework';

// The SPICE digital tools D3.3 associates with one Objective, each selectable for the Municipality's process.
export default function ObjectiveDigitalTools({ phaseNumber, selectedIds, onToggle, disabled = false, lockMessageFor }: {
  phaseNumber: number;
  selectedIds?: string[];
  onToggle?: (toolId: string, name: string) => void;
  disabled?: boolean;
  /** Why a tool cannot be added or removed right now, if it cannot. */
  lockMessageFor?: (toolId: string) => string | null;
}) {
  const { t } = useI18n();
  const tools = processPhase(phaseNumber).digitalTools || [];
  if (tools.length === 0) {
    return <p className="border-l-4 border-[#d5d6da] bg-[#f7f7f8] px-4 py-3 text-[13px] font-medium text-[#555]">{t('coverage.noDigitalTools')}</p>;
  }
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] font-bold text-[#444]"><MonitorSmartphone size={16} className="text-[#ca7428]" aria-hidden="true" />{t('coverage.digitalTools')}</p>
      <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const name = t(tool.nameKey);
          const selected = Boolean(selectedIds?.includes(tool.toolId));
          const lockMessage = onToggle ? lockMessageFor?.(tool.toolId) || null : null;
          return (
            <li key={tool.toolId} className={`flex flex-col border-2 p-4 ${selected ? 'border-[#f68b2c] bg-[#fffaf4]' : 'border-[#d5d6da] bg-white'}`}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-bold text-[#444]">{name}</span>
                <span className="bg-[#eef0f3] px-2 py-0.5 text-[11px] font-semibold text-[#555]">{t('phaseDetail.kindDigital')}</span>
                {selected && <span className="inline-flex items-center gap-1 bg-[#f68b2c] px-2 py-0.5 text-[11px] font-bold text-white"><CheckCircle2 size={12} aria-hidden="true" />{t('coverage.inProcess')}</span>}
              </span>
              <span className="mt-2 flex-1 text-[13px] leading-relaxed text-[#666]">{t(tool.descriptionKey)}</span>
              <span className="mt-3 flex flex-wrap gap-2">
                <Link to={tool.route} className="inline-flex min-h-10 items-center border border-[#bfc0c5] px-3 text-[13px] font-semibold text-[#444] hover:bg-[#f7f7f7]">{t('resources.moreInformation')}</Link>
                {onToggle && (
                  <button
                    type="button"
                    disabled={disabled || Boolean(lockMessage)}
                    aria-pressed={selected}
                    onClick={() => onToggle(tool.toolId, name)}
                    className={`inline-flex min-h-10 cursor-pointer items-center px-3 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${selected ? 'bg-[#a86622]' : 'bg-[#f68b2c] hover:bg-[#e07a20]'}`}
                  >
                    {t(selected ? 'coverage.removeFrom' : 'coverage.addTo', { number: phaseNumber })}
                  </button>
                )}
              </span>
              {lockMessage && <span className="mt-2 flex items-start gap-1.5 text-[12px] font-semibold text-[#8a4b16]"><Lock size={13} className="mt-0.5 flex-none" aria-hidden="true" />{lockMessage}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
