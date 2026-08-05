import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  Bell,
  Accessibility,
  ArrowUp,
  Bot,
  ChevronDown,
  Cookie,
  Facebook,
  Instagram,
  Languages,
  LogOut,
  Menu,
  MessageSquare,
  UserCircle,
  X,
  Youtube,
} from 'lucide-react';
import ChatbotFloating from './ChatbotFloating';
import AccessibilityWidget from './AccessibilityWidget';
import CookieBanner from './CookieBanner';
import FeedbackForm from './FeedbackForm';
import ModalPortal from './ModalPortal';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { languageOptions, type TranslationKey } from '../i18n/translations';
import spiceLogo from '../../imports/UserDetails/c6afc9a985ecd519e1c55936ffc0b9788fea1d45.png';
import euFunded from '../../imports/UserDetails/b83ce62c3e31fcf6ab360841dec7ca0c45572f62.png';
import { hasCookieConsent, saveCookieConsent, type CookieConsentChoice, type CookiePreferences } from '../lib/cookieConsent';
import { authRoute, safeReturnTo } from '../lib/authRedirect';

type HeaderVariant = 'public' | 'auth-user';

interface Props {
  children: React.ReactNode;
  variant?: HeaderVariant;
  activeUser?: { name: string; role: string };
  notifCount?: number;
}

interface NavItem {
  labelKey: TranslationKey;
  links: { labelKey: TranslationKey; to: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    labelKey: 'nav.coCreation',
    links: [
      { labelKey: 'nav.coCreationHub', to: '/co-creation-hub' },
      { labelKey: 'nav.forum', to: '/forum-voting' },
      { labelKey: 'nav.repository', to: '/repository' },
    ],
  },
  {
    labelKey: 'nav.tools',
    links: [
      { labelKey: 'nav.analogueTools', to: '/analogue-tools' },
      { labelKey: 'nav.citivoice', to: '/citivoice-app' },
      { labelKey: 'nav.sceneEditor', to: '/3d-scene-editor' },
      { labelKey: 'nav.aiChatbot', to: '/co-creation-guide' },
    ],
  },
  {
    labelKey: 'nav.resources',
    links: [
      { labelKey: 'nav.methodology', to: '/methodology' },
      { labelKey: 'nav.glossary', to: '/glossary' },
      { labelKey: 'nav.demoGuide', to: '/demo' },
      { labelKey: 'nav.pilotSites', to: '/pilot-sites' },
    ],
  },
];

function routeIsActive(pathname: string, target: string) {
  return pathname === target || pathname.startsWith(`${target}/`);
}

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ca7428]" aria-label="SPICE homepage">
      <span className="spice-logo-window">
        <img src={spiceLogo} alt="SPICE" />
      </span>
    </Link>
  );
}

function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { t } = useI18n();
  const isActive = item.links.some((link) => routeIsActive(location.pathname, link.to));

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative h-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-full cursor-pointer items-center gap-3 border-b-[3px] px-3 py-1.5 text-[16px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#ca7428] ${
          isActive || open ? 'border-[#f68b2c] text-[#ca7428]' : 'border-transparent text-[#444] hover:text-[#ca7428]'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-current={isActive ? 'page' : undefined}
      >
        {t(item.labelKey)}
        <ChevronDown size={20} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="spice-nav-dropdown" role="menu">
          {item.links.map((link) => {
            const active = routeIsActive(location.pathname, link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={active ? '!bg-[#fff4e9] !text-[#ca7428]' : ''}
                aria-current={active ? 'page' : undefined}
                role="menuitem"
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LanguageDropdown({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useI18n();
  const selected = languageOptions.find((item) => item.code === language)!;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <div ref={ref} className={`relative ${compact ? '' : 'h-full'}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex cursor-pointer items-center gap-3 border-b-[3px] px-3 py-2 text-[16px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#ca7428] ${compact ? 'min-h-12 border border-[#bfc0c5] bg-white' : 'h-full'} ${
          open ? 'border-[#f68b2c] text-[#ca7428]' : 'border-transparent text-[#444] hover:text-[#ca7428]'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('language.label')}
      >
        <Languages size={22} />
        {selected.nativeLabel} ({selected.code})
        <ChevronDown size={20} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="spice-nav-dropdown spice-nav-dropdown-right" role="menu">
          {languageOptions.map((item) => {
            const current = item.code === language;
            return (
              <button
                type="button"
                key={item.code}
                disabled={current}
                onClick={() => { setLanguage(item.code); setOpen(false); }}
                className={`spice-nav-dropdown-option ${current ? 'is-current' : ''}`}
                aria-current={current ? 'true' : undefined}
                role="menuitem"
              >
                {item.nativeLabel} ({item.code})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SpiceNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const cancelSignOutRef = useRef<HTMLButtonElement>(null);
  const signOutDialogRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, notificationCounts, signOut } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const returnTo = safeReturnTo(`${location.pathname}${location.search}${location.hash}`);

  useEffect(() => {
    if (!signOutOpen) return;
    cancelSignOutRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !signingOut) setSignOutOpen(false);
      if (event.key === 'Tab') {
        const controls = Array.from(signOutDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || []);
        if (controls.length === 0) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [signOutOpen, signingOut]);

  const requestSignOut = () => {
    setMobileOpen(false);
    setSignOutOpen(true);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setSignOutOpen(false);
      navigate('/');
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="spice-public-header">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 md:px-8 xl:px-12">
        <div className="flex h-full min-w-0 items-center gap-8 xl:gap-10">
          <Logo />
          <nav className="spice-desktop-nav hidden h-full items-center gap-3 xl:flex" aria-label={t('nav.main')}>
            {NAV_ITEMS.map((item) => <NavDropdown key={item.labelKey} item={item} />)}
          </nav>
        </div>

        <div className="spice-desktop-actions hidden h-full items-center gap-3 md:flex">
          <LanguageDropdown />
          <div className="h-[30px] w-px bg-[#bbb]" />

          {user ? (
            <>
              <Link
                to="/account/notifications"
                className={`relative flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[15px] font-medium transition-colors hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] ${routeIsActive(location.pathname, '/account/notifications') ? 'text-[#ca7428]' : 'text-[#444]'}`}
                aria-current={routeIsActive(location.pathname, '/account/notifications') ? 'page' : undefined}
              >
                <Bell size={21} />
                <span className="hidden xl:inline">{t('nav.notifications')}</span>
                {notificationCounts.unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f68b2c] px-1 text-[10px] font-bold text-white" aria-label={`${notificationCounts.unread} unread notifications`}>
                    {notificationCounts.unread > 99 ? '99+' : notificationCounts.unread}
                  </span>
                )}
              </Link>
              <div className="h-[30px] w-px bg-[#bbb]" />
              <Link
                to="/account"
                className={`flex cursor-pointer items-center gap-3 px-2 py-1.5 transition-colors hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] ${routeIsActive(location.pathname, '/account') ? 'text-[#ca7428]' : 'text-[#444]'}`}
                aria-current={routeIsActive(location.pathname, '/account') ? 'page' : undefined}
              >
                <span className="hidden text-right lg:block">
                  <span className="block max-w-[150px] truncate text-[15px] font-semibold leading-tight">{user.fullName}</span>
                  <span className="block text-[13px] leading-tight text-[#777]">{user.role}</span>
                </span>
                <span className="grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-full border border-[#444] bg-[#e6e6e6]/50">
                  {user.avatarData ? <img src={user.avatarData} alt="" className="h-full w-full object-cover" /> : <UserCircle size={27} />}
                </span>
              </Link>
              <button
                type="button"
                onClick={requestSignOut}
                className="grid h-10 w-10 cursor-pointer place-items-center text-[#444] transition-colors hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]"
                title={t('nav.signOut')}
                aria-label={t('nav.signOut')}
              >
                <LogOut size={21} />
              </button>
            </>
          ) : (
            <>
              <Link to={authRoute('signin', returnTo)} className="cursor-pointer px-3 py-1.5 text-[16px] font-medium text-[#444] transition-colors hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]">
                {t('nav.signIn')}
              </Link>
              <Link to={authRoute('register', returnTo)} className="cursor-pointer border-2 border-[#444] px-5 py-2.5 text-[16px] font-medium text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]">
                {t('nav.signUp')}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="spice-mobile-menu-button h-11 w-11 cursor-pointer place-items-center border border-[#bfc0c5] bg-white text-[#444] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={t('nav.toggleMenu')}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="spice-mobile-menu max-h-[calc(100vh-76px)] overflow-y-auto border-t border-[#ddd] bg-white px-5 py-4 xl:hidden" aria-label={t('nav.mobile')}>
          <div className="grid gap-2">
            {NAV_ITEMS.flatMap((item) => item.links).map((link) => {
              const active = routeIsActive(location.pathname, link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`cursor-pointer px-4 py-3 text-[14px] font-semibold ${active ? 'bg-[#fff4e9] text-[#ca7428]' : 'bg-[#f6f6f6] text-[#444]'}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {t(link.labelKey)}
                </Link>
              );
            })}
            <div className="mt-2 border-t border-[#ddd] pt-3">
              <p className="mb-2 px-1 text-[12px] font-bold uppercase text-[#777]">{t('language.label')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {languageOptions.map((item) => {
                  const current = item.code === language;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      disabled={current}
                      onClick={() => setLanguage(item.code)}
                      className={`px-3 py-2 text-[13px] font-semibold ${current ? 'cursor-default bg-[#fff4e9] text-[#ca7428]' : 'cursor-pointer bg-[#f6f6f6] text-[#444]'}`}
                    >
                      {item.code}
                    </button>
                  );
                })}
              </div>
            </div>
            {user ? (
              <>
                <Link to="/account" onClick={() => setMobileOpen(false)} className="cursor-pointer px-4 py-3 text-[14px] font-semibold text-[#444]">{t('nav.account')}</Link>
                <Link to="/account/notifications" onClick={() => setMobileOpen(false)} className="cursor-pointer px-4 py-3 text-[14px] font-semibold text-[#444]">{t('nav.notifications')} ({notificationCounts.unread})</Link>
                <button type="button" onClick={requestSignOut} className="cursor-pointer px-4 py-3 text-left text-[14px] font-semibold text-[#ca7428]">{t('nav.signOut')}</button>
              </>
            ) : (
              <>
                <Link to={authRoute('signin', returnTo)} onClick={() => setMobileOpen(false)} className="cursor-pointer px-4 py-3 text-[14px] font-semibold text-[#444]">{t('nav.signIn')}</Link>
                <Link to={authRoute('register', returnTo)} onClick={() => setMobileOpen(false)} className="cursor-pointer border border-[#444] px-4 py-3 text-[14px] font-semibold text-[#444]">{t('nav.signUp')}</Link>
              </>
            )}
          </div>
        </nav>
      )}
      {signOutOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto overscroll-contain bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !signingOut) setSignOutOpen(false); }}>
            <section ref={signOutDialogRef} role="dialog" aria-modal="true" aria-labelledby="sign-out-dialog-title" aria-describedby="sign-out-dialog-description" className="relative z-10 my-auto w-full max-w-[470px] border-2 border-[#b2b2b8] bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-start gap-4"><span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><LogOut size={24} aria-hidden="true" /></span><div><h2 id="sign-out-dialog-title" className="text-[23px] font-bold text-[#444]">{t('auth.signOutTitle')}</h2><p id="sign-out-dialog-description" className="mt-2 text-[14px] leading-relaxed text-[#555]">{t('auth.signOutMessage')}</p></div></div>
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button ref={cancelSignOutRef} type="button" onClick={() => setSignOutOpen(false)} disabled={signingOut} className="min-h-11 cursor-pointer border-2 border-[#444] px-5 py-2.5 text-[14px] font-semibold text-[#444] hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428] disabled:cursor-wait disabled:opacity-50">{t('common.cancel')}</button><button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className="min-h-11 cursor-pointer bg-[#f68b2c] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444] disabled:cursor-wait disabled:opacity-60">{signingOut ? t('auth.signingOut') : t('auth.signOutConfirm')}</button></div>
            </section>
          </div>
        </ModalPortal>
      )}
    </header>
  );
}

export function SpiceFooter() {
  const { t } = useI18n();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!feedbackOpen) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setFeedbackOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [feedbackOpen]);
  return (
    <footer className="bg-[#e2f6cf] pb-24">
      <div className="mx-auto grid max-w-[1440px] gap-x-8 gap-y-9 px-6 py-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(280px,1.4fr)_170px_170px_170px_210px] md:px-12">
        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-1">
          <img src={euFunded} alt={t('footer.funded')} className="mb-7 h-[60px] w-auto object-contain" />
          <p className="max-w-[560px] text-[13px] leading-relaxed text-black">{t('footer.disclaimer')}</p>
          <p className="mt-7 text-[14px] font-bold text-black">{t('footer.rights')}</p>
        </div>

        <div className="flex flex-col gap-5">
          <p className="text-[15px] font-bold text-black">{t('nav.coCreation')}</p>
          <div className="flex flex-col gap-3 text-[14px] text-black">
            <Link to="/co-creation-hub" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.coCreationHub')}</Link>
            <Link to="/forum-voting" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.forum')}</Link>
            <Link to="/repository" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.repository')}</Link>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <p className="text-[15px] font-bold text-black">{t('nav.tools')}</p>
          <div className="flex flex-col gap-3 text-[14px] text-black">
            <Link to="/analogue-tools" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.analogueTools')}</Link>
            <Link to="/citivoice-app" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.citivoice')}</Link>
            <Link to="/3d-scene-editor" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.sceneEditor')}</Link>
            <Link to="/co-creation-guide" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.aiChatbot')}</Link>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <p className="text-[15px] font-bold text-black">{t('nav.resources')}</p>
          <div className="flex flex-col gap-3 text-[14px] text-black">
            <Link to="/methodology" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.methodology')}</Link>
            <Link to="/glossary" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.glossary')}</Link>
            <Link to="/demo" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.demoGuide')}</Link>
            <Link to="/pilot-sites" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('nav.pilotSites')}</Link>
            <Link to="/privacy-policy" className="cursor-pointer transition-colors hover:text-[#ca7428]">{t('auth.privacy')}</Link>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-[15px] font-bold text-black">{t('feedback.footerTitle')}</p>
          <p className="text-[13px] leading-relaxed text-[#333]">{t('feedback.footerText')}</p>
          <button type="button" onClick={() => setFeedbackOpen(true)} className="flex w-fit cursor-pointer items-center gap-2 border-2 border-[#777] bg-white px-4 py-2 text-[13px] font-semibold text-[#444] transition-colors hover:border-[#444] hover:bg-[#f2f2f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]"><MessageSquare size={17} aria-hidden="true" />{t('feedback.open')}</button>
          <p className="mt-3 text-[15px] font-bold text-black">{t('footer.follow')}</p>
          <div className="flex items-center gap-6">
            <a href="https://www.youtube.com/results?search_query=SPICE+Sustainable+Public+Spaces+Inclusive+Community+Engagement" target="_blank" rel="noreferrer" className="grid h-8 w-8 cursor-pointer place-items-center text-black transition-colors hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]" aria-label="SPICE on YouTube"><Youtube size={24} strokeWidth={1.8} /></a>
            <a href="https://www.instagram.com/explore/tags/spiceprojecteu/" target="_blank" rel="noreferrer" className="grid h-8 w-8 cursor-pointer place-items-center text-black transition-colors hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]" aria-label="SPICE on Instagram"><Instagram size={24} strokeWidth={1.8} /></a>
            <a href="https://www.facebook.com/search/top?q=SPICE%20EU%20Project" target="_blank" rel="noreferrer" className="grid h-8 w-8 cursor-pointer place-items-center text-black transition-colors hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]" aria-label="SPICE on Facebook"><Facebook size={24} strokeWidth={1.8} /></a>
          </div>
        </div>
      </div>
      {feedbackOpen && <ModalPortal><div className="fixed inset-0 z-[200] grid overflow-y-auto overscroll-contain bg-black/55 p-4 sm:place-items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setFeedbackOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="footer-feedback-title" className="relative z-10 my-auto w-full max-w-[620px] bg-white p-6 shadow-2xl md:p-8">
          <button ref={closeRef} type="button" onClick={() => setFeedbackOpen(false)} className="absolute right-4 top-4 grid h-10 w-10 cursor-pointer place-items-center text-[#444] hover:bg-[#eee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428]" aria-label={t('common.close')}><X size={22}/></button>
          <h2 id="footer-feedback-title" className="pr-12 text-[28px] font-bold text-[#444]">{t('feedback.footerTitle')}</h2><p className="mb-6 mt-2 text-[15px] text-[#555]">{t('feedback.footerText')}</p>
          <FeedbackForm source="footer" />
        </section>
      </div></ModalPortal>}
    </footer>
  );
}

export default function SpicePublicShell({ children }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [activePanel, setActivePanel] = useState<'accessibility' | 'privacy' | 'chatbot' | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!hasCookieConsent()) setActivePanel('privacy');
    const onScroll = () => setScrolled(window.scrollY > 200);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePanel(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onEscape);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onEscape);
    };
  }, []);

  const setCookieChoice = (choice: CookieConsentChoice, preferences?: CookiePreferences) => {
    saveCookieConsent(choice, preferences);
    setActivePanel(null);
    toast.success(choice === 'all' ? t('cookie.accepted') : choice === 'essential' ? t('cookie.rejected') : t('cookie.saved'));
  };

  return (
    <div className="spice-public flex min-h-screen flex-col bg-white">
      <SpiceNav />
      <main className="flex-1 bg-[#f7f7f7]">{children}</main>
      <SpiceFooter />
      <ChatbotFloating open={activePanel === 'chatbot'} onOpenChange={(open) => setActivePanel(open ? 'chatbot' : null)} docked />
      <AccessibilityWidget open={activePanel === 'accessibility'} onOpenChange={(open) => setActivePanel(open ? 'accessibility' : null)} docked />
      <div className="fixed bottom-5 left-1/2 z-[60] flex w-auto -translate-x-1/2 items-center gap-2 rounded-[28px] bg-[#f2ccab] px-6 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition-[width,padding,background-color] duration-250 motion-reduce:transition-none" role="toolbar" aria-label={t('controls.label')}>
        {[
          { id: 'accessibility' as const, label: t('controls.accessibility'), icon: Accessibility },
          { id: 'privacy' as const, label: t('cookie.read'), icon: Cookie },
          { id: 'chatbot' as const, label: t('controls.chatbot'), icon: Bot },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setActivePanel((current) => current === id ? null : id)} title={label} aria-label={label} aria-pressed={activePanel === id} className={`grid h-12 w-12 cursor-pointer place-items-center rounded-full border-[3px] border-white text-white transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#a95f20] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#444] motion-reduce:transform-none ${activePanel === id ? 'bg-[#8f4d18] shadow-[0_0_0_4px_rgba(202,116,40,0.25)]' : 'bg-[#ca7428]'}`}>
            <Icon size={25} />
          </button>
        ))}
        <span className={`overflow-hidden transition-[width,opacity] duration-250 motion-reduce:transition-none ${scrolled ? 'w-12 opacity-100' : 'w-0 opacity-0'}`} aria-hidden={!scrolled}>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title={t('controls.scrollTop')} aria-label={t('controls.scrollTop')} tabIndex={scrolled ? 0 : -1} className={`grid h-12 w-12 cursor-pointer place-items-center rounded-full border-[3px] border-white bg-[#ca7428] text-white transition-[transform,background-color] duration-250 hover:-translate-y-0.5 hover:bg-[#a95f20] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#444] motion-reduce:transform-none ${scrolled ? 'scale-100' : 'scale-75'}`}>
            <ArrowUp size={25} />
          </button>
        </span>
      </div>
      {activePanel === 'privacy' && (
        <CookieBanner
          onAccept={() => setCookieChoice('all')}
          onReject={() => setCookieChoice('essential')}
          onPreferences={(preferences) => setCookieChoice('managed', preferences)}
          onReadPrivacy={() => { setActivePanel(null); navigate('/privacy-policy'); }}
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  );
}
