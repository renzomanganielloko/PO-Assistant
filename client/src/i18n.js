export const translations = {
  es: {
    locale: 'es-419',
    appSubtitle: 'Control de workflow PO',
    eyebrow: 'PO Assistant',
    nav: {
      settings: 'Credenciales',
      dashboard: 'Dashboard',
      boards: 'Trello - Jira Sync',
      sync: 'Tareas pendientes',
      alerts: 'Alertas Trello',
      jiraAlerts: 'Alertas Jira'
    },
    jiraAlerts: {
      title: 'Alertas Jira',
      refresh: 'Actualizar Jira',
      assigned: 'Asignado a ti',
      mentioned: 'Mencionado',
      noAlerts: 'No hay actividad reciente en Jira.',
      priority: 'Prioridad',
      status: 'Estado',
      type: 'Tipo'
    },
    alerts: {
      title: 'Alertas Trello',
      configTitle: 'Tableros monitoreados',
      monitoredBoards: 'Monitoreando favoritos',
      monitoredCount: 'Se muestran alertas de tus tableros marcados con estrella.',
      noFavorites: 'Marca algún tablero con estrella para ver sus alertas aquí.',
      refresh: 'Actualizar alertas',
      replyPlaceholder: 'Escribe una respuesta...',
      replyButton: 'Responder',
      noAlerts: 'No hay alertas recientes en tus favoritos.',
      types: {
        comment: 'Nuevo comentario',
        move: 'Tarjeta movida',
        creation: 'Nueva tarjeta'
      },
      messages: {
        moved: 'fue movida de **{from}** a **{to}**',
        created: 'fue creada en **{list}**',
        commented: 'comentó:'
      }
    },
    status: {
      ready: 'Listo',
      missing: 'Falta'
    },
    settings: {
      trelloApiKey: 'API Key de Trello',
      trelloToken: 'Token de Trello',
      jiraBaseUrl: 'URL base de Jira',
      jiraEmail: 'Email de Jira',
      jiraApiToken: 'API Token de Jira',
      geminiApiKey: 'Gemini AI API Key (Google)',
      save: 'Guardar credenciales',
      loadBoards: 'Cargar tableros',
      validateTrello: 'Verificar Trello',
      savedKey: 'Key guardada',
      chars: 'caracteres',
      starts: 'empieza',
      ends: 'termina',
      expectedKey: 'Una API Key de Trello suele tener 32 caracteres.',
      tokenLength: 'Token guardado',
      existingCredentials: 'Las credenciales ya guardadas se conservan si dejas campos vacios.'
    },
    boards: {
      refresh: 'Actualizar tableros',
      loadJira: 'Cargar proyectos Jira',
      noAutomation: 'Sin automatización',
      syncsTo: 'Sincroniza con',
      jiraProject: 'Proyecto Jira',
      issueType: 'Tipo',
      refineAI: 'Refinar con IA (Gemini)',
      issueTypes: {
        Story: 'Historia',
        Task: 'Tarea',
        Bug: 'Error'
      },
      save: 'Guardar',
      run: 'Ejecutar',
      running: 'Ejecutando...',
      syncRule: 'Regla: solo tarjetas en listas con "Sprint" y sin link Jira adjunto.',
      reportCreated: 'Se crearon {count} tareas en Jira.',
      reportRepaired: 'Se restauraron vínculos en {count} tarjetas de Trello.',
      reportNoCandidates: 'No se encontraron tarjetas en Sprint sin link Jira adjunto.',
      reportNoCreated: 'No se crearon tareas nuevas en Jira.',
      reportDetails: 'Total: {total}. En Sprint: {sprint}. Candidatas: {candidates}. Omitidas: {skipped}. Reparadas: {repaired}. Errores: {errors}.',
      repairedAttachment: 'se reparó el adjunto en Trello'
    },
    sync: {
      fetchCards: 'Actualizar pendientes',
      title: 'Tareas pendientes (Sprint)',
      subtitle: 'Tarjetas en listas "Sprint" que no tienen link a Jira.',
      card: 'Tarjeta',
      labels: 'Etiquetas',
      due: 'Vence',
      board: 'Tablero',
      refineAI: 'Refinar con IA (Gemini)',
      sendToJira: 'Enviar a Jira',
      sendingToJira: 'Enviando...',
      noLabels: 'Sin etiquetas',
      noDueDate: 'Sin fecha',
      empty: '¡Al día! No hay tareas pendientes en tus tableros favoritos.'
    },
    logs: {
      empty: 'Todavía no hay actividad.'
    },
    messages: {
      credentialsSaved: 'Credenciales guardadas localmente.',
      boardsLoaded: 'Tableros de Trello cargados.',
      trelloValidated: 'Trello conectado como {name}.',
      jiraProjectsLoaded: 'Proyectos de Jira cargados.',
      listsLoaded: 'Listas del tablero cargadas.',
      cardsLoaded: 'Tarjetas de Trello cargadas.',
      previewReady: 'Previsualización generada.',
      automationSaved: 'Automatización guardada para {board}.',
      automationFinished: 'Automatización finalizada para {board}.',
      automationSummary: '{board}: creadas {created}, reparadas {repaired}, omitidas {skipped}, errores {errors}.',
      configSaved: 'Configuración de alertas guardada.',
      replySent: 'Respuesta enviada a Trello.'
    },
    language: {
      label: 'Idioma',
      es: 'ES',
      en: 'EN'
    }
  },
  en: {
    locale: 'en-US',
    appSubtitle: 'PO workflow control',
    eyebrow: 'PO Assistant',
    nav: {
      settings: 'Settings',
      boards: 'Boards',
      sync: 'Pending Tasks',
      alerts: 'Alertas Trello',
      jiraAlerts: 'Jira Alerts'
      },
      jiraAlerts: {
      title: 'Jira Alerts',
      refresh: 'Refresh Jira',
      assigned: 'Assigned to you',
      mentioned: 'Mentioned',
      noAlerts: 'No recent Jira activity.',
      priority: 'Priority',
      status: 'Status',
      type: 'Type'
      },
      alerts: {
      title: 'Trello Alerts',
      configTitle: 'Monitored boards',
      monitoredBoards: 'Monitoring favorites',
      monitoredCount: 'Showing alerts from your starred boards.',
      noFavorites: 'Star some boards to see their alerts here.',
      refresh: 'Refresh alerts',
      replyPlaceholder: 'Write a reply...',
      replyButton: 'Reply',
      noAlerts: 'No recent alerts from your favorites.',
      types: {
        comment: 'New comment',
        move: 'Card moved',
        creation: 'New card'
      },
      messages: {
        moved: 'was moved from **{from}** to **{to}**',
        created: 'was created in **{list}**',
        commented: 'commented:'
      }
    },
    status: {
      ready: 'Ready',
      missing: 'Missing'
    },
    settings: {
      trelloApiKey: 'Trello API Key',
      trelloToken: 'Trello Token',
      jiraBaseUrl: 'Jira Base URL',
      jiraEmail: 'Jira Email',
      jiraApiToken: 'Jira API Token',
      geminiApiKey: 'Gemini AI API Key (Google)',
      save: 'Save credentials',
      loadBoards: 'Load boards',
      validateTrello: 'Verify Trello',
      savedKey: 'Saved key',
      chars: 'characters',
      starts: 'starts',
      ends: 'ends',
      expectedKey: 'A Trello API Key is usually 32 characters.',
      tokenLength: 'Saved token',
      existingCredentials: 'Saved credentials are kept when you leave fields empty.'
    },
    boards: {
      refresh: 'Refresh boards',
      loadJira: 'Load Jira projects',
      noAutomation: 'No automation yet',
      syncsTo: 'Syncs to',
      jiraProject: 'Jira project',
      issueType: 'Issue type',
      refineAI: 'Refine with AI (Gemini)',
      issueTypes: {
        Story: 'Story',
        Task: 'Task',
        Bug: 'Bug'
      },
      save: 'Save',
      run: 'Run',
      running: 'Running...',
      syncRule: 'Rule: only cards in lists containing "Sprint" and without an attached Jira link.',
      reportCreated: '{count} Jira issues were created.',
      reportRepaired: 'Restored links in {count} Trello cards.',
      reportNoCandidates: 'No cards were found in Sprint without an attached Jira link.',
      reportNoCreated: 'No new Jira issues were created.',
      reportDetails: 'Total: {total}. In Sprint: {sprint}. Candidates: {candidates}. Skipped: {skipped}. Repaired: {repaired}. Errors: {errors}.',
      repairedAttachment: 'Trello attachment repaired'
    },
    sync: {
      fetchCards: 'Refresh pending',
      title: 'Pending Tasks (Sprint)',
      subtitle: 'Cards in "Sprint" lists that do not have a Jira link yet.',
      card: 'Card',
      labels: 'Labels',
      due: 'Due',
      board: 'Board',
      refineAI: 'Refine with AI (Gemini)',
      sendToJira: 'Send to Jira',
      sendingToJira: 'Sending...',
      noLabels: 'None',
      noDueDate: 'No due date',
      empty: 'All caught up! No pending tasks in your favorite boards.'
    },
    logs: {
      empty: 'No activity yet.'
    },
    messages: {
      credentialsSaved: 'Credentials saved locally.',
      boardsLoaded: 'Trello boards loaded.',
      trelloValidated: 'Trello connected as {name}.',
      jiraProjectsLoaded: 'Jira projects loaded.',
      listsLoaded: 'Board lists loaded.',
      cardsLoaded: 'Trello cards loaded.',
      previewReady: 'Sync preview generated.',
      automationSaved: 'Automation saved for {board}.',
      automationFinished: 'Sync finished for {board}.',
      automationSummary: '{board}: created {created}, repaired {repaired}, skipped {skipped}, errors {errors}.',
      configSaved: 'Alerts configuration saved.',
      replySent: 'Reply sent to Trello.'
      },
    language: {
      label: 'Language',
      es: 'ES',
      en: 'EN'
    }
  }
};

export function formatMessage(template, values) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, String(value)),
    template
  );
}
