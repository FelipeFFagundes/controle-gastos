import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes.js';
import { errorHandler } from './middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

export function createApp({ serveClient = true } = {}) {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());

  app.use('/api', apiRouter());

  // Em produção local, o próprio Express serve o frontend compilado.
  if (serveClient && fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.use((req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
