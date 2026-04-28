export function normalizeTrelloCard(card) {
  const labelNames = card.labels.map((label) => label.name).filter(Boolean);

  return {
    trelloCardId: card.id,
    trelloListId: card.listId,
    summary: card.title,
    description: buildJiraDescription(card),
    suggestedIssueType: suggestIssueType(card),
    labels: labelNames.map(toJiraLabel),
    assigneeHint: card.members[0]?.username || null,
    due: card.due,
    sourceUrl: card.url,
    attachments: card.attachments || []
  };
}

function buildJiraDescription(card) {
  return card.description?.trim() || '';
}

function suggestIssueType(card) {
  const text = `${card.title} ${card.description}`.toLowerCase();
  const storyWords = ['user story', 'as a ', 'feature', 'epic'];
  return storyWords.some((word) => text.includes(word)) ? 'Story' : 'Task';
}

function toJiraLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}
