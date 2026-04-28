import test from 'node:test';
import assert from 'node:assert/strict';
import { hasJiraAttachment, selectSyncCandidates } from '../src/services/syncRules.js';

test('selects only cards in Sprint lists without Jira attachments', () => {
  const lists = [
    { id: 'todo', name: 'To Do' },
    { id: 'sprint', name: 'Sprint 24' }
  ];
  const cards = [
    {
      id: 'card-1',
      listId: 'sprint',
      labels: [],
      attachments: []
    },
    {
      id: 'card-2',
      listId: 'sprint',
      labels: [],
      attachments: [{ name: 'DM-55', url: 'https://knownonline.atlassian.net/browse/DM-55' }]
    },
    {
      id: 'card-3',
      listId: 'todo',
      labels: [],
      attachments: []
    }
  ];

  const result = selectSyncCandidates({ cards, lists });

  assert.deepEqual(result.eligibleCards.map((card) => card.id), ['card-1']);
  assert.equal(result.sprintCards.length, 2);
  assert.equal(result.cardsWithoutJiraLink.length, 1);
});

test('detects Jira attachments by URL or issue key name', () => {
  assert.equal(
    hasJiraAttachment({
      attachments: [{ name: 'Spec', url: 'https://knownonline.atlassian.net/browse/DM-55' }]
    }),
    true
  );
  assert.equal(
    hasJiraAttachment({
      attachments: [{ name: 'DM-55', url: 'https://example.com' }]
    }),
    true
  );
});
