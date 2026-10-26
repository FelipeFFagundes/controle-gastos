// Ponto de entrada local: `npm start` ou iniciar.bat.
import { config } from './config.js';
import { createApp } from './app.js';
import { getDb } from './db/client.js';
import { startAutoSync } from './jobs/autoSync.js';

await getDb();

createApp().listen(config.port, () => {
  console.log('===============================================');
  console.log(' Servidor de Controle de Gastos rodando!');
  console.log(` URL: http://localhost:${config.port}`);
  startAutoSync();
  console.log('===============================================');
});
