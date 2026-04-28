import { readJson, writeJson } from './fileStore.js';

const FILE_NAME = 'mappings.json';

export async function listMappings() {
  return readJson(FILE_NAME, []);
}

export async function findMappingByTrelloCardId(trelloCardId) {
  const mappings = await listMappings();
  return mappings.find((mapping) => mapping.trelloCardId === trelloCardId) || null;
}

export async function saveMapping(mapping) {
  const mappings = await listMappings();
  const existingIndex = mappings.findIndex((item) => item.trelloCardId === mapping.trelloCardId);
  const nextMapping = {
    ...mapping,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    mappings[existingIndex] = { ...mappings[existingIndex], ...nextMapping };
  } else {
    mappings.push({ ...nextMapping, createdAt: new Date().toISOString() });
  }

  await writeJson(FILE_NAME, mappings);
  return nextMapping;
}
