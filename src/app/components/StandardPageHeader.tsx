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
      className="border-b border-[#e2d8cf] bg-[linear-gradient(100deg,#ffffff_0%,#fff9f3_58%,#ffe7d2_100%)]"
      aria-labelledby={titleId}
    >
      <div className="mx-auto flex min-h-[240px] max-w-[1360px] flex-col justify-center gap-7 px-6 py-10 md:min-h-[270px] md:px-12 md:py-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[920px] min-w-0">
          <div className="mb-5 flex items-center gap-3 text-[#ca7428]">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#fff0e2] ring-1 ring-[#f3c69f]" aria-hidden="true"><Icon size={25} /></span>
            {eyebrow && <p className="text-[13px] font-bold uppercase text-[#9b4e13]">{eyebrow}</p>}
          </div>
          <h1 id={titleId} className="text-[34px] font-bold leading-tight text-[#444] md:text-[42px]">{title}</h1>
          <p className="mt-4 max-w-[850px] text-[16px] font-medium leading-relaxed text-[#5f5f5f] md:text-[17px]">{description}</p>
        </div>
        {actions && <div className="flex flex-none flex-wrap items-center gap-3 lg:justify-end">{actions}</div>}
      </div>
    </section>
  );
}
