import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Option { value: string; label: string }

export default function FormDropdown({ id, value, options, placeholder, icon, invalid, required, onChange }: {
  id: string; value: string; options: Option[]; placeholder: string; icon: ReactNode;
  invalid?: boolean; required?: boolean; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, []);

  return <div ref={ref} className={`relative ${open ? 'z-[80]' : 'z-0'}`}>
    <button id={id} type="button" onClick={() => setOpen((current) => !current)}
      className={`flex min-h-[52px] w-full cursor-pointer items-center gap-3 border-2 px-4 text-left text-[15px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] ${invalid ? 'border-red-600' : open ? 'border-[#ca7428]' : 'border-[#bfc0c5] hover:border-[#ca7428]'}`}
      aria-haspopup="menu" aria-expanded={open} aria-invalid={invalid} aria-required={required}>
      <span className="text-[#444]">{icon}</span><span className={`min-w-0 flex-1 truncate ${selected ? 'text-black' : 'text-[#777]'}`}>{selected?.label || placeholder}</span>
      <ChevronDown size={20} className={`transition-transform ${open ? 'rotate-180 text-[#ca7428]' : ''}`} />
    </button>
    {open && <div className="spice-nav-dropdown !left-0 !right-0 !z-[90] !min-w-full" role="menu">
      {options.map((option) => <button type="button" key={option.value} role="menuitemradio" aria-checked={option.value === value}
        onClick={() => { onChange(option.value); setOpen(false); }} className={`spice-nav-dropdown-option !flex !w-full !items-center !justify-between !gap-4 ${option.value === value ? 'is-current' : ''}`}>
        <span className="min-w-0 flex-1 text-left">{option.label}</span>
        {option.value === value && <Check size={17} className="ml-auto flex-none" />}
      </button>)}
    </div>}
  </div>;
}
