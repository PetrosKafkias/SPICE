import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option { value: string; label: string }

export default function FormMultiSelect({ id, values, options, placeholder, summary, icon, invalid, labelledBy, onChange }: {
  id: string; values: string[]; options: Option[]; placeholder: string; summary?: string; icon: ReactNode;
  invalid?: boolean; labelledBy?: string; onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, []);

  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((current) => current !== value) : [...values, value]);
  };

  return <div ref={ref} className={`relative ${open ? 'z-[80]' : 'z-0'}`}>
    <button id={id} type="button" onClick={() => setOpen((current) => !current)}
      className={`flex min-h-[52px] w-full cursor-pointer items-center gap-3 border-2 px-4 text-left text-[15px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] ${invalid ? 'border-red-600' : open ? 'border-[#ca7428]' : 'border-[#bfc0c5] hover:border-[#ca7428]'}`}
      aria-haspopup="menu" aria-expanded={open} aria-invalid={invalid} aria-labelledby={labelledBy}>
      <span className="text-[#444]">{icon}</span><span className={`min-w-0 flex-1 truncate ${values.length ? 'text-black' : 'text-[#777]'}`}>{values.length ? summary : placeholder}</span>
      <ChevronDown size={20} className={`transition-transform ${open ? 'rotate-180 text-[#ca7428]' : ''}`} />
    </button>
    {open && <div className="spice-nav-dropdown !left-0 !right-0 !z-[90] !min-w-full !max-h-80 !overflow-y-auto" role="menu">
      {options.map((option) => {
        const checked = values.includes(option.value);
        return <button type="button" key={option.value} role="menuitemcheckbox" aria-checked={checked}
          onClick={() => toggle(option.value)} className={`spice-nav-dropdown-option !flex !w-full !items-start !gap-3 ${checked ? 'is-current' : ''}`}>
          <span className={`mt-0.5 grid h-5 w-5 flex-none place-items-center border-2 ${checked ? 'border-[#ca7428] bg-[#ca7428] text-white' : 'border-[#bfc0c5]'}`} aria-hidden="true">
            {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
          </span>
          <span className="min-w-0 flex-1 text-left">{option.label}</span>
        </button>;
      })}
    </div>}
  </div>;
}
