export function selectSyncCandidates({ cards, lists }) {
  const sprintListIds = new Set(
    lists
      .filter((list) => isSprintList(list.name))
      .map((list) => list.id)
  );

  const sprintCards = cards.filter((card) => sprintListIds.has(card.listId));
  const cardsWithoutJiraLink = sprintCards.filter((card) => !hasJiraAttachment(card));
  
  const eligibleCards = cardsWithoutJiraLink;

  return {
    sprintListIds,
    sprintCards,
    cardsWithoutJiraLink,
    eligibleCards
  };
}

export function hasJiraAttachment(card) {
  return (card.attachments || []).some((attachment) => isJiraUrl(attachment.url) || isJiraKey(attachment.name));
}

function isSprintList(name = '') {
  return name.toLowerCase().includes('sprint');
}

function isJiraUrl(value = '') {
  const normalized = value.toLowerCase();
  return normalized.includes('atlassian.net/browse/') || normalized.includes('/browse/');
}

function isJiraKey(value = '') {
  return /^[A-Z][A-Z0-9]+-\d+$/.test(value.trim());
}
