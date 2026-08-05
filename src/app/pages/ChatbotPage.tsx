import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bot } from 'lucide-react';
import AiChatbotWidget from '../components/AiChatbotWidget';
import SpicePublicShell from '../components/SpicePublicShell';

export default function ChatbotPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <SpicePublicShell variant="public">
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="w-16 h-16 rounded-full bg-[rgba(246,139,44,0.15)] flex items-center justify-center">
          <Bot size={32} className="text-[#ca7428]" />
        </div>
        <h1 className="text-[28px] font-bold text-[#444]">SPICE AI Assistant</h1>
        <p className="text-[15px] text-[#666] text-center max-w-[480px]">
          Get help navigating the co-creation platform, understanding tools, and participating in your local pilot.
        </p>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-[#f68b2c] text-white text-[16px] font-semibold rounded hover:bg-[#e07a20] transition-colors"
          >
            <Bot size={20} /> Open Chatbot
          </button>
        )}
        <button
          onClick={() => navigate('/overview')}
          className="text-[14px] text-[#ca7428] hover:underline font-medium"
        >
          Back to Co-Creation Hub
        </button>
      </div>

      {open && <AiChatbotWidget onClose={() => setOpen(false)} />}
    </SpicePublicShell>
  );
}
