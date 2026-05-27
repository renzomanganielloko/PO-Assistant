import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCredentials } from '../src/storage/credentialsStore.js';

test('keeps the Gemini API key when normalizing credentials', () => {
  const credentials = normalizeCredentials({
    trelloApiKey: ' trello-key ',
    trelloToken: 'trello token',
    jiraBaseUrl: 'https://example.atlassian.net/',
    jiraEmail: ' user@example.com ',
    jiraApiToken: ' jira token ',
    geminiApiKey: ' gemini key ',
    googleTokens: { access_token: 'token' }
  });

  assert.equal(credentials.geminiApiKey, 'geminikey');
  assert.equal(credentials.jiraBaseUrl, 'https://example.atlassian.net');
  assert.equal(credentials.googleTokens.access_token, 'token');
});
