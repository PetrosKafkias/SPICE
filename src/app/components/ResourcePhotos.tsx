import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Check, Clock, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { apiRequest, jsonBody } from '../lib/api';
import { usePilotContext } from '../lib/activePilot';
import PilotSelector from './PilotSelector';

interface ResourcePhoto {
  id: number;
  caption: string;
  status: 'pending' | 'published';
  pilot: string | null;
  createdAt: string;
  publishedAt: string | null;
  imageUrl: string;
  canPublish: boolean;
  canDelete: boolean;
}

interface PhotosResponse {
  photos: ResourcePhoto[];
  access: { canUpload: boolean; publishesDirectly: boolean };
}

// Must stay below the server's 1 MB request body limit once wrapped in JSON.
const MAX_DATA_URL_LENGTH = 900_000;
const COMPRESSION_STEPS = [
  { maxSide: 1600, quality: 0.82 },
  { maxSide: 1280, quality: 0.75 },
  { maxSide: 960, quality: 0.7 },
];

async function compressImage(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    for (const { maxSide, quality } of COMPRESSION_STEPS) {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ResourcePhotos({ toolId }: { toolId: string }) {
  const { user } = useAuth();
  const { t, formatDate } = useI18n();
  const [data, setData] = useState<PhotosResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Facilitators assigned to several pilots choose which pilot a photo documents.
  const { options: pilotOptions, activePilot, setActivePilot } = usePilotContext();
  const uploadPilots = pilotOptions.filter((pilot) => pilot.initiativeId);

  const load = useCallback(async () => {
    try {
      setData(await apiRequest<PhotosResponse>(`/api/resources/${toolId}/photos`));
    } catch {
      setData(null);
    }
  }, [toolId]);

  useEffect(() => {
    if (user) load();
    else setData(null);
  }, [user, load]);

  if (!user || !data) return null;

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      let imageData: string | null;
      try {
        imageData = await compressImage(file);
      } catch {
        toast.error(t('toolDetail.photos.invalidFile'));
        return;
      }
      if (!imageData) {
        toast.error(t('toolDetail.photos.tooLarge'));
        return;
      }
      await apiRequest(`/api/resources/${toolId}/photos`, { method: 'POST', body: jsonBody({ imageData, caption, initiativeId: activePilot?.initiativeId || undefined }) });
      toast.success(t(data.access.publishesDirectly ? 'toolDetail.photos.shared' : 'toolDetail.photos.sentForApproval'));
      setFile(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch {
      toast.error(t('toolDetail.photos.failed'));
    } finally {
      setBusy(false);
    }
  };

  const approve = async (photoId: number) => {
    try {
      await apiRequest(`/api/resources/photos/${photoId}`, { method: 'PATCH', body: jsonBody({ status: 'published' }) });
      toast.success(t('toolDetail.photos.approved'));
      await load();
    } catch {
      toast.error(t('toolDetail.photos.failed'));
    }
  };

  const remove = async (photoId: number) => {
    if (!window.confirm(t('toolDetail.photos.confirmDelete'))) return;
    try {
      await apiRequest(`/api/resources/photos/${photoId}`, { method: 'DELETE' });
      toast.success(t('toolDetail.photos.deleted'));
      await load();
    } catch {
      toast.error(t('toolDetail.photos.failed'));
    }
  };

  return (
    <section aria-labelledby="resource-photos-title" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 id="resource-photos-title" className="flex items-center gap-2 text-[18px] font-bold text-[#444]">
          <Camera size={20} className="text-[#ca7428]" aria-hidden="true" />{t('toolDetail.photos.title')}
        </h2>
        <p className="mt-1 text-[13px] text-[#777]">{t('toolDetail.photos.subtitle')}</p>
      </div>
      <div className="grid gap-6 p-6">
        {data.access.canUpload && (
          <form onSubmit={upload} className="grid gap-3 border-2 border-dashed border-[#e4c9a4] bg-[#fffaf4] p-4">
            <PilotSelector id="resource-photo-pilot" className="sm:max-w-xs" options={uploadPilots.map((pilot) => ({ value: pilot.slug, label: `${pilot.city} · ${pilot.title}` }))} value={activePilot?.slug || ''} onChange={setActivePilot} />
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <label className="inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 border-2 border-[#444] bg-white px-4 text-[13px] font-bold text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ca7428]">
                <ImagePlus size={16} className="flex-none" aria-hidden="true" />
                <span className="truncate">{file ? file.name : t('toolDetail.photos.choose')}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <input
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={200}
                placeholder={t('toolDetail.photos.captionPlaceholder')}
                aria-label={t('toolDetail.photos.captionLabel')}
                className="min-h-11 min-w-0 border-2 border-[#bfc0c5] bg-white px-3 text-[13px] text-[#444] placeholder:text-[#999] focus:border-[#ca7428] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-[#777]">{t(data.access.publishesDirectly ? 'toolDetail.photos.publishesDirectlyHint' : 'toolDetail.photos.reviewHint')}</p>
              <button
                type="submit"
                disabled={!file || busy}
                className="min-h-11 cursor-pointer bg-[#ca7428] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#b86620] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? t('toolDetail.photos.uploading') : t('toolDetail.photos.submit')}
              </button>
            </div>
          </form>
        )}

        {data.photos.length === 0 ? (
          <p className="text-[14px] text-[#777]">{t('toolDetail.photos.empty')}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.photos.map((photo) => (
              <li key={photo.id} className="flex flex-col overflow-hidden rounded-lg border border-gray-200">
                <a href={photo.imageUrl} target="_blank" rel="noopener noreferrer" className="relative block aspect-[4/3] bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]">
                  <img src={photo.imageUrl} alt={photo.caption || t('toolDetail.photos.alt')} loading="lazy" className="h-full w-full object-cover" />
                  {photo.status === 'pending' && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#a85f20] shadow-sm">
                      <Clock size={12} aria-hidden="true" />{t('toolDetail.photos.pending')}
                    </span>
                  )}
                </a>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  {photo.caption && <p className="text-[13px] font-semibold text-[#444]">{photo.caption}</p>}
                  <p className="text-[12px] text-[#777]">
                    {[photo.pilot, formatDate(photo.publishedAt || photo.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(' · ')}
                  </p>
                  {(photo.canPublish || photo.canDelete) && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-2">
                      {photo.canPublish && (
                        <button type="button" onClick={() => approve(photo.id)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 bg-[#2e6e45] px-3 text-[12px] font-bold text-white hover:bg-[#25593a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]">
                          <Check size={14} aria-hidden="true" />{t('toolDetail.photos.approve')}
                        </button>
                      )}
                      {photo.canDelete && (
                        <button type="button" onClick={() => remove(photo.id)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 border-2 border-[#bfc0c5] bg-white px-3 text-[12px] font-bold text-[#444] hover:border-[#c0392b] hover:text-[#c0392b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b]">
                          <Trash2 size={14} aria-hidden="true" />{t('toolDetail.photos.delete')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
