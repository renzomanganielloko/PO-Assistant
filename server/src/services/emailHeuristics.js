export function analyzeEmail(email) {
  const subject = email.subject || '';
  const snippet = email.snippet || '';
  const body = email.body || '';
  const content = `${subject} ${snippet} ${body}`.toLowerCase();
  const fromLower = (email.from || '').toLowerCase();
  
  const categories = [];
  const badges = [];
  const jiraIds = [];
  let project = 'GRAL'; 
  let priorityScore = 0;

  // 1. Extract Jira IDs (e.g., PROJ-123)
  const jiraRegex = /\b([A-Z]{2,10}-[0-9]+)\b/g;
  let match;
  const foundJiraIds = new Set();
  while ((match = jiraRegex.exec(subject + ' ' + snippet)) !== null) {
    foundJiraIds.add(match[1]);
  }
  
  // Also scan body if no Jira IDs found in subject/snippet
  if (foundJiraIds.size === 0) {
    while ((match = jiraRegex.exec(body)) !== null) {
      foundJiraIds.add(match[1]);
    }
  }

  jiraIds.push(...foundJiraIds);

  // Extract Project code
  if (jiraIds.length > 0) {
    project = jiraIds[0].split('-')[0];
  } else {
    // Look for bracketed prefixes like [SUPPORT] or [MARKETING]
    const projectMatch = subject.match(/\[([A-Za-z0-9\s_-]{2,10})\]/);
    if (projectMatch) {
      project = projectMatch[1].trim().toUpperCase();
    } else {
      // Guess from sender domain or name
      if (fromLower.includes('trello')) project = 'TRELLO';
      else if (fromLower.includes('jira')) project = 'JIRA';
      else if (fromLower.includes('github')) project = 'GITHUB';
    }
  }

  // 2. Identify Sender Origin Badges
  if (fromLower.includes('jira')) {
    badges.push({ label: 'Jira', color: 'purple', icon: '📓' });
  } else if (fromLower.includes('trello')) {
    badges.push({ label: 'Trello', color: 'blue', icon: '📋' });
  } else if (fromLower.includes('github')) {
    badges.push({ label: 'Github', color: 'purple', icon: '🐙' });
  }

  // 3. Identify Categories & Priority Badges
  // Blocker
  const isBlocker = content.includes('block') || content.includes('bloqueo') || 
                    content.includes('critical') || content.includes('crítico') || 
                    content.includes('urgente') || content.includes('urgent') ||
                    content.includes('breaks') || content.includes('down') ||
                    content.includes('bloqueante') || content.includes('bloqueada');
  if (isBlocker) {
    categories.push('Blocker');
    badges.push({ label: 'Blocker', color: 'red', icon: '🔴' });
    priorityScore += 5;
  }

  // Client Messages
  const isClient = content.includes('client') || content.includes('cliente') || 
                   content.includes('customer') || content.includes('usuario') || 
                   content.includes('soporte') || content.includes('support') || 
                   content.includes('ticket') || content.includes('comprador');
  if (isClient) {
    categories.push('Client Messages');
    badges.push({ label: 'Client', color: 'orange', icon: '👥' });
    priorityScore += 3;
  }

  // Deploys & Releases
  const isDeploy = content.includes('deploy') || content.includes('release') || 
                   content.includes('prod') || content.includes('lanzamiento') || 
                   content.includes('pipeline') || content.includes('github action') ||
                   content.includes('merge') || content.includes('despliegue');
  if (isDeploy) {
    categories.push('Deploys & Releases');
    badges.push({ label: 'Deploy', color: 'green', icon: '🚀' });
    priorityScore += 1;
  }

  // Bug
  const isBug = content.includes('bug') || content.includes('error') || 
                content.includes('crash') || content.includes('defect') || 
                content.includes('falla') || content.includes('incidencia');
  if (isBug) {
    badges.push({ label: 'Bug', color: 'red', icon: '🐛' });
    priorityScore += 2;
  }

  // Needs Attention / Reviews
  const needsAttention = content.includes('review') || content.includes('approve') || 
                         content.includes('feedback') || content.includes('revisar') || 
                         content.includes('revisión') || content.includes('pr') ||
                         content.includes('pull request') || content.includes('action required');
  if (needsAttention || categories.length === 0) {
    categories.push('Needs Attention');
    if (!isBlocker && !isBug) {
      badges.push({ label: 'Review', color: 'yellow', icon: '👀' });
    }
    priorityScore += 2;
  }

  // Follow-up
  const isFollowUp = content.includes('follow up') || content.includes('seguimiento') || 
                     content.includes('reminder') || content.includes('recordatorio') || 
                     content.includes('status update');
  if (isFollowUp) {
    categories.push('Follow-up');
    badges.push({ label: 'Follow-up', color: 'purple', icon: '🔄' });
    priorityScore += 1;
  }

  // Cap priority score
  priorityScore = Math.min(Math.max(priorityScore, 1), 10);

  // 4. Extract potential deadlines
  const deadlines = [];
  const dateRegex = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g;
  let dateMatch;
  while ((dateMatch = dateRegex.exec(content)) !== null) {
    deadlines.push(`${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`);
  }

  // 5. Check if unread
  const isUnread = Array.isArray(email.labelIds) && email.labelIds.includes('UNREAD');

  return {
    priorityScore,
    categories,
    badges: badges.slice(0, 3), // limit to max 3 badges in UI
    deadlines,
    jiraIds,
    isUnread,
    project
  };
}
