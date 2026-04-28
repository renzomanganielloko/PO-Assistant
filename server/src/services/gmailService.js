import { google } from 'googleapis';
import { loadCredentials, saveCredentials } from '../storage/credentialsStore.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

export async function setTokens(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  await saveCredentials({ googleTokens: tokens });
  return tokens;
}

async function getAuthenticatedClient() {
  const credentials = await loadCredentials();
  const oauth2Client = getOAuth2Client();
  
  if (!credentials.googleTokens) {
    throw new Error('Gmail not connected');
  }

  oauth2Client.setCredentials(credentials.googleTokens);

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      // Save updated tokens
      const current = await loadCredentials();
      await saveCredentials({ 
        googleTokens: { ...current.googleTokens, ...tokens } 
      });
    }
  });

  return oauth2Client;
}

export async function fetchLabels() {
  const auth = await getAuthenticatedClient();
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

export async function fetchEmails(limit = 15, labelId = 'INBOX') {
  const auth = await getAuthenticatedClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.list({
    userId: 'me',
    maxResults: limit,
    labelIds: labelId === 'ALL' ? [] : [labelId],
    q: labelId === 'ALL' ? 'label:INBOX' : undefined
  });

  const messages = res.data.messages || [];
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
        const snippet = detail.data.snippet;
        
        let body = '';
        if (detail.data.payload.parts) {
          const part = detail.data.payload.parts.find(p => p.mimeType === 'text/plain') || detail.data.payload.parts[0];
          if (part && part.body && part.body.data) {
            body = Buffer.from(part.body.data, 'base64').toString();
          }
        } else if (detail.data.payload.body && detail.data.payload.body.data) {
          body = Buffer.from(detail.data.payload.body.data, 'base64').toString();
        }

        return {
          id: msg.id,
          threadId: msg.threadId,
          subject,
          from,
          snippet,
          body: body.slice(0, 2000),
          date: headers.find(h => h.name === 'Date')?.value
        };
      } catch (err) {
        console.error(`Error fetching message ${msg.id}:`, err.message);
        return null;
      }
    })
  );

  return emails.filter(Boolean);
}

export async function summarizeEmail(email) {
  const credentials = await loadCredentials();
  const apiKey = credentials.geminiApiKey;

  if (!apiKey) return "Gemini API key not configured.";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Eres un asistente eficiente. Resume el siguiente correo electrónico en una o dos oraciones máximo.
      Enfócate en la acción requerida o el punto principal.
      
      De: ${email.from}
      Asunto: ${email.subject}
      Contenido: ${email.snippet} ${email.body}
      
      Resumen corto:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('[Gmail AI] Summarization failed:', error.message);
    return "No se pudo generar el resumen.";
  }
}
