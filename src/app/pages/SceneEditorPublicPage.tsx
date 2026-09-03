import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Cloud, Download, Eye, Layers, Maximize2, Move, RotateCcw, Sun, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import { apiRequest, jsonBody } from '../lib/api';
import sceneImg from '../../imports/3DSceneEditor/978fe57591ca8618c6167394fa89e245464db967.png';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

const LAYERS = [
  { id: 'base', labelKey: 'scene.layer.base', active: true },
  { id: 'buildings', labelKey: 'scene.layer.buildings', active: true },
  { id: 'vegetation', labelKey: 'scene.layer.vegetation', active: true },
  { id: 'proposals', labelKey: 'scene.layer.proposals', active: true },
  { id: 'heatmap', labelKey: 'scene.layer.heatmap', active: false },
];

const SCENARIOS = [
  { id: 'cycle', labelKey: 'scene.scenario.cycle', active: true },
  { id: 'garden', labelKey: 'scene.scenario.garden', active: false },
  { id: 'seating', labelKey: 'scene.scenario.seating', active: false },
];

export default function SceneEditorPublicPage() {
  const { t } = useI18n();
  const [layers, setLayers] = useState(LAYERS);
  const [scenarios, setScenarios] = useState(SCENARIOS);
  const [timeOfDay, setTimeOfDay] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [panMode, setPanMode] = useState(false);
  const [firstPerson, setFirstPerson] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [remoteReady, setRemoteReady] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  const activeScenario = scenarios.find((scenario) => scenario.active);
  const activeScenarioLabel = activeScenario ? t(activeScenario.labelKey as TranslationKey) : t('scene.scenario.none');
  const activeLayerCount = layers.filter((layer) => layer.active).length;
  const sceneBrightness = useMemo(() => 0.78 + (timeOfDay / 100) * 0.34, [timeOfDay]);
  const sceneWarmth = Math.abs(timeOfDay - 50) / 140;

  useEffect(() => {
    let cancelled = false;
    void apiRequest<{ state: Record<string, unknown>; updatedAt: string | null }>('/api/scene-state')
      .then(({ state }) => {
        if (cancelled) return;
        const storedLayers = state.layers && typeof state.layers === 'object' ? state.layers as Record<string, boolean> : {};
        setLayers((items) => items.map((item) => item.id in storedLayers ? { ...item, active: Boolean(storedLayers[item.id]) } : item));
        if (typeof state.scenarioId === 'string') {
          setScenarios((items) => items.map((item) => ({ ...item, active: item.id === state.scenarioId })));
        }
        if (typeof state.timeOfDay === 'number') setTimeOfDay(Math.min(100, Math.max(0, state.timeOfDay)));
        if (typeof state.zoom === 'number') setZoom(Math.min(200, Math.max(60, state.zoom)));
        if (state.pan && typeof state.pan === 'object') {
          const storedPan = state.pan as { x?: unknown; y?: unknown };
          setPan({ x: Number(storedPan.x) || 0, y: Number(storedPan.y) || 0 });
        }
        if (typeof state.firstPerson === 'boolean') setFirstPerson(state.firstPerson);
        setPersistenceStatus('saved');
        setRemoteReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPersistenceStatus('error');
          setRemoteReady(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!remoteReady) return;
    setPersistenceStatus('saving');
    const timer = window.setTimeout(() => {
      const state = {
        layers: Object.fromEntries(layers.map((layer) => [layer.id, layer.active])),
        scenarioId: scenarios.find((scenario) => scenario.active)?.id || '',
        timeOfDay,
        zoom,
        pan,
        firstPerson,
      };
      void apiRequest('/api/scene-state', { method: 'PUT', body: jsonBody({ state }) })
        .then(() => setPersistenceStatus('saved'))
        .catch(() => setPersistenceStatus('error'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [firstPerson, layers, pan, remoteReady, scenarios, timeOfDay, zoom]);

  const toggleLayer = (id: string) =>
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, active: !layer.active } : layer)));

  const selectScenario = (id: string) =>
    setScenarios((prev) => prev.map((scenario) => ({ ...scenario, active: scenario.id === id })));

  const resetView = () => {
    setZoom(100);
    setTimeOfDay(50);
    setPan({ x: 0, y: 0 });
    setPanMode(false);
    setFirstPerson(false);
  };

  const exportConfiguration = () => {
    const payload = {
      pilot: 'Thessaloniki',
      location: 'Parko Kritis',
      activeScenario: activeScenario?.id || null,
      zoom,
      timeOfDay,
      pan,
      firstPerson,
      layers: layers.map(({ id, active }) => ({ id, active })),
      exportedAt: new Date().toISOString(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `spice-scene-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t('scene.downloadedConfiguration'));
  };

  const exportImage = () => {
    const anchor = document.createElement('a');
    anchor.href = sceneImg;
    anchor.download = 'spice-parko-kritis-scene.png';
    anchor.click();
    toast.success(t('scene.downloadedImage'));
  };

  const shareScene = async () => {
    const url = `${window.location.origin}${window.location.pathname}?scenario=${encodeURIComponent(activeScenario?.id || '')}&zoom=${zoom}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('scene.linkCopied'));
    } catch {
      toast.error(t('scene.clipboardError'));
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panMode || !dragStart.current) return;
    setPan({
      x: dragStart.current.panX + event.clientX - dragStart.current.x,
      y: dragStart.current.panY + event.clientY - dragStart.current.y,
    });
  };

  const stopDragging = () => { dragStart.current = null; };

  return (
    <SpicePublicShell variant="public">
      <div style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div
          ref={sceneRef}
          className={`relative w-full overflow-hidden ${panMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
          style={{ height: '65vh', minHeight: '520px' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          <img
            src={sceneImg}
            alt={t('scene.imageAlt')}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300"
            style={{
              transform: `translate(${pan.x}px, ${pan.y + (firstPerson ? 54 : 0)}px) scale(${(zoom / 100) * (firstPerson ? 1.34 : 1)})`,
              filter: `brightness(${sceneBrightness}) saturate(${layers.find((layer) => layer.id === 'vegetation')?.active ? 1 : 0.45})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(246,139,44,${sceneWarmth})` }} />
          {!layers.find((layer) => layer.id === 'buildings')?.active && <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />}
          {layers.find((layer) => layer.id === 'heatmap')?.active && (
            <div className="absolute left-[18%] top-[28%] h-36 w-56 rounded-full bg-[#f68b2c]/35 blur-2xl" />
          )}

          <div className="absolute top-5 left-5 w-[200px] sm:w-[220px] flex flex-col gap-3">
            <div className="bg-white bg-opacity-95 p-4 shadow-lg">
              <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-1">{t('scene.activePilot')}</p>
              <p className="text-[14px] font-bold text-[#444]">Thessaloniki</p>
              <p className="text-[12px] text-[#888]">Parko Kritis</p>
              <p className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${persistenceStatus === 'error' ? 'text-red-700' : 'text-[#637948]'}`} role="status">
                {persistenceStatus === 'loading' ? t('scene.loading') : persistenceStatus === 'saving' ? t('scene.saving') : persistenceStatus === 'error' ? t('scene.saveFailed') : t('scene.saved')}
              </p>
            </div>

            <div className="bg-white bg-opacity-95 p-4 shadow-lg">
              <p className="text-[12px] font-semibold text-[#444] mb-3 uppercase tracking-wide">{t('scene.scenarios')}</p>
              <div className="flex flex-col gap-2">
                {scenarios.map((scenario) => (
                  <label key={scenario.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="scene-scenario" checked={scenario.active} onChange={() => selectScenario(scenario.id)} className="accent-[#f68b2c]" />
                    <span className="text-[13px] text-[#444]">{t(scenario.labelKey as TranslationKey)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white bg-opacity-95 p-4 shadow-lg">
              <p className="text-[12px] font-semibold text-[#444] mb-3 uppercase tracking-wide flex items-center gap-2">
                <Layers size={13} /> {t('scene.layers')}
              </p>
              <div className="flex flex-col gap-2">
                {layers.map((layer) => (
                  <label key={layer.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={layer.active} onChange={() => toggleLayer(layer.id)} className="accent-[#f68b2c]" />
                    <span className="text-[12px] text-[#444]">{t(layer.labelKey as TranslationKey)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white bg-opacity-95 p-4 shadow-lg">
              <p className="text-[12px] font-semibold text-[#444] mb-2 uppercase tracking-wide flex items-center gap-2">
                <Sun size={13} /> {t('scene.timeOfDay')}
              </p>
              <input type="range" min={0} max={100} value={timeOfDay} onChange={(event) => setTimeOfDay(Number(event.target.value))} className="w-full accent-[#f68b2c]" />
              <div className="flex justify-between text-[10px] text-[#888] mt-1">
                <span>{t('scene.dawn')}</span><span>{t('scene.noon')}</span><span>{t('scene.dusk')}</span>
              </div>
            </div>
          </div>

          <div className="absolute top-5 right-5 flex flex-col gap-2">
            {[
              { icon: ZoomIn, labelKey: 'scene.zoomIn', onClick: () => setZoom((value) => Math.min(value + 10, 200)) },
              { icon: ZoomOut, labelKey: 'scene.zoomOut', onClick: () => setZoom((value) => Math.max(value - 10, 60)) },
              { icon: RotateCcw, labelKey: 'scene.resetView', onClick: resetView, active: false },
              { icon: Move, labelKey: 'scene.pan', onClick: () => setPanMode((value) => !value), active: panMode },
              { icon: Eye, labelKey: 'scene.firstPerson', onClick: () => setFirstPerson((value) => !value), active: firstPerson },
              { icon: Maximize2, labelKey: 'scene.fullscreen', onClick: () => sceneRef.current?.requestFullscreen(), active: false },
            ].map(({ icon: Icon, labelKey, onClick, active }) => (
              <button
                type="button"
                key={labelKey}
                title={t(labelKey as TranslationKey)}
                aria-label={t(labelKey as TranslationKey)}
                onClick={onClick}
                className={`w-10 h-10 bg-white bg-opacity-95 flex cursor-pointer items-center justify-center shadow-md hover:bg-[#fdf4ea] transition-colors ${active ? 'text-[#ca7428] ring-2 ring-[#ca7428]' : ''}`}
                aria-pressed={labelKey === 'scene.pan' || labelKey === 'scene.firstPerson' ? active : undefined}
              >
                <Icon size={16} className="text-[#444]" />
              </button>
            ))}
          </div>

          <div className="absolute bottom-5 right-5">
            <button
              type="button"
              onClick={exportConfiguration}
              className="flex cursor-pointer items-center gap-2 px-4 py-2.5 bg-[#f68b2c] text-white text-[13px] font-semibold shadow-lg hover:bg-[#e07a20] transition-colors"
            >
              <Download size={15} /> {t('scene.export')}
            </button>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white bg-opacity-90 px-3 py-1.5 rounded-full text-[12px] font-medium text-[#444] shadow">
            {t('scene.zoomValue', { zoom })}
          </div>
        </div>

        <div className="spice-page spice-wide-page grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border-2 border-[#bfc0c5] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Box size={18} className="text-[#ca7428]" />
              <p className="text-[15px] font-bold text-[#444]">{t('scene.details')}</p>
            </div>
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between gap-3"><span className="text-[#888]">{t('scene.pilot')}</span><span className="font-semibold text-[#444]">Thessaloniki</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#888]">{t('scene.location')}</span><span className="font-semibold text-[#444]">Parko Kritis</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#888]">{t('scene.phase')}</span><span className="font-semibold text-[#444]">{t('scene.phaseValue')}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#888]">{t('scene.activeScenario')}</span><span className="font-semibold text-[#ca7428] text-right">{activeScenarioLabel}</span></div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#bfc0c5] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Cloud size={18} className="text-[#ca7428]" />
              <p className="text-[15px] font-bold text-[#444]">{t('scene.environment')}</p>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[12px] text-[#888] mb-1">{t('scene.timeOfDay')}</p>
                <input type="range" min={0} max={100} value={timeOfDay} onChange={(event) => setTimeOfDay(Number(event.target.value))} className="w-full accent-[#f68b2c]" />
              </div>
              <div>
                <p className="text-[12px] text-[#888] mb-1">{t('scene.visibleLayers')}</p>
                <p className="text-[15px] font-semibold text-[#444]">{t('scene.layerCount', { active: activeLayerCount, total: layers.length })}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#bfc0c5] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Download size={18} className="text-[#ca7428]" />
              <p className="text-[15px] font-bold text-[#444]">{t('scene.exportOptions')}</p>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { labelKey: 'scene.exportConfiguration', action: exportConfiguration },
                { labelKey: 'scene.downloadImage', action: exportImage },
                { labelKey: 'scene.copyLink', action: shareScene },
              ].map((option) => (
                <button
                  type="button"
                  key={option.labelKey}
                  onClick={option.action}
                  className="w-full cursor-pointer py-2.5 border border-gray-200 text-[13px] font-medium text-[#444] hover:bg-[#fdf4ea] hover:border-[#ca7428] transition-colors"
                >
                  {t(option.labelKey as TranslationKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SpicePublicShell>
  );
}
