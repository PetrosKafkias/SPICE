import { useEffect, useMemo, useState } from 'react';
import { Landmark, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../context/I18nContext';
import { apiRequest, jsonBody } from '../lib/api';
import type { Tool } from '../data/tools';
import { DIGITAL_TOOL_IDS, recommendedResourceIds, resolveSpiceResource, type SpiceResource } from '../data/spiceResources';

interface Props {
  initiativeId: number;
  phaseNumber: number;
  enabledTools: string[];
  municipalityNotes: string;
  municipalityToolNotes: Record<string, string>;
  tools: Tool[];
  onSaved: () => Promise<void>;
}

export default function ObjectiveToolSelection({ initiativeId, phaseNumber, enabledTools, municipalityNotes, municipalityToolNotes, tools, onSaved }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string[]>(enabledTools);
  const [objectiveNotes, setObjectiveNotes] = useState(municipalityNotes);
  const [toolNotes, setToolNotes] = useState<Record<string, string>>(municipalityToolNotes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(enabledTools);
    setObjectiveNotes(municipalityNotes);
    setToolNotes(municipalityToolNotes);
  }, [enabledTools, municipalityNotes, municipalityToolNotes]);

  const recommendedIds = useMemo(() => recommendedResourceIds(phaseNumber, tools), [phaseNumber, tools]);
  const resolve = (ids: string[]) => ids.map((id) => resolveSpiceResource(id, tools, t)).filter((item): item is SpiceResource => Boolean(item));
  const recommended = resolve(recommendedIds);
  const others = resolve([...new Set([...DIGITAL_TOOL_IDS, ...selected])].filter((id) => !recommendedIds.includes(id)));

  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...enabledTools].sort())
    || objectiveNotes.trim() !== municipalityNotes.trim()
    || selected.some((id) => (toolNotes[id] || '').trim() !== (municipalityToolNotes[id] || '').trim());

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest(`/api/hub/initiatives/${initiativeId}/phases/${phaseNumber}`, {
        method: 'PATCH',
        body: jsonBody({
          enabledTools: selected,
          municipalityNotes: objectiveNotes,
          municipalityToolNotes: Object.fromEntries(selected.map((id) => [id, toolNotes[id] || ''])),
        }),
      });
      await onSaved();
      toast.success(t('phaseDetail.toolSelectionSaved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const renderGroup = (title: string, resources: SpiceResource[], isRecommended: boolean) => resources.length > 0 && (
    <fieldset className="mt-6">
      <legend className="text-[15px] font-bold text-[#444]">{title}</legend>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {resources.map((resource) => {
          const checked = selected.includes(resource.id);
          return (
            <li key={resource.id} className={`border-2 p-4 ${checked ? 'border-[#f68b2c] bg-[#fffaf4]' : 'border-[#d5d6da] bg-white'}`}>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={checked} onChange={() => toggle(resource.id)} className="mt-1 h-4 w-4 flex-none accent-[#ca7428]" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-bold text-[#444]">{resource.name}</span>
                    <span className="bg-[#eef0f3] px-2 py-0.5 text-[11px] font-semibold text-[#555]">{t(resource.kind === 'digital' ? 'phaseDetail.kindDigital' : 'phaseDetail.kindAnalog')}</span>
                    {isRecommended && <span className="bg-[#e7f2df] px-2 py-0.5 text-[11px] font-bold text-[#47662f]">{t('phaseDetail.recommendedTag')}</span>}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-[#666]">{resource.description}</span>
                  <span className="mt-1 block text-[12px] font-semibold text-[#a85f20]">{t(checked ? 'phaseDetail.toolSelected' : 'phaseDetail.toolNotSelected')}</span>
                </span>
              </label>
              {checked && (
                <label className="mt-3 block text-[12px] font-bold text-[#31556f]">
                  {t('phaseDetail.toolNoteLabel')}
                  <textarea
                    value={toolNotes[resource.id] || ''}
                    onChange={(event) => setToolNotes((current) => ({ ...current, [resource.id]: event.target.value }))}
                    rows={2}
                    className="mt-1.5 w-full resize-y border-2 border-[#c9d8e4] bg-white p-2.5 text-[13px] font-normal text-[#444] focus:border-[#4e789b] focus:outline-none"
                    placeholder={t('phaseDetail.toolNotePlaceholder')}
                  />
                </label>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );

  return (
    <section className="mt-8 border-t-2 border-[#eee] pt-7" aria-labelledby="tool-selection-title">
      <h2 id="tool-selection-title" className="text-[22px] font-bold text-[#444]">{t('hub.toolsHeadingManage', { phase: phaseNumber })}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#666]">{t('phaseDetail.toolSelectionText')}</p>

      <label className="mt-5 block max-w-3xl border-l-4 border-[#4e789b] bg-[#f1f7fb] p-4 text-[13px] font-bold text-[#31556f]">
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-wide"><Landmark size={14} aria-hidden="true" />{t('phaseDetail.municipalityNotesLabel')}</span>
        <textarea
          value={objectiveNotes}
          onChange={(event) => setObjectiveNotes(event.target.value)}
          rows={3}
          className="mt-2 w-full resize-y border-2 border-[#c9d8e4] bg-white p-3 text-[14px] font-normal text-[#444] focus:border-[#4e789b] focus:outline-none"
          placeholder={t('phaseDetail.municipalityNotesPlaceholder')}
        />
      </label>

      {renderGroup(t('phaseDetail.recommendedGroup'), recommended, true)}
      {renderGroup(t('phaseDetail.otherResourcesGroup'), others, false)}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#df771d] disabled:cursor-not-allowed disabled:opacity-50">
          <Save size={16} aria-hidden="true" />{t('phaseDetail.saveToolSelection')}
        </button>
        <p className="text-[12px] font-semibold text-[#777]">{t('phaseDetail.toolSelectionCount', { count: selected.length })}</p>
      </div>
    </section>
  );
}
