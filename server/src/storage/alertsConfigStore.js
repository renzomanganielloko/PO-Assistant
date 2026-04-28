import { readJson, writeJson } from './fileStore.js';

const FILE_NAME = 'alertsConfig.json';

export async function getAlertsConfig() {
  return readJson(FILE_NAME, { monitoredBoardIds: [] });
}

export async function saveAlertsConfig(config) {
  await writeJson(FILE_NAME, config);
  return config;
}
