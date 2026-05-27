import axios from 'axios';
import { loadCredentials } from '../storage/credentialsStore.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-lite'];

export async function generateGeminiText(userId, prompt) {
  const credentials = await loadCredentials(userId);
  const apiKey = credentials.geminiApiKey;

  if (!apiKey) {
    throw new Error('API Key de Gemini no encontrada. Configurala en la pestaña Credenciales.');
  }

  const models = [
    process.env.GEMINI_MODEL || DEFAULT_MODEL,
    ...FALLBACK_MODELS
  ].filter((model, index, all) => model && all.indexOf(model) === index);

  let lastError;

  for (const model of models) {
    try {
      return await generateWithModel({ apiKey, model, prompt });
    } catch (error) {
      lastError = error;

      if (!shouldTryFallback(error)) {
        break;
      }

      console.warn(`[Gemini] ${model} unavailable, trying fallback model.`, error.message);
    }
  }

  throw lastError;
}

async function generateWithModel({ apiKey, model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) throw new Error('No se obtuvo respuesta de la IA.');

    return result.trim();
  } catch (error) {
    let msg = error.response?.data?.error?.message || error.message;

    if (isQuotaError(error, msg)) {
      msg = 'Has superado el limite gratuito de Gemini. Espera unos segundos y vuelve a intentar.';
    }

    console.error('[Gemini] Error:', msg);
    const nextError = new Error(msg);
    nextError.status = error.response?.status;
    nextError.originalMessage = error.response?.data?.error?.message || error.message;
    throw nextError;
  }
}

function shouldTryFallback(error) {
  const msg = (error.originalMessage || error.message || '').toLowerCase();
  return error.status === 503 ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable');
}

function isQuotaError(error, message = '') {
  const msg = message.toLowerCase();
  return error.response?.status === 429 ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource exhausted');
}

export async function summarizeText(userId, text, type = 'corto') {
  const prompt = type === 'detallado'
    ? `Resumen detallado en espanol, con puntos clave:\n\n${text}`
    : `Resumen muy breve y claro en espanol (maximo 2 oraciones):\n\n${text}`;

  return generateGeminiText(userId, prompt);
}
