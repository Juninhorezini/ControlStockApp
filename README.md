# 📦 Control Stock App - Sistema de Controle de Estoque

Sistema completo de gerenciamento de estoque de prateleira com sincronização em tempo real com Google Sheets.

## 🌐 Deploy

**Aplicação disponível em:** [https://juninhorezini.github.io/ControlStockApp](https://juninhorezini.github.io/ControlStockApp)

**Repositório GitHub:** [https://github.com/Juninhorezini/ControlStockApp](https://github.com/Juninhorezini/ControlStockApp)

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Configuração Completa](#configuração-completa)
4. [Funcionalidades](#funcionalidades)
5. [Desenvolvimento Local](#desenvolvimento-local)
6. [Sincronização Google Sheets](#sincronização-google-sheets)
7. [Próximos Passos](#próximos-passos)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 VISÃO GERAL

Sistema React standalone que permite:
- ✅ Gerenciar produtos em prateleiras físicas
- ✅ Sincronização bidirecional com Google Sheets
- ✅ Controle de SKU, Cor, Quantidade e Localização
- ✅ Interface mobile-friendly
- ✅ Logs de movimentação automáticos

---

## 🏗️ ARQUITETURA DO SISTEMA

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  React Web App  │ ◄────► │ Google Apps      │ ◄────► │ Google Sheets   │
│  (GitHub Pages) │  HTTPS  │ Script Web App   │   API   │ (Planilha)      │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

### Componentes:

1. **Frontend (React):**
   - Armazenamento local: LocalStorage
   - Framework: React 18 + Tailwind CSS
   - Ícones: Lucide React

2. **Backend (Google Apps Script):**
   - Webhook: `doPost(e)` recebe POST requests
   - Aba alvo: `Prateleira`
   - Aba de logs: `Logs_Prateleira`

3. **Base de Dados (Google Sheets):**
   - Planilha ID: `1CWw8zKMf1ww08gynis7qIAYFjaYJo3PYb8bghp35zYE`
   - Aba: `Prateleira` (Colunas: SKU | COR | QUANTIDADE | DATA MOVIMENTAÇÃO)

---

## ⚙️ CONFIGURAÇÃO COMPLETA

### **PASSO 1: Configurar Google Apps Script**

1. Abra a planilha: [teste expedição x produção](https://docs.google.com/spreadsheets/d/1CWw8zKMf1ww08gynis7qIAYFjaYJo3PYb8bghp35zYE/edit)

2. Vá em **Extensões → Apps Script**

3. Crie um novo arquivo: `SyncPrateleira.gs`

4. Cole o código do Apps Script (fornecido anteriormente)

5. **Publique como Web App:**
   - Clique em **Implantar → Nova implantação**
   - Tipo: **Aplicativo da Web**
   - Descrição: `Sincronização Prateleira v2`
   - Executar como: **Eu** (seu email)
   - Quem tem acesso: **Qualquer pessoa**
   - Clique em **Implantar**
   - **COPIE A URL** (ex: `https://script.google.com/macros/s/XXXXXX/exec`)

6. Autorize o acesso quando solicitado

### **PASSO 2: Configurar no Aplicativo Web**

1. Acesse: [https://juninhorezini.github.io/ControlStockApp](https://juninhorezini.github.io/ControlStockApp)

2. Clique no ícone de **Configurações** (⚙️) no canto superior direito

3. Cole a **URL do Web App** no campo apropriado

4. Clique em **Salvar**

5. Teste com **"Inspecionar Planilha"** - deve aparecer sucesso

### **PASSO 3: Testar Sincronização**

1. Adicione um produto de teste:
   - SKU: `TEST-001`
   - Cor: `AZUL`
   - Quantidade: `10`
   - Prateleira: `A-01`

2. Aguarde 2-3 segundos

3. Abra a aba **Prateleira** na planilha

4. Verifique se o produto apareceu

5. Confira a aba **Logs_Prateleira** para ver registro da operação

---

## 🚀 FUNCIONALIDADES

### ✅ Gerenciamento de Produtos
- Adicionar produtos com SKU, Cor, Quantidade
- Organizar por prateleiras customizáveis
- Busca e filtros avançados
- Edição inline de quantidades
- Movimentação entre prateleiras (drag-and-drop)

### ✅ Sincronização Automática
- Sincronização individual ao adicionar/atualizar produto
- Sincronização em massa (Sincronizar Tudo)
- Feedback visual de status (✓ sucesso, ✗ erro)
- Tratamento robusto de erros com mensagens claras

### ✅ Interface
- Design responsivo (mobile-first)
- Modo claro/escuro
- Ícones intuitivos (Lucide React)
- Confirmações de ações críticas
- Feedback visual em todas as operações

### ✅ Logs e Histórico
- Registro automático de movimentações
- Timestamp de todas as operações
- Aba dedicada de logs na planilha
- Rastreabilidade completa

---

## 💻 DESENVOLVIMENTO LOCAL

### Pré-requisitos:
- Node.js 18+ instalado
- Git instalado
- Editor de código (VS Code recomendado)

### Instalação:

```bash
# Clonar repositório
git clone https://github.com/Juninhorezini/ControlStockApp.git
cd ControlStockApp

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start
```

O app abrirá em `http://localhost:3000`

### Scripts Disponíveis:

```bash
# Desenvolvimento
npm start          # Inicia servidor de desenvolvimento

# Produção
npm run build      # Gera build otimizado em /build

# Deploy
npm run deploy     # Deploy para GitHub Pages

# Testes
npm test           # Executa testes (se configurados)
```

---

## 🔄 SINCRONIZAÇÃO GOOGLE SHEETS

### Como Funciona:

1. **Adicionar/Atualizar Produto:**
   - App → POST `{action: 'updateSingleProduct', sku, color, data}`
   - Apps Script verifica se SKU+COR já existe
   - Se existe: atualiza linha
   - Se não existe: insere nova linha
   - Retorna JSON com resultado

2. **Remover Produto (quantidade = 0):**
   - App → POST `{action: 'updateSingleProduct', sku, color, data: null}`
   - Apps Script deleta linha correspondente

3. **Sincronizar Tudo:**
   - App → POST `{action: 'updateAllProducts', data: [...]}`
   - Apps Script limpa aba e reinsere todos os dados

### Formato de Dados:

```javascript
// Request
{
  action: 'updateSingleProduct',
  sku: 'PROD-001',
  color: 'AZUL',
  data: {
    sku: 'PROD-001',
    cor: 'AZUL',
    quantidade: 15,
    dataMovimentacao: '07/10/2025 12:30:45'
  }
}

// Response (sucesso)
{
  success: true,
  operation: 'UPDATED' | 'INSERTED' | 'DELETED',
  sku: 'PROD-001',
  cor: 'AZUL',
  row: 5,
  timestamp: '07/10/2025 12:30:45',
  executionTime: '234ms'
}

// Response (erro)
{
  success: false,
  error: 'Descrição do erro'
}
```

---

## 🎯 PRÓXIMOS PASSOS

### **TAREFA PENDENTE: Adicionar Critério no Script onEditInstalledResumo.gs**

**Objetivo:** Quando digitar "N" na coluna L da aba "Resumo FF e CC", verificar se o produto está na Prateleira e exibir essa informação no modal.

**Onde modificar:**
- Arquivo: `onEditInstalledResumo.gs` na planilha
- Função: `processarEdicao()`
- Local: Após buscar produto pai e antes de exibir modal

**O que adicionar:**

1. **Buscar produto na aba Prateleira:**
```javascript
// Após linha com: const itemConcatenado = produtoPaiLimpo + " - " + corLimpa;

// Verificar se está na prateleira
let estaNaPrateleira = false;
let quantidadePrateleira = 0;
let prateleira = "";

try {
  const prateleiraSheet = SHEET_CACHE.derivadosSheet.getParent().getSheetByName("Prateleira");
  if (prateleiraSheet) {
    const prateleiraData = prateleiraSheet.getDataRange().getValues();
    for (let i = 1; i < prateleiraData.length; i++) {
      const skuPrat = prateleiraData[i][0]?.toString().trim().toUpperCase();
      const corPrat = prateleiraData[i][1]?.toString().trim().toUpperCase();
      
      if (skuPrat === produtoPaiLimpo.toUpperCase() && 
          corPrat === corLimpa.toUpperCase()) {
        estaNaPrateleira = true;
        quantidadePrateleira = prateleiraData[i][2] || 0;
        // Assumindo que tem coluna de localização (ajustar conforme estrutura real)
        break;
      }
    }
  }
} catch (e) {
  Logger.log("Erro ao verificar prateleira: " + e.message);
}
```

2. **Adicionar informação ao modal:**

No template do modal, adicionar após informações do produto:

```javascript
${estaNaPrateleira ? `
  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0;">
    <strong>⚠️ ATENÇÃO:</strong> Este produto está na Prateleira<br>
    <strong>Quantidade disponível:</strong> ${quantidadePrateleira} unidades
  </div>
` : ''}
```

**Criar novo chat com o contexto:**
- Assunto: "Adicionar verificação de Prateleira no script onEditInstalledResumo.gs"
- Informar: Planilha ID, estrutura da aba Prateleira, e objetivo

---

## 🐛 TROUBLESHOOTING

### Problema: Sincronização não funciona

**Sintomas:** Modal fecha mas dados não aparecem na planilha

**Soluções:**
1. Verifique se URL do Web App está correta
2. Abra Console do navegador (F12) e veja erros
3. Verifique logs do Apps Script:
   - Apps Script → Execuções
   - Veja detalhes da última execução
4. Confirme que Web App está publicado com acesso "Qualquer pessoa"

### Problema: Erro de CORS

**Sintomas:** `Error: CORS policy blocked`

**Soluções:**
1. Certifique-se de que Apps Script está publicado corretamente
2. Verifique se não há `mode: 'no-cors'` no código
3. Reimplante o Web App (nova implantação)

### Problema: Produto não aparece na planilha

**Sintomas:** Sincronização bem-sucedida, mas linha não existe

**Soluções:**
1. Verifique normalização de texto (UPPERCASE)
2. Confira aba **Logs_Prateleira** para ver o que foi enviado
3. Veja se SKU/COR têm espaços extras

### Problema: GitHub Actions falhou

**Sintomas:** Deploy não funciona

**Soluções:**
1. Vá em **Actions** no GitHub
2. Clique na execução falhada
3. Veja logs detalhados
4. Problemas comuns:
   - `npm ci` falhou: delete `package-lock.json` e commit
   - Build error: verifique sintaxe do código React
   - Permission denied: configure GitHub Pages nas Settings

---

## 📚 RECURSOS ADICIONAIS

### Links Úteis:
- [Documentação React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Google Apps Script](https://developers.google.com/apps-script)
- [GitHub Pages](https://pages.github.com)

### Arquivos Importantes:
- `src/App.js` - Código principal do aplicativo (4049 linhas)
- `package.json` - Dependências e scripts
- `.github/workflows/deploy.yml` - Configuração do deploy automático
- `SyncPrateleira.gs` - Script de sincronização (na planilha)

---

## 👤 AUTOR

**Juninho Rezini**
- GitHub: [@Juninhorezini](https://github.com/Juninhorezini)
- Email: juninhorezini@gmail.com

---

## 📝 HISTÓRICO DE VERSÕES

### v2.0.0 (07/10/2025)
- ✅ Deploy independente no GitHub Pages
- ✅ Correção de sincronização (removido no-cors)
- ✅ Tratamento robusto de erros
- ✅ Feedback visual melhorado
- ✅ README completo e detalhado
- ✅ Apps Script otimizado com logs

### v1.0.0 (Original)
- App criado com Hatchcanvas
- Sincronização básica com mode: no-cors
- Interface funcional

---

## 📄 LICENÇA

MIT License - Livre para uso e modificação

---

**🎉 Projeto configurado e pronto para uso!**

**Próximo passo:** Configure a URL do Web App no aplicativo e comece a usar!

<!-- Deploy trigger -->
