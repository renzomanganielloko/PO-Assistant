export const translations = {
  es: {
    locale: 'es-419',
    appSubtitle: 'Control de workflow PO',
    eyebrow: 'PO Assistant',
    nav: {
      settings: 'Credenciales',
      dashboard: 'Dashboard',
      boards: 'Trello Boards',
      sync: 'Sync Jira',
      alerts: 'Alertas Trello',
      jiraAlerts: 'Alertas Jira',
      profile: 'Mi Perfil'
    },
    settings: {
      trelloApiKey: 'Trello API Key',
      trelloToken: 'Trello Token',
      jiraBaseUrl: 'Jira Base URL',
      jiraEmail: 'Jira Email',
      jiraApiToken: 'Jira API Token',
      geminiApiKey: 'Gemini API Key',
      save: 'Guardar Credenciales',
      loadBoards: 'Cargar Tableros',
      validateTrello: 'Validar Trello'
    },
    boards: {
      refresh: 'Actualizar Tableros',
      loadJira: 'Cargar Proyectos Jira',
      save: 'Guardar',
      run: 'Sincronizar',
      running: 'Sincronizando...',
      syncsTo: 'Sincroniza con',
      noAutomation: 'Sin automatización',
      syncRule: 'Crea Stories en Jira para cada tarjeta nueva en las listas "Sprint".',
      jiraProject: 'Proyecto Jira',
      issueType: 'Tipo de Issue',
      issueTypes: {
        Story: 'Historia',
        Task: 'Tarea',
        Bug: 'Error/Bug'
      },
      refineAI: 'Refinar con IA (Gemini)',
      reportNoCreated: 'No se crearon nuevas tareas.',
      reportCreated: 'Se crearon {count} nuevas tareas en Jira.'
    },
    alerts: {
      refresh: 'Actualizar Alertas',
      noAlerts: 'No hay actividad reciente.',
      replyButton: 'Responder',
      monitoredBoards: 'Tableros Monitoreados',
      monitoredCount: 'Alertas de tus favoritos',
      noFavorites: 'Marca tableros como favoritos para ver alertas aquí.',
      messages: {
        commented: 'comentó en',
        moved: 'movió la tarjeta de {from} a {to}',
        created: 'creó la tarjeta en {list}'
      }
    },
    jiraAlerts: {
      title: 'Panel Operativo Jira',
      refresh: 'Actualizar Jira',
      noAlerts: 'Sin actividad pendiente.',
      priority: 'Prioridad',
      status: 'Estado',
      type: 'Tipo',
      waiting: 'Esperando hace {time}',
      sections: {
        review: 'Necesita tu Revisión',
        deploy: 'Cola de Deploy',
        forgotten: 'Posiblemente Olvidados',
        comments: 'Radar de Comentarios',
        activity: 'Actividad Reciente'
      },
      stats: {
        review: 'En revisión',
        deploy: 'Listo deploy',
        stuck: 'Bloqueados',
        forgotten: 'Olvidados'
      },
      actions: {
        copyUpdate: 'Copiar Update',
        moveTo: 'Mover a...',
        openPR: 'Ver PR',
        assign: 'Asignar',
        openJira: 'Abrir Jira'
      },
      staleness: {
        forgotten: 'Olvidado en revisión',
        stale: 'Sin movimiento',
        blocked: 'Bloqueado'
      },
      templates: {
        readyDeploy: 'Ticket revisado y listo para deploy.',
        inDev: 'El issue se encuentra actualmente en desarrollo.'
      }
    },
    sync: {
      title: 'Sincronización de Tareas',
      subtitle: 'Tarjetas en listas "Sprint" que aún no tienen link a Jira.',
      fetchCards: 'Buscar tarjetas',
      card: 'Tarjeta',
      labels: 'Etiquetas',
      due: 'Vencimiento',
      board: 'Tablero',
      refineAI: 'Refinar con IA (Gemini)',
      sendToJira: 'Enviar a Jira',
      sendingToJira: 'Enviando...',
      noLabels: 'Ninguna',
      noDueDate: 'Sin fecha',
      empty: '¡Todo al día! No hay tareas pendientes en tus tableros favoritos.'
    },
    logs: {
      empty: 'Sin actividad aún.'
    },
    messages: {
      credentialsSaved: 'Credenciales guardadas localmente.',
      boardsLoaded: 'Tableros de Trello cargados.',
      trelloValidated: 'Trello conectado como {name}.',
      jiraProjectsLoaded: 'Proyectos de Jira cargados.',
      listsLoaded: 'Listas del tablero cargadas.',
      cardsLoaded: 'Tarjetas de Trello cargadas.',
      previewReady: 'Previsualización de sincronización lista.',
      automationSaved: 'Automatización guardada para {board}.',
      automationFinished: 'Sincronización terminada para {board}.',
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
    appSubtitle: 'PO Workflow Control',
    eyebrow: 'PO Assistant',
    nav: {
      settings: 'Credentials',
      dashboard: 'Dashboard',
      boards: 'Trello Boards',
      sync: 'Sync Jira',
      alerts: 'Trello Alerts',
      jiraAlerts: 'Jira Alerts',
      profile: 'My Profile'
    },
    settings: {
      trelloApiKey: 'Trello API Key',
      trelloToken: 'Trello Token',
      jiraBaseUrl: 'Jira Base URL',
      jiraEmail: 'Jira Email',
      jiraApiToken: 'Jira API Token',
      geminiApiKey: 'Gemini API Key',
      save: 'Save Credentials',
      loadBoards: 'Load Boards',
      validateTrello: 'Validate Trello'
    },
    boards: {
      refresh: 'Refresh Boards',
      loadJira: 'Load Jira Projects',
      save: 'Save',
      run: 'Sync',
      running: 'Syncing...',
      syncsTo: 'Syncs to',
      noAutomation: 'No automation',
      syncRule: 'Create Jira Stories for every new card in "Sprint" lists.',
      jiraProject: 'Jira Project',
      issueType: 'Issue Type',
      issueTypes: {
        Story: 'Story',
        Task: 'Task',
        Bug: 'Bug'
      },
      refineAI: 'Refine with AI (Gemini)',
      reportNoCreated: 'No new tasks were created.',
      reportCreated: 'Created {count} new tasks in Jira.'
    },
    alerts: {
      refresh: 'Refresh Alerts',
      noAlerts: 'No recent activity.',
      replyButton: 'Reply',
      monitoredBoards: 'Monitored Boards',
      monitoredCount: 'Alerts from your favorites',
      noFavorites: 'Mark boards as favorites to see alerts here.',
      messages: {
        commented: 'commented on',
        moved: 'moved card from {from} to {to}',
        created: 'created card in {list}'
      }
    },
    jiraAlerts: {
      title: 'Jira Operational Panel',
      refresh: 'Refresh Jira',
      noAlerts: 'No pending activity.',
      priority: 'Priority',
      status: 'Status',
      type: 'Type',
      waiting: 'Waiting for {time}',
      sections: {
        review: 'Needs Your Review',
        deploy: 'Deploy Queue',
        forgotten: 'Possibly Forgotten',
        comments: 'Comment Radar',
        activity: 'Recent Activity'
      },
      stats: {
        review: 'In review',
        deploy: 'Ready deploy',
        stuck: 'Blocked',
        forgotten: 'Forgotten'
      },
      actions: {
        copyUpdate: 'Copy Update',
        moveTo: 'Move to...',
        openPR: 'View PR',
        assign: 'Assign',
        openJira: 'Open Jira'
      },
      staleness: {
        forgotten: 'Forgotten in review',
        stale: 'No movement',
        blocked: 'Blocked'
      },
      templates: {
        readyDeploy: 'Ticket reviewed and ready for deployment.',
        inDev: 'The issue is currently in development.'
      }
    },
    sync: {
      title: 'Task Synchronization',
      subtitle: 'Cards in "Sprint" lists that do not have a Jira link yet.',
      fetchCards: 'Fetch cards',
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
