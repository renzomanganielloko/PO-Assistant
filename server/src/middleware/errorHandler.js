import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Invalid request.',
      details: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error.response) {
    const upstreamMessage = formatUpstreamMessage(error.response.data);
    const source = integrationSource(error.response.config?.baseURL);
    return res.status(error.response.status || 502).json({
      message: `${source} rejected the request: ${upstreamMessage}`,
      details: upstreamMessage
    });
  }

  console.error(error);
  return res.status(500).json({ message: 'Unexpected server error.' });
}

function integrationSource(baseUrl = '') {
  if (baseUrl.includes('trello.com')) return 'Trello';
  if (baseUrl.includes('atlassian.net')) return 'Jira';
  return 'The integration';
}

function formatUpstreamMessage(data) {
  if (!data) return 'No details returned.';
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (Array.isArray(data.errorMessages) && data.errorMessages.length) return data.errorMessages.join(', ');
  if (data.errors && typeof data.errors === 'object') return Object.values(data.errors).join(', ');
  return JSON.stringify(data);
}
