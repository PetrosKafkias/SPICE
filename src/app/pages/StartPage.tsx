import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Homepage from '../../imports/Homepage';
import SpiceHeader from '../components/SpiceHeader';
import CookieBanner from '../components/CookieBanner';
import ChatbotFloating from '../components/ChatbotFloating';
import AccessibilityWidget from '../components/AccessibilityWidget';
import ScrollToTopButton from '../components/ScrollToTopButton';
import { hasCookieConsent, saveCookieConsent } from '../lib/cookieConsent';

export default function StartPage() {
  const navigate = useNavigate();
  const [showCookies, setShowCookies] = useState(() => !hasCookieConsent());

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const text = target.textContent?.trim() ?? '';

      if (text === 'Sign Up') {
        e.preventDefault();
        navigate('/register');
      }
      if (text === 'Explore Pilot Sites') {
        e.preventDefault();
        navigate('/scenarios');
      }
      if (text === 'Watch Demo' || text === 'Explore the glossary') {
        e.preventDefault();
        navigate('/glossary');
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [navigate]);

  const handleAccept = () => { saveCookieConsent('all'); setShowCookies(false); };
  const handleReject = () => { saveCookieConsent('essential'); setShowCookies(false); };

  return (
    <div className="flex flex-col min-h-screen">
      <SpiceHeader />
      {/* Render Homepage but hide its built-in header via CSS */}
      <style>{`
        [data-name="Homepage"] > [data-name="Header"] { display: none !important; }
      `}</style>
      <div className="flex-1">
        <Homepage />
      </div>
      {showCookies && (
        <CookieBanner
          onAccept={handleAccept}
          onReject={handleReject}
          onPreferences={(preferences) => { saveCookieConsent('managed', preferences); setShowCookies(false); }}
          onReadPrivacy={() => navigate('/privacy-policy')}
          onClose={() => setShowCookies(false)}
        />
      )}
      <ChatbotFloating />
      <AccessibilityWidget />
      <ScrollToTopButton />
    </div>
  );
}
