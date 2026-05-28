import axios from 'axios';
import FormData from 'form-data';
import { loadCredentials } from '../storage/credentialsStore.js';
import { getReadAlerts } from '../storage/readAlertsStore.js';
import { AppError } from '../utils/AppError.js';

async function jiraClient(userId) {
  const credentials = await loadCredentials(userId);
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

export async function fetchJiraProjects(userId) {
  const client = await jiraClient(userId);
  const { data } = await client.get('/rest/api/3/project/search', { params: { maxResults: 50 } });
  return (data.values || []).map(p => ({ id: p.id, key: p.key, name: p.name, projectTypeKey: p.projectTypeKey }));
}

export async function getAssignedIssuesCount(userId) {
  const client = await jiraClient(userId);
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

let sprintFieldId = null;

async function getSprintFieldId(client) {
  if (sprintFieldId) return sprintFieldId;
  try {
    const { data } = await client.get('/rest/api/3/field');
    const field = data.find(f => f.name === 'Sprint' || f.schema?.custom === 'com.pyxis.greenhopper.jira:gh-sprint');
    if (field) sprintFieldId = field.id;
  } catch (e) {
    console.warn('[Jira] Could not fetch fields for sprint detection');
  }
  return sprintFieldId;
}

export async function getJiraAlerts(userId) {
  const client = await jiraClient(userId);
  const readAlerts = await getReadAlerts(userId);
  const sprintField = await getSprintFieldId(client);

  let myself = null;
  try {
    const { data } = await client.get('/rest/api/3/myself');
    myself = data;
  } catch (e) {
    console.warn('Could not fetch myself info from Jira', e.message);
  }

  const myAccountId = myself?.accountId || '';
  const myDisplayName = myself?.displayName || '';

  // JQL ampliada para cubrir todo el flujo operativo del PO
  // Buscamos: revisión, deploy, bloqueados, progreso y donde el usuario esté involucrado
  const projects = await fetchJiraProjects(userId).catch(() => []);
  const projectKeys = projects.map(p => p.key);

  let projectFilter = '';
  if (projectKeys.length > 0) {
    projectFilter = `project in (${projectKeys.map(k => `"${k}"`).join(', ')}) AND `;
  }

  const jql = `(statusCategory != Done) AND (reporter = currentUser() OR assignee = currentUser()) ORDER BY updated DESC`;
  
  try {
    const { data } = await client.post('/rest/api/3/search/jql', {
      jql,
      maxResults: 500,
      expand: "changelog",
      fields: ["summary", "status", "issuetype", "created", "updated", "assignee", "reporter", "priority", "comment", "labels", "components", sprintField].filter(Boolean)
    });

    const now = new Date();
    const processedIssues = await Promise.all((data.issues || []).map(async issue => {
      const fields = issue.fields;
      
      // Extraemos comentarios y cambios
      const comments = (fields.comment?.comments || []).map(c => ({ 
        date: c.created, 
        author: c.author, 
        type: 'comment', 
        body: c.body,
        text: extractTextFromAdf(c.body)
      }));

      const lastComment = comments.length > 0 ? comments[comments.length - 1] : null;

      const changes = (issue.changelog?.histories || []).map(h => ({ 
        date: h.created, 
        author: h.author, 
        type: 'change', 
        items: h.items 
      }));

      // Buscamos actividad relevante (menciones o asignaciones)
      const mentionActivity = comments.find(c => {
        const bodyStr = JSON.stringify(c.body);
        return bodyStr.includes(myAccountId) || (myDisplayName && bodyStr.includes(myDisplayName));
      });

      const assignmentActivity = changes.find(h => 
        h.items.some(i => i.field === 'assignee' && i.to === myAccountId)
      );

      const rel = mentionActivity || assignmentActivity || lastComment || changes[0];
      
      let actionType = 'update';
      let commentText = '';

      if (mentionActivity) {
        actionType = 'mention';
        commentText = mentionActivity.text;
      } else if (assignmentActivity) {
        actionType = 'assign';
      } else if (fields.assignee?.accountId === myAccountId) {
        actionType = 'update';
      }

      // Staleness logic (Heurística de inactividad)
      const updatedDate = new Date(fields.updated);
      const diffHours = (now - updatedDate) / (1000 * 60 * 60);
      
      const statusName = fields.status.name;
      const isUnderReview = statusName === 'En Revisión' || statusName === 'In Review';
      const isInProgress = statusName === 'En Progreso' || statusName === 'In Progress';
      const isBlocked = statusName === 'Bloqueado' || statusName === 'Blocked';
      const isReadyDeploy = statusName === 'Listo para Deploy' || statusName === 'Ready for Deploy' || statusName === 'Ready for deployment' || statusName === 'Ready for Release';

      let staleness = 'active';
      if (isUnderReview && diffHours > 24) staleness = 'forgotten';
      else if (isInProgress && diffHours > 72) staleness = 'stale';
      else if (isBlocked) staleness = 'blocked';

      // Bitbucket / PR Detection (Remote Links)
      let remoteLinks = [];
      if (isReadyDeploy || isUnderReview) {
        try {
          const { data: links } = await client.get(`/rest/api/3/issue/${issue.key}/remotelink`);
          remoteLinks = (links || []).map(l => ({
            title: l.object.title,
            url: l.object.url,
            isPR: l.object.url.includes('/pull-requests/') || l.object.title.toLowerCase().includes('pr')
          }));
        } catch (e) {
          // Silent fail for links
        }
      }

      // Sprint Detection
      let sprint = null;
      if (sprintField && fields[sprintField]) {
        const sprintArray = fields[sprintField];
        if (Array.isArray(sprintArray)) {
          const activeSprint = sprintArray.find(s => s.state === 'active') || sprintArray[sprintArray.length - 1];
          if (activeSprint) {
            sprint = { id: activeSprint.id, name: activeSprint.name, state: activeSprint.state };
          }
        }
      }

      return {
        id: issue.id, 
        key: issue.key, 
        summary: fields.summary, 
        status: fields.status.name,
        type: fields.issuetype.name, 
        created: fields.created,
        updated: fields.updated, 
        priority: fields.priority?.name,
        author: rel?.author?.displayName || 'Sistema', 
        authorId: rel?.author?.accountId,
        actionType, 
        commentText: commentText || (lastComment ? lastComment.text : ''),
        isAssignee: fields.assignee?.accountId === myAccountId,
        assigneeName: fields.assignee?.displayName,
        assigneeId: fields.assignee?.accountId,
        reporterId: fields.reporter?.accountId,
        reporterName: fields.reporter?.displayName,
        isReporter: fields.reporter?.accountId === myAccountId,
        labels: fields.labels || [],
        components: (fields.components || []).map(c => c.name),
        url: `${client.defaults.baseURL}/browse/${issue.key}`,
        staleness,
        remoteLinks,
        sprint,
        lastUpdateHours: Math.floor(diffHours)
      };
    }));

    // Categorización para el Dashboard Operativo
    const dashboard = {
      needsReview: processedIssues.filter(i => i.status === 'En Revisión' || i.status === 'In Review'),
      readyDeploy: processedIssues.filter(i => i.status === 'Listo para Deploy' || i.status === 'Ready for Deploy' || i.status === 'Ready for deployment' || i.status === 'Ready for Release'),
      blocked: processedIssues.filter(i => i.status === 'Bloqueado' || i.status === 'Blocked' || i.staleness === 'blocked'),
      forgotten: processedIssues.filter(i => i.staleness === 'forgotten' || i.staleness === 'stale'),
      commentRadar: processedIssues.filter(i => i.commentText && i.authorId !== myAccountId).slice(0, 10),
      myAssignments: processedIssues.filter(i => i.isAssignee),
      reportedByMe: processedIssues.filter(i => i.isReporter),
      allOpen: processedIssues,
      recentActivity: processedIssues.slice(0, 15)
    };

    return { 
      alerts: processedIssues.filter(issue => !readAlerts.includes(issue.id)),
      dashboard,
      stats: {
        reviewCount: dashboard.needsReview.length,
        deployCount: dashboard.readyDeploy.length,
        blockedCount: dashboard.blocked.length,
        forgottenCount: dashboard.forgotten.length,
        assignedCount: dashboard.myAssignments.length,
        reportedCount: dashboard.reportedByMe.length,
        allCount: dashboard.allOpen.length
      }
    };
  } catch (e) {
    console.error('Jira Alerts fetch failed:', e.response?.data || e.message);
    return { alerts: [], dashboard: {}, stats: {} };
  }
}

export async function addJiraComment(userId, issueKey, text) {
  const client = await jiraClient(userId);
  await client.post(`/rest/api/3/issue/${issueKey}/comment`, {
    body: toAdf(text)
  });
}

export async function updateIssueStatus(userId, issueKey, transitionId) {
  const client = await jiraClient(userId);
  await client.post(`/rest/api/3/issue/${issueKey}/transitions`, {
    transition: { id: transitionId }
  });
}

export async function assignIssue(userId, issueKey, accountId) {
  const client = await jiraClient(userId);
  await client.put(`/rest/api/3/issue/${issueKey}/assignee`, {
    accountId
  });
}

export async function getIssueTransitions(userId, issueKey) {
  const client = await jiraClient(userId);
  const { data } = await client.get(`/rest/api/3/issue/${issueKey}/transitions`);
  return data.transitions || [];
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

export async function findExistingJiraIssue(userId, { projectKey, summary, trelloCardId }) {
  const client = await jiraClient(userId);
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

export async function createJiraIssue(userId, { projectKey, issueType, cardPayload, trelloCardId }) {
  const client = await jiraClient(userId);
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

export async function createJiraRemoteLink(userId, issueKey, { title, url }) {
  const client = await jiraClient(userId);
  
  try {
    const { data: existingLinks } = await client.get(`/rest/api/3/issue/${issueKey}/remotelink`);
    if (existingLinks.some(link => link.object.url === url)) {
      console.log(`[Jira] Remote link already exists for ${issueKey}: ${url}`);
      return { id: 'already-exists' };
    }
  } catch (e) {
    console.warn(`[Jira] Could not verify existing remote links for ${issueKey}`, e.message);
  }

  const { data } = await withIssueVisibilityRetry(() =>
    client.post(`/rest/api/3/issue/${issueKey}/remotelink`, { object: { url, title } })
  );
  return { id: data.id };
}

export async function uploadAttachmentToJira(userId, issueKey, { filename, buffer }) {
  const client = await jiraClient(userId);
  const form = new FormData();
  form.append('file', buffer, filename);
  const { data } = await client.post(`/rest/api/3/issue/${issueKey}/attachments`, form, { headers: { ...form.getHeaders() } });
  return data;
}

export async function updateIssueDescription(userId, issueKey, descriptionAdf) {
  const client = await jiraClient(userId);
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
