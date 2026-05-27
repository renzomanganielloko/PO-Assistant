import axios from 'axios';
import FormData from 'form-data';
import { loadCredentials } from '../storage/credentialsStore.js';
import { getReadAlerts } from '../storage/readAlertsStore.js';
import { AppError } from '../utils/AppError.js';

async function jiraClient() {
  const credentials = await loadCredentials();
  if (!credentials.jiraBaseUrl || !credentials.jiraEmail || !credentials.jiraApiToken) {
    throw new AppError('Jira credentials are not configured.', 400);
  }
  const baseUrl = credentials.jiraBaseUrl.replace(/\/+$/, '');
  return axios.create({
    baseURL: baseUrl,
    timeout: 30000,
    auth: { username: credentials.jiraEmail, password: credentials.jiraApiToken },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Atlassian-Token': 'no-check'
    }
  });
}

export async function fetchJiraProjects() {
  const client = await jiraClient();
  const { data } = await client.get('/rest/api/3/project/search', { params: { maxResults: 50 } });
  return (data.values || []).map(p => ({ id: p.id, key: p.key, name: p.name, projectTypeKey: p.projectTypeKey }));
}

export async function getAssignedIssuesCount() {
  const client = await jiraClient();
  try {
    const { data } = await client.post('/rest/api/3/search/jql', {
      jql: 'assignee = currentUser() AND statusCategory != Done',
      maxResults: 1,
      fields: ['id']
    });
    return data.total || 0;
  } catch (e) {
    console.error('Assigned count failed:', e.response?.data || e.message);
    return 0;
  }
}

export async function getJiraAlerts() {
  const client = await jiraClient();
  const readAlerts = await getReadAlerts();

  let myAccountId = '';
  let myDisplayName = '';
  try {
    const { data: myself } = await client.get('/rest/api/3/myself');
    myAccountId = myself.accountId;
    myDisplayName = myself.displayName;
  } catch (e) {
    console.warn('Could not fetch myself info from Jira', e.message);
  }

  // Buscamos tareas donde el usuario esté mencionado o sea el asignado
  const jql = `text ~ "currentUser()" OR assignee = currentUser() ORDER BY updated DESC`;
  
  try {
    const { data } = await client.post('/rest/api/3/search/jql', {
      jql,
      maxResults: 30,
      expand: "changelog",
      fields: ["summary", "status", "issuetype", "updated", "assignee", "priority", "comment"]
    });

    return (data.issues || [])
      .filter(issue => !readAlerts.includes(issue.id))
      .map(issue => {
        const fields = issue.fields;
        
        // Extraemos comentarios y cambios
        const comments = (fields.comment?.comments || []).map(c => ({ 
          date: c.created, 
          author: c.author, 
          type: 'comment', 
          body: c.body,
          text: extractTextFromAdf(c.body)
        }));

        const changes = (issue.changelog?.histories || []).map(h => ({ 
          date: h.created, 
          author: h.author, 
          type: 'change', 
          items: h.items 
        }));

        // Buscamos si hay una mención específica en los comentarios
        const mentionActivity = comments.find(c => {
          const bodyStr = JSON.stringify(c.body);
          return bodyStr.includes(myAccountId) || bodyStr.includes(myDisplayName);
        });

        // Buscamos si hay una asignación específica
        const assignmentActivity = changes.find(h => 
          h.items.some(i => i.field === 'assignee' && i.to === myAccountId)
        );

        // Priorizamos la mención, luego la asignación, luego el último cambio que no sea mío
        const rel = mentionActivity || assignmentActivity || comments[0] || changes[0];
        if (!rel) return null;

        let actionType = 'update';
        let commentText = '';

        if (mentionActivity && rel === mentionActivity) {
          actionType = 'mention';
          commentText = mentionActivity.text;
        } else if (assignmentActivity && rel === assignmentActivity) {
          actionType = 'assign';
        } else if (fields.assignee?.accountId === myAccountId) {
          actionType = 'update';
        } else {
          return null;
        }

        return {
          id: issue.id, 
          key: issue.key, 
          summary: fields.summary, 
          status: fields.status.name,
          type: fields.issuetype.name, 
          updated: rel.date, 
          priority: fields.priority?.name,
          author: rel.author?.displayName || 'Sistema', 
          actionType, 
          commentText,
          isAssignee: fields.assignee?.accountId === myAccountId,
          url: `${client.defaults.baseURL}/browse/${issue.key}`
        };
      })
      .filter(Boolean);
  } catch (e) {
    console.error('Jira Alerts fetch failed:', e.response?.data || e.message);
    return [];
  }
}

function extractTextFromAdf(adf) {
  if (!adf || !adf.content) return '';
  let text = '';
  const walk = (node) => {
    if (node.text) text += node.text;
    if (node.content) node.content.forEach(walk);
    if (node.type === 'hardBreak') text += '\n';
    if (node.type === 'paragraph' && text.length > 0) text += '\n';
  };
  adf.content.forEach(walk);
  return text.trim();
}

export async function findExistingJiraIssue({ projectKey, summary, trelloCardId }) {
  const client = await jiraClient();
  const queries = [
    { jql: `project = "${projectKey}" AND labels = "trello-id-${trelloCardId}"`, maxResults: 1 },
    { jql: `project = "${projectKey}" AND summary ~ "\\"${summary.replace(/"/g, '\\"')}\\""`, maxResults: 1 }
  ];
  for (const q of queries) {
    try {
      const { data } = await client.post('/rest/api/3/search/jql', q);
      if (data.issues?.length > 0) return { id: data.issues[0].id, key: data.issues[0].key, browseUrl: `${client.defaults.baseURL}/browse/${data.issues[0].key}`, self: data.issues[0].self };
    } catch (e) {}
  }
  return null;
}

export async function createJiraIssue({ projectKey, issueType, cardPayload, trelloCardId }) {
  const client = await jiraClient();
  const { data } = await client.post('/rest/api/3/issue', {
    fields: {
      project: { key: projectKey }, summary: cardPayload.summary,
      description: toAdf(cardPayload.description),
      issuetype: { name: issueType || cardPayload.suggestedIssueType || 'Task' },
      labels: [...(cardPayload.labels || []), `trello-id-${trelloCardId}`]
    }
  });
  return { id: data.id, key: data.key, self: data.self, browseUrl: `${client.defaults.baseURL}/browse/${data.key}` };
}

export async function createJiraRemoteLink(issueKey, { title, url }) {
  const client = await jiraClient();
  
  // 1. Check if the link already exists to avoid duplicates
  try {
    const { data: existingLinks } = await client.get(`/rest/api/3/issue/${issueKey}/remotelink`);
    if (existingLinks.some(link => link.object.url === url)) {
      console.log(`[Jira] Remote link already exists for ${issueKey}: ${url}`);
      return { id: 'already-exists' };
    }
  } catch (e) {
    console.warn(`[Jira] Could not verify existing remote links for ${issueKey}`, e.message);
  }

  // 2. Create if not found
  const { data } = await withIssueVisibilityRetry(() =>
    client.post(`/rest/api/3/issue/${issueKey}/remotelink`, { object: { url, title } })
  );
  return { id: data.id };
}

export async function uploadAttachmentToJira(issueKey, { filename, buffer }) {
  const client = await jiraClient();
  const form = new FormData();
  form.append('file', buffer, filename);
  const { data } = await client.post(`/rest/api/3/issue/${issueKey}/attachments`, form, { headers: { ...form.getHeaders() } });
  return data;
}

export async function updateIssueDescription(issueKey, descriptionAdf) {
  const client = await jiraClient();
  await withIssueVisibilityRetry(() =>
    client.put(`/rest/api/3/issue/${issueKey}`, { fields: { description: descriptionAdf } })
  );
}

async function withIssueVisibilityRetry(action, attempts = 4) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!isIssueVisibilityError(error) || attempt === attempts) {
        throw error;
      }
      await wait(attempt * 750);
    }
  }

  throw lastError;
}

function isIssueVisibilityError(error) {
  if (error.response?.status !== 404) return false;
  const messages = [
    ...(error.response.data?.errorMessages || []),
    error.response.data?.message || ''
  ].join(' ').toLowerCase();

  return messages.includes('issue') ||
    messages.includes('incidencia') ||
    messages.includes('permiso') ||
    messages.includes('permission');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toAdf(text, attachmentMap = {}) {
  if (!text) return { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [] }] };
  const paragraphs = String(text).split(/\n\s*\n/);
  const content = paragraphs.map(p => {
    const nodes = []; const regex = /(!?\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]+)")?\))/g;
    let last = 0; let m;
    while ((m = regex.exec(p)) !== null) {
      if (m.index > last) nodes.push({ type: 'text', text: p.substring(last, m.index) });
      const isImg = m[0].startsWith('!');
      if (isImg) {
        const attId = attachmentMap[m[3]];
        if (attId) nodes.push({ type: 'media_placeholder', attachmentId: attId, filename: m[2] });
        else nodes.push({ type: 'text', text: `📸 [IMAGEN: ${m[2]}]`, marks: [{ type: 'strong' }] });
      } else nodes.push({ type: 'text', text: m[2], marks: [{ type: 'link', attrs: { href: m[3] } }] });
      last = regex.lastIndex;
    }
    if (last < p.length) nodes.push({ type: 'text', text: p.substring(last) });
    const res = []; let curr = [];
    nodes.forEach(n => {
      if (n.type === 'media_placeholder') {
        if (curr.length > 0) res.push({ type: 'paragraph', content: curr });
        curr = []; res.push({ type: 'mediaSingle', attrs: { layout: 'center' }, content: [{ type: 'media', attrs: { id: n.attachmentId, type: 'file', collection: '' } }] });
      } else curr.push(n);
    });
    if (curr.length > 0) res.push({ type: 'paragraph', content: curr });
    return res;
  }).flat();
  return { type: 'doc', version: 1, content: content.length ? content : [{ type: 'paragraph', content: [] }] };
}
