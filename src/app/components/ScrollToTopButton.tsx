import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="Scroll to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#ca7428] ring-2 ring-white flex items-center justify-center shadow-[0_4px_24px_rgba(202,116,40,0.5)] hover:bg-[#b86620] transition-all duration-300 ease-out ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0 pointer-events-none'
      }`}
    >
      <ArrowUp size={24} className="text-white" />
    </button>
  );
}
