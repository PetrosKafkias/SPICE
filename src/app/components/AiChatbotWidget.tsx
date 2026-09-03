import { useEffect, useRef, useState, type ElementType } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Home,
  Mail,
  Maximize2,
  MessageSquare,
  Mic,
  Paperclip,
  Search,
  Send,
  Smile,
  X,
} from 'lucide-react';
import spiceLogo from '../../imports/AiChatbot/411ddb08eac6c477eae07f10bb3f68053986608c.png';
import communityImg from '../../imports/AiChatbot/bf12a0be312c383c6259b344bc7d9c1812490034.png';
import { authRoute } from '../lib/authRedirect';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

type Screen = 'home' | 'history' | 'chat-login' | 'chat' | 'help' | 'collection' | 'article';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  time: string;
}

const QUICK_QUESTIONS: TranslationKey[] = ['chatbot.quick.process', 'chatbot.quick.feedback', 'chatbot.quick.afterContribution', 'chatbot.quick.vote'];

const COLLECTIONS = [
  {
    id: 'getting-started',
    title: 'chatbot.collection.start.title' as TranslationKey,
    desc: 'chatbot.collection.start.text' as TranslationKey,
    count: 3,
  },
  {
    id: 'toolkit',
    title: 'chatbot.collection.toolkit.title' as TranslationKey,
    desc: 'chatbot.collection.toolkit.text' as TranslationKey,
    count: 24,
  },
  {
    id: 'troubleshooting',
    title: 'chatbot.collection.trouble.title' as TranslationKey,
    desc: 'chatbot.collection.trouble.text' as TranslationKey,
    count: 10,
  },
  {
    id: 'pilots',
    title: 'chatbot.collection.pilots.title' as TranslationKey,
    desc: 'chatbot.collection.pilots.text' as TranslationKey,
    count: 5,
  },
];

const ARTICLES: TranslationKey[] = ['chatbot.article.what', 'chatbot.article.participate', 'chatbot.article.after'];

const ARTICLE_BODY = [
  {
    title: 'chatbot.article.section1.title' as TranslationKey,
    text: 'chatbot.article.section1.text' as TranslationKey,
  },
  {
    title: 'chatbot.article.section2.title' as TranslationKey,
    text: 'chatbot.article.section2.text' as TranslationKey,
  },
  {
    title: 'chatbot.article.section3.title' as TranslationKey,
    text: 'chatbot.article.section3.text' as TranslationKey,
  },
  {
    title: 'chatbot.article.section4.title' as TranslationKey,
    text: 'chatbot.article.section4.text' as TranslationKey,
  },
  {
    title: 'chatbot.article.section5.title' as TranslationKey,
    text: 'chatbot.article.section5.text' as TranslationKey,
  },
  {
    title: 'chatbot.article.section6.title' as TranslationKey,
    text: 'chatbot.article.section6.text' as TranslationKey,
  },
];

function BotBadge({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-full border border-[#ca7428] bg-[rgba(246,139,44,0.18)] text-[#ca7428]"
      style={{ width: size, height: size }}
    >
      <Bot size={Math.round(size * 0.55)} />
    </span>
  );
}

function HeaderShell({ title, subtitle, onBack, onClose }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex h-[58px] flex-shrink-0 items-center gap-3 border-b border-[#e7e7e7] bg-white px-4">
      {onBack && (
        <button onClick={onBack} title={t('chatbot.back')} aria-label={t('chatbot.back')} className="text-[#444] hover:opacity-70">
          <ChevronLeft size={20} />
        </button>
      )}
      {title === 'SPICEBOT' && <BotBadge size={32} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold uppercase text-[#444]">{title}</p>
        {subtitle && <p className="truncate text-[10px] font-medium text-[#777]">{subtitle}</p>}
      </div>
      <button onClick={onClose} title={t('chatbot.minimise')} aria-label={t('chatbot.minimise')} className="text-[#444] hover:opacity-70">
        <X size={18} />
      </button>
    </div>
  );
}

function TabBar({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const { t } = useI18n();
  const tabs: { id: Screen; label: TranslationKey; icon: ElementType }[] = [
    { id: 'home', label: 'chatbot.home', icon: Home },
    { id: 'history', label: 'chatbot.history', icon: MessageSquare },
    { id: 'help', label: 'chatbot.help', icon: CircleHelp },
  ];
  const active = screen === 'collection' || screen === 'article' ? 'help' : screen === 'chat-login' || screen === 'chat' ? 'history' : screen;

  return (
    <div className="flex h-[54px] flex-shrink-0 items-center border-t border-[#e7e7e7] bg-white px-4 shadow-[0_-10px_24px_rgba(0,0,0,0.06)]">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} onClick={() => setScreen(id)} className="flex flex-1 flex-col items-center justify-center gap-1">
          <Icon size={16} className={active === id ? 'text-[#ca7428]' : 'text-[#444]'} />
          <span className={`text-[10px] font-bold ${active === id ? 'text-[#ca7428]' : 'text-[#444]'}`}>{t(label)}</span>
        </button>
      ))}
    </div>
  );
}

function HomeScreen({ setScreen, onQuestion, onClose }: {
  setScreen: (screen: Screen) => void;
  onQuestion: (question: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const filtered = QUICK_QUESTIONS.filter((question) => t(question).toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  return (
    <div className="flex-1 overflow-y-auto bg-[#fac594] px-5 py-5">
      <div className="mb-5 flex items-center justify-between">
        <img src={spiceLogo} alt="SPICE" className="h-10 w-auto object-contain" />
        <button onClick={onClose} title={t('chatbot.minimise')} aria-label={t('chatbot.minimise')} className="text-[#444] hover:opacity-70">
          <X size={18} />
        </button>
      </div>

      <h2 className="text-[15px] font-bold text-[#444]">{t('chatbot.hello')}</h2>
      <p className="mt-2 text-[11px] font-medium text-[#555]">{t('chatbot.welcome')}</p>

      <button
        onClick={() => { onClose(); navigate(authRoute('signin', `${location.pathname}${location.search}${location.hash}`)); }}
        className="mt-3 flex w-full items-center gap-2 border border-[#444] bg-white px-3 py-2 text-left text-[10px] font-medium text-[#444]"
      >
        <span className="flex-1">{t('chatbot.loginMemory')}</span>
        <ExternalLink size={14} />
      </button>

      <button
        onClick={() => setScreen('chat-login')}
        className="mt-2 flex w-full items-center gap-3 border border-[#444] bg-white px-3 py-2 text-left"
      >
        <div className="flex-1">
          <p className="text-[12px] font-bold text-[#444]">{t('chatbot.askQuestion')}</p>
          <p className="text-[10px] font-medium text-[#777]">{t('chatbot.agentHelp')}</p>
        </div>
        <BotBadge size={34} />
      </button>

      <div className="mt-3 overflow-hidden border border-[#444] bg-white">
        <div className="flex items-center gap-2 bg-[#e9e9e9] px-3 py-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('chatbot.searchHelp')}
            className="min-w-0 flex-1 bg-transparent text-[11px] text-[#444] outline-none placeholder:text-[#888]"
          />
          <Search size={14} className="text-[#444]" />
        </div>
        {filtered.map((question, index) => (
          <button
            key={question}
            onClick={() => onQuestion(t(question))}
            className="flex w-full items-center gap-2 border-t border-[#ececec] px-3 py-2 text-left"
            style={{ backgroundColor: index === 0 ? '#fde8d5' : 'white' }}
          >
            <span className="flex-1 text-[10px] font-medium text-[#444]">{t(question)}</span>
            <ChevronRight size={13} />
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-hidden border border-[#444] bg-white">
        <img src={communityImg} alt={t('chatbot.community')} className="h-[120px] w-full object-cover" />
        <div className="p-3">
          <p className="text-[12px] font-bold text-[#444]">{t('chatbot.community')}</p>
          <p className="mt-1 text-[10px] font-medium leading-tight text-[#444]">
            {t('chatbot.communityText')}
          </p>
        </div>
      </div>
    </div>
  );
}

function HistoryScreen({ setScreen, onClose }: { setScreen: (screen: Screen) => void; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col bg-white">
      <HeaderShell title={t('chatbot.historyTitle')} onClose={onClose} />
      <div className="flex flex-1 flex-col items-start justify-center px-6">
        <MessageSquare size={34} className="mb-4 text-[#ca7428]" />
        <p className="text-[15px] font-bold text-[#444]">{t('chatbot.noHistory')}</p>
        <p className="mt-2 text-[11px] font-medium text-[#777]">{t('chatbot.noHistoryText')}</p>
      </div>
      <div className="p-4">
        <button
          onClick={() => setScreen('chat-login')}
          className="flex w-full items-center justify-center gap-2 bg-[#f68b2c] px-3 py-3 text-[12px] font-bold text-white"
        >
          {t('chatbot.begin')} <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function MessageList({ messages, isTyping }: { messages: Message[]; isTyping?: boolean }) {
  const { t } = useI18n();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      {messages.map((message) => (
        <div key={message.id} className={`mb-4 flex flex-col ${message.from === 'user' ? 'items-end' : 'items-start'}`}>
          <div
            className={`max-w-[82%] whitespace-pre-line px-4 py-3 text-[11px] font-medium leading-snug ${
              message.from === 'user' ? 'bg-[#f68b2c] text-white' : 'bg-[#e9e9e9] text-black'
            }`}
          >
            {message.text}
          </div>
          {message.from === 'bot' && <p className="mt-2 text-[9px] font-medium text-[#444]">{t('chatbot.agentLabel', { time: message.time })}</p>}
        </div>
      ))}
      {isTyping && (
        <div className="mb-4 flex flex-col items-start" role="status" aria-live="polite">
          <span className="sr-only">{t('chatbot.typing')}</span>
          <div className="flex items-center gap-1.5 bg-[#e9e9e9] px-4 py-3" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#777] motion-reduce:animate-none" style={{ animationDelay: `${dot * 120}ms` }} />
            ))}
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function ChatComposer({ withEmail, onSend }: { withEmail?: boolean; onSend: (text: string) => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submit = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage('');
  };

  return (
    <div className="p-4">
      <div className="border border-[#444] bg-white px-3 py-3">
        {withEmail && (
          <div className="mb-3 flex items-center gap-2 border-b border-[#b2b2b8] pb-2">
            <Mail size={14} className="text-[#444]" />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('chatbot.emailPlaceholder')}
              className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-[#444] outline-none placeholder:text-[#777]"
            />
          </div>
        )}
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
          placeholder={t('chatbot.messagePlaceholder')}
          className="w-full bg-transparent text-[11px] font-medium text-[#444] outline-none placeholder:text-[#777]"
        />
        <div className="mt-4 flex items-center gap-3">
          {!withEmail && (
            <>
              <Paperclip size={15} className="text-[#444]" />
              <Smile size={15} className="text-[#444]" />
              <Mic size={15} className="text-[#444]" />
            </>
          )}
          <button
            onClick={submit}
            disabled={!message.trim()}
            className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-[#ca7428] text-white disabled:opacity-40"
            title={t('chatbot.send')}
            aria-label={t('chatbot.send')}
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatScreen({ screen, messages, isTyping, onSend, setScreen, onClose }: {
  screen: 'chat-login' | 'chat';
  messages: Message[];
  isTyping?: boolean;
  onSend: (text: string) => void;
  setScreen: (screen: Screen) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col bg-white">
      <HeaderShell title="SPICEBOT" subtitle={t('chatbot.subtitle')} onBack={() => setScreen('home')} onClose={onClose} />
      <MessageList messages={messages} isTyping={isTyping} />
      <ChatComposer withEmail={screen === 'chat-login'} onSend={onSend} />
    </div>
  );
}

function HelpScreen({ setScreen, onClose }: { setScreen: (screen: Screen) => void; onClose: () => void }) {
  const { t, tp } = useI18n();
  const [query, setQuery] = useState('');
  const filtered = COLLECTIONS.filter((item) => t(item.title).toLocaleLowerCase().includes(query.toLocaleLowerCase()) || t(item.desc).toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  return (
    <div className="flex flex-1 flex-col bg-white">
      <HeaderShell title={t('chatbot.help')} onClose={onClose} />
      <div className="border-b border-[#e7e7e7] p-4">
        <div className="flex items-center gap-2 bg-[#e9e9e9] px-3 py-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('chatbot.searchHelp')}
            className="min-w-0 flex-1 bg-transparent text-[10px] font-medium text-[#444] outline-none placeholder:text-[#777]"
          />
          <Search size={14} />
        </div>
      </div>
      <div className="border-b border-[#e7e7e7] px-5 py-4 text-[13px] font-bold text-[#444]">{tp(COLLECTIONS.length, { one: 'chatbot.collections.one', few: 'chatbot.collections.few', many: 'chatbot.collections.many', other: 'chatbot.collections.other' })}</div>
      <div className="overflow-y-auto">
        {filtered.map((collection) => (
          <button
            key={collection.id}
            onClick={() => setScreen('collection')}
            className="flex w-full items-center gap-3 border-b border-[#e7e7e7] px-5 py-4 text-left hover:bg-[#fafafa]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-[#444]">{t(collection.title)}</p>
              <p className="mt-2 text-[10px] font-medium leading-tight text-[#666]">{t(collection.desc)}</p>
              <p className="mt-2 text-[9px] font-medium text-[#777]">{tp(collection.count, { one: 'chatbot.articles.one', few: 'chatbot.articles.few', many: 'chatbot.articles.many', other: 'chatbot.articles.other' })}</p>
            </div>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

function CollectionScreen({ setScreen, onClose }: { setScreen: (screen: Screen) => void; onClose: () => void }) {
  const { t, tp } = useI18n();
  return (
    <div className="flex flex-1 flex-col bg-white">
      <HeaderShell title={t('chatbot.help')} onClose={onClose} />
      <div className="border-b border-[#e7e7e7] p-4">
        <div className="flex items-center gap-2 bg-[#e9e9e9] px-3 py-2">
          <input placeholder={t('chatbot.searchHelp')} className="min-w-0 flex-1 bg-transparent text-[10px] font-medium outline-none placeholder:text-[#777]" />
          <Search size={14} />
        </div>
      </div>
      <button onClick={() => setScreen('help')} className="border-b border-[#e7e7e7] px-5 py-5 text-left hover:bg-[#fafafa]">
        <p className="text-[16px] font-bold text-[#444]">{t('chatbot.collection.start.title')}</p>
        <p className="mt-2 text-[10px] font-medium leading-tight text-[#666]">
          {t('chatbot.collection.start.text')}
        </p>
        <p className="mt-2 text-[9px] text-[#777]">{tp(3, { one: 'chatbot.articles.one', few: 'chatbot.articles.few', many: 'chatbot.articles.many', other: 'chatbot.articles.other' })}</p>
      </button>
      {ARTICLES.map((article) => (
        <button
          key={article}
          onClick={() => setScreen(article === 'chatbot.article.what' ? 'article' : 'chat')}
          className="flex w-full items-center gap-3 border-b border-[#e7e7e7] px-5 py-5 text-left hover:bg-[#fafafa]"
        >
          <span className="flex-1 text-[15px] font-bold text-[#444]">{t(article)}</span>
          <ChevronRight size={16} />
        </button>
      ))}
    </div>
  );
}

function ArticleScreen({ setScreen, onClose, expanded, onToggleExpand }: {
  setScreen: (screen: Screen) => void;
  onClose: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { t, formatDate } = useI18n();
  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="flex h-[54px] flex-shrink-0 items-center gap-4 border-b border-[#e7e7e7] px-4">
        <button onClick={() => setScreen('collection')} className="text-[#444] hover:opacity-70" title={t('chatbot.article.backHelp')} aria-label={t('chatbot.article.backHelp')}>
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-[#444]">{t('chatbot.article.what')}</p>
          <p className="text-[10px] font-medium text-[#777]">{t('chatbot.articleLabel')}</p>
        </div>
        <button onClick={onToggleExpand} title={expanded ? t('chatbot.article.shrink') : t('chatbot.article.expand')} className="text-[#444] hover:opacity-70">
          <Maximize2 size={16} />
        </button>
        <button onClick={onClose} title={t('chatbot.minimise')} aria-label={t('chatbot.minimise')} className="text-[#444] hover:opacity-70">
          <X size={18} />
        </button>
      </div>
      <div className={`flex-1 overflow-y-auto px-5 py-6 ${expanded ? 'md:px-10 md:py-8' : ''}`}>
        <h2 className="text-[16px] font-bold text-[#444]">{t('chatbot.article.what')}</h2>
        <div className="mt-3 flex items-center gap-3">
          <BotBadge size={32} />
          <div>
            <p className="text-[10px] font-bold text-[#444]">{t('chatbot.article.author')}</p>
            <p className="text-[9px] font-medium text-[#777]">{formatDate('2026-06-17', { dateStyle: 'long' })}</p>
          </div>
        </div>
        <div className="mt-7 space-y-6">
          {ARTICLE_BODY.map((section) => (
            <section key={section.title}>
              <h3 className="text-[15px] font-bold text-[#444]">{t(section.title)}</h3>
              <p className={`${expanded ? 'text-[14px]' : 'text-[11px]'} mt-3 font-medium leading-relaxed text-[#555]`}>{t(section.text)}</p>
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => setScreen('chat')}
            className="bg-[#f68b2c] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#e07a20]"
          >
            {t('chatbot.article.return')}
          </button>
          <button
            onClick={() => setScreen('collection')}
            className="border border-[#444] bg-white px-4 py-2.5 text-[12px] font-bold text-[#444] hover:bg-[#f7f7f7]"
          >
            {t('chatbot.article.back')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AiChatbotWidget({ onClose, docked = false }: { onClose: () => void; docked?: boolean }) {
  const { t, formatDate } = useI18n();
  const [screen, setScreen] = useState<Screen>('home');
  const [articleExpanded, setArticleExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'bot', text: t('chatbot.intro'), time: t('chatbot.justNow') },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setMessages((current) => current.map((message) => message.id === 1 && message.from === 'bot'
      ? { ...message, text: t('chatbot.intro'), time: t('chatbot.justNow') }
      : message));
  }, [t]);

  const setScreenSafe = (nextScreen: Screen) => {
    if (nextScreen !== 'article') setArticleExpanded(false);
    setScreen(nextScreen);
  };

  const sendMessage = (text: string) => {
    const now = formatDate(new Date(), { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: Date.now(), from: 'user', text, time: now }]);
    setScreenSafe('chat');
    setIsTyping(true);
    window.setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: 'bot',
          text: t('chatbot.reply'),
          time: t('chatbot.justNow'),
        },
      ]);
    }, 450);
  };

  const askQuickQuestion = (question: string) => {
    setScreenSafe('chat');
    window.setTimeout(() => sendMessage(question), 100);
  };

  return (
    <div
      className={`fixed z-[70] flex flex-col overflow-hidden bg-white shadow-[0_8px_40px_rgba(0,0,0,0.28)] transition-[width,height,opacity,transform] duration-250 motion-reduce:transition-none ${
        docked
          ? 'bottom-[104px] right-3 sm:right-6 max-h-[calc(100dvh-8rem)] max-sm:bottom-[92px] max-sm:right-3 max-sm:w-[calc(100vw-24px)]'
          : 'bottom-6 right-6'
      }`}
      style={{
        width: articleExpanded && screen === 'article' ? 'min(760px, calc(100vw - 32px))' : 'min(360px, calc(100vw - 32px))',
        height: articleExpanded && screen === 'article' ? 'min(860px, calc(100vh - 32px))' : 'min(680px, calc(100vh - 32px))',
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <div className="h-1 flex-shrink-0 bg-[#ca7428]" />
      {screen === 'home' && <HomeScreen setScreen={setScreenSafe} onQuestion={askQuickQuestion} onClose={onClose} />}
      {screen === 'history' && <HistoryScreen setScreen={setScreenSafe} onClose={onClose} />}
      {(screen === 'chat-login' || screen === 'chat') && (
        <ChatScreen screen={screen} messages={messages} isTyping={isTyping} onSend={sendMessage} setScreen={setScreenSafe} onClose={onClose} />
      )}
      {screen === 'help' && <HelpScreen setScreen={setScreenSafe} onClose={onClose} />}
      {screen === 'collection' && <CollectionScreen setScreen={setScreenSafe} onClose={onClose} />}
      {screen === 'article' && (
        <ArticleScreen
          setScreen={setScreenSafe}
          onClose={onClose}
          expanded={articleExpanded}
          onToggleExpand={() => setArticleExpanded((value) => !value)}
        />
      )}
      <TabBar screen={screen} setScreen={setScreenSafe} />
    </div>
  );
}
