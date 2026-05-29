import { getCredentialStatus } from '../storage/credentialsStore.js';
import { listAutomations } from '../storage/automationStore.js';
import { fetchCards, fetchLists } from './trelloService.js';
import { selectSyncCandidates } from './syncRules.js';
import { getLiveAlerts } from './alertService.js';
import { getJiraAlerts } from './jiraService.js';
import { getUnreadEmailCount } from './gmailService.js';
import { AppError } from '../utils/AppError.js';

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
  const cleanText = text.trim();
  const normalizedText = normalize(cleanText);

  // 1. Greetings & Chit-chat
  if (isGreeting(normalizedText)) {
    return {
      answer: '¡Hola! Soy POsito, tu asistente de PO Assistant. Puedo darte detalles sobre tus tableros de Trello, tareas asignadas de Jira (ej: "qué tengo asignado"), buscar un ticket específico por su código (ej: "MET-34"), decirte cuántos mails tenés sin leer, o ayudarte con la configuración de la app. ¿En qué te puedo ayudar hoy?',
      details: []
    };
  }

  if (isHowAreYou(normalizedText)) {
    return {
      answer: '¡Hola! Estoy muy bien, procesando datos e integraciones para que tu flujo de Product Owner sea lo más fluido posible. ¿Qué te gustaría saber sobre tus tableros o tareas hoy?',
      details: []
    };
  }

  if (isThanks(normalizedText)) {
    return {
      answer: '¡De nada! Es un placer ayudarte a coordinar todo. Si tenés otra pregunta o querés buscar alguna tarea, solo escribime.',
      details: []
    };
  }

  if (isFarewell(normalizedText)) {
    return {
      answer: '¡Hasta luego! Que tengas un día súper productivo. Quedo acá disponible por si necesitás consultar algo más tarde.',
      details: []
    };
  }

  // 2. Specific Jira ticket key matching (e.g. MET-34, ABC-123)
  const ticketMatch = cleanText.match(/\b([A-Za-z]+-\d+)\b/);
  if (ticketMatch) {
    const key = ticketMatch[1].toUpperCase();
    return await answerSpecificJiraTicket(userId, key);
  }

  // 3. User's assigned tasks
  if (matchesPatterns(normalizedText, ['mi tarea', 'mis tarea', 'mis asignacion', 'mi asignacion', 'que tengo asignado', 'mis tickets', 'que tengo que hacer', 'que tareas tengo', 'mis tareas'])) {
    return await answerMyAssignments(userId);
  }

  // 4. Tasks reported by user
  if (matchesPatterns(normalizedText, ['informadas por mi', 'tareas que reporte', 'mis reportes', 'creadas por mi', 'yo informe', 'yo cree', 'mis creadas'])) {
    return await answerMyReportedIssues(userId);
  }

  // 5. Query tasks by status
  if (matchesPatterns(normalizedText, ['revisio', 'review', 'para revisar', 'en revisio'])) {
    return await answerTasksByStatus(userId, ['En Revisión', 'In Review', 'revisio']);
  }
  if (matchesPatterns(normalizedText, ['listas para deploy', 'listo para deploy', 'deploy', 'cola de deploy', 'listos para deploy'])) {
    return await answerTasksByStatus(userId, ['Listo para Deploy', 'Ready for Deploy', 'Ready for deployment', 'Ready for Release', 'deploy']);
  }
  if (matchesPatterns(normalizedText, ['bloquead', 'stuck', 'trabad'])) {
    return await answerTasksByStatus(userId, ['Bloqueado', 'Blocked']);
  }
  if (matchesPatterns(normalizedText, ['en progreso', 'haciendo', 'in progress', 'desarrollo', 'progreso'])) {
    return await answerTasksByStatus(userId, ['En Progreso', 'In Progress']);
  }

  // 6. Emails / Gmail unread count
  if (matchesPatterns(normalizedText, ['mail', 'correo', 'gmail', 'sin leer', 'recibido', 'bandeja'])) {
    return await answerUnreadMails(userId);
  }

  // 7. Trello favorites & boards
  if (matchesPatterns(normalizedText, ['tablero', 'trello', 'favorito', 'monitoreo', 'monitoreado'])) {
    return await answerFavoriteBoards(userId);
  }

  // 8. General alerts summary
  if (matchesPatterns(normalizedText, ['alerta', 'novedad', 'notificacion', 'notificaciones', 'que paso'])) {
    return await answerAllAlerts(userId);
  }

  // 9. Pending sync cards
  if (matchesPatterns(normalizedText, ['sincroniz', 'pendiente', 'falta pasar', 'no se pasaron', 'pasar a jira'])) {
    return await answerPendingTotal(userId);
  }

  // 10. Credentials status
  if (matchesPatterns(normalizedText, ['credencial', 'conexion', 'conectado', 'token', 'api key', 'configurac', 'gemini', 'ia'])) {
    return await answerMissingCredentials(userId);
  }

  // 11. Search tasks by assignee name (e.g. "que tiene andres", "tareas de renzo")
  const personMatch = detectPersonInQuery(normalizedText);
  if (personMatch) {
    return await answerTasksByAssignee(userId, personMatch);
  }

  // 12. Fuzzy fallback to predefined QA database
  const matchedId = questionId || inferQuestionId(cleanText);
  if (matchedId) {
    return await handlePredefinedQuestion(userId, matchedId);
  }

  // 13. General keyword search across the titles of Trello and Jira elements
  return await searchAppContent(userId, cleanText);
}

function isGreeting(text) {
  return matchesPatterns(text, ['hola', 'buen dia', 'buenas tardes', 'buenas noches', 'buenas', 'hello', 'hi']);
}

function isHowAreYou(text) {
  return matchesPatterns(text, ['como estas', 'como va', 'todo bien', 'que haces', 'que tal', 'como andas']);
}

function isThanks(text) {
  return matchesPatterns(text, ['gracias', 'muchas gracias', 'genio', 'capo', 'buenisimo', 'excelente', 'perfecto']);
}

function isFarewell(text) {
  return matchesPatterns(text, ['chau', 'adios', 'hasta luego', 'nos vemos', 'bye']);
}

function matchesPatterns(text, patterns) {
  return patterns.some(p => text.includes(p));
}

function detectPersonInQuery(normalizedText) {
  if (normalizedText.includes('andres') || normalizedText.includes('isola')) {
    return 'andres';
  }
  if (normalizedText.includes('renzo') || normalizedText.includes('manganiello')) {
    return 'renzo';
  }
  const match = normalizedText.match(/\b(?:de|a|para)\s+([a-z]+)\b/);
  if (match && !['mi', 'mis', 'el', 'la', 'un', 'una', 'sistema'].includes(match[1])) {
    return match[1];
  }
  return null;
}

async function answerTasksByAssignee(userId, nameQuery) {
  try {
    const jiraData = await getJiraAlerts(userId);
    const issues = jiraData.dashboard?.allOpen || [];
    const matched = issues.filter(i => {
      const assignee = normalize(i.assigneeName || '');
      return assignee.includes(nameQuery);
    });

    if (matched.length === 0) {
      return {
        answer: `No encontré ninguna tarea de Jira asignada a alguien que coincida con "${nameQuery}" en tus tableros activos.`,
        details: []
      };
    }

    return {
      answer: `Encontré ${matched.length} tarea(s) asignada(s) a **${matched[0].assigneeName}**:`,
      details: matched.map(i => `${i.key} [${i.status}]: ${i.summary}`)
    };
  } catch (error) {
    return {
      answer: `Error al buscar las tareas de ${nameQuery}.`,
      details: [error.message]
    };
  }
}

async function answerTasksByStatus(userId, statusNames) {
  try {
    const jiraData = await getJiraAlerts(userId);
    const issues = jiraData.dashboard?.allOpen || [];
    const matched = issues.filter(i => 
      statusNames.some(sName => normalize(i.status).includes(normalize(sName)))
    );

    if (matched.length === 0) {
      return {
        answer: `No hay tareas en el estado solicitado (${statusNames[0]}) actualmente en tus tableros activos.`,
        details: []
      };
    }

    return {
      answer: `Hay ${matched.length} tarea(s) en estado **${matched[0].status}**:`,
      details: matched.map(i => `${i.key} (Asignado a: ${i.assigneeName || 'Sin asignar'}): ${i.summary}`)
    };
  } catch (error) {
    return {
      answer: 'Error al filtrar tareas por estado.',
      details: [error.message]
    };
  }
}

async function answerSpecificJiraTicket(userId, key) {
  try {
    const jiraData = await getJiraAlerts(userId);
    const issues = jiraData.dashboard?.allOpen || [];
    const issue = issues.find(i => i.key.toUpperCase() === key);
    if (!issue) {
      return {
        answer: `No encontré el ticket ${key} en tu lista de tareas activas de Jira (recordá que filtramos tareas abiertas asignadas o informadas por vos).`,
        details: []
      };
    }
    const assigneeStr = issue.assigneeName ? `asignada a **${issue.assigneeName}**` : 'sin asignar';
    const commentStr = issue.commentText 
      ? `\nÚltimo comentario (${issue.commentAuthor}): "${issue.commentText}"` 
      : '\nNo tiene comentarios recientes.';
    return {
      answer: `La tarea **${issue.key}** ("${issue.summary}") está en estado **${issue.status}** y se encuentra ${assigneeStr}.${commentStr}`,
      details: [
        `Prioridad: ${issue.priority || 'No especificada'}`,
        `Última actualización: ${formatDate(issue.updated)}`
      ]
    };
  } catch (error) {
    return {
      answer: `Error al buscar la tarea ${key} en Jira.`,
      details: [error.message]
    };
  }
}

async function answerMyAssignments(userId) {
  try {
    const jiraData = await getJiraAlerts(userId);
    const assigned = jiraData.dashboard?.myAssignments || [];
    if (assigned.length === 0) {
      return {
        answer: 'No tenés tareas asignadas actualmente en tus tableros activos de Jira.',
        details: []
      };
    }
    return {
      answer: `Tenés ${assigned.length} tarea(s) asignada(s) en Jira:`,
      details: assigned.map(i => `${i.key} [${i.status}]: ${i.summary}`)
    };
  } catch (error) {
    return {
      answer: 'No pude cargar tus asignaciones de Jira.',
      details: [error.message]
    };
  }
}

async function answerMyReportedIssues(userId) {
  try {
    const jiraData = await getJiraAlerts(userId);
    const reported = jiraData.dashboard?.reportedByMe || [];
    if (reported.length === 0) {
      return {
        answer: 'No encontré tareas creadas o informadas por vos en tus tableros activos.',
        details: []
      };
    }
    return {
      answer: `Informaste ${reported.length} tarea(s) abierta(s) en Jira:`,
      details: reported.map(i => `${i.key} [${i.status}]: ${i.summary}`)
    };
  } catch (error) {
    return {
      answer: 'No pude cargar tus tareas informadas en Jira.',
      details: [error.message]
    };
  }
}

async function answerAllAlerts(userId) {
  try {
    const jiraData = await getJiraAlerts(userId).catch(() => ({ alerts: [] }));
    const jiraCount = (jiraData.alerts || []).length;
    const trelloCount = (await getLiveAlerts(userId).catch(() => [])).length;
    const emailCount = await getUnreadEmailCount(userId, 'INBOX').catch(() => 0);
    return {
      answer: `Este es el resumen de tus alertas pendientes:`,
      details: [
        `Jira: ${jiraCount} tareas que requieren tu revisión o tienen novedades.`,
        `Trello: ${trelloCount} alertas de comentarios o movimientos.`,
        `Gmail: ${emailCount} correos sin leer en Recibidos.`
      ]
    };
  } catch (error) {
    return {
      answer: 'No pude compilar todas las alertas.',
      details: [error.message]
    };
  }
}

async function searchAppContent(userId, text) {
  try {
    const query = normalize(text);
    if (query.length < 3) {
      return {
        answer: 'Soy POsito, tu asistente de PO Assistant. Podés hacerme preguntas en lenguaje natural sobre tus tareas de Jira, tableros de Trello, correos sin leer, o consultar sobre un ticket específico (ej: MET-34). ¿Qué deseas buscar?',
        details: []
      };
    }

    const jiraData = await getJiraAlerts(userId).catch(() => ({ dashboard: {} }));
    const jiraIssues = jiraData.dashboard?.allOpen || [];
    const matchingJira = jiraIssues.filter(i => 
      normalize(i.key).includes(query) || 
      normalize(i.summary).includes(query) || 
      normalize(i.commentText).includes(query)
    );

    if (matchingJira.length === 0) {
      return {
        answer: `No encontré ninguna tarea de Jira o contenido en la app que contenga "${text}". Intentá con otra palabra clave o ingresá el código de un ticket directamente (ej: MET-34).`,
        details: []
      };
    }

    return {
      answer: `Encontré las siguientes tareas de Jira relacionadas con "${text}":`,
      details: matchingJira.map(i => `${i.key} [${i.status}] - Asignado a: ${i.assigneeName || 'Sin asignar'}: ${i.summary}`)
    };
  } catch (error) {
    return {
      answer: 'Error al realizar la búsqueda en la aplicación.',
      details: [error.message]
    };
  }
}

function inferQuestionId(text) {
  const q = normalize(text);
  const scores = assistantQuestions.map(aq => {
    const aqText = normalize(aq.text);
    let score = 0;
    
    if (q === aqText) score += 100;
    if (aqText.includes(q) || q.includes(aqText)) score += 50;

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
      answer: `Tenés ${count} mails sin leer en Recibidos.`,
      details: [`Fuente: Gmail INBOX.`]
    };
  } catch (error) {
    return {
      answer: 'No pude leer Gmail. Revisá si Gmail está conectado en Configuración.',
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
      ? `Estás monitoreando ${favorites.length} tablero(s) favoritos.`
      : 'No tenés tableros marcados como favoritos.',
    details: favorites.map(item => item.trelloBoardName)
  };
}

async function answerActiveAutomations(userId) {
  const automations = await listAutomations(userId);
  const active = automations.filter(item => item.enabled);
  return {
    answer: `Hay ${active.length} automatización(es) activas.`,
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
      : 'Todas las integraciones principales (Trello, Jira, Gemini y Gmail) están configuradas correctamente.',
    details: []
  };
}

async function answerBooleanStatus(userId, label, key) {
  const status = await getCredentialStatus(userId);
  return {
    answer: status[key] ? `${label} está configurado.` : `${label} no está configurado.`,
    details: []
  };
}

async function answerLastSyncSummary(userId) {
  const latest = await latestAutomationRun(userId);
  if (!latest) return { answer: 'Todavía no hay corridas de automatización registradas.', details: [] };
  const result = latest.lastResult || {};
  return {
    answer: `Última corrida: ${latest.trelloBoardName} (${formatDate(latest.lastRunAt)}).`,
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
      ? `La última corrida tuvo ${errors.length} error(es).`
      : 'La última corrida no registró errores.',
    details: errors.map(item => `${item.title || item.trelloCardId}: ${item.message}`)
  };
}

async function answerLastCreated(userId) {
  const latest = await latestAutomationRun(userId);
  const created = latest?.lastResult?.created || [];
  return {
    answer: created.length
      ? `La última corrida creó ${created.length} tarea(s) nueva(s).`
      : 'La última corrida no creó tareas nuevas.',
    details: created.map(item => `${item.title} -> ${item.jiraIssueKey}`)
  };
}

async function answerLastRepaired(userId) {
  const latest = await latestAutomationRun(userId);
  const repaired = latest?.lastResult?.repaired || [];
  return {
    answer: repaired.length
      ? `La última corrida reparó ${repaired.length} tarea(s).`
      : 'La última corrida no reparó tareas.',
    details: repaired.map(item => `${item.title} -> ${item.jiraIssueKey}`)
  };
}

async function answerRefineAiBoards(userId) {
  const automations = await listAutomations(userId);
  const enabled = automations.filter(item => item.refineAI);
  return {
    answer: enabled.length
      ? `${enabled.length} tablero(s) tienen refinamiento con IA activo.`
      : 'Ningún tablero tiene refinamiento con IA activo.',
    details: enabled.map(item => item.trelloBoardName)
  };
}

async function answerBoardsWithoutProject(userId) {
  const automations = await listAutomations(userId);
  const missing = automations.filter(item => !item.jiraProjectKey);
  return {
    answer: missing.length
      ? `${missing.length} tablero(s) no tienen proyecto Jira configurado.`
      : 'Todos los tableros automatizados tienen proyecto de Jira configurado.',
    details: missing.map(item => item.trelloBoardName)
  };
}

async function answerJiraAlerts(userId) {
  try {
    const jiraData = await getJiraAlerts(userId);
    const alerts = jiraData.alerts || [];
    return {
      answer: `Tenés ${alerts.length} alerta(s) de Jira.`,
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
    answer: `Tipos de issue usados: ${Object.keys(counts).join(', ') || 'ninguno'}.`,
    details: Object.entries(counts).map(([type, count]) => `${type}: ${count}`)
  };
}

async function answerLastRunDates(userId) {
  const automations = await listAutomations(userId);
  const withRuns = automations.filter(item => item.lastRunAt);
  return {
    answer: withRuns.length
      ? `${withRuns.length} automatización(es) tienen corridas registradas.`
      : 'No hay corridas registradas todavía.',
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

async function handlePredefinedQuestion(userId, questionId) {
  switch (questionId) {
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
    case 'polling-explanation':
      return { answer: 'El Polling es la técnica de consultar periódicamente si hay cambios. En una futura versión, PO Assistant podrá hacerlo automáticamente en segundo plano.', details: [] };
    case 'language-change':
      return { answer: 'Podés cambiar entre Inglés y Español usando el selector de idioma (globo terráqueo) en la parte inferior del menú lateral.', details: [] };
    case 'dark-mode-info':
      return { answer: 'El modo oscuro se activa haciendo clic en el Sol/Luna en la parte superior derecha de la barra de navegación.', details: [] };
    case 'delete-credentials':
      return { answer: 'Para borrar las credenciales, andá a Configuración, borrá los campos de texto correspondientes y hacé clic en Guardar.', details: [] };
    case 'gmail-labels-used':
      return { answer: 'Filtramos correos con las etiquetas: INBOX, Jira, Trello y Notas de Gemini.', details: [] };
    case 'trello-visibility':
      return { answer: 'Si no ves un tablero, asegurate de que tu Token de Trello tenga permisos sobre ese Workspace y que no esté archivado.', details: [] };
    case 'security-info':
      return { answer: 'Tus credenciales se cifran en la base de datos de MongoDB Atlas usando el algoritmo AES-256-GCM.', details: [] };
    case 'about-po-assistant':
      return { answer: 'PO Assistant es un panel operativo integrado para Product Owners que conecta el feedback de clientes (Trello) con el desarrollo técnico (Jira).', details: [] };
    default:
      return { answer: 'Pregunta no implementada.', details: [] };
  }
}
