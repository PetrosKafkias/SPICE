import { Home, SearchX } from 'lucide-react';
import { Link } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import { useI18n } from '../context/I18nContext';

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <SpicePublicShell>
      <main className="spice-page spice-wide-page">
        <section className="mx-auto max-w-2xl border-2 border-[#d7d8dc] bg-white p-8 text-center" role="alert">
          <SearchX className="mx-auto text-[#ca7428]" size={48} aria-hidden="true" />
          <h1 className="mt-4 text-[32px] font-bold text-[#444]">{t('notFound.title')}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{t('notFound.text')}</p>
          <Link to="/" className="mt-6 inline-flex min-h-12 items-center gap-2 bg-[#f68b2c] px-6 py-3 font-bold text-white">
            <Home size={18} aria-hidden="true" /> {t('notFound.home')}
          </Link>
        </section>
      </main>
    </SpicePublicShell>
  );
}
