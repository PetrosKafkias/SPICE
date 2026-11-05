import { useRef, type KeyboardEvent } from 'react';
import { CalendarCheck, Info } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export type ObjectiveTab = 'activities' | 'about';

const TABS: Array<{ id: ObjectiveTab; icon: typeof Info; labelKey: 'objectiveTabs.activities' | 'objectiveTabs.about' }> = [
  { id: 'activities', icon: CalendarCheck, labelKey: 'objectiveTabs.activities' },
  { id: 'about', icon: Info, labelKey: 'objectiveTabs.about' },
];

/** The "Activities" / "About this Objective" tabs of an Objective, as in the Co-Creation Hub. */
export default function ObjectiveTabs({ idPrefix, active, onChange }: { idPrefix: string; active: ObjectiveTab; onChange: (tab: ObjectiveTab) => void }) {
  const { t } = useI18n();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  // Arrow keys move between tabs, as the ARIA tabs pattern expects.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" className="mt-6 flex flex-wrap gap-x-2 border-b border-[#e3e3e6]">
      {TABS.map(({ id, icon: Icon, labelKey }, index) => {
        const selected = active === id;
        return (
          <button
            key={id}
            ref={(element) => { refs.current[index] = element; }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`-mb-px inline-flex min-h-14 flex-none cursor-pointer items-center gap-2.5 border-b-[3px] px-4 sm:px-6 text-[17px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#ca7428] ${selected ? 'border-[#ca7428] text-[#ca7428]' : 'border-transparent text-[#333] hover:text-[#ca7428]'}`}
          >
            <Icon size={20} aria-hidden="true" />{t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}
