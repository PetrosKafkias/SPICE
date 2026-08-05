import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import imgSpiceLogo from '../../imports/Homepage/c6afc9a985ecd519e1c55936ffc0b9788fea1d45.png';

interface DropdownItem {
  label: string;
  to: string;
}

interface NavItem {
  label: string;
  items: DropdownItem[];
}

const NAV: NavItem[] = [
  {
    label: 'Co-Creation',
    items: [
      { label: 'Overview', to: '/overview' },
      { label: 'Process Guide', to: '/co-creation-guide' },
      { label: 'Activities', to: '/explore-toolkit' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'CitiVoice App', to: '/citivoice-app' },
      { label: '3D Scene Editor', to: '/3d-scene-editor' },
      { label: 'AI Chatbot', to: '/co-creation-guide' },
      { label: 'Forum & Voting', to: '/forum-voting' },
    ],
  },
  {
    label: 'Impact',
    items: [
      { label: 'My Contributions', to: '/account' },
      { label: 'Insights & Results', to: '/insights' },
      { label: 'Repository', to: '/repository-public' },
    ],
  },
];

function CaretDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 14.5L5.5 8H18.5L12 14.5Z"
        fill="#444444"
      />
    </svg>
  );
}

function DropdownMenu({ items }: { items: DropdownItem[] }) {
  return (
    <div className="absolute top-full left-0 mt-1 bg-white border border-[rgba(68,68,68,0.2)] shadow-lg z-50 min-w-[180px]">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="block px-8 py-4 font-['Montserrat',sans-serif] font-medium text-[16px] text-[#444] hover:bg-[#f5f5f5] hover:text-[#ca7428] transition-colors whitespace-nowrap"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function NavDropdown({ nav }: { nav: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative h-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-3 py-1.5 h-full font-['Montserrat',sans-serif] font-medium text-[16px] text-[#444] hover:text-[#ca7428] transition-colors"
      >
        {nav.label}
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <CaretDown />
        </span>
      </button>
      {open && <DropdownMenu items={nav.items} />}
    </div>
  );
}

export default function SpiceHeader() {
  return (
    <header className="bg-white relative w-full shrink-0" style={{ borderBottom: '1px solid rgba(68,68,68,0.5)' }}>
      <div className="flex items-center justify-between px-12 py-[10px]">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center">
            <div className="relative h-[45px] w-[115px] overflow-hidden">
              <img
                alt="SPICE logo"
                src={imgSpiceLogo}
                className="absolute max-w-none"
                style={{ height: '290%', left: '-24%', top: '-87%', width: '149%' }}
              />
            </div>
          </Link>

          <nav className="flex items-center gap-6 h-[60px]">
            {NAV.map((nav) => (
              <NavDropdown key={nav.label} nav={nav} />
            ))}
          </nav>
        </div>

        {/* Right: language + login + get started */}
        <div className="flex items-center gap-4 h-[60px]">
          {/* Language selector */}
          <button className="flex items-center gap-3 px-3 py-1.5 font-['Montserrat',sans-serif] font-medium text-[16px] text-[#444] hover:text-[#ca7428] transition-colors">
            <svg width="25" height="25" viewBox="0 0 25 25" fill="none">
              <path d="M4 12.5C4 8.36 7.36 5 11.5 5" stroke="#444444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.5 4C16.64 4 20 7.36 20 11.5" stroke="#444444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 12.5C4 16.64 7.36 20 11.5 20" stroke="#444444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.5 20C16.64 20 20 16.64 20 12.5" stroke="#444444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4.5 9.5H20.5M4.5 15.5H20.5M12.5 4C10.5 7.5 9.5 10 9.5 12.5C9.5 15 10.5 17.5 12.5 21M12.5 4C14.5 7.5 15.5 10 15.5 12.5C15.5 15 14.5 17.5 12.5 21" stroke="#444444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            English (EN)
          </button>

          {/* Divider */}
          <div className="w-px h-[30px] bg-[#444]" />

          {/* Log In */}
          <Link
            to="/signin"
            className="px-3 py-1.5 font-['Montserrat',sans-serif] font-medium text-[16px] text-[#444] hover:text-[#ca7428] transition-colors"
          >
            Log In
          </Link>

          {/* Get Started */}
          <Link
            to="/overview"
            className="px-6 py-4 font-['Montserrat',sans-serif] font-medium text-[16px] text-[#444] border-2 border-[#444] hover:border-[#ca7428] hover:text-[#ca7428] transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
