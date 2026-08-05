import type { ElementType, ReactNode } from 'react';
import { ArrowRight, Info, LockKeyhole } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import SpicePublicShell from './SpicePublicShell';
import StandardPageHeader from './StandardPageHeader';

interface Props {
  children: ReactNode;
  icon: ElementType;
  eyebrow: string;
  title: string;
  description: string;
  capabilities: string[];
}

export default function PublicFeatureGate({ children, icon, eyebrow, title, description, capabilities }: Props) {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <SpicePublicShell>
        <div className="spice-page spice-wide-page" aria-busy="true" aria-label="Loading">
          <div className="h-36 animate-pulse bg-[#ededed] motion-reduce:animate-none" />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse bg-[#ededed] motion-reduce:animate-none" />)}
          </div>
        </div>
      </SpicePublicShell>
    );
  }

  if (user) return children;

  const signIn = () => navigate(`/signin?returnTo=${encodeURIComponent(location.pathname + location.search)}`);

  return (
    <SpicePublicShell>
      <StandardPageHeader icon={icon} eyebrow={eyebrow} title={title} description={description} />
      <div className="spice-page spice-wide-page">
        <section className="grid gap-5 md:grid-cols-3" aria-label={`${title} overview`}>
          {capabilities.map((capability) => (
            <article key={capability} className="border-2 border-[#d7d8dc] bg-white p-6">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]"><Info size={22} /></span>
              <p className="mt-5 text-[16px] font-semibold leading-relaxed text-[#444]">{capability}</p>
            </article>
          ))}
        </section>
        <section className="mt-8 flex flex-col gap-5 border-2 border-[#f68b2c] bg-[#fff8f2] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-[22px] font-bold text-[#444]"><LockKeyhole size={23} className="text-[#ca7428]" />Sign in to use this tool</h2>
            <p className="mt-2 max-w-[720px] text-[14px] leading-relaxed text-[#555]">You can review this overview without an account. Sign in when you are ready to create, submit, save, or manage project content.</p>
          </div>
          <button type="button" onClick={signIn} className="inline-flex min-h-12 flex-none cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-6 py-3 font-bold text-white hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#444]">
            Sign in to continue <ArrowRight size={18} />
          </button>
        </section>
      </div>
    </SpicePublicShell>
  );
}
