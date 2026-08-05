import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Accessibility,
  Archive,
  Bell,
  Bookmark,
  Bot,
  Box,
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  GitBranch,
  Grid3X3,
  HelpCircle,
  Home,
  Keyboard,
  LogOut,
  Menu,
  MessageSquare,
  MousePointer,
  Settings,
  Shield,
  Wifi,
  X,
} from 'lucide-react';
import ChatbotFloating from './ChatbotFloating';
import AccessibilityWidget from './AccessibilityWidget';
import ScrollToTopButton from './ScrollToTopButton';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { languageOptions, type TranslationKey } from '../i18n/translations';
import spiceLogo from '../../imports/spice-logo.jpg';

interface ToolkitNavItem {
  labelKey: TranslationKey;
  path: string;
  icon: React.ElementType;
}

const NAV_MAIN: ToolkitNavItem[] = [
  { labelKey: 'toolkit.overview', path: '/app', icon: Home },
  { labelKey: 'toolkit.setup', path: '/app/setup', icon: Settings },
  { labelKey: 'toolkit.explore', path: '/app/explore', icon: Grid3X3 },
  { labelKey: 'nav.coCreationGuide', path: '/app/ai-agent', icon: Bot },
  { labelKey: 'toolkit.scenarios', path: '/app/possible-scenarios', icon: GitBranch },
];

const NAV_TOOLS: ToolkitNavItem[] = [
  { labelKey: 'toolkit.citivoiceMap', path: '/app/citivoice', icon: Wifi },
  { labelKey: 'toolkit.sceneEditor', path: '/app/scene-editor', icon: Box },
  { labelKey: 'toolkit.myContributions', path: '/app/my-process', icon: Bookmark },
  { labelKey: 'nav.repository', path: '/app/repository', icon: Archive },
  { labelKey: 'nav.forum', path: '/app/forum', icon: MessageSquare },
  { labelKey: 'toolkit.reports', path: '/app/reports', icon: Download },
];

function isActivePath(pathname: string, path: string) {
  if (path === '/app') return pathname === '/app' || pathname === '/app/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, notificationCounts, signOut } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const {
    accessibilityOpen, setAccessibilityOpen, fontSize, setFontSize,
    highContrast, setHighContrast, reducedMotion, setReducedMotion,
  } = useApp();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const closeMenus = () => {
    setLanguageOpen(false);
    setNotificationOpen(false);
    setProfileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const currentNavItem = [...NAV_MAIN, ...NAV_TOOLS].find((item) => isActivePath(location.pathname, item.path));
  const breadcrumb = currentNavItem ? t(currentNavItem.labelKey) : t('toolkit.title');
  const initials = user?.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'SP';
  const translatedRole = user ? t(`role.${user.role.replaceAll(' ', '')}` as TranslationKey) : '';
  const isManager = user?.role === 'Admin' || user?.role === 'Municipality Staff';

  const renderNavItem = ({ labelKey, path, icon: Icon }: ToolkitNavItem) => {
    const active = isActivePath(location.pathname, path);
    return (
      <Link
        key={path}
        to={path}
        onClick={() => setMobileSidebarOpen(false)}
        className="group relative flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#7edba0]"
        style={{ backgroundColor: active ? 'rgba(255,255,255,0.13)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.68)' }}
        aria-current={active ? 'page' : undefined}
      >
        {active && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#6fcf97]" />}
        <Icon size={15} className="flex-shrink-0" />
        <span className="leading-tight">{t(labelKey)}</span>
      </Link>
    );
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${highContrast ? 'contrast-more' : ''}`} style={{ fontSize: fontSize === 'large' ? '17px' : fontSize === 'x-large' ? '20px' : undefined }}>
      {mobileSidebarOpen && <button type="button" className="fixed inset-0 z-30 cursor-default bg-black/40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} aria-label={t('common.close')} />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex h-full w-[250px] flex-shrink-0 flex-col overflow-y-auto bg-[#1a3924] transition-transform duration-200 lg:static lg:w-[236px] lg:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between bg-[#142d1c] px-4 pb-3.5 pt-5">
          <div className="flex items-center gap-2.5">
            <img src={spiceLogo} alt="SPICE" className="h-9 w-auto rounded object-contain" />
            <div>
              <div className="text-[12px] font-semibold leading-tight text-white">{t('toolkit.title')}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-white/45">{t('toolkit.subtitle')}</div>
            </div>
          </div>
          <button type="button" onClick={() => setMobileSidebarOpen(false)} className="grid h-9 w-9 cursor-pointer place-items-center text-white lg:hidden" aria-label={t('common.close')}><X size={19} /></button>
        </div>

        <div className="mx-3 my-3 border border-white/10 bg-white/[0.07] p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-white/45">
            <Building2 size={11} /> {t('toolkit.activePilot')}
          </div>
          <div className="text-[12px] font-semibold leading-snug text-white">{user?.pilotSite || 'Thessaloniki'}</div>
          <div className="mt-1 text-[11px] text-white/55">{t('toolkit.title')}</div>
        </div>

        <nav className="px-2" aria-label={t('nav.main')}>
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-white/35">{t('nav.coCreation')}</p>
          {NAV_MAIN.map(renderNavItem)}
          <div className="mx-2 my-2 border-t border-white/10" />
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-white/35">{t('toolkit.toolsOutputs')}</p>
          {NAV_TOOLS.map(renderNavItem)}
          {isManager && (
            <>
              <div className="mx-2 my-2 border-t border-white/10" />
              <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-white/35">{t('toolkit.manage')}</p>
              {renderNavItem({ labelKey: 'toolkit.manage', path: '/app/admin', icon: Shield })}
            </>
          )}
        </nav>

        <div className="mt-auto border-t border-white/10 px-4 py-4 text-center text-[10px] leading-relaxed text-white/35">
          SPICE - Horizon Europe
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex min-h-[58px] flex-shrink-0 items-center gap-2 border-b border-[#e6ede9] bg-white px-3 sm:px-5">
          <button type="button" onClick={() => setMobileSidebarOpen(true)} className="grid h-10 w-10 cursor-pointer place-items-center text-[#1a3924] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428] lg:hidden" aria-label={t('nav.toggleMenu')}><Menu size={21} /></button>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <span className="hidden text-[11px] text-[#9baba3] sm:inline">SPICE</span>
            <ChevronRight size={11} className="hidden text-[#c5d4cc] sm:block" />
            <span className="truncate text-[12px] font-semibold text-[#1a3924]">{breadcrumb}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative hidden sm:block">
              <button type="button" onClick={() => { closeMenus(); setLanguageOpen((value) => !value); }} className="flex cursor-pointer items-center gap-1 border border-[#e2ece6] px-2.5 py-1.5 text-[12px] text-[#4a5e4f] hover:bg-[#f3f8f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428]" aria-expanded={languageOpen} aria-label={t('language.label')}>
                {language}<ChevronDown size={11} />
              </button>
              {languageOpen && (
                <div className="absolute right-0 top-9 z-50 min-w-[170px] border border-[#e2ece6] bg-white py-1 shadow-lg">
                  {languageOptions.map((item) => {
                    const current = item.code === language;
                    return (
                      <button key={item.code} type="button" disabled={current} onClick={() => { setLanguage(item.code); setLanguageOpen(false); }} className={`block w-full px-3 py-2 text-left text-[12px] ${current ? 'cursor-default bg-[#fff4e9] font-semibold text-[#ca7428]' : 'cursor-pointer text-[#4a5e4f] hover:bg-[#f0f8f3]'}`}>
                        {item.nativeLabel} ({item.code})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative">
              <button type="button" onClick={() => { closeMenus(); setNotificationOpen((value) => !value); }} className="relative grid h-10 w-10 cursor-pointer place-items-center text-[#6b7d72] hover:bg-[#f3f8f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428]" aria-label={t('nav.notifications')} aria-expanded={notificationOpen}>
                <Bell size={18} />
                {notificationCounts.unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
              </button>
              {notificationOpen && (
                <div className="absolute right-0 top-11 z-50 w-[min(300px,calc(100vw-24px))] border border-[#e2ece6] bg-white p-4 shadow-xl">
                  <p className="text-[13px] font-semibold text-[#1a3924]">{t('nav.notifications')}</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-[#4a5e4f]">{notificationCounts.unread ? t('toolkit.unreadCount', { count: notificationCounts.unread }) : t('toolkit.noUnread')}</p>
                  <Link to="/account/notifications" onClick={() => setNotificationOpen(false)} className="mt-4 flex cursor-pointer items-center justify-center border border-[#ca7428] px-3 py-2 text-[12px] font-semibold text-[#ca7428] hover:bg-[#fff4e9]">{t('toolkit.viewNotifications')}</Link>
                </div>
              )}
            </div>

            <button type="button" onClick={() => navigate('/demo')} className="hidden h-10 w-10 cursor-pointer place-items-center text-[#6b7d72] hover:bg-[#f3f8f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428] sm:grid" aria-label={t('toolkit.help')}><HelpCircle size={18} /></button>
            <button type="button" onClick={() => setAccessibilityOpen(!accessibilityOpen)} className="grid h-10 w-10 cursor-pointer place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428]" style={{ color: accessibilityOpen ? '#2e6e45' : '#6b7d72', backgroundColor: accessibilityOpen ? '#e4f0e9' : 'transparent' }} aria-label="Accessibility"><Accessibility size={18} /></button>

            <div className="relative">
              <button type="button" onClick={() => { closeMenus(); setProfileOpen((value) => !value); }} className="flex cursor-pointer items-center gap-2 border border-[#e2ece6] p-1 pr-2 hover:bg-[#f3f8f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428]" aria-expanded={profileOpen}>
                <span className="grid h-8 w-8 place-items-center bg-[#1a3924] text-[10px] font-bold text-white">{initials}</span>
                <span className="hidden max-w-[130px] text-left md:block">
                  <span className="block truncate text-[11px] font-semibold text-[#1e2d22]">{user?.fullName}</span>
                  <span className="block truncate text-[10px] text-[#6b7d72]">{translatedRole}</span>
                </span>
                <ChevronDown size={11} className="text-[#9baba3]" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-[220px] border border-[#e2ece6] bg-white p-2 shadow-xl">
                  <Link to="/account" onClick={() => setProfileOpen(false)} className="block cursor-pointer px-3 py-2 text-[12px] font-semibold text-[#1a3924] hover:bg-[#f0f8f3]">{t('nav.account')}</Link>
                  <button type="button" onClick={handleSignOut} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold text-[#ca7428] hover:bg-[#fff4e9]"><LogOut size={14} />{t('nav.signOut')}</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {accessibilityOpen && (
          <section className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-[#c8e0d0] bg-[#f0f8f3] px-4 py-3" aria-label="Accessibility settings">
            <span className="text-[12px] font-semibold text-[#1a3924]">Accessibility</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#4a5e4f]">{t('toolkit.fontSize')}:</span>
              {(['normal', 'large', 'x-large'] as const).map((size, index) => (
                <button key={size} type="button" onClick={() => setFontSize(size)} className="cursor-pointer px-2 py-0.5" style={{ fontSize: ['11px', '13px', '15px'][index], backgroundColor: fontSize === size ? '#1a3924' : '#fff', color: fontSize === size ? '#fff' : '#4a5e4f', border: `1px solid ${fontSize === size ? '#1a3924' : '#c8d5ce'}` }} aria-pressed={fontSize === size}>A</button>
              ))}
            </div>
            <button type="button" onClick={() => setHighContrast(!highContrast)} className="cursor-pointer border border-[#c8d5ce] px-3 py-1 text-[11px]" style={{ backgroundColor: highContrast ? '#1a3924' : '#fff', color: highContrast ? '#fff' : '#4a5e4f' }} aria-pressed={highContrast}>{t('toolkit.highContrast')}</button>
            <button type="button" onClick={() => setReducedMotion(!reducedMotion)} className="flex cursor-pointer items-center gap-1.5 border border-[#c8d5ce] px-3 py-1 text-[11px]" style={{ backgroundColor: reducedMotion ? '#1a3924' : '#fff', color: reducedMotion ? '#fff' : '#4a5e4f' }} aria-pressed={reducedMotion}><MousePointer size={12} />{t('toolkit.reducedMotion')}</button>
            <button type="button" onClick={() => navigate('/demo#keyboard')} className="flex cursor-pointer items-center gap-1.5 border border-[#c8d5ce] px-3 py-1 text-[11px] text-[#4a5e4f]"><Keyboard size={12} />{t('toolkit.keyboardHelp')}</button>
            <button type="button" onClick={() => setAccessibilityOpen(false)} className="ml-auto grid h-8 w-8 cursor-pointer place-items-center text-[#6b7d72]" aria-label={t('common.close')}><X size={15} /></button>
          </section>
        )}

        <main className="flex-1 overflow-y-auto bg-[#f5f3ee]"><Outlet /></main>
      </div>

      <ChatbotFloating />
      <AccessibilityWidget />
      <ScrollToTopButton />
    </div>
  );
}
