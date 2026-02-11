/**
 * Google Cloud Translation API v2 (REST).
 * Uses API key from VITE_GOOGLE_TRANSLATE_API_KEY.
 * For production, consider proxying through your backend to keep the key server-side.
 */

const API_KEY =
  (import.meta as { env?: { VITE_GOOGLE_TRANSLATE_API_KEY?: string } }).env?.VITE_GOOGLE_TRANSLATE_API_KEY || '';

const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';

export type TranslateTarget =
  | 'en'
  | 'ko'
  | 'ja'
  | 'zh-CN'
  | 'es'
  | 'fr';

/** Map i18n language code to Google Translate target code */
export function i18nToTranslateTarget(lang: string): TranslateTarget {
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('zh')) return 'zh-CN';
  return 'en';
}

export interface TranslateResponse {
  translatedText: string;
  detectedSourceLanguage?: string;
}

/**
 * Translate one or more text strings to the target language.
 * Empty strings are skipped and returned as empty in the same order.
 * Max 128 strings per request.
 */
export async function translateText(
  texts: string[],
  target: TranslateTarget,
  source?: string
): Promise<TranslateResponse[]> {
  if (!API_KEY) {
    throw new Error('Google Translate API key is not configured. Add VITE_GOOGLE_TRANSLATE_API_KEY to .env.local');
  }

  const trimmed = texts.map((t) => (t || '').trim());
  const toTranslate = trimmed.filter((s) => s.length > 0);

  if (toTranslate.length === 0) {
    return trimmed.map((t) => ({ translatedText: t }));
  }

  const params = new URLSearchParams();
  params.set('key', API_KEY);
  params.set('target', target);
  params.set('format', 'text');
  toTranslate.forEach((q) => params.append('q', q));
  if (source) params.set('source', source);

  const url = `${ENDPOINT}?${params.toString()}`;
  const res = await fetch(url, { method: 'GET' });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Translate API error ${res.status}: ${errBody || res.statusText}`);
  }

  const json = await res.json();
  const list = json?.data?.translations as Array<{ translatedText: string; detectedSourceLanguage?: string }> | undefined;
  if (!Array.isArray(list) || list.length !== toTranslate.length) {
    throw new Error('Invalid translate API response');
  }

  const results: TranslateResponse[] = [];
  let listIdx = 0;
  for (let i = 0; i < texts.length; i++) {
    const raw = trimmed[i];
    if (raw.length === 0) {
      results.push({ translatedText: '' });
    } else {
      results.push({
        translatedText: list[listIdx].translatedText,
        detectedSourceLanguage: list[listIdx].detectedSourceLanguage,
      });
      listIdx += 1;
    }
  }
  return results;
}

/**
 * Translate a single string.
 */
export async function translate(text: string, target: TranslateTarget, source?: string): Promise<string> {
  const [result] = await translateText([text], target, source);
  return result.translatedText;
}
