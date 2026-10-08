import { ChevronDown, MapPinned } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

interface Option {
  value: string;
  label: string;
}

interface Props {
  id: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Pilot switcher for users who work on more than one pilot; renders nothing for a single pilot. */
export default function PilotSelector({ id, options, value, onChange, className = '' }: Props) {
  const { t } = useI18n();
  if (options.length < 2) return null;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[#a85f20]">
        <MapPinned size={14} aria-hidden="true" />{t('pilotContext.label')}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full cursor-pointer appearance-none border-2 border-[#bfc0c5] bg-white py-2 pl-3 pr-9 text-[14px] font-semibold text-[#444] outline-none transition-colors hover:border-[#ca7428] focus:border-[#ca7428]"
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#888]" aria-hidden="true" />
      </div>
    </div>
  );
}
