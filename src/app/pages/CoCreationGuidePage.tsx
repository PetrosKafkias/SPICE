import { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Mic, BookOpen, FileText, Lightbulb, Bot } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';

type Mode = 'Guided' | 'Exploratory' | 'Factual';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  time: string;
}

const INITIAL_BOT_MESSAGE = `Hello! I'm the SPICE Co-Creation Agent. I can help you select tools, understand co-creation methods, and structure your participatory process.

I have access to the SPICE toolkit documentation, pilot diagnostics, and the SPICE repository. My responses are grounded in these sources (RAG-based).

How can I help you today?`;

const QUICK_PROMPTS = [
  'Which tools fit my workshop objective for collective understanding.',
  'Explain the difference between co-design and consultation.',
  'Summarize the selected process for the Thessaloniki pilot.',
  'Which tools support collective understanding?',
];

const KNOWLEDGE_SOURCES = [
  { icon: FileText, title: 'Toolkit document', desc: 'SPICE Toolkit Method Guide v2.1' },
  { icon: FileText, title: 'Pilot diagnostic', desc: 'Thessaloniki Pilot Diagnostic Report' },
  { icon: BookOpen, title: 'Regulation / Context', desc: 'Horizon Europe Participatory Planning Guidelines' },
  { icon: Lightbulb, title: 'AI Note', desc: 'Responses are generated using retrieval-augmented generation (RAG) over SPICE project documentation only. No external internet access.' },
];

export default function CoCreationGuidePage() {
  const [mode, setMode] = useState<Mode>('Guided');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'bot', text: INITIAL_BOT_MESSAGE, time: 'Just now' },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: Date.now(), from: 'user', text, time: now }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, from: 'bot',
        text: `Based on the SPICE toolkit documentation, I can help you with "${text}". For the Thessaloniki Pilot (Phase 3: Co-Design & Scenario Building), I recommend starting with the Future Scenarios Workshop tool, which is particularly effective for collective visioning exercises.\n\nWould you like me to explain the methodology in more detail or suggest supporting tools?`,
        time: 'Just now',
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
              <h1 className="text-[24px] font-bold text-[#444]">Co-Creation Guide</h1>
              <p className="text-[14px] text-[#888]">Guided support for tool selection and process structuring</p>
            </div>
          </div>
          {/* Mode tabs */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {(['Guided', 'Exploratory', 'Factual'] as Mode[]).map((m) => (
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
                {m === 'Guided' && <FileText size={15} />}
                {m === 'Exploratory' && <BookOpen size={15} />}
                {m === 'Factual' && <BookOpen size={15} />}
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Chat panel */}
          <div className="bg-white flex flex-col overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.06)]" style={{ minHeight: '560px' }}>
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
                      {msg.text}
                    </div>
                    <p className="text-[11px] text-[#aaa]">
                      {msg.from === 'bot' ? `SPICEBOT - AI Agent - ${msg.time}` : `You - ${msg.time}`}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-[12px] text-[#444] hover:border-[#ca7428] hover:bg-[#fdf4ea] transition-colors text-left"
                >
                  <Bot size={13} className="text-[#ca7428] flex-shrink-0" />
                  {q}
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
                  placeholder="Type your message here..."
                  className="w-full bg-transparent text-[15px] text-[#444] outline-none placeholder:text-[#aaa]"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="text-[#888] hover:text-[#444] transition-colors"><Paperclip size={18} /></button>
                    <button className="text-[#888] hover:text-[#444] transition-colors"><Smile size={18} /></button>
                    <button className="text-[#888] hover:text-[#444] transition-colors"><Mic size={18} /></button>
                  </div>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim()}
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
          <div className="bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,0.06)] flex flex-col gap-4 h-fit">
            <div>
              <p className="text-[16px] font-bold text-[#444]">Knowledge base</p>
              <p className="text-[13px] text-[#888] mt-0.5">Documents used for responses</p>
            </div>
            {KNOWLEDGE_SOURCES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-4"
                style={{ backgroundColor: title === 'AI Note' ? '#f9f9f9' : 'rgba(246,139,44,0.07)', border: title === 'AI Note' ? '1px solid #eee' : '1px solid rgba(246,139,44,0.2)' }}
              >
                <Icon size={18} className="text-[#ca7428] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-[#444]">{title}</p>
                  <p className="text-[12px] text-[#666] mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SpicePublicShell>
  );
}
