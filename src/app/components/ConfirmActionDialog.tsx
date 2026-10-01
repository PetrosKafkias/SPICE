import { useEffect, useRef } from 'react';
import { CircleAlert } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { useI18n } from '../context/I18nContext';

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmActionDialog({ title, body, confirmLabel, saving, onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

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

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto overscroll-contain bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
        <section ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="confirm-action-title" aria-describedby="confirm-action-description" className="relative z-10 my-auto w-full max-w-[480px] border-2 border-[#b2b2b8] bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><CircleAlert size={22} aria-hidden="true" /></span>
            <div>
              <h2 id="confirm-action-title" className="text-[22px] font-bold text-[#444]">{title}</h2>
              <p id="confirm-action-description" className="mt-2 text-[14px] leading-relaxed text-[#555]">{body}</p>
            </div>
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button ref={cancelRef} type="button" onClick={onCancel} disabled={saving} className="min-h-11 cursor-pointer border-2 border-[#444] px-5 py-2.5 text-[14px] font-semibold text-[#444] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428] disabled:cursor-wait disabled:opacity-50">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={onConfirm} disabled={saving} className="min-h-11 cursor-pointer bg-[#f68b2c] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444] disabled:cursor-wait disabled:opacity-60">
              {saving ? t('common.saving') : confirmLabel}
            </button>
          </div>
        </section>
      </div>
    </ModalPortal>
  );
}
