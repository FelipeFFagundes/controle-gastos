import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSyncNotification, monthName } from './notification.js';

const clean = (text) => text.replace(/\s/g, ' ');

test('notificação mostra quanto ainda dá para gastar e o que mudou', () => {
  const n = buildSyncNotification({ importedCount: 3, updatedCount: 1 }, 1234.56, '2026-11');
  assert.equal(n.title, 'Transações atualizadas');
  assert.equal(clean(n.body), 'Você ainda tem R$ 1.234,56 para gastar em novembro. 3 lançamentos novos, 1 atualizado.');
  assert.equal(n.tag, 'sync-diario');
});

test('notificação com saldo estourado e sem novidades', () => {
  const n = buildSyncNotification({ importedCount: 0, updatedCount: 0 }, -50, '2026-03');
  assert.equal(clean(n.body), 'Você passou R$ 50,00 do limite de março. Nenhum lançamento novo.');
});

test('singular e plural', () => {
  const n = buildSyncNotification({ importedCount: 1, updatedCount: 2 }, 0, '2026-01');
  assert.match(clean(n.body), /1 lançamento novo, 2 atualizados\.$/);
  assert.equal(monthName('2026-12'), 'dezembro');
});
