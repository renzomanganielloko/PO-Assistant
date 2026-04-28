import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrelloCard } from '../src/services/mappingService.js';

test('normalizes a Trello card into a Jira-ready payload', () => {
  const payload = normalizeTrelloCard({
    id: 'card-1',
    listId: 'list-1',
    title: 'As a user I can export reports',
    description: 'Client needs CSV export.',
    url: 'https://trello.com/c/card-1',
    due: '2026-05-01T00:00:00.000Z',
    labels: [{ name: 'Ready' }, { name: 'Client Work' }],
    members: [{ username: 'renzo' }]
  });

  assert.equal(payload.trelloCardId, 'card-1');
  assert.equal(payload.suggestedIssueType, 'Story');
  assert.deepEqual(payload.labels, ['ready', 'client-work']);
  assert.equal(payload.description, 'Client needs CSV export.');
});
