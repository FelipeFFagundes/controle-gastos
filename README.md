# 💰 Controle de Gastos

App web (PWA) para controlar receitas, despesas, faturas de cartão e parcelamentos, com importação automática dos bancos via [Pluggy](https://pluggy.ai) (Open Finance).

## Como rodar

### Local (Windows, 1 clique)
Dê dois cliques em `iniciar.bat`. Na primeira vez ele instala as dependências e compila a interface. Depois abre `http://localhost:5000`.

### Local (terminal)
```bash
npm install
npm run build      # compila a interface (client/dist)
npm start          # http://localhost:5000
```

Para desenvolver com recarga automática, use dois terminais: `npm run dev` (API na porta 5000) e `npm run dev:client` (Vite em `http://localhost:5173`, com proxy para a API).

### Vercel
1. No [Supabase](https://supabase.com), crie um projeto e copie a connection string do **Transaction pooler** (botão **Connect**, porta 6543), trocando `[YOUR-PASSWORD]` pela senha do banco.
2. No projeto da Vercel, mantenha **Root Directory = raiz do repositório** e cadastre as variáveis do `.env.example` (`DATABASE_URL`, `APP_PIN`, `AUTH_SECRET`, `CRON_SECRET`, `PLUGGY_*`). As tabelas são criadas sozinhas no primeiro acesso.
3. O `vercel.json` já define o build (`npm run build`), a saída (`client/dist`), a função `/api` e a região `pdx1` (Oregon). A função precisa ficar na mesma região do banco: se o Supabase estiver em outra, ajuste `regions`.

## Configuração
Copie `.env.example` para `.env`. Todas as variáveis são opcionais localmente; na Vercel o `DATABASE_URL` é obrigatório.

## Sincronização automática
Busca os lançamentos dos últimos 7 dias na Pluggy sem precisar abrir o app. Atualiza o que já existe e não duplica.
- **Local:** defina `SYNC_INTERVAL_HOURS` no `.env` (ex.: `6`). Roda 1 minuto depois de o servidor subir e depois de X em X horas, enquanto ele estiver ligado.
- **Vercel:** o `vercel.json` agenda `/api/cron/sync` todo dia às 07:00 (horário de Brasília). Cadastre `CRON_SECRET` nas variáveis do projeto. No plano Hobby a Vercel só permite 1 execução por dia; no Pro dá para usar, por exemplo, `0 */6 * * *` (a cada 6 horas).

## Migrando dados da versão antiga
A versão anterior guardava tudo num JSON (`server/data/database.json` ou Upstash). Para trazer esses dados para o banco novo:
```bash
npm run import:legacy -- server/data/database.legacy.json
npm run import:legacy -- --upstash   # lê do Upstash (UPSTASH_REDIS_REST_URL/TOKEN)
```
O destino é o banco do `DATABASE_URL` (ou o arquivo local). **A importação substitui as contas e os lançamentos existentes.**

## Testes
```bash
npm test           # banco SQLite em memória
npm run test:pg    # mesma suíte num Postgres em memória (PGlite), para garantir o SQL do Supabase
```

## Arquitetura
```
server/
  domain/        regras puras e testadas: mês da fatura, parcelas, totais, mapeamento Pluggy
  services/      casos de uso (lançamentos, contas, sincronização, autenticação)
  repositories/  acesso ao banco (SQL)
  db/            conexão (SQLite local, Postgres/Supabase ou Turso, conforme DATABASE_URL) e migrações
  integrations/  cliente HTTP da Pluggy
  routes.js      rotas HTTP (/api/*)
  app.js         monta o Express (usado local e pela Vercel em api/index.js)
client/src/
  api.js         única porta de acesso ao servidor
  queries.js     leituras/escritas com React Query (cache e atualização automática)
  components/    telas
```

Principais regras:
- **O servidor é a única fonte de verdade.** A interface não guarda cópia dos dados.
- **Contas são referenciadas por id.** Renomear uma conta não mexe nos lançamentos. Excluir uma conta com lançamentos pede confirmação.
- **Mês da fatura** = mês da data, +1 se a compra foi a partir do dia de fechamento do cartão, mais o deslocamento manual da conta. Se o fechamento mudar, os lançamentos são recalculados (exceto os que tiveram o mês fixado manualmente).
- **Transferências** (pagamento de fatura, aplicação/resgate automático, Pix entre contas próprias) aparecem na lista, mas não contam como gasto nem como receita, para que a fatura não seja contada duas vezes.
- **Sincronização Pluggy** é idempotente: atualiza o que já existe, preserva as edições do usuário (descrição, categoria, tipo, pago, nome da conta) e não traz de volta o que foi excluído.
