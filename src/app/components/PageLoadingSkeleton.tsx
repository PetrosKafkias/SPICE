import { useI18n } from '../context/I18nContext';

export default function PageLoadingSkeleton() {
  const { t } = useI18n();

  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#f7f7f7] px-5 py-10 md:px-12" role="status" aria-live="polite" aria-busy="true">
      <div className="mx-auto max-w-[1344px]">
        <div className="mb-8 flex items-center gap-3 text-[15px] font-semibold text-[#444]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#ca7428] border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
          <span>{t('common.loading')}</span>
        </div>
        <div className="animate-pulse space-y-7 motion-reduce:animate-none" aria-hidden="true">
          <div className="h-10 w-full max-w-[420px] bg-[#dedede]" />
          <div className="h-5 w-full max-w-[720px] bg-[#e8e8e8]" />
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="border-2 border-[#d4d4d4] bg-white p-6">
                <div className="h-11 w-11 rounded-full bg-[#f5dfca]" />
                <div className="mt-6 h-6 w-2/3 bg-[#dedede]" />
                <div className="mt-4 h-4 w-full bg-[#ececec]" />
                <div className="mt-2 h-4 w-4/5 bg-[#ececec]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
