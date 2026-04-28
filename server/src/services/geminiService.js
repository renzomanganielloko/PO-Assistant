import axios from 'axios';
import { loadCredentials } from '../storage/credentialsStore.js';

export async function summarizeText(text, type = 'corto') {
  const credentials = await loadCredentials();
  const apiKey = credentials.geminiApiKey;

  if (!apiKey) {
    throw new Error('API Key no encontrada. Configúrala en Settings.');
  }

  // Usamos el endpoint v1 (estable) con gemini-1.5-flash
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = type === 'detallado' 
    ? `Resumen detallado en español, con puntos clave:\n\n${text}`
    : `Resumen muy breve y claro en español (máximo 2 oraciones):\n\n${text}`;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) throw new Error('No se obtuvo respuesta de la IA.');
    
    return result.trim();
  } catch (error) {
    let msg = error.response?.data?.error?.message || error.message;
    
    // Capturamos el error de cuota para mostrar un mensaje amigable
    if (msg.toLowerCase().includes('quota') || error.response?.status === 429) {
      msg = 'Has superado el límite gratuito de Gemini. Espera unos segundos y vuelve a intentar.';
    }

    console.error('[Gemini] Error:', msg);
    throw new Error(msg);
  }
}
