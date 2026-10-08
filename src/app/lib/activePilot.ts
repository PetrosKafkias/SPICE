import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../auth/usePermissions';
import { apiRequest } from './api';

// The pilot a user is currently working on. Facilitators can be assigned to several pilots and
// administrators see all of them, so pilot-specific pages share one remembered choice.
const STORAGE_KEY = 'spice-active-pilot';

export interface PilotOption {
  slug: string;
  city: string;
  title: string;
  initiativeId: number | null;
}

interface PilotRow { slug: string; city: string; title: string }
interface InitiativeRow { id: number; pilotSlug: string | null }

export function readStoredPilot(): string | null {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function storeActivePilot(slug: string) {
  try { window.localStorage.setItem(STORAGE_KEY, slug); } catch { /* storage unavailable */ }
}

/** Matches a free-text pilot site (e.g. "Bielsko-Biała") to a pilot slug. */
export function pilotSiteToSlug(pilotSite: string | null | undefined, pilots: PilotRow[]) {
  if (!pilotSite) return null;
  const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/gi, 'l').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const target = plain(pilotSite);
  return pilots.find((pilot) => pilot.slug === target || plain(pilot.city) === target)?.slug || null;
}

/** Picks the remembered pilot when the user still has access to it, otherwise the first one. */
export function resolveActivePilot<T extends { slug: string }>(options: T[], requested: string | null): T | null {
  return options.find((option) => option.slug === requested)
    || options.find((option) => option.slug === readStoredPilot())
    || options[0]
    || null;
}

/** allPilots: list every pilot (e.g. for public aggregate outputs such as CitiVoice), not only the user's own. */
export function usePilotContext({ allPilots = false }: { allPilots?: boolean } = {}) {
  const { user } = useAuth();
  const { role } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [options, setOptions] = useState<PilotOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !role) { setOptions([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    const load = async () => {
      const { pilots } = await apiRequest<{ pilots: PilotRow[] }>('/api/pilots');
      const toOption = (slug: string, initiativeId: number | null): PilotOption | null => {
        const pilot = pilots.find((item) => item.slug === slug);
        return pilot ? { slug, city: pilot.city, title: pilot.title, initiativeId } : null;
      };
      const ownSlug = pilotSiteToSlug(user.pilotSite, pilots);
      let initiatives: InitiativeRow[] = [];
      if (role === 'facilitator') initiatives = (await apiRequest<{ initiatives: InitiativeRow[] }>('/api/hub/facilitator-assignments')).initiatives;
      else initiatives = (await apiRequest<{ initiatives: InitiativeRow[] }>('/api/hub/initiatives')).initiatives;
      const initiativeFor = (slug: string) => initiatives.find((item) => item.pilotSlug === slug)?.id ?? null;
      let slugs: string[];
      if (role === 'admin' || allPilots) slugs = pilots.map((pilot) => pilot.slug);
      else if (role === 'citizen') slugs = ownSlug ? [ownSlug] : [];
      else slugs = [...new Set(initiatives.map((item) => item.pilotSlug).filter((slug): slug is string => Boolean(slug)))];
      if (slugs.length === 0 && ownSlug) slugs = [ownSlug];
      return slugs.map((slug) => toOption(slug, initiativeFor(slug))).filter((option): option is PilotOption => Boolean(option));
    };
    load()
      .then((result) => { if (active) setOptions(result); })
      .catch(() => { if (active) setOptions([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allPilots, role, user]);

  const requested = searchParams.get('pilot');
  const activePilot = useMemo(() => resolveActivePilot(options, requested), [options, requested]);

  const setActivePilot = useCallback((slug: string) => {
    storeActivePilot(slug);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('pilot', slug);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return { options, activePilot, setActivePilot, loading, canSwitch: options.length > 1 };
}
