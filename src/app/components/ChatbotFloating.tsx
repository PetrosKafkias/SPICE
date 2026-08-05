import { useCallback, useEffect, useState } from 'react';
import AiChatbotWidget from './AiChatbotWidget';

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  docked?: boolean;
}

export default function ChatbotFloating({ open: controlledOpen, onOpenChange, docked = false }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback((value: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  }, [controlledOpen, onOpenChange]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('chatbot-open', handler);
    return () => {
      window.removeEventListener('chatbot-open', handler);
    };
  }, [setOpen]);

  return (
    <>
      {open && <AiChatbotWidget onClose={() => setOpen(false)} docked={docked} />}
    </>
  );
}
