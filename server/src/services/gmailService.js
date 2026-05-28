import { google } from 'googleapis';
import { loadCredentials, saveCredentials } from '../storage/credentialsStore.js';
import { generateGeminiText } from './geminiService.js';
import { analyzeEmail } from './emailHeuristics.js';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];
const SUMMARY_CACHE = new Map(); // Simple in-memory cache for summaries

export function getOAuth2Client() {
  const redirectUri = process.env.REDIRECT_URI || 'http://localhost:4000/api/gmail/callback';
  console.log(`[Gmail] Initializing OAuth2 with redirect: ${redirectUri}`);
  
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function getAuthUrl(userId) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: userId
  });
}

export async function setTokens(userId, code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  await saveCredentials(userId, { googleTokens: tokens });
  return tokens;
}

async function getAuthenticatedClient(userId) {
  const credentials = await loadCredentials(userId);
  const oauth2Client = getOAuth2Client();

  if (!credentials.googleTokens) {
    throw new Error('Gmail not connected');
  }

  oauth2Client.setCredentials(credentials.googleTokens);

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      const current = await loadCredentials(userId);
      await saveCredentials(userId, {
        googleTokens: { ...current.googleTokens, ...tokens }
      });
    }
  });

  return oauth2Client;
}

export async function fetchLabels(userId) {
  const auth = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.labels.list({ userId: 'me' });

  const allLabels = res.data.labels || [];
  console.log('[Gmail] All labels found:', allLabels.map(l => l.name).join(', '));

  const allowedNames = ['INBOX', 'Calendar', 'Jira', 'Notas de Gemini', 'Trello'];

  return allLabels.filter(label => {
    const nameMatch = allowedNames.some(n => label.name.toLowerCase() === n.toLowerCase());
    const idMatch = allowedNames.some(n => label.id.toLowerCase() === n.toLowerCase());
    return nameMatch || idMatch;
  }).map(label => ({
    ...label,
    name: label.id === 'INBOX' ? (process.env.LANG === 'es' ? 'Recibidos' : 'Inbox') : label.name
  }));
}

export async function fetchEmails(userId, labelId = 'INBOX', limit = 30) {
  const auth = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  console.log(`[Gmail] Fetching emails for label: ${labelId}, limit: ${limit}`);

  const res = await gmail.users.messages.list({
    userId: 'me',
    maxResults: limit,
    labelIds: labelId === 'ALL' ? [] : [labelId],
    q: labelId === 'ALL' ? 'label:INBOX' : undefined
  });

  const messages = res.data.messages || [];
  console.log(`[Gmail] Found ${messages.length} messages`);

  const emails = await Promise.all(
    messages.map(async (msg) => {
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = detail.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
        const from = headers.find(h => h.name === 'From')?.value || '(Unknown)';
        const date = headers.find(h => h.name === 'Date')?.value;
        const snippet = detail.data.snippet;
        const labelIds = detail.data.labelIds || [];

        let body = '';
        if (detail.data.payload.parts) {
          const part = detail.data.payload.parts.find(p => p.mimeType === 'text/plain') || detail.data.payload.parts[0];
          if (part?.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString();
          }
        } else if (detail.data.payload.body?.data) {
          body = Buffer.from(detail.data.payload.body.data, 'base64').toString();
        }

        const emailData = {
          id: msg.id,
          threadId: msg.threadId,
          subject,
          from,
          snippet,
          body: body.slice(0, 2000),
          date,
          labelIds
        };

        const analysis = analyzeEmail(emailData);
        console.log(`[Gmail] Analyzed: "${subject}" -> Categories: ${analysis.categories.join(', ')}`);

        return {
          ...emailData,
          ...analysis,
          hasSummary: SUMMARY_CACHE.has(msg.id),
          cachedSummary: SUMMARY_CACHE.get(msg.id)
        };
      } catch (err) {
        console.error(`Error fetching message ${msg.id}:`, err.message);
        return null;
      }
    })
  );

  return emails.filter(Boolean);
}

export async function getUnreadEmailCount(userId, labelId = 'INBOX') {
  const auth = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.labels.get({ userId: 'me', id: labelId });
  return res.data.messagesUnread || 0;
}

export async function summarizeEmail(userId, email) {
  // Check cache first
  if (SUMMARY_CACHE.has(email.id)) {
    return SUMMARY_CACHE.get(email.id);
  }

  try {
    const prompt = `
      Eres un asistente eficiente para un Product Owner. Resume el siguiente correo electronico en una o dos oraciones maximo.
      Identifica puntos clave, bloqueos o acciones requeridas.
      
      De: ${email.from}
      Asunto: ${email.subject}
      Contenido: ${email.snippet} ${email.body}

      Resumen ejecutivo:
    `;

    const summary = await generateGeminiText(userId, prompt);
    SUMMARY_CACHE.set(email.id, summary);
    return summary;
  } catch (error) {
    console.error('[Gmail AI] Summarization failed:', error.message);
    return 'No se pudo generar el resumen.';
  }
}

export async function markAsRead(userId, messageId) {
  const auth = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });
  await gmail.users.messages.batchModify({
    userId: 'me',
    ids: [messageId],
    removeLabelIds: ['UNREAD']
  });
}

export async function archiveMessage(userId, messageId) {
  const auth = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });
  await gmail.users.messages.batchModify({
    userId: 'me',
    ids: [messageId],
    removeLabelIds: ['INBOX']
  });
}

