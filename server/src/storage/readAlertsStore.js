import { readJson, writeJson } from './fileStore.js';

const FILE_NAME = 'read-alerts.json';

export async function markAsRead(id) {
  const current = await getReadAlerts();
  if (!current.includes(id)) {
    await writeJson(FILE_NAME, [...current, id]);
  }
}

export async function getReadAlerts() {
  return await readJson(FILE_NAME, []);
}
