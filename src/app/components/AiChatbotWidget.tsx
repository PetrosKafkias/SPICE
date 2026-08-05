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

type Screen = 'home' | 'history' | 'chat-login' | 'chat' | 'help' | 'collection' | 'article';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  time: string;
}

const QUICK_QUESTIONS = [
  'What is the co-creation process',
  'How can I share feedback on a public space',
  'What happens after I submit a contribution',
  'How do I vote on design ideas',
];

const COLLECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    desc: 'Discover the project, explore ways to participate, and understand how your input helps shape better public spaces.',
    count: 3,
  },
  {
    id: 'toolkit',
    title: 'Using the Toolkit',
    desc: 'Practical guides for using the SPICE tools, including CitiVoice, the 3D Scenario Editor, AI guidance, feedback features, and participation activities.',
    count: 24,
  },
  {
    id: 'troubleshooting',
    title: 'Help & Troubleshooting',
    desc: 'Need support? Browse solutions for common issues, technical questions, account access, and guidance on how to complete key tasks.',
    count: 10,
  },
  {
    id: 'pilots',
    title: 'Pilots & Community',
    desc: 'Learn about pilot activities, local participation opportunities, workshops, and how communities and municipalities work together in SPICE.',
    count: 5,
  },
];

const ARTICLES = [
  'What is SPICE Project',
  'How can I participate',
  'What happens after I contribute',
];

const BOT_INTRO =
  "Hi! I'm the SPICE Assistant. I can help you understand the project, explore the toolkit, and find guidance for participating in your local pilot.\n\nI can answer questions about co-creation activities, public space feedback, pilot documents, maps, scenarios, voting, privacy, and next steps.\n\nHave feedback about your experience? You can share it with the SPICE team here";

const ARTICLE_BODY = [
  {
    title: 'What is SPICE?',
    text: 'SPICE stands for Sustainable Public spaces through Inclusive Community Engagement. It is an EU-funded project that supports citizens, communities, planners, municipalities, and project partners in working together to shape better public spaces.',
  },
  {
    title: 'Why was SPICE created?',
    text: 'Public spaces affect everyday life. Parks, streets, squares, waterfronts, walking routes, and community areas influence how people move, meet, feel safe, and belong in a city.',
  },
  {
    title: 'What does the SPICE Digital Toolkit do?',
    text: 'The toolkit brings several tools together in one place. It helps users learn about the co-creation process, share feedback, explore maps, ask questions, vote, and follow project updates.',
  },
  {
    title: 'Who is SPICE for?',
    text: 'SPICE is for anyone involved in improving public spaces, including citizens, local communities, municipalities, researchers, facilitators, and local stakeholders.',
  },
  {
    title: 'How does participation work?',
    text: 'Depending on the pilot, you may comment on a public space, mark issues or ideas on a map, compare design scenarios, vote on proposals, or join workshops.',
  },
  {
    title: 'What can you do next?',
    text: 'Explore your local pilot, learn about the co-creation process, or use the SPICE tools to share your first contribution.',
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
  return (
    <div className="flex h-[58px] flex-shrink-0 items-center gap-3 border-b border-[#e7e7e7] bg-white px-4">
      {onBack && (
        <button onClick={onBack} title="Back" className="text-[#444] hover:opacity-70">
          <ChevronLeft size={20} />
        </button>
      )}
      {title === 'SPICEBOT' && <BotBadge size={32} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold uppercase text-[#444]">{title}</p>
        {subtitle && <p className="truncate text-[10px] font-medium text-[#777]">{subtitle}</p>}
      </div>
      <button onClick={onClose} title="Minimise" className="text-[#444] hover:opacity-70">
        <X size={18} />
      </button>
    </div>
  );
}

function TabBar({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const tabs: { id: Screen; label: string; icon: ElementType }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: MessageSquare },
    { id: 'help', label: 'Help', icon: CircleHelp },
  ];
  const active = screen === 'collection' || screen === 'article' ? 'help' : screen === 'chat-login' || screen === 'chat' ? 'history' : screen;

  return (
    <div className="flex h-[54px] flex-shrink-0 items-center border-t border-[#e7e7e7] bg-white px-4 shadow-[0_-10px_24px_rgba(0,0,0,0.06)]">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} onClick={() => setScreen(id)} className="flex flex-1 flex-col items-center justify-center gap-1">
          <Icon size={16} className={active === id ? 'text-[#ca7428]' : 'text-[#444]'} />
          <span className={`text-[10px] font-bold ${active === id ? 'text-[#ca7428]' : 'text-[#444]'}`}>{label}</span>
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
  const [query, setQuery] = useState('');
  const filtered = QUICK_QUESTIONS.filter((question) => question.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex-1 overflow-y-auto bg-[#fac594] px-5 py-5">
      <div className="mb-5 flex items-center justify-between">
        <img src={spiceLogo} alt="SPICE" className="h-10 w-auto object-contain" />
        <button onClick={onClose} title="Minimise" className="text-[#444] hover:opacity-70">
          <X size={18} />
        </button>
      </div>

      <h2 className="text-[15px] font-bold text-[#444]">Hello there</h2>
      <p className="mt-2 text-[11px] font-medium text-[#555]">How can we help in your co-creation process?</p>

      <button
        onClick={() => { onClose(); navigate(authRoute('signin', `${location.pathname}${location.search}${location.hash}`)); }}
        className="mt-3 flex w-full items-center gap-2 border border-[#444] bg-white px-3 py-2 text-left text-[10px] font-medium text-[#444]"
      >
        <span className="flex-1">Login to SPICE Platform for memory of your questions</span>
        <ExternalLink size={14} />
      </button>

      <button
        onClick={() => setScreen('chat-login')}
        className="mt-2 flex w-full items-center gap-3 border border-[#444] bg-white px-3 py-2 text-left"
      >
        <div className="flex-1">
          <p className="text-[12px] font-bold text-[#444]">Ask a question</p>
          <p className="text-[10px] font-medium text-[#777]">SPICE's AI agent can help you</p>
        </div>
        <BotBadge size={34} />
      </button>

      <div className="mt-3 overflow-hidden border border-[#444] bg-white">
        <div className="flex items-center gap-2 bg-[#e9e9e9] px-3 py-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for help"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-[#444] outline-none placeholder:text-[#888]"
          />
          <Search size={14} className="text-[#444]" />
        </div>
        {filtered.map((question, index) => (
          <button
            key={question}
            onClick={() => onQuestion(question)}
            className="flex w-full items-center gap-2 border-t border-[#ececec] px-3 py-2 text-left"
            style={{ backgroundColor: index === 0 ? '#fde8d5' : 'white' }}
          >
            <span className="flex-1 text-[10px] font-medium text-[#444]">{question}</span>
            <ChevronRight size={13} />
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-hidden border border-[#444] bg-white">
        <img src={communityImg} alt="SPICE Community" className="h-[120px] w-full object-cover" />
        <div className="p-3">
          <p className="text-[12px] font-bold text-[#444]">The SPICE Community</p>
          <p className="mt-1 text-[10px] font-medium leading-tight text-[#444]">
            Be sure to check the SPICE Community for support, tips from SPICE users and much more
          </p>
        </div>
      </div>
    </div>
  );
}

function HistoryScreen({ setScreen, onClose }: { setScreen: (screen: Screen) => void; onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <HeaderShell title="Messages History" onClose={onClose} />
      <div className="flex flex-1 flex-col items-start justify-center px-6">
        <MessageSquare size={34} className="mb-4 text-[#ca7428]" />
        <p className="text-[15px] font-bold text-[#444]">No message history</p>
        <p className="mt-2 text-[11px] font-medium text-[#777]">Messages from the chatbot will be shown here</p>
      </div>
      <div className="p-4">
        <button
          onClick={() => setScreen('chat-login')}
          className="flex w-full items-center justify-center gap-2 bg-[#f68b2c] px-3 py-3 text-[12px] font-bold text-white"
        >
          Begin your conversation here <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function MessageList({ messages }: { messages: Message[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          {message.from === 'bot' && <p className="mt-2 text-[9px] font-medium text-[#444]">SPICEBOT - AI Agent - {message.time}</p>}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

function ChatComposer({ withEmail, onSend }: { withEmail?: boolean; onSend: (text: string) => void }) {
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
              placeholder="email@example.com"
              className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-[#444] outline-none placeholder:text-[#777]"
            />
          </div>
        )}
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
          placeholder="Type your message here..."
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
            title="Send"
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatScreen({ screen, messages, onSend, setScreen, onClose }: {
  screen: 'chat-login' | 'chat';
  messages: Message[];
  onSend: (text: string) => void;
  setScreen: (screen: Screen) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <HeaderShell title="SPICEBOT" subtitle="Ask us anything or share your feedback." onBack={() => setScreen('home')} onClose={onClose} />
      <MessageList messages={messages} />
      <ChatComposer withEmail={screen === 'chat-login'} onSend={onSend} />
    </div>
  );
}

function HelpScreen({ setScreen, onClose }: { setScreen: (screen: Screen) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const filtered = COLLECTIONS.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.desc.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-1 flex-col bg-white">
      <HeaderShell title="Help" onClose={onClose} />
      <div className="border-b border-[#e7e7e7] p-4">
        <div className="flex items-center gap-2 bg-[#e9e9e9] px-3 py-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for help"
            className="min-w-0 flex-1 bg-transparent text-[10px] font-medium text-[#444] outline-none placeholder:text-[#777]"
          />
          <Search size={14} />
        </div>
      </div>
      <div className="border-b border-[#e7e7e7] px-5 py-4 text-[13px] font-bold text-[#444]">9 Collections</div>
      <div className="overflow-y-auto">
        {filtered.map((collection) => (
          <button
            key={collection.id}
            onClick={() => setScreen('collection')}
            className="flex w-full items-center gap-3 border-b border-[#e7e7e7] px-5 py-4 text-left hover:bg-[#fafafa]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-[#444]">{collection.title}</p>
              <p className="mt-2 text-[10px] font-medium leading-tight text-[#666]">{collection.desc}</p>
              <p className="mt-2 text-[9px] font-medium text-[#777]">{collection.count} Articles</p>
            </div>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

function CollectionScreen({ setScreen, onClose }: { setScreen: (screen: Screen) => void; onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <HeaderShell title="Help" onClose={onClose} />
      <div className="border-b border-[#e7e7e7] p-4">
        <div className="flex items-center gap-2 bg-[#e9e9e9] px-3 py-2">
          <input placeholder="Search for help" className="min-w-0 flex-1 bg-transparent text-[10px] font-medium outline-none placeholder:text-[#777]" />
          <Search size={14} />
        </div>
      </div>
      <button onClick={() => setScreen('help')} className="border-b border-[#e7e7e7] px-5 py-5 text-left hover:bg-[#fafafa]">
        <p className="text-[16px] font-bold text-[#444]">Getting Started</p>
        <p className="mt-2 text-[10px] font-medium leading-tight text-[#666]">
          Discover the project, explore ways to participate, and understand how your input helps shape better public spaces.
        </p>
        <p className="mt-2 text-[9px] text-[#777]">3 Articles</p>
      </button>
      {ARTICLES.map((article) => (
        <button
          key={article}
          onClick={() => setScreen(article === 'What is SPICE Project' ? 'article' : 'chat')}
          className="flex w-full items-center gap-3 border-b border-[#e7e7e7] px-5 py-5 text-left hover:bg-[#fafafa]"
        >
          <span className="flex-1 text-[15px] font-bold text-[#444]">{article}</span>
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
  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="flex h-[54px] flex-shrink-0 items-center gap-4 border-b border-[#e7e7e7] px-4">
        <button onClick={() => setScreen('collection')} className="text-[#444] hover:opacity-70" title="Back to help">
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-[#444]">What is SPICE Project</p>
          <p className="text-[10px] font-medium text-[#777]">Help article</p>
        </div>
        <button onClick={onToggleExpand} title={expanded ? 'Shrink article' : 'Expand article'} className="text-[#444] hover:opacity-70">
          <Maximize2 size={16} />
        </button>
        <button onClick={onClose} title="Minimise" className="text-[#444] hover:opacity-70">
          <X size={18} />
        </button>
      </div>
      <div className={`flex-1 overflow-y-auto px-5 py-6 ${expanded ? 'md:px-10 md:py-8' : ''}`}>
        <h2 className="text-[16px] font-bold text-[#444]">What is SPICE Project</h2>
        <div className="mt-3 flex items-center gap-3">
          <BotBadge size={32} />
          <div>
            <p className="text-[10px] font-bold text-[#444]">Written by SPICE Team</p>
            <p className="text-[9px] font-medium text-[#777]">June 17, 2026</p>
          </div>
        </div>
        <div className="mt-7 space-y-6">
          {ARTICLE_BODY.map((section) => (
            <section key={section.title}>
              <h3 className="text-[15px] font-bold text-[#444]">{section.title}</h3>
              <p className={`${expanded ? 'text-[14px]' : 'text-[11px]'} mt-3 font-medium leading-relaxed text-[#555]`}>{section.text}</p>
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => setScreen('chat')}
            className="bg-[#f68b2c] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#e07a20]"
          >
            Return to conversation
          </button>
          <button
            onClick={() => setScreen('collection')}
            className="border border-[#444] bg-white px-4 py-2.5 text-[12px] font-bold text-[#444] hover:bg-[#f7f7f7]"
          >
            Back to articles
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AiChatbotWidget({ onClose, docked = false }: { onClose: () => void; docked?: boolean }) {
  const [screen, setScreen] = useState<Screen>('home');
  const [articleExpanded, setArticleExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'bot', text: BOT_INTRO, time: 'Just now' },
  ]);

  const setScreenSafe = (nextScreen: Screen) => {
    if (nextScreen !== 'article') setArticleExpanded(false);
    setScreen(nextScreen);
  };

  const sendMessage = (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: Date.now(), from: 'user', text, time: now }]);
    setScreenSafe('chat');
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: 'bot',
          text: 'Thanks. I can help connect this to the relevant SPICE method, pilot context, and next action. You can also open the Help tab for the structured project guide.',
          time: 'Just now',
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
          ? 'bottom-[104px] left-1/2 max-h-[calc(100dvh-8rem)] -translate-x-1/2 max-sm:bottom-[92px] max-sm:w-[calc(100vw-24px)]'
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
        <ChatScreen screen={screen} messages={messages} onSend={sendMessage} setScreen={setScreenSafe} onClose={onClose} />
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
