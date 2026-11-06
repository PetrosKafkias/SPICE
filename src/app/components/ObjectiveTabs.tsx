import { useRef, type KeyboardEvent } from 'react';
import { CalendarCheck, ClipboardList, Info, Trophy, Users } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

export type ObjectiveTab = 'events' | 'activities' | 'team' | 'results' | 'about';

const TAB_META: Record<ObjectiveTab, { icon: typeof Info; labelKey: TranslationKey }> = {
  events: { icon: CalendarCheck, labelKey: 'objectiveTabs.events' },
  activities: { icon: ClipboardList, labelKey: 'objectiveTabs.activities' },
  team: { icon: Users, labelKey: 'objectiveTabs.team' },
  results: { icon: Trophy, labelKey: 'objectiveTabs.results' },
  about: { icon: Info, labelKey: 'objectiveTabs.about' },
};

interface Props {
  idPrefix: string;
  tabs: ObjectiveTab[];
  active: ObjectiveTab;
  onChange: (tab: ObjectiveTab) => void;
  /** Optional number shown next to a tab's label, such as the number of events. */
  counts?: Partial<Record<ObjectiveTab, number>>;
}

/** The tabs of an Objective in the Co-Creation Hub; each role sees the tabs that matter to it. */
export default function ObjectiveTabs({ idPrefix, tabs, active, onChange, counts = {} }: Props) {
  const { t } = useI18n();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  // Arrow keys move between tabs, as the ARIA tabs pattern expects.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    onChange(tabs[next]);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" className="mt-6 flex flex-wrap gap-x-1 border-b border-[#e3e3e6]">
      {tabs.map((id, index) => {
        const { icon: Icon, labelKey } = TAB_META[id];
        const selected = active === id;
        const count = counts[id];
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
            className={`-mb-px inline-flex min-h-14 flex-none cursor-pointer items-center gap-2 border-b-[3px] px-3 text-[16px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#ca7428] sm:px-5 ${selected ? 'border-[#ca7428] text-[#a85f20]' : 'border-transparent text-[#333] hover:text-[#a85f20]'}`}
          >
            <Icon size={19} aria-hidden="true" />{t(labelKey)}
            {count != null && <span className={`rounded-full px-2 py-0.5 text-[12px] ${selected ? 'bg-[#fff0e1] text-[#8a4b16]' : 'bg-[#eef0f3] text-[#444]'}`}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
