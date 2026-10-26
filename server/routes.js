// Camada HTTP: só traduz requisição -> serviço -> resposta. Regras ficam em services/ e domain/.
import { Router } from 'express';
import { requireAuth, bearerToken } from './middleware.js';
import * as auth from './services/auth.js';
import * as transactions from './services/transactions.js';
import * as accounts from './services/accounts.js';
import * as pluggySync from './services/pluggySync.js';
import * as settingsRepo from './repositories/settings.js';
import { importLegacyData } from './services/legacyImport.js';
import { initialData } from './seed.js';
import { config } from './config.js';
import { runAutoSync } from './jobs/autoSync.js';

export function apiRouter() {
  const router = Router();

  // --- Autenticação (pública) ---
  router.get('/auth/status', (req, res) => {
    const pinRequired = auth.isPinRequired();
    res.json({ pinRequired, authenticated: !pinRequired || auth.verifyToken(bearerToken(req)) });
  });

  router.post('/auth/login', (req, res) => {
    if (!auth.isPinRequired()) return res.json({ success: true, ...auth.issueToken() });
    const result = auth.checkPin(req.body?.pin, req.ip);
    if (!result.ok) return res.status(result.locked ? 429 : 401).json({ success: false, error: result.error });
    res.json({ success: true, ...auth.issueToken() });
  });

  // --- Cron da Vercel (autenticado pelo CRON_SECRET, não pelo PIN) ---
  router.get('/cron/sync', async (req, res) => {
    if (!config.cronSecret || !auth.safeEqual(bearerToken(req) || '', config.cronSecret)) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
    res.json(await runAutoSync('cron'));
  });

  router.use(requireAuth);

  // --- Dados de referência ---
  router.get('/categories', async (req, res) => {
    res.json({ categories: await settingsRepo.listCategories() });
  });

  // --- Meses ---
  router.get('/months', async (req, res) => {
    res.json({ months: await transactions.listMonths() });
  });

  router.get('/months/:month', async (req, res) => {
    res.json(await transactions.getMonth(req.params.month));
  });

  router.put('/months/:month/surplus', async (req, res) => {
    const target = await transactions.setSurplusTarget(req.params.month, req.body?.target);
    res.json({ month: req.params.month, customSurplusTarget: target });
  });

  router.get('/installments', async (req, res) => {
    res.json({ installments: await transactions.getInstallments(req.query.month) });
  });

  // --- Lançamentos ---
  router.post('/transactions', async (req, res) => {
    res.status(201).json({ created: await transactions.create(req.body || {}) });
  });

  router.put('/transactions/:id', async (req, res) => {
    res.json({ transaction: await transactions.update(req.params.id, req.body || {}) });
  });

  router.patch('/transactions/:id/toggle-paid', async (req, res) => {
    res.json({ transaction: await transactions.togglePaid(req.params.id) });
  });

  router.delete('/transactions/:id', async (req, res) => {
    await transactions.remove(req.params.id);
    res.status(204).end();
  });

  // --- Contas e cartões ---
  router.get('/accounts', async (req, res) => {
    res.json({ accounts: await accounts.list() });
  });

  router.post('/accounts', async (req, res) => {
    res.status(201).json({ account: await accounts.create(req.body || {}) });
  });

  router.put('/accounts/:id', async (req, res) => {
    res.json({ account: await accounts.update(req.params.id, req.body || {}) });
  });

  router.delete('/accounts/:id', async (req, res) => {
    await accounts.remove(req.params.id, { withTransactions: req.query.withTransactions === 'true' });
    res.status(204).end();
  });

  // --- Manutenção ---
  router.post('/admin/clear', async (req, res) => {
    await settingsRepo.clearFinancialData();
    res.json({ message: 'Lançamentos e cartões/contas removidos. Categorias preservadas.' });
  });

  router.post('/admin/reset-seed', async (req, res) => {
    await importLegacyData(initialData);
    res.json({ message: 'Dados de exemplo (planilha de Outubro/2026) restaurados.' });
  });

  // --- Pluggy (Open Finance) ---
  router.get('/pluggy/status', async (req, res) => {
    res.json({ configured: pluggySync.isConfigured(), items: await pluggySync.listItems() });
  });

  router.post('/pluggy/connect-token', async (req, res) => {
    res.json({ connectToken: await pluggySync.createConnectToken(req.body?.itemId) });
  });

  router.post('/pluggy/items', async (req, res) => {
    await pluggySync.registerItem(req.body?.itemId);
    res.status(201).json({ items: await pluggySync.listItems() });
  });

  router.post('/pluggy/sync', async (req, res) => {
    res.json(await pluggySync.sync({
      period: req.body?.period,
      clearExisting: Boolean(req.body?.clearExisting),
      itemIds: req.body?.itemIds
    }));
  });

  router.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  return router;
}
