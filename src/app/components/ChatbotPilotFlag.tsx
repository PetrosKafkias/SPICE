import type { ChatbotPilot } from '../data/chatbotPilots';

/** A small flag so the pilot's country is recognisable at a glance in the AI Chatbot. */
export default function ChatbotPilotFlag({ slug }: { slug: ChatbotPilot['slug'] }) {
  const common = { width: 22, height: 15, 'aria-hidden': true, className: 'flex-none border border-[#d5d6da]' } as const;
  if (slug === 'thessaloniki') {
    return (
      <svg viewBox="0 0 27 18" {...common}>
        {Array.from({ length: 9 }, (_, index) => <rect key={index} y={index * 2} width="27" height="2" fill={index % 2 ? '#fff' : '#0D5EAF'} />)}
        <rect width="10" height="10" fill="#0D5EAF" /><rect x="4" width="2" height="10" fill="#fff" /><rect y="4" width="10" height="2" fill="#fff" />
      </svg>
    );
  }
  if (slug === 'bielsko-biala') return <svg viewBox="0 0 16 10" {...common}><rect width="16" height="5" fill="#fff" /><rect y="5" width="16" height="5" fill="#DC143C" /></svg>;
  if (slug === 'cuba') return <svg viewBox="0 0 15 10" {...common}><rect width="6" height="10" fill="#046A38" /><rect x="6" width="9" height="10" fill="#DA291C" /></svg>;
  return <svg viewBox="0 0 18 11" {...common}><rect width="18" height="11" fill="#fff" /><rect x="5" width="3" height="11" fill="#002F6C" /><rect y="4" width="18" height="3" fill="#002F6C" /></svg>;
}
