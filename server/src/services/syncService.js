import { attachUrlToCard, fetchCards, fetchLists, downloadAttachment } from './trelloService.js';
import { createJiraIssue, createJiraRemoteLink, findExistingJiraIssue, uploadAttachmentToJira, updateIssueDescription, toAdf } from './jiraService.js';
import { normalizeTrelloCard } from './mappingService.js';
import { selectSyncCandidates, hasJiraAttachment } from './syncRules.js';
import { findMappingByTrelloCardId, saveMapping, listMappings } from '../storage/mappingStore.js';
import { updateAutomationRun } from '../storage/automationStore.js';
import { refineTicket } from './aiService.js';
import { AppError } from '../utils/AppError.js';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

/**
 * Core logic to sync a single card. Used by both board sync and single card sync.
 */
async function processSingleCard(card, automation, listName, allMappings) {
  console.log(`[Sync] Processing card: ${card.title}`);
  const cardHasLink = hasJiraAttachment(card);
  const existingMapping = allMappings.find(m => m.trelloCardId === card.id);

  const cardPayload = normalizeTrelloCard(card);
  let finalIssue = null;
  let isNewCreation = false;

  // 1. Find or Create the Jira Issue
  if (existingMapping) {
    finalIssue = {
      id: existingMapping.jiraIssueId,
      key: existingMapping.jiraIssueKey,
      self: existingMapping.jiraIssueApiUrl,
      browseUrl: existingMapping.jiraIssueUrl
    };
    console.log(`[Sync] Using existing mapping for ${finalIssue.key}`);
  } else {
    finalIssue = await findExistingJiraIssue({
      projectKey: automation.jiraProjectKey,
      summary: cardPayload.summary,
      trelloCardId: card.id
    });
  }

  if (!finalIssue) {
    isNewCreation = true;
    finalIssue = await createJiraIssue({
      projectKey: automation.jiraProjectKey,
      issueType: automation.jiraIssueType,
      cardPayload,
      trelloCardId: card.id
    });
    console.log(`[Sync] Created new issue: ${finalIssue.key}`);
  } else {
    console.log(`[Sync] Issue already exists: ${finalIssue.key}`);
  }

  // 2. Refine description with AI if enabled
  let finalDescription = card.description;
  if (automation.refineAI) {
    console.log(`[Sync] Refining description with AI for ${card.title}`);
    finalDescription = await refineTicket(card.title, card.description);
  }

  // 3. Process Attachments and embed images in description
  const attachments = [...(cardPayload.attachments || [])];
  const descImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  let descMatch;
  while ((descMatch = descImageRegex.exec(finalDescription)) !== null) {
    const url = descMatch[1];
    if (!attachments.some(a => a.url === url)) {
      attachments.push({ name: 'description_image.webp', url });
    }
  }

  const attachmentMap = {}; 
  let hasNewUploads = false;

  for (const attachment of attachments) {
    const isImage = IMAGE_EXTENSIONS.some(ext => attachment.url.toLowerCase().includes(ext)) || 
                    attachment.url.includes('/download/') || 
                    attachment.url.includes('previews');

    if (isImage) {
      try {
        let filename = attachment.url.split('/').pop().split('?')[0] || 'image.webp';
        if (!IMAGE_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext))) {
           filename += '.webp';
        }

        const buffer = await downloadAttachment(attachment.url);
        const uploadResult = await uploadAttachmentToJira(finalIssue.key, { filename, buffer });
        
        if (uploadResult && uploadResult[0]) {
          attachmentMap[attachment.url] = uploadResult[0].id;
          hasNewUploads = true;
        }
      } catch (err) {
        console.error(`[Sync] Attachment error (${attachment.name}):`, err.message);
      }
    }
  }

  // 4. Update description if needed
  if (hasNewUploads || isNewCreation || automation.refineAI) {
    const finalDescriptionAdf = toAdf(finalDescription, attachmentMap);
    await updateIssueDescription(finalIssue.key, finalDescriptionAdf);
  }

  // 5. Ensure links
  if (!cardHasLink) {
    await attachUrlToCard(card.id, { name: finalIssue.key, url: finalIssue.browseUrl });
  }
  try {
    await createJiraRemoteLink(finalIssue.key, { title: 'Link a Trello', url: card.url });
  } catch (e) { /* silent */ }

  // 6. Save Mapping
  await saveMapping({
    trelloBoardId: automation.trelloBoardId,
    trelloCardId: card.id,
    trelloCardUrl: card.url,
    trelloListName: listName,
    jiraProjectKey: automation.jiraProjectKey,
    jiraIssueId: finalIssue.id,
    jiraIssueKey: finalIssue.key,
    jiraIssueUrl: finalIssue.browseUrl,
    jiraIssueApiUrl: finalIssue.self
  });

  return {
    trelloCardId: card.id,
    title: card.title,
    jiraIssueKey: finalIssue.key,
    jiraIssueUrl: finalIssue.browseUrl,
    isNew: isNewCreation
  };
}

export async function runBoardAutomation(automation) {
  if (!automation?.enabled) {
    throw new AppError('This automation is disabled.', 400);
  }

  const [lists, cards, allMappings] = await Promise.all([
    fetchLists(automation.trelloBoardId),
    fetchCards(automation.trelloBoardId, automation.trelloListId || undefined),
    listMappings()
  ]);

  const listNamesById = new Map(lists.map((list) => [list.id, list.name]));
  const { eligibleCards } = selectSyncCandidates({ cards, lists });

  console.log(`[Sync] Running sync for ${automation.trelloBoardName}. Refine with AI: ${automation.refineAI}`);

  const result = {
    totalCards: cards.length,
    sprintCards: eligibleCards.length,
    created: [],
    repaired: [],
    skipped: [],
    errors: []
  };

  for (const card of eligibleCards) {
    try {
      const listName = listNamesById.get(card.listId) || '';
      const entry = await processSingleCard(card, automation, listName, allMappings);
      if (entry.isNew) result.created.push(entry);
      else result.repaired.push(entry);
    } catch (error) {
      console.error(`[Sync] Global error for card ${card.title}:`, error.message);
      result.errors.push({
        trelloCardId: card.id,
        title: card.title,
        message: error.response?.data?.errorMessages?.join(', ') || error.message
      });
    }
  }

  await updateAutomationRun(automation.id, result);
  return result;
}

export async function syncSingleCard(cardId, automation) {
  // Fetch specific card data
  const [lists, cards, allMappings] = await Promise.all([
    fetchLists(automation.trelloBoardId),
    fetchCards(automation.trelloBoardId), // Individual cards don't filter by list to find it first
    listMappings()
  ]);

  const card = cards.find(c => c.id === cardId);
  if (!card) throw new AppError('Card not found on board.', 404);

  const listNamesById = new Map(lists.map((list) => [list.id, list.name]));
  const listName = listNamesById.get(card.listId) || '';

  return await processSingleCard(card, automation, listName, allMappings);
}
