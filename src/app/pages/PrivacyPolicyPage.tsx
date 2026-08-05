import {
  ArrowDownToLine,
  ChevronRight,
  Cookie,
  Database,
  FileText,
  Globe2,
  Languages,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';

const POLICY_SECTIONS = [
  {
    id: 'overview',
    title: 'Privacy overview',
    icon: ShieldCheck,
    text: 'SPICE is designed to support inclusive public-space co-creation while limiting personal data collection to what is needed for participation, security, and project reporting.',
  },
  {
    id: 'data-we-collect',
    title: 'Personal data we collect',
    icon: Database,
    text: 'We may collect account details, pilot affiliation, language preference, accessibility preferences, workshop participation, map feedback, votes, uploaded media, comments, and technical usage information.',
  },
  {
    id: 'how-we-use-data',
    title: 'How we use personal data',
    icon: FileText,
    text: 'Data is used to operate the platform, support citizen participation, generate co-creation outputs, improve accessibility, prevent misuse, and provide municipalities with structured, aggregated insights.',
  },
  {
    id: 'sharing',
    title: 'Sharing and project partners',
    icon: Globe2,
    text: 'Relevant project data may be shared with authorized SPICE partners, pilot municipalities, facilitators, and technical providers where this is necessary for the co-creation process.',
  },
  {
    id: 'cookies',
    title: 'Cookies and similar technologies',
    icon: Cookie,
    text: 'Essential cookies keep the toolkit secure and functional. Optional analytics cookies help us improve workflows, performance, multilingual support, and accessibility.',
  },
  {
    id: 'rights',
    title: 'Your privacy rights',
    icon: UserCheck,
    text: 'Depending on your location, you may request access, correction, deletion, restriction, portability, or objection to the processing of your personal data.',
  },
  {
    id: 'security',
    title: 'Protection of personal data',
    icon: Lock,
    text: 'SPICE applies role-based access, secure platform operations, data minimization, and responsible retention practices to protect participant contributions.',
  },
  {
    id: 'contact',
    title: 'Privacy questions',
    icon: Mail,
    text: 'For privacy questions or requests, contact the SPICE project team or the responsible pilot organization listed in your local participation materials.',
  },
];

const QUICK_LINKS = [
  'Privacy overview',
  'What data SPICE collects',
  'How citizen input is used',
  'Cookies and preferences',
  'Your rights',
  'Contact and requests',
];

export default function PrivacyPolicyPage() {
  return (
    <SpicePublicShell variant="public">
      <div className="bg-[#f7f7f7]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="spice-page spice-wide-page">
          <section className="mb-10 border-2 border-[#d7d8dc] bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.08)] md:p-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-[#e4e4e4] pb-6 md:flex-row md:items-center md:justify-between">
              <div className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#555]">
                <Languages size={18} className="text-[#ca7428]" />
                English (EN)
              </div>
              <div className="text-[13px] font-semibold text-[#888]">SPICE Digital Toolkit</div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wide text-[#ca7428]">Trust and transparency</p>
                <h1 className="mt-3 text-[40px] font-bold leading-tight text-[#444] md:text-[52px]">Privacy Policy</h1>
                <p className="mt-3 text-[15px] font-semibold text-[#777]">Updated July 7, 2026</p>
                <p className="mt-6 max-w-[860px] text-[18px] font-medium leading-relaxed text-[#444]">
                  This Privacy Policy explains how the SPICE Digital Toolkit collects, uses, shares, and protects personal data when citizens, municipalities, facilitators, researchers, and project partners use the platform.
                </p>
                <p className="mt-4 max-w-[860px] text-[15px] font-medium leading-relaxed text-[#666]">
                  In addition to this policy, SPICE may show contextual privacy notices inside specific tools, such as CitiVoice, the Repository, the Co-Creation Guide, and account settings. These notices help explain what data is requested before a user contributes.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a
                    href="#overview"
                    className="inline-flex items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#e07a20]"
                  >
                    Read the policy <ChevronRight size={16} />
                  </a>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 border-2 border-[#444] bg-white px-5 py-3 text-[14px] font-bold text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428]"
                  >
                    <ArrowDownToLine size={16} /> Download a copy
                  </button>
                  <a
                    href="#cookies"
                    className="inline-flex items-center justify-center gap-2 border-2 border-[#ca7428] bg-white px-5 py-3 text-[14px] font-bold text-[#ca7428] transition-colors hover:bg-[#fff3e8]"
                  >
                    Cookie preferences
                  </a>
                </div>
              </div>

              <aside className="border-2 border-[#f68b2c] bg-[#fff8f2] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(246,139,44,0.18)]">
                    <Lock size={22} className="text-[#ca7428]" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[#444]">Data & privacy</p>
                    <p className="text-[12px] font-bold uppercase tracking-wide text-[#ca7428]">Participant-first</p>
                  </div>
                </div>
                <p className="text-[13px] font-medium leading-relaxed text-[#666]">
                  The toolkit is intended for civic participation. Contributions should be handled with respect, transparency, and clear purpose limitation.
                </p>
              </aside>
            </div>
          </section>

          <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replaceAll(' ', '-').replace('what-data-spice-collects', 'data-we-collect').replace('how-citizen-input-is-used', 'how-we-use-data').replace('cookies-and-preferences', 'cookies').replace('your-rights', 'rights').replace('contact-and-requests', 'contact').replace('privacy-overview', 'overview')}`}
                className="flex items-center justify-between border-2 border-[#d7d8dc] bg-white px-5 py-4 text-[14px] font-bold text-[#444] transition-colors hover:border-[#f68b2c] hover:text-[#ca7428]"
              >
                {link}
                <ChevronRight size={16} />
              </a>
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 border-2 border-[#d7d8dc] bg-white p-5">
                <p className="mb-4 text-[15px] font-bold text-[#444]">Policy headings</p>
                <nav className="flex flex-col gap-2">
                  {POLICY_SECTIONS.map((section) => (
                    <a key={section.id} href={`#${section.id}`} className="text-[13px] font-semibold leading-snug text-[#666] hover:text-[#ca7428]">
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="flex flex-col gap-6">
              {POLICY_SECTIONS.map(({ id, title, text, icon: Icon }) => (
                <article key={id} id={id} className="scroll-mt-24 border-2 border-[#d7d8dc] bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.06)] md:p-7">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-[rgba(246,139,44,0.15)]">
                      <Icon size={22} className="text-[#ca7428]" />
                    </div>
                    <div>
                      <h2 className="text-[24px] font-bold leading-tight text-[#444]">{title}</h2>
                      <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#555]">{text}</p>
                    </div>
                  </div>

                  <div className="ml-0 mt-5 border-l-4 border-[#f68b2c] bg-[#f7f7f7] px-5 py-4 md:ml-16">
                    <p className="text-[13px] font-semibold leading-relaxed text-[#555]">
                      SPICE keeps privacy information practical and contextual. Where a tool asks for a contribution, upload, location, or account action, users should be able to understand why the data is needed and how it supports the co-creation process.
                    </p>
                  </div>
                </article>
              ))}

              <article className="border-2 border-[#f68b2c] bg-[#d87d2a] p-7 text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
                <h2 className="text-[24px] font-bold">Need help with a privacy request?</h2>
                <p className="mt-3 max-w-[780px] text-[15px] font-medium leading-relaxed">
                  Contact your pilot facilitator or SPICE project contact with the email address used for your account, the pilot site, and the request type. We will route the request to the appropriate responsible organization.
                </p>
                <a href="mailto:privacy@spice-toolkit.eu" className="mt-5 inline-flex items-center gap-2 border-2 border-white px-5 py-3 text-[14px] font-bold text-white hover:bg-white hover:text-[#ca7428]">
                  <Mail size={16} /> privacy@spice-toolkit.eu
                </a>
              </article>
            </div>
          </section>
        </div>
      </div>
    </SpicePublicShell>
  );
}
