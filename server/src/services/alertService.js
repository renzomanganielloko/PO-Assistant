import { fetchActions, addComment as trelloAddComment, uploadFileToCard } from './trelloService.js';
import { listAutomations } from '../storage/automationStore.js';

export async function addComment(userId, cardId, text, attachment) {
  if (attachment) {
    const buffer = Buffer.from(attachment.split(',')[1], 'base64');
    await uploadFileToCard(userId, cardId, { filename: 'reply-image.png', buffer });
  }
  return trelloAddComment(userId, cardId, text);
}

export async function getLiveAlerts(userId) {
  const automations = await listAutomations(userId);
  // Filter boards that are marked as favorite
  const boardIds = automations
    .filter(a => a.favorite)
    .map(a => a.trelloBoardId);
  
  if (boardIds.length === 0) return [];

  const allActions = await Promise.all(
    boardIds.map(async (boardId) => {
      try {
        const actions = await fetchActions(userId, boardId);
        return actions.map(action => ({ ...action, boardId }));
      } catch (e) {
        console.error(`Failed to fetch actions for board ${boardId}:`, e.message);
        return [];
      }
    })
  );

  const flatActions = allActions.flat().sort((a, b) => new Date(b.date) - new Date(a.date));

  return flatActions.map(formatAction).filter(Boolean);
}

function formatAction(action) {
  const { type, date, data, memberCreator } = action;
  const base = {
    id: action.id,
    date,
    user: memberCreator.fullName || memberCreator.username,
    username: memberCreator.username,
    userId: memberCreator.id,
    boardName: data.board.name,
    boardId: action.boardId,
    cardId: data.card.id,
    cardName: data.card.name,
    cardUrl: `https://trello.com/c/${data.card.shortLink || data.card.id}`
  };

  if (type === 'commentCard') {
    return {
      ...base,
      type: 'comment',
      text: data.text
    };
  }

  if (type === 'updateCard' && data.listBefore && data.listAfter) {
    return {
      ...base,
      type: 'move',
      fromList: data.listBefore.name,
      toList: data.listAfter.name
    };
  }

  if (type === 'createCard') {
    const listName = data.list.name.toLowerCase();
    const isRelevantList = listName.includes('backlog') || listName.includes('sprint');
    
    if (isRelevantList) {
      return {
        ...base,
        type: 'creation',
        listName: data.list.name
      };
    }
  }

  return null;
}
