import { generateGeminiText } from './geminiService.js';

export async function refineTicket(userId, summary, description) {
  const prompt = `
    Eres un Product Owner experto refinando tareas para un equipo de desarrollo.
    Tu objetivo es transformar una descripcion basica de Trello en un ticket de Jira profesional.

    Titulo de la tarea: ${summary}
    Descripcion original: ${description || '(sin descripcion)'}

    IMPORTANTE: Jira NO entiende Markdown (**texto**, # Titulo, [enlace](url)). 
    Debes usar exclusivamente JIRA WIKI MARKUP:
    - Encabezados: h1. Nombre de Seccion (siempre empezar con h1.)
    - Bullets: * Elemento (un solo asterisco seguido de espacio, sin negritas)
    - Separacion: Deja siempre dos saltos de linea entre secciones.
    - Negritas: No uses negritas dentro de los bullets ni en los titulos.

    Genera la descripcion siguiendo este esquema EXACTO:

    h1. Objetivo
    (Escribe aqui el objetivo central de la tarea)

    h1. Contexto
    (Explica el porque de esta tarea y la situacion actual)

    h1. Implementacion
    (Detalla los pasos tecnicos o funcionales a seguir)

    h1. Criterios de Aceptacion
    * Item 1
    * Item 2
    * Item 3

    Manten un tono profesional y tecnico. Si la descripcion original es muy breve, inferi los detalles mas probables basados en el titulo.
    Responde UNICAMENTE con el texto formateado para Jira, sin preambulos ni explicaciones.
  `;

  return generateGeminiText(userId, prompt);
}
