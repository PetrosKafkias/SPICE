import { useEffect, useRef } from 'react';
import { ArrowRightLeft, CheckCircle2, CircleAlert } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { useI18n } from '../context/I18nContext';
import type { WorkflowRequirement } from './WorkflowNextActionPanel';
import type { TranslationKey } from '../i18n/translations';

interface Props {
  targetPhaseNumber: number;
  currentPhaseNumber: number;
  phaseTitles: Record<number, string>;
  saving: boolean;
  requirements: WorkflowRequirement[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PhaseChangeDialog({ targetPhaseNumber, currentPhaseNumber, phaseTitles, saving, requirements, onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isForward = targetPhaseNumber > currentPhaseNumber;

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
      if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || []);
        if (controls.length === 0) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [saving, onCancel]);

  const allPhases = [1, 2, 3, 4, 5];
  const completedList = allPhases.filter((n) => n < targetPhaseNumber).join(', ');
  const incompleteList = allPhases.filter((n) => n > targetPhaseNumber).join(', ');

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto overscroll-contain bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="phase-change-dialog-title" aria-describedby="phase-change-dialog-description" className="relative z-10 my-auto w-full max-w-[520px] border-2 border-[#b2b2b8] bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><ArrowRightLeft size={22} aria-hidden="true" /></span>
            <div>
              <h2 id="phase-change-dialog-title" className="text-[22px] font-bold text-[#444]">
                {t(isForward ? 'hub.confirmPhaseForwardTitle' : 'hub.confirmPhaseBackwardTitle')}
              </h2>
              <p id="phase-change-dialog-description" className="mt-2 text-[14px] leading-relaxed text-[#555]">
                {isForward
                  ? t('hub.confirmPhaseForwardBody', { phase: targetPhaseNumber, completedList: completedList || '—', incompleteList: incompleteList || '—' })
                  : t('hub.confirmPhaseBackwardBody', { phase: targetPhaseNumber })}
              </p>
              <p className="mt-3 text-[13px] font-semibold text-[#a85f20]">
                {t('hub.phaseNumber', { phase: targetPhaseNumber })} · {phaseTitles[targetPhaseNumber]}
              </p>
              {isForward && (
                <ul className="mt-4 space-y-2 border-t-2 border-[#eee] pt-4">
                  {requirements.map((requirement) => (
                    <li key={requirement.code} className="flex items-start gap-2 text-[13px] text-[#555]">
                      {requirement.met
                        ? <CheckCircle2 size={16} className="mt-0.5 flex-none text-[#58723d]" aria-hidden="true" />
                        : <CircleAlert size={16} className="mt-0.5 flex-none text-[#a85f20]" aria-hidden="true" />}
                      {t(`workflow.requirement.${requirement.code}` as TranslationKey)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button ref={cancelRef} type="button" onClick={onCancel} disabled={saving} className="min-h-11 cursor-pointer border-2 border-[#444] px-5 py-2.5 text-[14px] font-semibold text-[#444] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428] disabled:cursor-wait disabled:opacity-50">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={onConfirm} disabled={saving || (isForward && requirements.some((item) => !item.met))} className="min-h-11 cursor-pointer bg-[#f68b2c] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444] disabled:cursor-not-allowed disabled:bg-[#d4d4d4] disabled:text-[#666]">
              {saving ? t('common.saving') : t('hub.confirmPhaseAction')}
            </button>
          </div>
        </section>
      </div>
    </ModalPortal>
  );
}
