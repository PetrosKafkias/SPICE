import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { apiRequest, ApiError, jsonBody } from '../lib/api';
import { FieldGroup, FieldMessage, FormField } from './FormLayout';

const SUS_KEYS = ['sus1','sus2','sus3','sus4','sus5','sus6','sus7','sus8','sus9','sus10'] as const;

export default function FeedbackForm({ source, includeSus = false }: { source: 'footer' | 'account'; includeSus?: boolean }) {
  const { t } = useI18n();
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [sus, setSus] = useState<number[]>(Array(10).fill(0));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const complete = Boolean(category && rating && message.trim().length >= 10 && (!includeSus || sus.every(Boolean)));
  const required = <><span className="text-[#b42318]" aria-hidden="true"> *</span><span className="sr-only"> ({t('common.required')})</span></>;
  const error = (field: string) => errors[field] && <FieldMessage id={`feedback-${field}-error`} tone="error" className="mt-2">{errors[field]}</FieldMessage>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setErrors({}); setSubmitting(true);
    try {
      await apiRequest('/api/feedback', { method: 'POST', body: jsonBody({ category, rating, message, source, ...(includeSus ? { sus } : {}) }) });
      setSubmitted(true); setCategory(''); setRating(0); setMessage(''); setSus(Array(10).fill(0));
    } catch (caught) {
      const apiError = caught as ApiError;
      setErrors(apiError.fieldErrors || { form: apiError.message || t('common.error') });
    } finally { setSubmitting(false); }
  };

  if (submitted) return <div className="flex items-start gap-3 border-l-4 border-[#5f7d3d] bg-[#f3faec] p-5 text-[#33451f]" role="status" aria-live="polite"><CheckCircle2 size={24} className="flex-none" aria-hidden="true" /><div><h3 className="font-bold">{t('feedback.thankYou')}</h3><p className="mt-1 text-[14px]">{t('feedback.confirmation')}</p><button type="button" onClick={() => setSubmitted(false)} className="mt-3 cursor-pointer font-semibold text-[#ca7428] underline">{t('feedback.sendAnother')}</button></div></div>;

  return <form onSubmit={submit} className="grid gap-5" noValidate>
    {error('form')}
    {includeSus && <fieldset className="border-2 border-[#ddd] p-4 md:p-5"><legend className="px-2 text-[18px] font-bold text-[#444]">{t('feedback.susTitle')}{required}</legend><p className="mb-5 text-[13px] leading-relaxed text-[#666]">{t('feedback.susHelp')}</p><div className="grid gap-5">{SUS_KEYS.map((key, index) => <fieldset key={key} className="grid gap-2 border-b border-[#ddd] pb-5 last:border-0 last:pb-0"><legend className="text-[14px] font-semibold leading-relaxed text-[#333]">{index + 1}. {t(`feedback.${key}` as Parameters<typeof t>[0])}</legend><div className="flex flex-wrap gap-2" aria-label={t(`feedback.${key}` as Parameters<typeof t>[0])}>{[1,2,3,4,5].map((value) => <label key={value} className={`grid h-10 min-w-10 cursor-pointer place-items-center border-2 px-2 text-[13px] font-bold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ca7428] ${sus[index] === value ? 'border-[#ca7428] bg-[#ca7428] text-white' : 'border-[#777] bg-white text-[#444] hover:border-[#ca7428]'}`}><input type="radio" name={`sus-${index}`} value={value} checked={sus[index] === value} onChange={() => { setSus((current) => current.map((item, itemIndex) => itemIndex === index ? value : item)); setErrors((current) => ({...current, sus: ''})); }} className="sr-only" required/><span>{value}</span></label>)}</div></fieldset>)}</div>{error('sus')}</fieldset>}
    <FormField className="text-[15px] font-semibold text-[#333]"><span>{t('feedback.type')}{required}</span>
      <select id={`feedback-category-${source}`} required value={category} onChange={(event) => { setCategory(event.target.value); setErrors((current) => ({...current, category: ''})); }} className={`mt-2 min-h-[48px] w-full cursor-pointer border-2 bg-white px-4 text-[15px] outline-none focus:border-[#ca7428] ${errors.category ? 'border-red-600' : 'border-[#555]'}`} aria-invalid={!!errors.category} aria-describedby={errors.category ? 'feedback-category-error' : undefined}>
        <option value="">{t('feedback.selectType')}</option><option value="general">{t('feedback.general')}</option><option value="technical">{t('feedback.technical')}</option><option value="improvement">{t('feedback.improvement')}</option>
      </select>{error('category')}</FormField>
    <FieldGroup><fieldset><legend className="text-[15px] font-semibold text-[#333]">{t('feedback.rating')}{required}</legend><p className="mt-1 text-[13px] text-[#666]">{t('feedback.ratingHelp')}</p>
      <div className="mt-3 flex flex-wrap gap-2">{[1,2,3,4,5].map((value) => <label key={value} className={`grid h-11 w-11 cursor-pointer place-items-center border-2 font-bold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ca7428] ${rating === value ? 'border-[#ca7428] bg-[#ca7428] text-white' : 'border-[#555] bg-white text-[#333] hover:border-[#ca7428]'}`}><input type="radio" name={`feedback-rating-${source}`} value={value} checked={rating === value} onChange={() => { setRating(value); setErrors((current) => ({...current, rating: ''})); }} className="sr-only" required/><span aria-hidden="true">{value}</span><span className="sr-only">{value} {t('feedback.outOfFive')}</span></label>)}</div>{error('rating')}</fieldset>
    </FieldGroup>
    <FormField className="text-[15px] font-semibold text-[#333]"><span>{t('feedback.message')}{required}</span><textarea id={`feedback-message-${source}`} required minLength={10} maxLength={2000} rows={5} value={message} onChange={(event) => { setMessage(event.target.value); setErrors((current) => ({...current, message: ''})); }} placeholder={t('feedback.messagePlaceholder')} className={`mt-2 w-full resize-y border-2 bg-white p-4 text-[15px] leading-relaxed outline-none focus:border-[#ca7428] ${errors.message ? 'border-red-600' : 'border-[#555]'}`} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'feedback-message-error' : 'feedback-message-help'}/><div className="mt-1 flex justify-between gap-3 text-[12px] font-normal text-[#666]"><span id="feedback-message-help">{t('feedback.minimum')}</span><span>{message.length}/2000</span></div>{error('message')}</FormField>
    <button type="submit" disabled={!complete || submitting} className="flex min-h-[48px] w-fit cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-6 font-semibold text-white hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444] disabled:cursor-not-allowed disabled:bg-[#d5d5d5] disabled:text-[#737373]"><Send size={18} aria-hidden="true" />{submitting ? t('feedback.submitting') : t('feedback.submit')}</button>
  </form>;
}
