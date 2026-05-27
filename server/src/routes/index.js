import { Router } from 'express';
import { z } from 'zod';
import { getCredentialStatus, saveCredentials, loadCredentials } from '../storage/credentialsStore.js';
import { fetchBoards, fetchCards, fetchLists, validateTrelloCredentials, fetchBoardMembers, uploadFileToCard } from '../services/trelloService.js';
import { fetchJiraProjects, getJiraAlerts, getAssignedIssuesCount } from '../services/jiraService.js';
import { normalizeTrelloCard } from '../services/mappingService.js';
import { selectSyncCandidates } from '../services/syncRules.js';
import { findAutomationByBoardId, getAutomation, listAutomations, upsertAutomation } from '../storage/automationStore.js';
import { runBoardAutomation, syncSingleCard } from '../services/syncService.js';
import { getLiveAlerts, addComment } from '../services/alertService.js';
import { markAsRead } from '../storage/readAlertsStore.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authRouter } from './auth.js';
import { auth } from '../middleware/auth.js';

import { getAuthUrl, setTokens, fetchEmails, summarizeEmail, fetchLabels } from '../services/gmailService.js';
import { summarizeText } from '../services/geminiService.js';
import { answerAssistantQuestion, assistantQuestions, assistantCategories } from '../services/assistantService.js';

export const apiRouter = Router();

// Routes that do NOT require authentication
apiRouter.use('/auth', authRouter);
apiRouter.get(
  '/gmail/auth',
  asyncHandler(async (_req, res) => {
    res.json({ url: getAuthUrl() });
  })
);

apiRouter.get(
  '/gmail/callback',
  asyncHandler(async (req, res) => {
    try {
      const { code } = req.query;
      if (typeof code !== 'string') throw new Error('Missing code');
      await setTokens(code);
      res.redirect(process.env.CLIENT_ORIGIN || 'http://localhost:5173');
    } catch (e) {
      console.error('Callback error:', e);
      res.status(500).send('Authentication failed');
    }
  })
);

// Apply authentication middleware to all subsequent routes
apiRouter.use(auth);

// ... protected routes ...

apiRouter.post(
  '/gemini/summarize',
  asyncHandler(async (req, res) => {
    try {
      const { text, type } = z.object({ 
        text: z.string().min(1),
        type: z.enum(['corto', 'detallado']).optional().default('corto')
      }).parse(req.body);
      
      const result = await summarizeText(text, type);
      res.json({ result });
    } catch (error) {
      if (error.message.includes('límite gratuito')) {
        return res.status(429).json({ message: error.message });
      }
      throw new AppError(error.message, 502);
    }
  })
);

apiRouter.get(
  '/gmail/status',
  asyncHandler(async (_req, res) => {
    const credentials = await loadCredentials();
    res.json({ connected: Boolean(credentials.googleTokens) });
  })
);

apiRouter.get(
  '/gmail/labels',
  asyncHandler(async (_req, res) => {
    res.json({ labels: await fetchLabels() });
  })
);

apiRouter.post(
  '/gmail/disconnect',
  asyncHandler(async (_req, res) => {
    await saveCredentials({ googleTokens: null });
    res.status(204).send();
  })
);

apiRouter.get(
  '/gmail/emails',
  asyncHandler(async (req, res) => {
    const labelId = req.query.labelId || 'INBOX';
    const emails = await fetchEmails(15, labelId);
    res.json({ emails });
  })
);


const credentialsSchema = z.object({
  trelloApiKey: z.string().min(1).optional().or(z.literal('')),
  trelloToken: z.string().min(1).optional().or(z.literal('')),
  jiraBaseUrl: z.string().url().optional().or(z.literal('')),
  jiraEmail: z.string().email().optional().or(z.literal('')),
  jiraApiToken: z.string().min(1).optional().or(z.literal('')),
  geminiApiKey: z.string().min(1).optional().or(z.literal(''))
});

const automationSchema = z.object({
  trelloBoardId: z.string().min(1),
  trelloBoardName: z.string().min(1),
  trelloListId: z.string().optional().or(z.literal('')),
  trelloListName: z.string().optional().or(z.literal('')),
  jiraProjectKey: z.string().min(1).optional().or(z.literal('')),
  jiraIssueType: z.string().min(1).default('Story'),
  refineAI: z.boolean().default(false),
  enabled: z.boolean().default(true),
  favorite: z.boolean().default(false)
});

apiRouter.get('/', (_req, res) => {
  res.json({ message: 'PO Assistant API is running' });
});

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});

apiRouter.get(
  '/assistant/questions',
  asyncHandler(async (_req, res) => {
    res.json({ 
      questions: assistantQuestions,
      categories: assistantCategories 
    });
  })
);

apiRouter.post(
  '/assistant/query',
  asyncHandler(async (req, res) => {
    const query = z.object({
      questionId: z.string().optional(),
      text: z.string().optional().default('')
    }).parse(req.body);

    res.json(await answerAssistantQuestion(query));
  })
);

apiRouter.get(
  '/settings/status',
  asyncHandler(async (req, res) => {
    res.json(await getCredentialStatus(req.user._id));
  })
);

apiRouter.post(
  '/settings',
  asyncHandler(async (req, res) => {
    const credentials = credentialsSchema.parse(req.body);
    await saveCredentials(req.user._id, credentials);
    res.status(204).send();
  })
);

apiRouter.get(
  '/trello/validate',
  asyncHandler(async (_req, res) => {
    res.json({ member: await validateTrelloCredentials() });
  })
);

apiRouter.get(
  '/trello/boards',
  asyncHandler(async (_req, res) => {
    const boards = await fetchBoards();
    const automations = await listAutomations();
    const automationsByBoard = new Map(
      automations.map((automation) => [automation.trelloBoardId, automation])
    );

    res.json({
      boards: boards.map((board) => ({
        ...board,
        automation: automationsByBoard.get(board.id) || null
      }))
    });
  })
);

apiRouter.get(
  '/trello/lists',
  asyncHandler(async (req, res) => {
    const boardId = z.string().min(1).parse(req.query.boardId);
    res.json({ lists: await fetchLists(boardId) });
  })
);

apiRouter.get(
  '/trello/boards/:boardId/members',
  asyncHandler(async (req, res) => {
    const boardId = z.string().min(1).parse(req.params.boardId);
    res.json({ members: await fetchBoardMembers(boardId) });
  })
);

apiRouter.post(
  '/trello/cards/:cardId/upload',
  asyncHandler(async (req, res) => {
    const cardId = z.string().min(1).parse(req.params.cardId);
    const { attachment } = z.object({ attachment: z.string().min(1) }).parse(req.body);
    const buffer = Buffer.from(attachment.split(',')[1], 'base64');
    const result = await uploadFileToCard(cardId, { filename: `img_${Date.now()}.png`, buffer });
    res.json({ url: result.url, name: result.name });
  })
);

apiRouter.get(
  '/trello/cards',
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        boardId: z.string().min(1),
        listId: z.string().min(1).optional()
      })
      .parse(req.query);

    res.json({ cards: await fetchCards(query.boardId, query.listId) });
  })
);

apiRouter.post(
  '/sync/preview',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        boardId: z.string().min(1),
        listId: z.string().min(1).optional()
      })
      .parse(req.body);

    const lists = await fetchLists(body.boardId);
    const cards = await fetchCards(body.boardId, body.listId);
    const { sprintCards, cardsWithoutJiraLink, eligibleCards } = selectSyncCandidates({
      cards,
      lists
    });

    res.json({
      cards: eligibleCards.map(normalizeTrelloCard),
      count: eligibleCards.length,
      totalCards: cards.length,
      sprintCards: sprintCards.length,
      cardsWithoutJiraLink: cardsWithoutJiraLink.length
    });
  })
);

apiRouter.get(
  '/sync/pending',
  asyncHandler(async (_req, res) => {
    const automations = await listAutomations();
    const favoriteBoardIds = automations
      .filter((a) => a.favorite)
      .map((a) => a.trelloBoardId);

    const allPendingCards = [];

    for (const boardId of favoriteBoardIds) {
      try {
        const lists = await fetchLists(boardId);
        const cards = await fetchCards(boardId);
        const { cardsWithoutJiraLink } = selectSyncCandidates({ cards, lists });
        
        const boardName = automations.find(a => a.trelloBoardId === boardId)?.trelloBoardName || boardId;

        allPendingCards.push(...cardsWithoutJiraLink.map(card => ({
          ...normalizeTrelloCard(card),
          boardName,
          boardId
        })));
      } catch (err) {
        console.error(`Error fetching pending cards for board ${boardId}:`, err.message);
      }
    }

    res.json({ cards: allPendingCards });
  })
);

apiRouter.get(
  '/jira/projects',
  asyncHandler(async (_req, res) => {
    res.json({ projects: await fetchJiraProjects() });
  })
);

apiRouter.get(
  '/automations',
  asyncHandler(async (req, res) => {
    res.json({ automations: await listAutomations(req.user._id) });
  })
);

apiRouter.post(
  '/automations',
  asyncHandler(async (req, res) => {
    const automation = automationSchema.parse(req.body);
    res.status(201).json({ automation: await upsertAutomation(req.user._id, automation) });
  })
);

apiRouter.post(
  '/sync/card',
  asyncHandler(async (req, res) => {
    const { cardId, boardId, refineAI } = z.object({
      cardId: z.string().min(1), 
      boardId: z.string().min(1),
      refineAI: z.boolean().optional()
    }).parse(req.body);
    
    const automation = await findAutomationByBoardId(req.user._id, boardId);
    if (!automation) throw new AppError('No automation configured for this board.', 400);
    
    res.json({ result: await syncSingleCard(cardId, { ...automation, refineAI: refineAI ?? automation.refineAI }) });
  })
);

apiRouter.post(
  '/automations/:id/run',
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const automation = await getAutomation(req.user._id, id);
    if (!automation) throw new AppError('Automation was not found.', 404);
    res.json({ result: await runBoardAutomation(automation) });
  })
);

apiRouter.post(
  '/boards/:boardId/run-automation',
  asyncHandler(async (req, res) => {
    const boardId = z.string().min(1).parse(req.params.boardId);
    const automation = await findAutomationByBoardId(req.user._id, boardId);
    if (!automation) throw new AppError('No automation is configured for this Trello board.', 404);
    const result = await runBoardAutomation(automation);
    await updateAutomationRun(req.user._id, automation.id, result);
    res.json({ result });
  })
);

apiRouter.get(
  '/jira/alerts',
  asyncHandler(async (_req, res) => {
    res.json({ alerts: await getJiraAlerts() });
  })
);

apiRouter.post(
  '/jira/alerts/read',
  asyncHandler(async (req, res) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.body);
    await markAsRead(id);
    res.status(204).send();
  })
);

apiRouter.get(
  '/dashboard/stats',
  asyncHandler(async (_req, res) => {
    res.json({
      jiraAssigned: 0,
      jiraAlertsCount: 0,
      trelloAlertsCount: 0,
      unsyncedCount: 0,
      jiraSearchUrl: ''
    });
  })
);

apiRouter.get(
  '/alerts',
  asyncHandler(async (_req, res) => {
    res.json({ alerts: await getLiveAlerts() });
  })
);

apiRouter.post(
  '/alerts/reply',
  asyncHandler(async (req, res) => {
    const { cardId, text, attachment } = z.object({
      cardId: z.string().min(1),
      text: z.string().min(1),
      attachment: z.string().optional()
    }).parse(req.body);
    
    res.json({ result: await addComment(cardId, text, attachment) });
  })
);
