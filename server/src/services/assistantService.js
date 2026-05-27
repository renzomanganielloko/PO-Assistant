import { getCredentialStatus } from '../storage/credentialsStore.js';
import { listAutomations } from '../storage/automationStore.js';
import { fetchCards, fetchLists } from './trelloService.js';
import { selectSyncCandidates } from './syncRules.js';
import { getLiveAlerts } from './alertService.js';
import { getJiraAlerts, getAssignedIssuesCount } from './jiraService.js';
import { getUnreadEmailCount } from './gmailService.js';

export const assistantCategories = [
  { id: 'cat-gmail', text: 'Gmail y Correos', icon: 'Mail' },
  { id: 'cat-trello', text: 'Trello y Tableros', icon: 'ClipboardList' },
  { id: 'cat-jira', text: 'Jira y Tareas', icon: 'Activity' },
  { id: 'cat-sync', text: 'Sincronización', icon: 'RefreshCw' },
  { id: 'cat-config', text: 'Configuración y IA', icon: 'KeyRound' },
  { id: 'cat-general', text: 'General', icon: 'Bot' }
];

export const assistantQuestions = [
  // Gmail
  { id: 'unread-mails', categoryId: 'cat-gmail', text: '¿Cuántos mails tengo sin leer?' },
  { id: 'gmail-status', categoryId: 'cat-gmail', text: '¿Está conectado Gmail?' },
  { id: 'gmail-labels-used', categoryId: 'cat-gmail', text: '¿Qué etiquetas de Gmail se usan?' },
  
  // Trello
  { id: 'favorite-boards', categoryId: 'cat-trello', text: '¿Qué tableros estoy monitoreando?' },
  { id: 'trello-status', categoryId: 'cat-trello', text: '¿Está conectado Trello?' },
  { id: 'trello-setup', categoryId: 'cat-trello', text: '¿Cómo configuro Trello?' },
  { id: 'trello-visibility', categoryId: 'cat-trello', text: '¿Por qué no veo mis tableros de Trello?' },
  { id: 'trello-alerts', categoryId: 'cat-trello', text: '¿Cuántas alertas de Trello tengo?' },

  // Jira
  { id: 'jira-status', categoryId: 'cat-jira', text: '¿Está conectado Jira?' },
  { id: 'jira-alerts', categoryId: 'cat-jira', text: '¿Cuántas alertas de Jira tengo?' },
  { id: 'issue-types', categoryId: 'cat-jira', text: '¿Qué tipos de issue de Jira se usan?' },
  { id: 'jira-token-help', categoryId: 'cat-jira', text: '¿Cómo obtengo mi Jira API Token?' },
  { id: 'boards-without-project', categoryId: 'cat-jira', text: '¿Qué tableros no tienen proyecto Jira?' },

  // Sincronización
  { id: 'pending-total', categoryId: 'cat-sync', text: '¿Cuántas tareas no se sincronizaron?' },
  { id: 'pending-by-board', categoryId: 'cat-sync', text: '¿En qué tableros hay tareas pendientes?' },
  { id: 'active-automations', categoryId: 'cat-sync', text: '¿Qué automatizaciones están activas?' },
  { id: 'last-sync-summary', categoryId: 'cat-sync', text: '¿Cómo salió la última sincronización?' },
  { id: 'last-sync-errors', categoryId: 'cat-sync', text: '¿Hubo errores en la última sincronización?' },
  { id: 'last-created', categoryId: 'cat-sync', text: '¿Qué tareas se crearon recientemente?' },
  { id: 'last-repaired', categoryId: 'cat-sync', text: '¿Qué tareas se repararon recientemente?' },
  { id: 'last-run-dates', categoryId: 'cat-sync', text: '¿Cuándo corrió cada automatización?' },
  { id: 'sync-multiple-boards', categoryId: 'cat-sync', text: '¿Puedo sincronizar varios tableros?' },

  // Configuración / IA
  { id: 'missing-credentials', categoryId: 'cat-config', text: '¿Qué credenciales faltan cargar?' },
  { id: 'gemini-status', categoryId: 'cat-config', text: '¿Está configurada la IA (Gemini)?' },
  { id: 'refine-ai-boards', categoryId: 'cat-config', text: '¿Qué tableros usan IA para refinar?' },
  { id: 'ai-refinement-purpose', categoryId: 'cat-config', text: '¿Para qué sirve el refinamiento con IA?' },
  { id: 'delete-credentials', categoryId: 'cat-config', text: '¿Cómo borro las credenciales?' },
  { id: 'security-info', categoryId: 'cat-config', text: '¿Es seguro guardar mis tokens aquí?' },

  // General
  { id: 'about-po-assistant', categoryId: 'cat-general', text: '¿Quién creó PO Assistant?' },
  { id: 'polling-explanation', categoryId: 'cat-general', text: '¿Qué es el Polling?' },
  { id: 'language-change', categoryId: 'cat-general', text: '¿Cómo cambio el idioma?' },
  { id: 'dark-mode-info', categoryId: 'cat-general', text: '¿El modo oscuro es automático?' }
];

export async function answerAssistantQuestion(userId, { questionId, text = '' }) {
  const matchedId = questionId || inferQuestionId(text);
  
  if (!matchedId) {
    const suggestions = getSuggestions(text);
    return {
      answer: 'No estoy seguro de haber entendido bien. ¿Te referías a alguna de estas preguntas?',
      suggestions: suggestions,
      details: []
    };
  }

  switch (matchedId) {
    case 'unread-mails':
      return answerUnreadMails(userId);
    case 'pending-total':
      return answerPendingTotal(userId);
    case 'pending-by-board':
      return answerPendingByBoard(userId);
    case 'favorite-boards':
      return answerFavoriteBoards(userId);
    case 'active-automations':
      return answerActiveAutomations(userId);
    case 'missing-credentials':
      return answerMissingCredentials(userId);
    case 'gemini-status':
      return answerBooleanStatus(userId, 'Gemini IA', 'geminiConfigured');
    case 'gmail-status':
      return answerBooleanStatus(userId, 'Gmail', 'gmailConfigured');
    case 'jira-status':
      return answerBooleanStatus(userId, 'Jira', 'jiraConfigured');
    case 'trello-status':
      return answerBooleanStatus(userId, 'Trello', 'trelloConfigured');
    case 'last-sync-summary':
      return answerLastSyncSummary(userId);
    case 'last-sync-errors':
      return answerLastSyncErrors(userId);
    case 'last-created':
      return answerLastCreated(userId);
    case 'last-repaired':
      return answerLastRepaired(userId);
    case 'refine-ai-boards':
      return answerRefineAiBoards(userId);
    case 'boards-without-project':
      return answerBoardsWithoutProject(userId);
    case 'jira-alerts':
      return answerJiraAlerts(userId);
    case 'trello-alerts':
      return answerTrelloAlerts(userId);
    case 'issue-types':
      return answerIssueTypes(userId);
    case 'last-run-dates':
      return answerLastRunDates(userId);
    case 'trello-setup':
      return { answer: 'Para configurar Trello, necesitás tu API Key y un Token que podés obtener desde el portal de desarrolladores de Atlassian. Luego cargalos en la sección Configuración.', details: [] };
    case 'jira-token-help':
      return { answer: 'El Jira API Token se genera desde tu cuenta de Atlassian (id.atlassian.com). Es vital usar el token y no tu contraseña personal.', details: [] };
    case 'ai-refinement-purpose':
      return { answer: 'El refinamiento con IA usa Gemini para mejorar los títulos y descripciones de las tarjetas de Trello al pasarlas a Jira, asegurando que cumplan con estándares técnicos.', details: [] };
    case 'sync-multiple-boards':
      return { answer: 'Sí, podés configurar automatizaciones para múltiples tableros. Cada una correrá de forma independiente cuando presiones el botón de Play o según el cronograma.', details: [] };
    case 'error-logs-location':
      return { answer: 'Los logs de errores específicos de sincronización se ven en cada tablero. Los logs generales del sistema se guardan en la carpeta root del servidor.', details: [] };
    case 'polling-explanation':
      return { answer: 'El Polling es la técnica de consultar periódicamente si hay cambios. En una futura versión, PO Assistant podrá hacerlo automáticamente en segundo plano.', details: [] };
    case 'language-change':
      return { answer: 'Podés cambiar entre Inglés y Español desde el menú superior, haciendo clic en el selector de idioma (globo terráqueo).', details: [] };
    case 'dark-mode-info':
      return { answer: 'PO Assistant respeta la preferencia de tu sistema operativo, pero también podés forzar el cambio desde el botón de Luna/Sol en el encabezado.', details: [] };
    case 'delete-credentials':
      return { answer: 'Por seguridad, no hay un botón de "borrar todo", pero podés sobrescribir los campos en Configuración con espacios en blanco y guardar.', details: [] };
    case 'gmail-labels-used':
      return { answer: 'Filtramos correos con las etiquetas: INBOX, Jira, Trello y Notas de Gemini.', details: [] };
    case 'trello-visibility':
      return { answer: 'Si no ves un tablero, asegurate de que tu Token de Trello tenga permisos sobre ese Workspace y que el tablero no esté archivado.', details: [] };
    case 'security-info':
      return { answer: 'Tus tokens se guardan de forma segura en MongoDB Atlas y se encriptan con AES-256 usando una clave maestra.', details: [] };
    case 'about-po-assistant':
      return { answer: 'PO Assistant fue creado para simplificar la vida de los Product Owners que lidian con el caos entre el feedback de clientes (Trello) y el desarrollo (Jira).', details: [] };
    default:
      return {
        answer: 'Esa pregunta todavía no está cubierta por POsito directamente.',
        details: []
      };
  }
}

function inferQuestionId(text) {
  const q = normalize(text);
  const scores = assistantQuestions.map(aq => {
    const aqText = normalize(aq.text);
    let score = 0;
    
    // Coincidencia exacta o contenida
    if (q === aqText) score += 100;
    if (aqText.includes(q) || q.includes(aqText)) score += 50;

    // Coincidencia de palabras clave
    const qWords = q.split(/\W+/).filter(w => w.length > 3);
    const aqWords = aqText.split(/\W+/).filter(w => w.length > 3);
    
    qWords.forEach(qw => {
      if (aqWords.includes(qw)) score += 20;
    });

    return { id: aq.id, score };
  });

  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 40 ? best.id : null;
}

function getSuggestions(text) {
  const q = normalize(text);
  const scores = assistantQuestions.map(aq => {
    const aqText = normalize(aq.text);
    let score = 0;
    
    const qWords = q.split(/\W+/).filter(w => w.length > 2);
    const aqWords = aqText.split(/\W+/).filter(w => w.length > 2);
    
    qWords.forEach(qw => {
      if (aqWords.includes(qw)) score += 10;
    });

    return { ...aq, score };
  });

  return scores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function answerUnreadMails(userId) {
  try {
    const count = await getUnreadEmailCount(userId, 'INBOX');
    return {
      answer: `Tenes ${count} mails sin leer en Recibidos.`,
      details: [`Fuente: Gmail INBOX unread count.`]
    };
  } catch (error) {
    return {
      answer: 'No pude leer Gmail. Revisá si Gmail está conectado en Credenciales.',
      details: [error.message]
    };
  }
}

async function answerPendingTotal(userId) {
  const pending = await collectPendingCards(userId);
  return {
    answer: `Hay ${pending.total} tareas sin sincronizar en tableros favoritos.`,
    details: pending.byBoard.map(item => `${item.boardName}: ${item.count}`)
  };
}

async function answerPendingByBoard(userId) {
  const pending = await collectPendingCards(userId);
  if (pending.total === 0) {
    return { answer: 'No hay tareas pendientes de sincronizar en tableros favoritos.', details: [] };
  }
  return {
    answer: `Encontré pendientes en ${pending.byBoard.length} tablero(s).`,
    details: pending.byBoard.map(item => `${item.boardName}: ${item.count}`)
  };
}

async function answerFavoriteBoards(userId) {
  const automations = await listAutomations(userId);
  const favorites = automations.filter(item => item.favorite);
  return {
    answer: favorites.length
      ? `Estas monitoreando ${favorites.length} tablero(s).`
      : 'No tenes tableros marcados como favoritos.',
    details: favorites.map(item => item.trelloBoardName)
  };
}

async function answerActiveAutomations(userId) {
  const automations = await listAutomations(userId);
  const active = automations.filter(item => item.enabled);
  return {
    answer: `Hay ${active.length} automatizacion(es) activas.`,
    details: active.map(item => `${item.trelloBoardName}: ${item.jiraProjectKey || 'sin proyecto Jira'}`)
  };
}

async function answerMissingCredentials(userId) {
  const status = await getCredentialStatus(userId);
  const missing = [
    ['Trello', !status.trelloConfigured],
    ['Jira', !status.jiraConfigured],
    ['Gemini IA', !status.geminiConfigured],
    ['Gmail', !status.gmailConfigured]
  ].filter(([, isMissing]) => isMissing).map(([label]) => label);

  return {
    answer: missing.length
      ? `Faltan configurar: ${missing.join(', ')}.`
      : 'Todas las integraciones principales estan configuradas.',
    details: []
  };
}

async function answerBooleanStatus(userId, label, key) {
  const status = await getCredentialStatus(userId);
  return {
    answer: status[key] ? `${label} esta configurado.` : `${label} no esta configurado.`,
    details: []
  };
}

async function answerLastSyncSummary(userId) {
  const latest = await latestAutomationRun(userId);
  if (!latest) return { answer: 'Todavia no hay corridas de automatizacion registradas.', details: [] };
  const result = latest.lastResult || {};
  return {
    answer: `Ultima corrida: ${latest.trelloBoardName} (${formatDate(latest.lastRunAt)}).`,
    details: [
      `Creadas: ${(result.created || []).length}`,
      `Reparadas: ${(result.repaired || []).length}`,
      `Errores: ${(result.errors || []).length}`,
      `Tarjetas Sprint: ${result.sprintCards || 0}`
    ]
  };
}

async function answerLastSyncErrors(userId) {
  const latest = await latestAutomationRun(userId);
  const errors = latest?.lastResult?.errors || [];
  return {
    answer: errors.length
      ? `La ultima corrida tuvo ${errors.length} error(es).`
      : 'La ultima corrida no registro errores.',
    details: errors.map(item => `${item.title || item.trelloCardId}: ${item.message}`)
  };
}

async function answerLastCreated(userId) {
  const latest = await latestAutomationRun(userId);
  const created = latest?.lastResult?.created || [];
  return {
    answer: created.length
      ? `La ultima corrida creo ${created.length} tarea(s).`
      : 'La ultima corrida no creo tareas nuevas.',
    details: created.map(item => `${item.title} -> ${item.jiraIssueKey}`)
  };
}

async function answerLastRepaired(userId) {
  const latest = await latestAutomationRun(userId);
  const repaired = latest?.lastResult?.repaired || [];
  return {
    answer: repaired.length
      ? `La ultima corrida reparo ${repaired.length} tarea(s).`
      : 'La ultima corrida no reparo tareas.',
    details: repaired.map(item => `${item.title} -> ${item.jiraIssueKey}`)
  };
}

async function answerRefineAiBoards(userId) {
  const automations = await listAutomations(userId);
  const enabled = automations.filter(item => item.refineAI);
  return {
    answer: enabled.length
      ? `${enabled.length} tablero(s) tienen refinamiento con IA.`
      : 'Ningun tablero tiene refinamiento con IA activo.',
    details: enabled.map(item => item.trelloBoardName)
  };
}

async function answerBoardsWithoutProject(userId) {
  const automations = await listAutomations(userId);
  const missing = automations.filter(item => !item.jiraProjectKey);
  return {
    answer: missing.length
      ? `${missing.length} tablero(s) no tienen proyecto Jira configurado.`
      : 'Todos los tableros automatizados tienen proyecto Jira.',
    details: missing.map(item => item.trelloBoardName)
  };
}

async function answerJiraAlerts(userId) {
  try {
    const alerts = await getJiraAlerts(userId);
    return {
      answer: `Tenes ${alerts.length} alerta(s) de Jira.`,
      details: alerts.slice(0, 6).map(item => `${item.key}: ${item.summary}`)
    };
  } catch (error) {
    return { answer: 'No pude consultar alertas de Jira.', details: [error.message] };
  }
}

async function answerTrelloAlerts(userId) {
  const alerts = await getLiveAlerts(userId);
  return {
    answer: `Hay ${alerts.length} alerta(s) de Trello.`,
    details: alerts.slice(0, 6).map(item => item.cardName || item.cardId)
  };
}

async function answerIssueTypes(userId) {
  const automations = await listAutomations(userId);
  const counts = automations.reduce((acc, item) => {
    const type = item.jiraIssueType || 'Story';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return {
    answer: `Tipos usados: ${Object.keys(counts).join(', ') || 'ninguno'}.`,
    details: Object.entries(counts).map(([type, count]) => `${type}: ${count}`)
  };
}

async function answerLastRunDates(userId) {
  const automations = await listAutomations(userId);
  const withRuns = automations.filter(item => item.lastRunAt);
  return {
    answer: withRuns.length
      ? `${withRuns.length} automatizacion(es) tienen corridas registradas.`
      : 'No hay corridas registradas todavia.',
    details: withRuns.map(item => `${item.trelloBoardName}: ${formatDate(item.lastRunAt)}`)
  };
}

async function collectPendingCards(userId) {
  const automations = await listAutomations(userId);
  const favoriteAutomations = automations.filter(item => item.favorite);
  const byBoard = [];

  for (const automation of favoriteAutomations) {
    try {
      const lists = await fetchLists(userId, automation.trelloBoardId);
      const cards = await fetchCards(userId, automation.trelloBoardId, automation.trelloListId || undefined);
      const { cardsWithoutJiraLink } = selectSyncCandidates({ cards, lists });
      if (cardsWithoutJiraLink.length) {
        byBoard.push({
          boardName: automation.trelloBoardName,
          count: cardsWithoutJiraLink.length
        });
      }
    } catch (error) {
      byBoard.push({
        boardName: automation.trelloBoardName,
        count: 0,
        error: error.message
      });
    }
  }

  return {
    total: byBoard.reduce((sum, item) => sum + item.count, 0),
    byBoard
  };
}

async function latestAutomationRun(userId) {
  const automations = await listAutomations(userId);
  return automations
    .filter(item => item.lastRunAt)
    .sort((a, b) => new Date(b.lastRunAt) - new Date(a.lastRunAt))[0] || null;
}

function formatDate(value) {
  if (!value) return 'sin fecha';
  return new Date(value).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}
