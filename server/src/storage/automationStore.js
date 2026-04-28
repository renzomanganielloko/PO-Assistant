import crypto from 'node:crypto';
import { readJson, writeJson } from './fileStore.js';

const FILE_NAME = 'automations.json';

export async function listAutomations() {
  return readJson(FILE_NAME, []);
}

export async function getAutomation(id) {
  const automations = await listAutomations();
  return automations.find((automation) => automation.id === id) || null;
}

export async function findAutomationByBoardId(trelloBoardId) {
  const automations = await listAutomations();
  return automations.find((automation) => automation.trelloBoardId === trelloBoardId) || null;
}

export async function upsertAutomation(input) {
  const automations = await listAutomations();
  const existingIndex = automations.findIndex((automation) => automation.trelloBoardId === input.trelloBoardId);
  const current = existingIndex >= 0 ? automations[existingIndex] : {};
  const automation = {
    id: current.id || crypto.randomUUID(),
    enabled: input.enabled ?? current.enabled ?? true,
    trelloBoardId: input.trelloBoardId,
    trelloBoardName: input.trelloBoardName,
    trelloListId: input.trelloListId ?? current.trelloListId ?? '',
    trelloListName: input.trelloListName ?? current.trelloListName ?? '',
    jiraProjectKey: (input.jiraProjectKey ?? current.jiraProjectKey ?? '').trim().toUpperCase(),
    jiraIssueType: input.jiraIssueType ?? current.jiraIssueType ?? 'Story',
    refineAI: input.refineAI ?? current.refineAI ?? false,
    favorite: input.favorite ?? current.favorite ?? false,
    lastRunAt: current.lastRunAt || null,
    lastResult: current.lastResult || null,
    updatedAt: new Date().toISOString(),
    createdAt: current.createdAt || new Date().toISOString()
  };

  if (existingIndex >= 0) {
    automations[existingIndex] = automation;
  } else {
    automations.push(automation);
  }

  await writeJson(FILE_NAME, automations);
  return automation;
}

export async function updateAutomationRun(id, result) {
  const automations = await listAutomations();
  const index = automations.findIndex((automation) => automation.id === id);
  if (index < 0) return null;

  automations[index] = {
    ...automations[index],
    lastRunAt: new Date().toISOString(),
    lastResult: result,
    updatedAt: new Date().toISOString()
  };

  await writeJson(FILE_NAME, automations);
  return automations[index];
}
