import axios from 'axios';
import FormData from 'form-data';
import { loadCredentials } from '../storage/credentialsStore.js';
import { AppError } from '../utils/AppError.js';

const trello = axios.create({
  baseURL: 'https://api.trello.com/1',
  timeout: 15000
});

async function trelloParams() {
  const credentials = await loadCredentials();

  if (!credentials.trelloApiKey || !credentials.trelloToken) {
    throw new AppError('Trello credentials are not configured.', 400);
  }

  return {
    key: credentials.trelloApiKey,
    token: credentials.trelloToken
  };
}

export async function fetchBoards() {
  const params = await trelloParams();
  const { data } = await trello.get('/members/me/boards', {
    params: {
      ...params,
      fields: 'id,name,url,closed,dateLastActivity,prefs',
      filter: 'open'
    }
  });

  return data.map((board) => ({
    id: board.id,
    name: board.name,
    url: board.url,
    lastActivity: board.dateLastActivity,
    backgroundColor: board.prefs?.backgroundColor || null
  }));
}

export async function validateTrelloCredentials() {
  const params = await trelloParams();
  const { data } = await trello.get('/members/me', {
    params: {
      ...params,
      fields: 'id,username,fullName'
    }
  });

  return {
    id: data.id,
    username: data.username,
    fullName: data.fullName
  };
}

export async function fetchLists(boardId) {
  const params = await trelloParams();
  const { data } = await trello.get(`/boards/${boardId}/lists`, {
    params: {
      ...params,
      fields: 'id,name,closed,pos',
      filter: 'open'
    }
  });

  return data.map((list) => ({
    id: list.id,
    name: list.name,
    position: list.pos
  }));
}

export async function fetchBoardMembers(boardId) {
  const params = await trelloParams();
  const { data } = await trello.get(`/boards/${boardId}/members`, {
    params: {
      ...params,
      fields: 'id,username,fullName,avatarUrl'
    }
  });

  return data.map((member) => ({
    id: member.id,
    username: member.username,
    fullName: member.fullName,
    avatarUrl: member.avatarUrl
  }));
}

export async function fetchCards(boardId, listId) {
  const params = await trelloParams();
  const { data } = await trello.get(`/boards/${boardId}/cards`, {
    params: {
      ...params,
      fields: 'id,idList,name,desc,url,due,dateLastActivity,labels,idMembers,closed',
      attachments: true,
      attachment_fields: 'id,name,url',
      members: true,
      member_fields: 'fullName,username,avatarUrl',
      filter: 'open'
    }
  });

  return data
    .filter((card) => !listId || card.idList === listId)
    .map((card) => ({
      id: card.id,
      listId: card.idList,
      title: card.name,
      description: card.desc || '',
      url: card.url,
      due: card.due,
      lastActivity: card.dateLastActivity,
      labels: (card.labels || []).map((label) => ({
        id: label.id,
        name: label.name || label.color,
        color: label.color
      })),
      attachments: (card.attachments || []).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url
      })),
      members: (card.members || []).map((member) => ({
        id: member.id,
        fullName: member.fullName,
        username: member.username,
        avatarUrl: member.avatarUrl
      }))
    }));
}

export async function attachUrlToCard(cardId, { name, url }) {
  const params = await trelloParams();
  const { data } = await trello.post(`/cards/${cardId}/attachments`, null, {
    params: {
      ...params,
      name,
      url
    }
  });

  return {
    id: data.id,
    name: data.name,
    url: data.url
  };
}

export async function fetchActions(boardId) {
  const params = await trelloParams();
  const { data } = await trello.get(`/boards/${boardId}/actions`, {
    params: {
      ...params,
      filter: 'commentCard,updateCard:idList,createCard',
      limit: 50,
      member: true,
      member_fields: 'fullName,username,avatarUrl',
      fields: 'id,type,date,data,memberCreator'
    }
  });

  return data;
}

export async function uploadFileToCard(cardId, { filename, buffer }) {
  const params = await trelloParams();
  const form = new FormData();
  form.append('key', params.key);
  form.append('token', params.token);
  form.append('file', buffer, filename);

  const { data } = await trello.post(`/cards/${cardId}/attachments`, form, {
    headers: {
      ...form.getHeaders()
    }
  });

  return data;
}

export async function addComment(cardId, text) {
  const params = await trelloParams();
  const { data } = await trello.post(`/cards/${cardId}/actions/comments`, null, {
    params: {
      ...params,
      text
    }
  });

  return data;
}

export async function downloadAttachment(url) {
  const params = await trelloParams();
  
  let downloadUrl;
  try {
    // Normalize trello.com to api.trello.com for API-based downloads
    const normalizedUrl = url.replace('https://trello.com/1/', 'https://api.trello.com/1/');
    downloadUrl = new URL(normalizedUrl);
    
    if (downloadUrl.hostname.includes('trello.com')) {
      if (!downloadUrl.searchParams.has('key')) {
        downloadUrl.searchParams.append('key', params.key);
      }
      if (!downloadUrl.searchParams.has('token')) {
        downloadUrl.searchParams.append('token', params.token);
      }
    }
  } catch (e) {
    throw new Error(`Invalid attachment URL: ${url}`);
  }

  const { data } = await axios.get(downloadUrl.toString(), {
    responseType: 'arraybuffer',
    timeout: 30000
  });

  return Buffer.from(data);
}
