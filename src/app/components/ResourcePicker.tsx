import { useState, type ReactNode } from 'react';
import { Layers3, Search, Sparkles } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import type { ResourceOption } from '../lib/resourceRecommendation';

export type PickerOption = ResourceOption & {
  /** A short note under the name, such as the other events an activity already takes place in. */
  note?: string | null;
};

interface Props {
  idPrefix: string;
  phaseNumber: number;
  options: PickerOption[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  /** Extra controls for a ticked resource, such as its status or a link to its card. */
  renderSelectedExtra?: (id: string) => ReactNode;
}

/**
 * Chooses resources for an Objective in two groups: the ones the Municipality picked in the setup
 * questionnaire, and the Objective's other resources.
 */
export default function ResourcePicker({ idPrefix, phaseNumber, options, selected, onToggle, disabled = false, renderSelectedExtra }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const recommended = options.filter((option) => option.recommended);
  const others = options.filter((option) => !option.recommended);
  const needle = query.trim().toLowerCase();
  const visibleOthers = needle ? others.filter((option) => option.name.toLowerCase().includes(needle)) : others;

  const renderOption = (option: PickerOption) => {
    const checked = selected.includes(option.id);
    const inputId = `${idPrefix}-${option.id}`;
    const detail = option.kind === 'digital' ? t('resourcePicker.digitalChip')
      : option.phase && option.phase !== phaseNumber ? t('resourcePicker.objectiveChip', { phase: option.phase }) : null;
    return (
      <li key={option.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${checked ? 'border-[#f0b77f] bg-[#fff8f1]' : 'border-[#e3e3e6] bg-white hover:border-[#c9cace]'}`}>
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => onToggle(option.id)}
          className="h-[18px] w-[18px] flex-none cursor-pointer accent-[#ca7428] disabled:cursor-wait"
        />
        <label htmlFor={inputId} className="min-h-10 min-w-0 flex-1 cursor-pointer py-1">
          <span className="block text-[14px] font-bold leading-snug text-[#333]">{option.name}</span>
          {detail && <span className="block text-[12px] text-[#666]">{detail}</span>}
          {option.note && <span className="block text-[12px] text-[#8a4b16]">{option.note}</span>}
        </label>
        {checked && renderSelectedExtra?.(option.id)}
      </li>
    );
  };

  return (
    <div className="grid gap-5">
      <section aria-labelledby={`${idPrefix}-recommended`} className="rounded-lg border border-[#f0d2b4] bg-[#fffaf5] p-4">
        <h4 id={`${idPrefix}-recommended`} className="flex items-center gap-2 text-[14px] font-bold text-[#333]">
          <Sparkles size={16} className="text-[#a85f20]" aria-hidden="true" />{t('resourcePicker.setupTitle')}
          <span className="rounded-full bg-[#fff0e1] px-2 py-0.5 text-[12px] text-[#8a4b16]">{recommended.length}</span>
        </h4>
        <p className="mt-0.5 text-[12px] text-[#666]">{t('resourcePicker.setupHint', { phase: phaseNumber })}</p>
        {recommended.length ? (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">{recommended.map(renderOption)}</ul>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-[#d9b38f] bg-white p-4 text-[13px] text-[#666]">{t('resourcePicker.noneFromSetup')}</p>
        )}
      </section>

      {others.length > 0 && (
        <section aria-labelledby={`${idPrefix}-others`} className="rounded-lg border border-[#e3e3e6] p-4">
          <h4 id={`${idPrefix}-others`} className="flex items-center gap-2 text-[14px] font-bold text-[#333]">
            <Layers3 size={16} className="text-[#666]" aria-hidden="true" />{t('resourcePicker.otherTitle', { phase: phaseNumber })}
            <span className="rounded-full bg-[#eef0f3] px-2 py-0.5 text-[12px] text-[#444]">{others.length}</span>
          </h4>
          <p className="mt-0.5 text-[12px] text-[#666]">{t('resourcePicker.otherHint')}</p>
          {others.length > 8 && (
            <label htmlFor={`${idPrefix}-search`} className="relative mt-3 block max-w-sm">
              <span className="sr-only">{t('resourcePicker.search')}</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" aria-hidden="true" />
              <input
                id={`${idPrefix}-search`}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('resourcePicker.search')}
                className="min-h-10 w-full rounded-md border-2 border-[#d5d6da] bg-white pl-9 pr-3 text-[14px] focus:border-[#ca7428] focus:outline-none"
              />
            </label>
          )}
          {visibleOthers.length ? (
            <ul className="mt-3 grid gap-2 md:grid-cols-2">{visibleOthers.map(renderOption)}</ul>
          ) : (
            <p className="mt-3 text-[13px] text-[#666]">{t('resourcePicker.noMatch')}</p>
          )}
        </section>
      )}
    </div>
  );
}
