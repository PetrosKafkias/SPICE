import { useId, type ElementType, type ReactNode } from 'react';

export default function StandardPageHeader({ icon: Icon, eyebrow, title, description, actions }: {
  icon: ElementType;
  eyebrow?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      className="border-b border-[#ead8c8] bg-[linear-gradient(100deg,#ffffff_0%,#fffaf5_58%,#ffe6d1_100%)]"
      aria-labelledby={titleId}
    >
      <div className="mx-auto flex min-h-[136px] max-w-[1440px] flex-col justify-center gap-5 px-6 py-6 md:min-h-[146px] md:flex-row md:items-center md:justify-between md:px-8 lg:px-12">
        <div className="min-w-0 max-w-[920px] flex-1">
          <div className="flex items-center gap-3 text-[#444]">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#fff0e2] text-[#ca7428] ring-1 ring-[#f3c69f]" aria-hidden="true"><Icon size={23} /></span>
            {eyebrow && <span className="sr-only">{eyebrow}</span>}
            <h1 id={titleId} className="text-[25px] font-bold leading-tight text-[#444] md:text-[28px]">{title}</h1>
          </div>
          <p className="mt-4 max-w-[850px] text-[14px] font-medium leading-relaxed text-[#5f5f5f] md:text-[15px]">{description}</p>
        </div>
        {actions && <div className="flex flex-none flex-wrap items-center gap-3 md:justify-end">{actions}</div>}
      </div>
    </section>
  );
}
