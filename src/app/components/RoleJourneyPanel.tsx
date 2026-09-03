import { ArrowRight, CheckCircle2, CircleDot, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router';
import type { Role } from '../auth/permissions';
import { ROLE_JOURNEYS } from '../data/processFramework';
import { useI18n } from '../context/I18nContext';

export default function RoleJourneyPanel({ role, currentStep = 1 }: { role: Role; currentStep?: number }) {
  const journey = ROLE_JOURNEYS[role];
  const { t } = useI18n();
  const activeStep = Math.min(Math.max(currentStep, 1), journey.steps.length);

  return (
    <section className="spice-card p-6 md:p-8" aria-labelledby="role-journey-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#ca7428]">{t('journey.eyebrow')}</p>
          <h2 id="role-journey-title" className="mt-2 text-[24px] font-bold text-[#444]">{t(journey.titleKey)}</h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#666]">{t(journey.descriptionKey)}</p>
        </div>
        <p className="inline-flex items-center gap-2 self-start bg-[#f4f4f4] px-3 py-2 text-[12px] font-semibold text-[#555]">
          <LockKeyhole size={15} aria-hidden="true" /> {t('journey.permissions')}
        </p>
      </div>

      <ol className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {journey.steps.map((step, index) => {
          const number = index + 1;
          const completed = number < activeStep;
          const current = number === activeStep;
          return (
            <li key={step.titleKey} className={`flex min-h-[218px] flex-col border-2 p-5 ${current ? 'border-[#f68b2c] bg-[#fffaf5]' : 'border-[#d7d8dc] bg-white'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase text-[#a85f20]">{t('journey.step', { count: number })}</span>
                {completed ? <CheckCircle2 size={20} className="text-[#58723d]" aria-label={t('status.completed')} /> : current ? <CircleDot size={20} className="text-[#ca7428]" aria-label={t('journey.current')} /> : <span className="grid h-5 w-5 place-items-center rounded-full border border-[#bbb] text-[10px] font-bold text-[#777]" aria-label={t('hub.phaseUpcoming')}>{number}</span>}
              </div>
              <h3 className="mt-4 text-[17px] font-bold text-[#444]">{t(step.titleKey)}</h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[#666]">{t(step.descriptionKey)}</p>
              <Link to={step.path} className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 self-start font-bold text-[#a85f20] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]">
                {t(step.actionKey)} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
