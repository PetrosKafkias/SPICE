import { useEffect, useRef, useState } from 'react';
import { ArrowUp, BookOpen, Bot, BrainCircuit, ChevronDown, FileText, Info, Lightbulb, MapPinned, Quote } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { ApiError, apiRequest, jsonBody } from '../lib/api';
import { readStoredPilot, storeActivePilot } from '../lib/activePilot';
import { CHATBOT_PILOTS, type ChatbotPilot } from '../data/chatbotPilots';
import type { TranslationKey } from '../i18n/translations';

type Mode = 'exploratory' | 'factual';
type Tone = 'professional' | 'friendly' | 'simple';
type Panel = 'sources' | 'excerpts' | 'reasoning';

interface ChatbotAnswer {
  answer: string;
  sources: Array<{ title: string; url: string | null }>;
  excerpts: Array<{ source: string | null; text: string }>;
  reasoning: string;
}

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  createdAt: Date;
  /** Present on answers: what the answer is based on. */
  details?: Omit<ChatbotAnswer, 'answer'>;
}

const MODES: Array<{ value: Mode; labelKey: TranslationKey; icon: typeof FileText }> = [
  { value: 'exploratory', labelKey: 'guide.mode.exploratory', icon: BookOpen },
  { value: 'factual', labelKey: 'guide.mode.factual', icon: FileText },
];

const TONES: Array<{ value: Tone; labelKey: TranslationKey }> = [
  { value: 'professional', labelKey: 'guide.tone.professional' },
  { value: 'friendly', labelKey: 'guide.tone.friendly' },
  { value: 'simple', labelKey: 'guide.tone.simple' },
];

const PANELS: Array<{ value: Panel; labelKey: TranslationKey; icon: typeof FileText }> = [
  { value: 'sources', labelKey: 'guide.sources', icon: FileText },
  { value: 'excerpts', labelKey: 'guide.excerpts', icon: Quote },
  { value: 'reasoning', labelKey: 'guide.reasoning', icon: BrainCircuit },
];

const KNOWLEDGE_SOURCES = [
  { icon: FileText, titleKey: 'guide.source.toolkit', descKey: 'guide.source.toolkitText' },
  { icon: BookOpen, titleKey: 'guide.source.context', descKey: 'guide.source.contextText' },
  { icon: Lightbulb, titleKey: 'guide.source.ai', descKey: 'guide.source.aiText' },
] satisfies Array<{ icon: typeof FileText; titleKey: TranslationKey; descKey: TranslationKey }>;

/** A small flag so the pilot's country is recognisable at a glance. */
function PilotFlag({ slug }: { slug: ChatbotPilot['slug'] }) {
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

function initialPilot(pilotSite: string | null | undefined): ChatbotPilot['slug'] {
  const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/gi, 'l').toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '');
  const stored = readStoredPilot();
  const own = pilotSite ? plain(pilotSite) : null;
  return CHATBOT_PILOTS.find((pilot) => pilot.slug === stored)?.slug
    || CHATBOT_PILOTS.find((pilot) => own && (pilot.slug === own || own.startsWith(pilot.slug)))?.slug
    || 'thessaloniki';
}

export default function CoCreationGuidePage() {
  const { t, formatDate, language } = useI18n();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('exploratory');
  const [tone, setTone] = useState<Tone>('professional');
  const [pilotSlug, setPilotSlug] = useState<ChatbotPilot['slug']>(() => initialPilot(user?.pilotSite));
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [messages, setMessages] = useState<Message[]>(() => [{ id: 1, from: 'bot', text: '', createdAt: new Date() }]);
  const [openPanels, setOpenPanels] = useState<Record<number, Panel | undefined>>({});
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pilot = CHATBOT_PILOTS.find((item) => item.slug === pilotSlug) || CHATBOT_PILOTS[0];

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const choosePilot = (slug: ChatbotPilot['slug']) => {
    setPilotSlug(slug);
    storeActivePilot(slug);
  };

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || isTyping) return;
    setMessages((prev) => [...prev, { id: Date.now(), from: 'user', text: question, createdAt: new Date() }]);
    setInput('');
    setIsTyping(true);
    let reply: Message;
    try {
      const answer = await apiRequest<ChatbotAnswer>('/api/chatbot/ask', {
        method: 'POST',
        body: jsonBody({ question, pilot: pilot.slug, tone, mode, language }),
      });
      reply = { id: Date.now() + 1, from: 'bot', text: answer.answer, createdAt: new Date(), details: answer };
    } catch (caught) {
      // Without a connected knowledge base the page says so plainly instead of inventing an answer.
      const notConnected = caught instanceof ApiError && caught.code === 'CHATBOT_NOT_CONNECTED';
      reply = notConnected
        ? {
            id: Date.now() + 1,
            from: 'bot',
            text: t('guide.demoAnswer', { pilot: pilot.name }),
            createdAt: new Date(),
            details: {
              sources: [],
              excerpts: [],
              reasoning: t('guide.demoReasoning', {
                pilot: pilot.name,
                mode: t(MODES.find((item) => item.value === mode)?.labelKey || 'guide.mode.exploratory'),
                tone: t(TONES.find((item) => item.value === tone)?.labelKey || 'guide.tone.professional'),
              }),
            },
          }
        : { id: Date.now() + 1, from: 'bot', text: t('guide.unavailable'), createdAt: new Date() };
    }
    setMessages((prev) => [...prev, reply]);
    setIsTyping(false);
  };

  const togglePanel = (messageId: number, panel: Panel) => {
    setOpenPanels((current) => ({ ...current, [messageId]: current[messageId] === panel ? undefined : panel }));
  };

  const renderPanel = (message: Message, panel: Panel) => {
    const details = message.details;
    if (!details) return null;
    if (panel === 'sources') {
      return details.sources.length ? (
        <ul className="flex flex-col gap-2">
          {details.sources.map((source) => (
            <li key={source.title} className="flex items-start gap-2 text-[13px] text-[#444]">
              <FileText size={14} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
              {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-[#a85f20] underline">{source.title}</a> : <span className="font-semibold">{source.title}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="text-[13px] text-[#666]">{t('guide.noSources')}</p>;
    }
    if (panel === 'excerpts') {
      return details.excerpts.length ? (
        <ul className="flex flex-col gap-3">
          {details.excerpts.map((excerpt, index) => (
            <li key={`${excerpt.source}-${index}`} className="border-l-4 border-[#f0c49a] bg-white px-3 py-2">
              <p className="text-[13px] italic leading-relaxed text-[#444]">“{excerpt.text}”</p>
              {excerpt.source && <p className="mt-1 text-[11px] font-semibold text-[#888]">{excerpt.source}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="text-[13px] text-[#666]">{t('guide.noExcerpts')}</p>;
    }
    return details.reasoning
      ? <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#444]">{details.reasoning}</p>
      : <p className="text-[13px] text-[#666]">{t('guide.noReasoning')}</p>;
  };

  return (
    <SpicePublicShell variant="public">
      <div className="spice-page spice-wide-page flex flex-col gap-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 flex-none place-items-center rounded-full bg-[rgba(246,139,44,0.15)]">
            <Bot size={26} className="text-[#ca7428]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold text-[#444]">{t('nav.aiChatbot')}</h1>
            <p className="text-[14px] text-[#666]">{t('guide.pageSubtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* Chat */}
          <div className="spice-card flex flex-col overflow-hidden" style={{ minHeight: '620px' }}>
            <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4">
              <div className="flex flex-wrap" role="tablist" aria-label={t('guide.modeLabel')}>
                {MODES.map(({ value, labelKey, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => setMode(value)}
                    className={`-mb-px flex min-h-12 cursor-pointer items-center gap-2 border-b-2 px-4 text-[14px] font-bold tracking-wide transition-colors ${mode === value ? 'border-[#f68b2c] text-[#ca7428]' : 'border-transparent text-[#444] hover:text-[#ca7428]'}`}
                  >
                    <Icon size={16} aria-hidden="true" />{t(labelKey)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setShowModeInfo((value) => !value)} aria-expanded={showModeInfo} aria-label={t('guide.modeInfoLabel')} className="grid h-10 w-10 cursor-pointer place-items-center text-[#666] hover:text-[#ca7428]">
                <Info size={19} aria-hidden="true" />
              </button>
            </div>
            {showModeInfo && <p className="border-b border-[#eee] bg-[#fffaf4] px-6 py-3 text-[13px] leading-relaxed text-[#555]">{t('guide.modeInfo')}</p>}

            <div ref={messagesContainerRef} className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 md:p-8" style={{ maxHeight: '620px' }} aria-live="polite">
              {messages.map((message) => {
                const isBot = message.from === 'bot';
                const openPanel = openPanels[message.id];
                return (
                  <div key={message.id} className={`flex gap-4 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                    {isBot && (
                      <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[rgba(246,139,44,0.15)]">
                        <Bot size={18} className="text-[#ca7428]" aria-hidden="true" />
                      </div>
                    )}
                    <div className={`flex max-w-[85%] flex-col gap-2 ${isBot ? 'items-start' : 'items-end'}`}>
                      <div className={`whitespace-pre-line rounded px-5 py-4 text-[14px] leading-relaxed ${isBot ? 'bg-[#e9e9e9] text-[#444]' : 'bg-[#f68b2c] text-white'}`}>
                        {message.id === 1 ? t('guide.initialMessage') : message.text}
                      </div>
                      <div className={`flex flex-wrap items-center gap-2 ${isBot ? '' : 'justify-end'}`}>
                        <p className="text-[11px] text-[#888]">
                          {isBot ? `SPICEBOT · ${t('guide.agent')}` : t('guide.you')} · {formatDate(message.createdAt, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {message.details?.sources.map((source) => (
                          <span key={source.title} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#ececec] px-3 py-1 text-[12px] text-[#444]">
                            <FileText size={13} className="flex-none" aria-hidden="true" /><span className="truncate">{source.title}</span>
                          </span>
                        ))}
                      </div>
                      {message.details && (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {PANELS.map(({ value, labelKey, icon: Icon }) => {
                              const count = value === 'sources' ? message.details?.sources.length : value === 'excerpts' ? message.details?.excerpts.length : undefined;
                              const active = openPanel === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => togglePanel(message.id, value)}
                                  aria-expanded={active}
                                  aria-controls={`answer-${message.id}-${value}`}
                                  className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 border px-3 text-[12px] font-bold transition-colors ${active ? 'border-[#f68b2c] bg-[#fff3e8] text-[#a85f20]' : 'border-[#d5d6da] bg-white text-[#555] hover:border-[#f68b2c] hover:text-[#a85f20]'}`}
                                >
                                  <Icon size={14} aria-hidden="true" />{t(labelKey)}
                                  {count !== undefined && <span className="rounded-full bg-[#ececec] px-1.5 text-[11px] text-[#555]">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                          {openPanel && (
                            <div id={`answer-${message.id}-${openPanel}`} className="w-full border border-[#eadfd3] bg-[#fffaf4] p-4">
                              {renderPanel(message, openPanel)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex flex-row gap-4" role="status">
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[rgba(246,139,44,0.15)]">
                    <Bot size={18} className="text-[#ca7428]" aria-hidden="true" />
                  </div>
                  <span className="sr-only">{t('guide.typing')}</span>
                  <div className="flex items-center gap-1.5 rounded bg-[#e9e9e9] px-5 py-4" aria-hidden="true">
                    {[0, 1, 2].map((dot) => (
                      <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#999] motion-reduce:animate-none" style={{ animationDelay: `${dot * 120}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-3">
              <button type="button" onClick={() => setShowSuggestions((value) => !value)} aria-expanded={showSuggestions} className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-[13px] font-bold tracking-wide text-[#555] hover:text-[#ca7428]">
                <Lightbulb size={15} aria-hidden="true" />{t('guide.suggestedQuestions', { pilot: pilot.name })}
                <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
              </button>
              {showSuggestions && (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {pilot.questions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendMessage(question)}
                      disabled={isTyping}
                      className="flex cursor-pointer items-start gap-2 border border-[#d5d6da] bg-white px-3 py-2 text-left text-[12px] leading-snug text-[#444] transition-colors hover:border-[#ca7428] hover:bg-[#fdf4ea] disabled:cursor-wait disabled:opacity-60"
                    >
                      <Bot size={13} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />{question}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              className="border-t border-[#eee] px-6 py-4"
              onSubmit={(event) => { event.preventDefault(); void sendMessage(input); }}
            >
              <div className="flex items-center gap-3 border border-[#bfc0c5] bg-white py-2 pl-4 pr-2 focus-within:border-[#ca7428]">
                <label htmlFor="chatbot-question" className="sr-only">{t('guide.inputPlaceholder')}</label>
                <input
                  id="chatbot-question"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={t('guide.inputPlaceholder')}
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-[#444] outline-none placeholder:text-[#999]"
                />
                <button type="submit" disabled={!input.trim() || isTyping} aria-label={t('guide.send')} className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-full bg-[#f68b2c] text-white transition-colors hover:bg-[#df771d] disabled:cursor-not-allowed disabled:opacity-40">
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>

          {/* Settings and knowledge base */}
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-[14px] font-bold text-[#444]">
              {t('guide.pilot')}
              <span className="relative flex items-center">
                <span className="pointer-events-none absolute left-4"><PilotFlag slug={pilot.slug} /></span>
                <select value={pilot.slug} onChange={(event) => choosePilot(event.target.value as ChatbotPilot['slug'])} className="min-h-12 w-full cursor-pointer appearance-none border border-[#bfc0c5] bg-white pl-12 pr-10 text-[15px] font-medium text-[#444] focus:border-[#ca7428] focus:outline-none">
                  {CHATBOT_PILOTS.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                </select>
                <ChevronDown size={17} className="pointer-events-none absolute right-4 text-[#666]" aria-hidden="true" />
              </span>
            </label>
            <label className="flex flex-col gap-2 text-[14px] font-bold text-[#444]">
              {t('guide.tone')}
              <span className="relative flex items-center">
                <select value={tone} onChange={(event) => setTone(event.target.value as Tone)} className="min-h-12 w-full cursor-pointer appearance-none border border-[#bfc0c5] bg-white px-4 pr-10 text-[15px] font-medium text-[#444] focus:border-[#ca7428] focus:outline-none">
                  {TONES.map((item) => <option key={item.value} value={item.value}>{t(item.labelKey)}</option>)}
                </select>
                <ChevronDown size={17} className="pointer-events-none absolute right-4 text-[#666]" aria-hidden="true" />
              </span>
            </label>

            <div className="spice-card flex h-fit flex-col gap-4 p-5">
              <div>
                <p className="text-[17px] font-bold text-[#444]">{t('guide.knowledgeBase')}</p>
                <p className="mt-0.5 text-[13px] text-[#666]">{t('guide.knowledgeBaseText')}</p>
              </div>
              <div className="flex items-start gap-3 border border-[rgba(246,139,44,0.25)] bg-[rgba(246,139,44,0.07)] p-4">
                <MapPinned size={18} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                <div>
                  <p className="text-[13px] font-semibold text-[#444]">{t('guide.source.pilotTitle')}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[#666]">{t('guide.source.pilotDocuments', { pilot: pilot.name })}</p>
                </div>
              </div>
              {KNOWLEDGE_SOURCES.map(({ icon: Icon, titleKey, descKey }) => {
                const isNote = titleKey === 'guide.source.ai';
                return (
                  <div key={titleKey} className={`flex items-start gap-3 p-4 ${isNote ? 'border border-[#eee] bg-[#f9f9f9]' : 'border border-[rgba(246,139,44,0.25)] bg-[rgba(246,139,44,0.07)]'}`}>
                    <Icon size={18} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                    <div>
                      <p className="text-[13px] font-semibold text-[#444]">{t(titleKey)}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[#666]">{t(descKey)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </SpicePublicShell>
  );
}
