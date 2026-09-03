import { useCallback, useEffect, useState, type ElementType } from 'react';
import {
  AlignLeft,
  ArrowLeftRight,
  Contrast,
  Droplet,
  ImageOff,
  Info,
  Link,
  List,
  MousePointer2,
  PauseCircle,
  Play,
  RotateCcw,
  Settings,
  Type,
  X,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

interface AccessibilityState {
  contrast: boolean;
  highlightLinks: boolean;
  biggerText: boolean;
  textSpacing: boolean;
  pauseAnimations: boolean;
  hideImages: boolean;
  dyslexiaFriendly: boolean;
  cursor: boolean;
  tooltips: boolean;
  lineHeight: boolean;
  textAlign: boolean;
  saturation: boolean;
  oversizedWidget: boolean;
}

const DEFAULT_STATE: AccessibilityState = {
  contrast: false,
  highlightLinks: false,
  biggerText: false,
  textSpacing: false,
  pauseAnimations: false,
  hideImages: false,
  dyslexiaFriendly: false,
  cursor: false,
  tooltips: false,
  lineHeight: false,
  textAlign: false,
  saturation: false,
  oversizedWidget: false,
};

const BODY_CLASSES: Partial<Record<keyof AccessibilityState, string>> = {
  contrast: 'spice-a11y-contrast',
  highlightLinks: 'spice-a11y-highlight-links',
  biggerText: 'spice-a11y-bigger-text',
  textSpacing: 'spice-a11y-text-spacing',
  pauseAnimations: 'spice-a11y-pause-motion',
  hideImages: 'spice-a11y-hide-images',
  dyslexiaFriendly: 'spice-a11y-readable-font',
  cursor: 'spice-a11y-large-cursor',
  lineHeight: 'spice-a11y-line-height',
  textAlign: 'spice-a11y-left-align',
  saturation: 'spice-a11y-low-saturation',
};

const ITEMS: { key: keyof AccessibilityState; labelKey: TranslationKey; icon: ElementType; badge?: string }[] = [
  { key: 'contrast', labelKey: 'accessibility.contrast', icon: Contrast },
  { key: 'highlightLinks', labelKey: 'accessibility.highlightLinks', icon: Link },
  { key: 'biggerText', labelKey: 'accessibility.biggerText', icon: Type },
  { key: 'textSpacing', labelKey: 'accessibility.textSpacing', icon: ArrowLeftRight },
  { key: 'pauseAnimations', labelKey: 'accessibility.pauseAnimations', icon: PauseCircle },
  { key: 'hideImages', labelKey: 'accessibility.hideImages', icon: ImageOff },
  { key: 'dyslexiaFriendly', labelKey: 'accessibility.dyslexiaFriendly', icon: Type, badge: 'i' },
  { key: 'cursor', labelKey: 'accessibility.cursor', icon: MousePointer2 },
  { key: 'tooltips', labelKey: 'accessibility.tooltips', icon: Info },
  { key: 'lineHeight', labelKey: 'accessibility.lineHeight', icon: List },
  { key: 'textAlign', labelKey: 'accessibility.textAlign', icon: AlignLeft },
  { key: 'saturation', labelKey: 'accessibility.saturation', icon: Droplet },
];

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  docked?: boolean;
}

export default function AccessibilityWidget({ open: controlledOpen, onOpenChange, docked = false }: Props) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback((value: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  }, [controlledOpen, onOpenChange]);
  const [state, setState] = useState<AccessibilityState>(DEFAULT_STATE);

  useEffect(() => {
    const handler = () => setOpen(true);
    const keyHandler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('accessibility-open', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('accessibility-open', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [setOpen]);

  useEffect(() => {
    Object.entries(BODY_CLASSES).forEach(([key, className]) => {
      document.body.classList.toggle(className, Boolean(state[key as keyof AccessibilityState]));
    });

    return () => {
      Object.values(BODY_CLASSES).forEach((className) => document.body.classList.remove(className));
    };
  }, [state]);

  const toggle = (key: keyof AccessibilityState) =>
    setState((prev) => ({ ...prev, [key]: !prev[key] }));

  const resetAll = () => setState(DEFAULT_STATE);

  return (
    <>
      {open && (
        <div
          className={`spice-a11y-widget fixed z-[70] flex flex-col overflow-hidden rounded-lg bg-[#e9edf2] shadow-[0_8px_40px_rgba(0,0,0,0.28)] transition-[opacity,transform] duration-250 motion-reduce:transition-none ${
            docked ? 'bottom-[104px] left-3 sm:left-6 max-sm:bottom-[92px]' : 'bottom-24 left-3 sm:left-6'
          }`}
          style={{
            width: state.oversizedWidget ? 'min(340px, calc(100vw - 24px))' : 'min(264px, calc(100vw - 24px))',
            maxHeight: 'calc(100vh - 7rem)',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          <div className="flex items-center justify-between bg-[#ca7428] px-3 py-2 text-white">
            <p className="text-[12px] font-bold">{t('accessibility.menu')}</p>
            <button
              onClick={() => setOpen(false)}
              title={t('accessibility.close')}
              aria-label={t('accessibility.close')}
              className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#a95f20] text-white"
            >
              <X size={17} />
            </button>
          </div>

          <div className="overflow-y-auto px-3 py-3">
            <button className="mb-3 flex w-full items-center justify-center gap-8 rounded-md bg-[#ca7428] px-3 py-2 text-[12px] font-bold text-white">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#a95f20]">
                <Play size={11} fill="white" />
              </span>
              {t('accessibility.howItWorks')}
            </button>

            <div className="mb-3 flex items-center justify-between text-[12px] font-medium text-black">
              <span>{t('accessibility.oversized')}</span>
              <button
                onClick={() => toggle('oversizedWidget')}
                aria-pressed={state.oversizedWidget}
                className="relative h-5 w-10 rounded-full bg-[#223661]"
              >
                <span
                  className="absolute top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white text-[#223661] transition-transform"
                  style={{ left: state.oversizedWidget ? 22 : 3 }}
                >
                  <X size={11} />
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ITEMS.map(({ key, labelKey, icon: Icon, badge }) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  aria-pressed={Boolean(state[key])}
                  className="relative flex h-[86px] flex-col items-center justify-center gap-2 rounded-md bg-white px-2 text-center text-black transition-colors hover:bg-[#f7fff9]"
                  style={{ outline: state[key] ? '2px solid #ca7428' : undefined }}
                >
                  {badge && (
                    <span className="absolute left-2 top-2 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#d8f0ee] text-[10px] font-bold text-[#426b6a]">
                      {badge}
                    </span>
                  )}
                  <Icon size={26} strokeWidth={1.9} />
                  <span className="text-[11px] font-bold leading-tight">{t(labelKey)}</span>
                </button>
              ))}
            </div>

            <button
              onClick={resetAll}
              className="mt-3 flex w-full items-center justify-center gap-3 rounded-md bg-[#ca7428] px-3 py-2 text-[11px] font-bold text-white"
            >
              <RotateCcw size={15} /> {t('accessibility.reset')}
            </button>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 flex items-center gap-3 text-[11px] font-medium text-black"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ca7428] text-white">
                <Settings size={15} />
              </span>
              {t('accessibility.moveHide')}
              <span className="text-[14px]">›</span>
            </button>
          </div>

          <div className="mt-auto flex items-center justify-between bg-white px-3 py-2">
            <button className="rounded-full bg-[#ca7428] px-2 py-1 text-[10px] font-bold text-white">{t('accessibility.manage')}</button>
            <div className="flex items-center gap-2">
              <span className="text-[30px] font-bold leading-none text-[#1f63ff]">U</span>
              <div>
                <p className="text-[16px] font-black leading-none text-black">USERWAY</p>
                <p className="text-[7px] font-bold leading-none text-black">{t('accessibility.company')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
