import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, FileText, BookOpen, Clipboard, Info, Bookmark, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; type: string }[];
}

const SUGGESTED_PROMPTS = [
  'Which tools fit my workshop objective for collective understanding?',
  'Explain the difference between co-design and consultation.',
  'Summarise the selected process for the Thessaloniki pilot.',
  'Which tools support collective understanding?',
  'What documents support this recommendation?',
  'How many participants should I target for the CitiVoice campaign?',
];

const SOURCES = [
  { title: 'SPICE Toolkit Method Guide v2.1', type: 'Toolkit document', icon: BookOpen, color: 'text-[#1b3a5c] bg-[#e8f0f7]' },
  { title: 'Thessaloniki Pilot Diagnostic Report', type: 'Pilot diagnostic', icon: Clipboard, color: 'text-[#0f6e6e] bg-[#e6f5f5]' },
  { title: 'SPICE Repository — Phase 3 Tools', type: 'Repository item', icon: FileText, color: 'text-[#3a6b3a] bg-[#eaf3ea]' },
  { title: 'Horizon Europe Participatory Planning Guidelines', type: 'Regulation / background', icon: BookOpen, color: 'text-[#5a3f7a] bg-[#f0eef8]' },
  { title: 'Rovaniemi Workshop Results — Mar 2025', type: 'Previous results', icon: Clipboard, color: 'text-[#8b4f15] bg-[#fef3e8]' },
];

const MOCK_RESPONSES: Record<string, { content: string; sources: { title: string; type: string }[] }> = {
  default: {
    content: `Based on the SPICE toolkit methodology and your current pilot context (Thessaloniki — Phase 3: Co-design & Scenario Building), I recommend the following tools:

**1. Future Scenarios Workshop** — Ideal for structured visioning with 12–30 participants. Pairs well with 3D Scene Visualisation outputs.

**2. Participatory Design Sprint** — If you have 2–3 days available, this intensive session can produce concrete design proposals for community validation.

**3. Digital Forum & Voting** — For asynchronous participation between sessions, this allows broader community input on proposals.

*Process note:* Based on your questionnaire, you selected "Collaboration" as the participation level. This aligns best with tools that keep decision-making transparent and co-produced, rather than merely consultative.

Would you like me to generate a summary of these recommendations to add to your Process page?`,
    sources: [
      { title: 'SPICE Toolkit Method Guide v2.1', type: 'Toolkit document' },
      { title: 'Thessaloniki Pilot Diagnostic Report', type: 'Pilot diagnostic' },
    ],
  },
  codesign: {
    content: `**Co-design vs. Consultation — key distinctions:**

**Consultation** involves gathering opinions and preferences from stakeholders, but decisions remain with the project team. Citizens are asked for input, but do not shape the process or outcome design. Example: a survey about preferred colours for a playground.

**Co-design** means that participants actively shape both the process and the outcomes. They are partners in decision-making, not just respondents. Facilitators support rather than direct. Example: a Future Scenarios Workshop where participants define the design brief together.

In the SPICE framework, the participation level filter (Input / Collaboration / Ownership) maps directly to this distinction. A level 1 process is consultative; levels 2–3 are genuinely co-creative.

*Regulatory note:* Horizon Europe NEB (New European Bauhaus) principles explicitly require co-design processes that go beyond consultation.`,
    sources: [
      { title: 'Horizon Europe Participatory Planning Guidelines', type: 'Regulation / background' },
      { title: 'SPICE Toolkit Method Guide v2.1', type: 'Toolkit document' },
    ],
  },
};

export default function AIAgentPage() {
  const [mode, setMode] = useState<'guided' | 'exploratory' | 'factual'>('exploratory');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hello! I'm the SPICE Co-Creation Agent. I can help you select tools, understand co-creation methods, and structure your participatory process.\n\nI have access to the SPICE toolkit documentation, pilot diagnostics, and the SPICE repository. My responses are grounded in these sources (RAG-based).\n\nHow can I help you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const isCodesign = text.toLowerCase().includes('co-design') || text.toLowerCase().includes('consultation');
      const resp = isCodesign ? MOCK_RESPONSES.codesign : MOCK_RESPONSES.default;
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resp.content,
        sources: resp.sources,
      };
      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Annotation */}
        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-3">
          <Info size={12} />
          RAG-based AI guidance with sources · Knowledge base: SPICE docs, pilot diagnostics, repository · Role-aware context
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f0eef8] flex items-center justify-center">
              <Bot size={20} className="text-[#5a3f7a]" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-[#1b3a5c]">Co-Creation Guide</h1>
              <p className="text-gray-500 text-[12px]">Guided support for tool selection and process structuring</p>
            </div>
          </div>
          {/* Mode selector */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
            {(['guided', 'exploratory', 'factual'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-2 text-[12px] font-medium capitalize transition-colors
                  ${mode === m ? 'bg-[#5a3f7a] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {m === 'guided' ? '🗺️ Guided' : m === 'exploratory' ? '🔍 Exploratory' : '📄 Factual'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#f0eef8] flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <Bot size={15} className="text-[#5a3f7a]" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-[#1b3a5c] text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm shadow-sm'}`}>
                    {msg.content.split('\n\n').map((para, i) => (
                      <p key={i} className={`${i > 0 ? 'mt-2' : ''} whitespace-pre-wrap`}>
                        {para.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                          part.startsWith('**') ? (
                            <strong key={j} className={msg.role === 'user' ? 'text-blue-200' : 'text-[#1b3a5c]'}>
                              {part.replace(/\*\*/g, '')}
                            </strong>
                          ) : part
                        )}
                      </p>
                    ))}
                  </div>
                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] text-gray-400 mb-1 ml-1">Sources used:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s, i) => (
                          <div key={i} className="flex items-center gap-1 bg-[#f0eef8] text-[#5a3f7a] text-[10px] px-2 py-1 rounded-full border border-purple-200">
                            <FileText size={9} />
                            {s.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Action buttons for assistant */}
                  {msg.role === 'assistant' && msg.id !== '0' && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => toast.success('Summary sent to your Process page')}
                        className="flex items-center gap-1 text-[10px] text-[#1b3a5c] bg-[#e8f0f7] px-2 py-1 rounded-full hover:bg-[#d0e4f0] transition-colors"
                      >
                        <Bookmark size={10} /> Send to My Process
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#f0eef8] flex items-center justify-center flex-shrink-0">
                  <Bot size={15} className="text-[#5a3f7a]" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 bg-[#5a3f7a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-[#5a3f7a] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-[#5a3f7a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts */}
          <div className="px-6 pb-2 flex-shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                <button key={prompt} onClick={() => sendMessage(prompt)}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-gray-200 text-[11px] text-gray-700 px-3 py-1.5 rounded-full hover:bg-[#f0eef8] hover:border-purple-200 hover:text-[#5a3f7a] transition-colors shadow-sm">
                  <Sparkles size={11} className="text-[#5a3f7a]" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-6 pb-6 flex-shrink-0">
            <div className="flex gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                placeholder="Ask about tools, methods, or your process…"
                className="flex-1 px-3 py-2 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium text-[12px] transition-colors
                  ${input.trim() && !loading ? 'bg-[#5a3f7a] text-white hover:bg-[#4a2f6a]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <Send size={14} />
              </button>
            </div>
            <div className="text-[10px] text-gray-400 mt-1.5 text-center">
              AI Agent uses RAG over SPICE project documents. Always verify recommendations with your facilitator.
            </div>
          </div>
        </div>

        {/* Sources panel */}
        <div className="w-[260px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
          <div className="px-4 pt-4 pb-2 border-b border-gray-100">
            <div className="text-[12px] font-bold text-[#1b3a5c] mb-0.5">Knowledge Base</div>
            <div className="text-[10px] text-gray-400">Documents used for RAG responses</div>
          </div>
          <div className="flex-1 px-3 py-3 flex flex-col gap-2">
            {SOURCES.map((src, i) => {
              const Icon = src.icon;
              return (
                <div key={i} className={`rounded-lg p-2.5 ${src.color.split(' ')[1]}`}>
                  <div className={`flex items-center gap-1.5 mb-1 ${src.color.split(' ')[0]}`}>
                    <Icon size={11} />
                    <span className="text-[10px] font-semibold">{src.type}</span>
                  </div>
                  <div className="text-[11px] text-gray-700 leading-tight">{src.title}</div>
                </div>
              );
            })}
          </div>
          <div className="px-3 pb-3">
            <div className="bg-[#f0eef8] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb size={12} className="text-[#5a3f7a]" />
                <span className="text-[11px] font-semibold text-[#5a3f7a]">AI note</span>
              </div>
              <p className="text-[11px] text-[#5a3f7a]/80 leading-relaxed">
                Responses are generated using retrieval-augmented generation (RAG) over SPICE project documentation only. No external internet access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
