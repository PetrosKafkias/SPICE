export default function PilotFlag({ code, label }: { code: string; label?: string }) {
  if (code === 'GR') {
    return (
      <span className="relative block h-7 w-11 overflow-hidden rounded-md border border-black/10 shadow-sm" role="img" aria-label={label || 'Greece'}>
        <span className="absolute inset-0" style={{ background: 'repeating-linear-gradient(to bottom, #1f5aa6 0 3px, #fff 3px 6px)' }} />
        <span className="absolute left-0 top-0 h-[18px] w-[18px] bg-[#1f5aa6]">
          <span className="absolute left-[7px] top-0 h-full w-1 bg-white" />
          <span className="absolute left-0 top-[7px] h-1 w-full bg-white" />
        </span>
      </span>
    );
  }

  if (code === 'FI') {
    return (
      <span className="relative block h-7 w-11 overflow-hidden rounded-md border border-black/10 bg-white shadow-sm" role="img" aria-label={label || 'Finland'}>
        <span className="absolute left-[13px] top-0 h-full w-[7px] bg-[#1f559d]" />
        <span className="absolute left-0 top-[10px] h-[7px] w-full bg-[#1f559d]" />
      </span>
    );
  }

  if (code === 'PL') {
    return (
      <span className="block h-7 w-11 overflow-hidden rounded-md border border-black/10 shadow-sm" role="img" aria-label={label || 'Poland'}>
        <span className="block h-1/2 bg-white" />
        <span className="block h-1/2 bg-[#dc143c]" />
      </span>
    );
  }

  return (
    <span className="relative block h-7 w-11 overflow-hidden rounded-md border border-black/10 shadow-sm" role="img" aria-label={label || 'Portugal'}>
      <span className="absolute inset-y-0 left-0 w-[40%] bg-[#00843d]" />
      <span className="absolute inset-y-0 right-0 w-[60%] bg-[#ff1f2d]" />
      <span className="absolute left-[15px] top-[8px] h-3 w-3 rounded-full border border-[#f7d44a] bg-[#f7d44a]" />
      <span className="absolute left-[18px] top-[10px] h-2 w-2 rounded-full bg-white" />
    </span>
  );
}
