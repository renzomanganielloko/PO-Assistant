import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiRouter } from './routes/index.js';
import { connectDB } from './db.js';
import { ensureDataDir } from './storage/fileStore.js';
import { errorHandler } from './middleware/errorHandler.js';

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('CRITICAL ERROR (Uncaught Exception):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const allowedLocalOrigin = !origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      if (allowedLocalOrigin) {
        callback(null, true);
        return;
      }
      callback(null, true); // Fallback to true for development
    }
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev')); 

app.use('/api', apiRouter); 
app.use(errorHandler);

// Initialize and start listening
async function init() {
  try {
    await connectDB();
    await ensureDataDir();

    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use.`);
      } else {
        console.error('Server failed to start:', err);
      }
    });
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
}

init();
