# 📦 Control Stock App - Sistema de Controle de Estoque

Sistema de gerenciamento de estoque de prateleira com sincronização em tempo real com Google Sheets.

## 🚀 Deploy

Aplicação disponível em: [https://juninhorezini.github.io/ControlStockApp](https://juninhorezini.github.io/ControlStockApp)

## ⚙️ Configuração

### 1. Configurar Google Apps Script

1. Abra sua planilha Google Sheets
2. Vá em **Extensões → Apps Script**
3. Crie um novo arquivo chamado `SyncPrateleira.gs`
4. Cole o código do Apps Script otimizado (veja instruções anteriores)
5. Publique como **Web App**:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
6. Copie a URL do Web App

### 2. Configurar no App

1. Acesse o aplicativo
2. Clique em **Configurações** (ícone de engrenagem)
3. Cole a URL do Web App no campo apropriado
4. Clique em **Sincronizar Tudo**

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start

# Build para produção
npm run build

# Deploy para GitHub Pages
npm run deploy
```

## 📊 Funcionalidades

- ✅ Adicionar produtos com SKU, cor e quantidade
- ✅ Organizar por prateleiras customizáveis
- ✅ Sincronização automática com Google Sheets
- ✅ Pesquisa e filtros avançados
- ✅ Interface responsiva (mobile-friendly)
- ✅ Logs de movimentação
- ✅ Export/Import de dados

## 🔧 Tecnologias

- React 18
- Tailwind CSS
- Lucide Icons
- Google Apps Script
- GitHub Pages

## 📝 Licença

MIT License

## 👤 Autor

Juninho Rezini
