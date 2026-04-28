import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.resolve(__dirname, '../../data');

export async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readJson(fileName, fallback) {
  try {
    const raw = await readFile(path.join(dataDir, fileName), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(fileName, value) {
  await ensureDataDir();
  await writeFile(path.join(dataDir, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
