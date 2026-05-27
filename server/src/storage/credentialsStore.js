import crypto from 'node:crypto';
import { Credentials } from '../models/Credentials.js';

const EMPTY_CREDENTIALS = {
  trelloApiKey: '',
  trelloToken: '',
  jiraBaseUrl: '',
  jiraEmail: '',
  jiraApiToken: '',
  geminiApiKey: '',
  googleTokens: null
};

export async function saveCredentials(userId, nextCredentials) {
  let credentials = await Credentials.findOne({ userId });
  
  const currentData = credentials ? decryptData(credentials) : EMPTY_CREDENTIALS;
  const merged = normalizeCredentials({ ...currentData, ...nextCredentials });
  
  const encrypted = encryptData(merged);
  
  if (!credentials) {
    credentials = new Credentials({ userId, ...encrypted });
  } else {
    Object.assign(credentials, encrypted);
  }
  
  await credentials.save();
}

export async function loadCredentials(userId) {
  const credentials = await Credentials.findOne({ userId });
  if (!credentials) return EMPTY_CREDENTIALS;
  
  return normalizeCredentials({ ...EMPTY_CREDENTIALS, ...decryptData(credentials) });
}

export async function getCredentialStatus(userId) {
  const credentials = await loadCredentials(userId);
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

// Internal encryption logic
function encryptData(data) {
  const secret = process.env.CREDENTIAL_SECRET || 'development-only-secret-change-me';
  const key = crypto.createHash('sha256').update(secret).digest();
  
  const result = {};
  const fieldsToEncrypt = ['trelloApiKey', 'trelloToken', 'jiraBaseUrl', 'jiraEmail', 'jiraApiToken', 'geminiApiKey'];
  
  for (const field of fieldsToEncrypt) {
    const val = data[field] || '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(val, 'utf8'), cipher.final()]);
    
    result[field] = JSON.stringify({
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: encrypted.toString('base64')
    });
  }
  
  // Google tokens are stored as is (usually already encrypted by google or less sensitive than direct API keys)
  // or we can encrypt them too if needed. For now, keep as object.
  result.googleTokens = data.googleTokens;
  
  return result;
}

function decryptData(credentials) {
  const secret = process.env.CREDENTIAL_SECRET || 'development-only-secret-change-me';
  const key = crypto.createHash('sha256').update(secret).digest();
  
  const result = {};
  const fieldsToDecrypt = ['trelloApiKey', 'trelloToken', 'jiraBaseUrl', 'jiraEmail', 'jiraApiToken', 'geminiApiKey'];
  
  for (const field of fieldsToDecrypt) {
    const encryptedJson = credentials[field];
    if (!encryptedJson || encryptedJson === '') {
      result[field] = '';
      continue;
    }
    
    try {
      const payload = JSON.parse(encryptedJson);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.data, 'base64')),
        decipher.final()
      ]);
      result[field] = decrypted.toString('utf8');
    } catch (e) {
      console.error(`Failed to decrypt field ${field}`, e.message);
      result[field] = '';
    }
  }
  
  result.googleTokens = credentials.googleTokens;
  return result;
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
