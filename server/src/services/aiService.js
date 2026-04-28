import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadCredentials } from '../storage/credentialsStore.js';

export async function refineTicket(summary, description) {
  const credentials = await loadCredentials();
  const apiKey = credentials.geminiApiKey;

  if (!apiKey) {
    console.warn('[AI] Gemini API Key not found. Skipping refinement.');
    return description;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Eres un Product Owner experto refinando tareas para un equipo de desarrollo.
      Tu objetivo es transformar una descripción básica de Trello en un ticket de Jira profesional y completo.

      Título de la tarea: ${summary}
      Descripción original: ${description}

      Por favor, genera una nueva descripción estructurada EXACTAMENTE con los siguientes títulos en negrita:
      
      **Contexto**
      (Explica el trasfondo de por qué se necesita esta tarea)
      
      **Objetivo**
      (Define claramente qué se busca lograr)
      
      **Consideraciones**
      (Anota puntos técnicos o de negocio importantes a tener en cuenta)
      
      **Implementación**
      (Sugiere pasos técnicos o lógica de alto nivel para el desarrollador)
      
      **Criterios de Aceptación**
      (Lista los puntos que deben cumplirse para dar la tarea por finalizada)

      Mantén un tono profesional y técnico. Si la descripción original es muy breve, usa tu conocimiento para inferir los detalles más probables basados en el título.
      Responde SOLO con el contenido de la nueva descripción.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const refinedText = response.text();

    return refinedText || description;
  } catch (error) {
    console.error('[AI] Refinement failed:', error.message);
    return description; // Fallback to original description
  }
}
