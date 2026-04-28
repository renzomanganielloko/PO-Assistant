import { saveCredentials } from './src/storage/credentialsStore.js';
import dotenv from 'dotenv';
dotenv.config(); // This loads the SECRET from .env

async function update() {
  try {
    // The key provided by the user was AIzaSyD7X3fjrMsEPssN56T1QSf-0IpSuoChYOw
    await saveCredentials({ geminiApiKey: 'AIzaSyD7X3fjrMsEPssN56T1QSf-0IpSuoChYOw' });
    console.log('Gemini API Key updated successfully with correct secret');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
