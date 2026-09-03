import { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Mic, BookOpen, FileText, Lightbulb, Bot } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

type Mode = 'guided' | 'exploratory';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text?: string;
  textKey?: TranslationKey;
  values?: Record<string, string | number>;
  createdAt?: Date;
  justNow?: boolean;
}

const MODE_KEYS: Record<Mode, TranslationKey> = {
  guided: 'guide.mode.guided',
  exploratory: 'guide.mode.exploratory',
};

const QUICK_PROMPTS: TranslationKey[] = [
  'guide.prompt.tools',
  'guide.prompt.difference',
  'guide.prompt.summary',
  'guide.prompt.collective',
];

const KNOWLEDGE_SOURCES = [
  { icon: FileText, titleKey: 'guide.source.toolkit', descKey: 'guide.source.toolkitText' },
  { icon: FileText, titleKey: 'guide.source.pilot', descKey: 'guide.source.pilotText' },
  { icon: BookOpen, titleKey: 'guide.source.context', descKey: 'guide.source.contextText' },
  { icon: Lightbulb, titleKey: 'guide.source.ai', descKey: 'guide.source.aiText' },
] satisfies Array<{ icon: typeof FileText; titleKey: TranslationKey; descKey: TranslationKey }>;

export default function CoCreationGuidePage() {
  const { t, formatDate } = useI18n();
  const [mode, setMode] = useState<Mode>('guided');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'bot', textKey: 'guide.initialMessage', justNow: true },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), from: 'user', text, createdAt: new Date() }]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, from: 'bot',
        textKey: 'guide.reply',
        values: { question: text },
        justNow: true,
      }]);
    }, 1000);
  };

  return (
    <SpicePublicShell variant="public">
      <div className="spice-page spice-wide-page flex flex-col gap-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[rgba(246,139,44,0.15)] border border-[#ca7428] flex items-center justify-center">
              <Bot size={24} className="text-[#ca7428]" />
            </div>
            <div>
              <h1 className="text-[24px] font-bold text-[#444]">{t('guide.title')}</h1>
              <p className="text-[14px] text-[#888]">{t('guide.subtitle')}</p>
            </div>
          </div>
          {/* Mode tabs */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {(Object.keys(MODE_KEYS) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold transition-colors"
                style={{
                  backgroundColor: mode === m ? '#fff' : '#f5f5f5',
                  color: mode === m ? '#444' : '#888',
                  borderRight: '1px solid #e5e5e5',
                }}
              >
                {m === 'guided' && <FileText size={15} />}
                {m !== 'guided' && <BookOpen size={15} />}
                {t(MODE_KEYS[m])}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Chat panel */}
          <div className="spice-card flex flex-col overflow-hidden" style={{ minHeight: '560px' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.from === 'bot' && (
                    <div className="w-10 h-10 rounded-full bg-[rgba(246,139,44,0.15)] border border-[#ca7428] flex items-center justify-center flex-shrink-0">
                      <Bot size={18} className="text-[#ca7428]" />
                    </div>
                  )}
                  <div className={`flex flex-col gap-1.5 max-w-[80%] ${msg.from === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className="px-5 py-4 text-[14px] leading-relaxed whitespace-pre-line"
                      style={{
                        backgroundColor: msg.from === 'bot' ? '#e9e9e9' : '#f68b2c',
                        color: msg.from === 'bot' ? '#444' : 'white',
                        borderRadius: '4px',
                      }}
                    >
                      {msg.textKey ? t(msg.textKey, msg.values) : msg.text}
                    </div>
                    <p className="text-[11px] text-[#aaa]">
                      {msg.from === 'bot' ? `SPICEBOT - ${t('guide.agent')}` : t('guide.you')} - {msg.justNow ? t('guide.justNow') : formatDate(msg.createdAt || new Date(), { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex flex-row gap-4" role="status" aria-live="polite">
                  <div className="w-10 h-10 rounded-full bg-[rgba(246,139,44,0.15)] border border-[#ca7428] flex items-center justify-center flex-shrink-0">
                    <Bot size={18} className="text-[#ca7428]" />
                  </div>
                  <span className="sr-only">{t('guide.typing')}</span>
                  <div className="flex items-center gap-1.5 px-5 py-4" style={{ backgroundColor: '#e9e9e9', borderRadius: '4px' }} aria-hidden="true">
                    {[0, 1, 2].map((dot) => (
                      <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#999] motion-reduce:animate-none" style={{ animationDelay: `${dot * 120}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((promptKey) => (
                <button
                  key={promptKey}
                  onClick={() => sendMessage(t(promptKey))}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-[12px] text-[#444] hover:border-[#ca7428] hover:bg-[#fdf4ea] transition-colors text-left"
                >
                  <Bot size={13} className="text-[#ca7428] flex-shrink-0" />
                  {t(promptKey)}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="border border-[#444] flex flex-col gap-3 p-4">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  placeholder={t('guide.inputPlaceholder')}
                  aria-label={t('guide.inputPlaceholder')}
                  className="w-full bg-transparent text-[15px] text-[#444] outline-none placeholder:text-[#aaa]"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button type="button" aria-label={t('guide.attachFile')} className="text-[#888] hover:text-[#444] transition-colors"><Paperclip size={18} /></button>
                    <button type="button" aria-label={t('guide.addEmoji')} className="text-[#888] hover:text-[#444] transition-colors"><Smile size={18} /></button>
                    <button type="button" aria-label={t('guide.voiceInput')} className="text-[#888] hover:text-[#444] transition-colors"><Mic size={18} /></button>
                  </div>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim()}
                    aria-label={t('guide.send')}
                    className="w-9 h-9 bg-[#ca7428] rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-[#b86620] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 rotate-90">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Knowledge base sidebar */}
          <div className="spice-card p-5 flex flex-col gap-4 h-fit">
            <div>
              <p className="text-[16px] font-bold text-[#444]">{t('guide.knowledgeBase')}</p>
              <p className="text-[13px] text-[#888] mt-0.5">{t('guide.knowledgeBaseText')}</p>
            </div>
            {KNOWLEDGE_SOURCES.map(({ icon: Icon, titleKey, descKey }) => (
              <div
                key={titleKey}
                className="flex items-start gap-3 p-4"
                style={{ backgroundColor: titleKey === 'guide.source.ai' ? '#f9f9f9' : 'rgba(246,139,44,0.07)', border: titleKey === 'guide.source.ai' ? '1px solid #eee' : '1px solid rgba(246,139,44,0.2)' }}
              >
                <Icon size={18} className="text-[#ca7428] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-[#444]">{t(titleKey)}</p>
                  <p className="text-[12px] text-[#666] mt-0.5 leading-relaxed">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SpicePublicShell>
  );
}
