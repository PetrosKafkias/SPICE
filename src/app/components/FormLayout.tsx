import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';

function classes(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

export function FormGrid({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return <div className={classes('spice-form-grid', className)} {...props} />;
}

export function FormField({
  className,
  ...props
}: ComponentPropsWithoutRef<'label'>) {
  return <label className={classes('spice-field-group', className)} {...props} />;
}

export function FieldGroup({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return <div className={classes('spice-field-group', className)} {...props} />;
}

type FieldMessageTone = 'error' | 'warning' | 'helper' | 'success' | 'status';

const toneClass: Record<FieldMessageTone, string> = {
  error: 'text-red-800',
  warning: 'text-[#7a4b00]',
  helper: 'text-[#666]',
  success: 'text-[#334f25]',
  status: 'text-[#444]',
};

export function FieldMessage({
  id,
  children,
  tone = 'helper',
  className,
  reserveSpace = false,
  live,
}: {
  id?: string;
  children?: ReactNode;
  tone?: FieldMessageTone;
  className?: string;
  reserveSpace?: boolean;
  live?: 'polite' | 'assertive';
}) {
  const Icon = tone === 'error' || tone === 'warning'
    ? CircleAlert
    : tone === 'success'
      ? CircleCheck
      : Info;

  return (
    <span
      id={id}
      className={classes(
        'spice-field-message',
        toneClass[tone],
        reserveSpace && 'spice-field-message-reserved',
        className,
      )}
      role={tone === 'error' || tone === 'warning' ? 'alert' : tone === 'status' || tone === 'success' ? 'status' : undefined}
      aria-live={live}
      aria-hidden={!children && reserveSpace ? true : undefined}
    >
      {children ? (
        <>
          <Icon size={16} className="mt-px flex-none" aria-hidden="true" />
          <span className="min-w-0 flex-1">{children}</span>
        </>
      ) : null}
    </span>
  );
}
