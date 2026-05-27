const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

async function request(path, options = {}) {
  let response;
  const token = localStorage.getItem('token');

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      },
      ...options
    });
  } catch (error) {
    throw new Error(
      `No se pudo conectar con la API (${API_BASE}). Verifica que el backend esté corriendo.`
    );
  }

  if (response.status === 401 && !path.includes('/auth/login')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(error.message || 'Request failed.');
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  getMe: () => request('/auth/me'),
  getUsers: () => request('/auth/users'),
  registerUser: (userData) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  deleteUser: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),
  toggleUserStatus: (id) => request(`/auth/users/${id}/toggle`, { method: 'PUT' }),
  changePassword: (currentPassword, newPassword) => request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword })
  }),
  credentialStatus: () => request('/settings/status'),
  dashboardStats: () => request('/dashboard/stats'),
  saveSettings: (payload) =>
    request('/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  boards: () => request('/trello/boards'),
  validateTrello: () => request('/trello/validate'),
  lists: (boardId) => request(`/trello/lists?boardId=${encodeURIComponent(boardId)}`),
  boardMembers: (boardId) => request(`/trello/boards/${encodeURIComponent(boardId)}/members`),
  uploadTrelloImage: (cardId, attachment) => 
    request(`/trello/cards/${encodeURIComponent(cardId)}/upload`, {
      method: 'POST',
      body: JSON.stringify({ attachment })
    }),
  cards: (boardId, listId) => {
    const query = new URLSearchParams({ boardId });
    if (listId) query.set('listId', listId);
    return request(`/trello/cards?${query.toString()}`);
  },
  syncPreview: (payload) =>
    request('/sync/preview', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  syncCard: (payload) =>
    request('/sync/card', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  pendingCards: () => request('/sync/pending'),
  jiraProjects: () => request('/jira/projects'),
  jiraAlerts: () => request('/jira/alerts'),
  markJiraAlertAsRead: (id) =>
    request('/jira/alerts/read', {
      method: 'POST',
      body: JSON.stringify({ id })
    }),
  automations: () => request('/automations'),
  saveAutomation: (payload) =>
    request('/automations', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  runBoardAutomation: (boardId) =>
    request(`/boards/${encodeURIComponent(boardId)}/run-automation`, {
      method: 'POST',
      body: JSON.stringify({})
    }),
  getAlertsConfig: () => request('/alerts/config'),
  saveAlertsConfig: (payload) =>
    request('/alerts/config', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getAlerts: () => request('/alerts'),
  replyToAlert: (payload) =>
    request('/alerts/reply', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getGmailStatus: () => request('/gmail/status'),
  getGmailAuthUrl: () => request('/gmail/auth'),
  getGmailLabels: () => request('/gmail/labels'),
  disconnectGmail: () => request('/gmail/disconnect', { method: 'POST' }),
  getEmails: (labelId) => request(`/gmail/emails?labelId=${encodeURIComponent(labelId || 'INBOX')}`),
  aiSummarize: (text, type = 'corto') => 
    request('/gemini/summarize', { 
      method: 'POST', 
      body: JSON.stringify({ text, type }) 
    }),
  assistantQuestions: () => request('/assistant/questions'),
  assistantQuery: (payload) =>
    request('/assistant/query', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
};
