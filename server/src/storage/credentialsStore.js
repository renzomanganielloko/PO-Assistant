import crypto from 'node:crypto';
import { readJson, writeJson } from './fileStore.js';

const FILE_NAME = 'credentials.enc.json';
const EMPTY_CREDENTIALS = {
  trelloApiKey: '',
  trelloToken: '',
  jiraBaseUrl: '',
  jiraEmail: '',
  jiraApiToken: '',
  geminiApiKey: '',
  googleTokens: null
};

export async function saveCredentials(nextCredentials) {
  const current = await loadCredentials();
  const merged = normalizeCredentials({ ...current, ...nextCredentials });
  await writeJson(FILE_NAME, encryptJson(merged));
}

export async function loadCredentials() {
  const encrypted = await readJson(FILE_NAME, null);
  if (!encrypted) return EMPTY_CREDENTIALS;
  return normalizeCredentials({ ...EMPTY_CREDENTIALS, ...decryptJson(encrypted) });
}

export async function getCredentialStatus() {
  const credentials = await loadCredentials();
  return {
    trelloConfigured: Boolean(credentials.trelloApiKey && credentials.trelloToken),
    jiraConfigured: Boolean(credentials.jiraBaseUrl && credentials.jiraEmail && credentials.jiraApiToken),
    geminiConfigured: Boolean(credentials.geminiApiKey),
    gmailConfigured: Boolean(credentials.googleTokens),
    jiraBaseUrl: credentials.jiraBaseUrl || '',
    diagnostics: {
      trelloApiKey: summarizeKey(credentials.trelloApiKey),
      trelloTokenLength: credentials.trelloToken.length,
      jiraEmail: credentials.jiraEmail,
      jiraApiTokenLength: credentials.jiraApiToken.length,
      geminiApiKey: summarizeKey(credentials.geminiApiKey)
    }
  };
}

function encryptJson(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);

  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64')
  };
}

function decryptJson(payload) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64')),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}

function key() {
  const secret = process.env.CREDENTIAL_SECRET || 'development-only-secret-change-me';
  return crypto.createHash('sha256').update(secret).digest();
}

export function normalizeCredentials(credentials) {
  return {
    ...credentials,
    trelloApiKey: compactSecret(credentials.trelloApiKey || ''),
    trelloToken: compactSecret(credentials.trelloToken || ''),
    jiraBaseUrl: trimString(credentials.jiraBaseUrl || '').replace(/\/+$/, ''),
    jiraEmail: trimString(credentials.jiraEmail || ''),
    jiraApiToken: compactSecret(credentials.jiraApiToken || ''),
    geminiApiKey: compactSecret(credentials.geminiApiKey || ''),
    googleTokens: credentials.googleTokens || null
  };
}

function compactSecret(value) {
  return trimString(value).replace(/\s+/g, '');
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function summarizeKey(value = '') {
  return {
    length: value.length,
    startsWith: value.slice(0, 6),
    endsWith: value.slice(-4),
    expectedLength: 32,
    hasExpectedLength: value.length === 32
  };
}
