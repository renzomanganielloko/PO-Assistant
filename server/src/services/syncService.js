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
async function processSingleCard(userId, card, automation, listName, allMappings) {
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
    finalIssue = await findExistingJiraIssue(userId, {
      projectKey: automation.jiraProjectKey,
      summary: cardPayload.summary,
      trelloCardId: card.id
    });
  }

  if (!finalIssue) {
    isNewCreation = true;
    finalIssue = await createJiraIssue(userId, {
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
  let aiError = '';
  if (automation.refineAI && isNewCreation) {
    console.log(`[Sync] Refining description with AI for ${card.title}`);
    try {
      finalDescription = await refineTicket(userId, card.title, card.description);
    } catch (error) {
      aiError = error.message;
      console.error(`[Sync] AI refinement failed for ${card.title}:`, error.message);
    }
  }

  // 3. Process Attachments - ONLY for new creations
  const attachmentMap = {}; 
  let hasNewUploads = false;

  if (isNewCreation) {
    const attachments = [...(cardPayload.attachments || [])];
    const descImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    let descMatch;
    while ((descMatch = descImageRegex.exec(finalDescription)) !== null) {
      const url = descMatch[1];
      if (!attachments.some(a => a.url === url)) {
        attachments.push({ name: 'description_image.webp', url });
      }
    }

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

          const buffer = await downloadAttachment(userId, attachment.url);
          const uploadResult = await uploadAttachmentToJira(userId, finalIssue.key, { filename, buffer });
          
          if (uploadResult && uploadResult[0]) {
            attachmentMap[attachment.url] = uploadResult[0].id;
            hasNewUploads = true;
          }
        } catch (err) {
          console.error(`[Sync] Attachment error (${attachment.name}):`, err.message);
        }
      }
    }
  }

  // 4. Update description if needed
  if (isNewCreation && (hasNewUploads || automation.refineAI)) {
    const finalDescriptionAdf = toAdf(finalDescription, attachmentMap);
    await updateIssueDescription(userId, finalIssue.key, finalDescriptionAdf);
  }

  // 5. Ensure links
  if (!cardHasLink) {
    await attachUrlToCard(userId, card.id, { name: finalIssue.key, url: finalIssue.browseUrl });
  }
  try {
    await createJiraRemoteLink(userId, finalIssue.key, { title: 'Link a Trello', url: card.url });
  } catch (e) { /* silent */ }

  // 6. Save Mapping
  await saveMapping(userId, {
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
    isNew: isNewCreation,
    aiError
  };
}

export async function runBoardAutomation(automation) {
  if (!automation?.enabled) {
    throw new AppError('This automation is disabled.', 400);
  }

  const userId = automation.userId;

  const [lists, cards, allMappings] = await Promise.all([
    fetchLists(userId, automation.trelloBoardId),
    fetchCards(userId, automation.trelloBoardId, automation.trelloListId || undefined),
    listMappings(userId)
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
      const entry = await processSingleCard(userId, card, automation, listName, allMappings);
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

  await updateAutomationRun(userId, automation.id, result);
  return result;
}

export async function syncSingleCard(cardId, automation) {
  const userId = automation.userId;
  const [lists, cards, allMappings] = await Promise.all([
    fetchLists(userId, automation.trelloBoardId),
    fetchCards(userId, automation.trelloBoardId), 
    listMappings(userId)
  ]);

  const card = cards.find(c => c.id === cardId);
  if (!card) throw new AppError('Card not found on board.', 404);

  const listNamesById = new Map(lists.map((list) => [list.id, list.name]));
  const listName = listNamesById.get(card.listId) || '';

  return await processSingleCard(userId, card, automation, listName, allMappings);
}
