import { LoaderCircle } from 'lucide-react';

export default function LoadingState({ message, minHeight = '200px', size = 'md' }: {
  message?: string;
  minHeight?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconSize = size === 'lg' ? 30 : size === 'sm' ? 16 : 22;
  const textSize = size === 'lg' ? 'text-[16px]' : size === 'sm' ? 'text-[13px]' : 'text-[15px]';

  return (
    <div className="grid place-items-center" style={{ minHeight }} role="status" aria-live="polite" aria-busy="true">
      <div className={`flex items-center gap-3 font-semibold text-[#555] ${textSize}`}>
        <LoaderCircle size={iconSize} className="animate-spin text-[#ca7428] motion-reduce:animate-none" aria-hidden="true" />
        {message && <span>{message}</span>}
      </div>
    </div>
  );
}
