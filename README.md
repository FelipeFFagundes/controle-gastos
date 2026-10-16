# 💰 Aplicativo de Controle de Gastos Mensais

Aplicação web moderna, leve e responsiva criada para gerenciar receitas, despesas, faturas de cartão de crédito e controle de parcelamentos, pré-configurada com os dados de **Outubro de 2026** da sua planilha.

---

## 🚀 Como Iniciar a Aplicação

### Opção 1: Atalho Rápido (1 Clique no Windows)
Basta dar dois cliques no arquivo:
```
iniciar.bat
```
Ele iniciará o servidor e abrirá automaticamente o aplicativo no seu navegador em `http://localhost:5000`.

### Opção 2: Pelo Terminal / Linha de Comando
No diretório do projeto:
```bash
npm start
```
Depois acesse `http://localhost:5000` no seu navegador.

---

## ✨ Principais Funcionalidades

1. **Lançamento Rápido de Compras**:
   * Clique em **"+ Nova Compra"** no topo.
   * Preencha Descrição, Valor, Categoria, Conta/Cartão e Data.
   * **Compras Parceladas**: Ative o campo de parcelas (ex: 1/6) e o sistema automaticamente pode gerar as parcelas para os próximos meses subsequentes!

2. **Dashboard Financeiro do Mês**:
   * **Receitas do Mês**: Entradas, salário e rendimentos.
   * **Total de Despesas**: Soma de todas as compras e faturas.
   * **Saldo Líquido**: Diferença entre o que entrou e o que saiu.
   * **Status dos Pagamentos**: Total já pago vs pendente com barra de progresso.

3. **Filtro por Cartão / Conta**:
   * Clique em qualquer card de conta no topo (*Fatura XP*, *Cartão Natalina*, *Despesas Fixas*, etc.) para filtrar instantaneamente a listagem apenas por aquela fatura.

4. **Alternância Rápida de Status (Pago / Pendente)**:
   * Na coluna de **Status**, basta um clique no ícone para alternar entre pago (ícone verde de check) e pendente (ícone de relógio).

5. **Aba "Parcelamentos Ativos"**:
   * Visualização dedicada para acompanhar compras parceladas ativas (como *Discos 5/12*, *Farol 4/10*, *Farm 3/4*, *North Face 1/4*, *Protetor de quadro 3/10*).
   * Mostra barra de porcentagem concluída, valor total, quanto já pagou e quanto ainda falta para quitar.

6. **Navegação entre Meses**:
   * Use os botões `<` e `>` ou o seletor no topo para navegar entre meses passados e futuros.

7. **Restaurar Dados**:
   * Caso queira voltar ao estado inicial da sua planilha de Outubro 2026, basta clicar no botão **"Restaurar Planilha"** no cabeçalho.

---

## 📁 Estrutura de Arquivos

* `server/data/database.json`: Banco de dados local onde todos os seus lançamentos ficam salvos de forma segura.
* `server/index.js`: Backend Express com API REST.
* `server/seed.js`: Carga inicial dos dados de Outubro 2026 da planilha.
* `client/`: Código fonte da interface React com Tailwind CSS e Lucide Icons.
* `iniciar.bat`: Script de inicialização automática no Windows.
