// ========================================
// APPS SCRIPT STANDALONE - VERSÃƒO FINAL CORRIGIDA
// ========================================

const SPREADSHEET_ID = '1CWw8zKMf1ww08gynis7qIAYFjaYJo3PYb8bghp35zYE';

function doGet(e) {
  const callback = e.parameter.callback;
  const data = handleRequest(e);

  if (callback) {
    // JSONP response
    return ContentService
      .createTextOutput(callback + '(' + data.getContent() + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return data;
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let prateleiraSheet = ss.getSheetByName('Prateleiras');
    let historicoSheet = ss.getSheetByName('HistÃ³rico');

    if (!prateleiraSheet) {
      prateleiraSheet = ss.insertSheet('Prateleiras');
      prateleiraSheet.appendRow(['Ãšltima ModificaÃ§Ã£o', 'Modificado Por', 'SKU', 'Cor', 'Quantidade', 'Corredor', 'Prateleira', 'LocalizaÃ§Ã£o']);
      formatHeader(prateleiraSheet);
    }

    if (!historicoSheet) {
      historicoSheet = ss.insertSheet('HistÃ³rico');
      historicoSheet.appendRow(['Data/Hora', 'UsuÃ¡rio', 'AÃ§Ã£o', 'SKU', 'Cor', 'Qtd Anterior', 'Qtd Nova', 'LocalizaÃ§Ã£o', 'Corredor', 'Prateleira']);
      formatHeader(historicoSheet);
    }

    // ðŸ†• Parse do parÃ¢metro localizacoes se vier como string JSON
    let localizacoesArray = [];
    if (e.parameter.localizacoes) {
      try {
        localizacoesArray = JSON.parse(e.parameter.localizacoes);
      } catch (err) {
        Logger.log('âš ï¸ Erro ao fazer parse de localizacoes: ' + err);
        localizacoesArray = [];
      }
    }

    const data = {
      sku: e.parameter.sku || '',
      cor: e.parameter.cor || '',
      quantidadeTotal: parseInt(e.parameter.quantidade) || 0,
      usuario: e.parameter.usuario || 'Sistema',
      dataMovimentacao: new Date().toLocaleString('pt-BR'),
      // ðŸ†• Ãšltima localizaÃ§Ã£o (para aba Prateleiras - totalizador)
      ultimaLocalizacao: {
        corredor: e.parameter.corredor || '',
        prateleira: e.parameter.prateleira || '',
        localizacao: e.parameter.localizacao || ''
      },
      // ðŸ†• Todas as localizaÃ§Ãµes (para aba HistÃ³rico - detalhado)
      localizacoes: localizacoesArray
    };

    if (!data.sku) throw new Error('SKU nÃ£o fornecido');

    Logger.log('ðŸ“¦ Dados recebidos: SKU=' + data.sku + ' COR=' + data.cor + ' QTD=' + data.quantidadeTotal);
    Logger.log('ðŸ“ LocalizaÃ§Ãµes recebidas: ' + localizacoesArray.length);

    return updateProductComplete(prateleiraSheet, historicoSheet, data);

  } catch (error) {
    Logger.log('âŒ Erro em handleRequest: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


function updateProductComplete(prateleiraSheet, historicoSheet, data) {
  const sku = String(data.sku || '').toUpperCase().trim();
  const cor = String(data.cor || '').toUpperCase().trim();
  const usuario = data.usuario || 'Sistema';
  const dataHora = data.dataMovimentacao || new Date().toLocaleString('pt-BR');
  const quantidadeTotal = data.quantidadeTotal || 0;
  const localizacoes = data.localizacoes || [];
  const ultimaLocalizacao = data.ultimaLocalizacao || {};

  Logger.log('ðŸ”„ Processando: SKU=' + sku + ' COR=' + cor + ' QTD_TOTAL=' + quantidadeTotal);
  Logger.log('ðŸ“ Total de localizaÃ§Ãµes: ' + localizacoes.length);

  // ============================================
  // ATUALIZAR ABA PRATELEIRAS (TOTALIZADOR)
  // ============================================

  const prateleiraData = prateleiraSheet.getDataRange().getValues();
  let prateleiraRow = -1;
  let quantidadeAnterior = 0;

  // Buscar linha existente (SKU + COR)
  for (let i = 1; i < prateleiraData.length; i++) {
    const rowSKU = String(prateleiraData[i][2] || '').toUpperCase().trim();
    const rowCOR = String(prateleiraData[i][3] || '').toUpperCase().trim();

    if (rowSKU === sku && rowCOR === cor) {
      prateleiraRow = i + 1;
      quantidadeAnterior = parseInt(prateleiraData[i][4]) || 0;
      Logger.log('âœ… Linha encontrada: ' + prateleiraRow + ' (Qtd anterior: ' + quantidadeAnterior + ')');
      break;
    }
  }

  let acao = '';

  if (quantidadeTotal === 0) {
    // REMOVER - Produto zerado em todas as localizaÃ§Ãµes
    if (prateleiraRow > 0) {
      prateleiraSheet.deleteRow(prateleiraRow);
      acao = 'REMOVER';
      Logger.log('ðŸ—‘ï¸ Linha removida: ' + prateleiraRow);
    } else {
      Logger.log('âš ï¸ Tentou remover mas linha nÃ£o existe');
      acao = 'REMOVER';
    }
  } else {
    if (prateleiraRow > 0) {
      // ATUALIZAR linha existente com ÃšLTIMA localizaÃ§Ã£o
      prateleiraSheet.getRange(prateleiraRow, 1, 1, 8).setValues([[
        dataHora,
        usuario,
        sku,
        cor,
        quantidadeTotal,  // ðŸ†• Quantidade TOTAL consolidada
        ultimaLocalizacao.corredor || '',      // ðŸ†• ÃšLTIMA localizaÃ§Ã£o
        ultimaLocalizacao.prateleira || '',    // ðŸ†• ÃšLTIMA localizaÃ§Ã£o
        ultimaLocalizacao.localizacao || ''    // ðŸ†• ÃšLTIMA localizaÃ§Ã£o
      ]]);
      acao = quantidadeAnterior === 0 ? 'ADICIONAR' : 'ATUALIZAR';
      Logger.log('âœï¸ Linha atualizada: ' + prateleiraRow + ' com QTD=' + quantidadeTotal);
    } else {
      // ADICIONAR nova linha com ÃšLTIMA localizaÃ§Ã£o
      prateleiraSheet.appendRow([
        dataHora,
        usuario,
        sku,
        cor,
        quantidadeTotal,
        ultimaLocalizacao.corredor || '',
        ultimaLocalizacao.prateleira || '',
        ultimaLocalizacao.localizacao || ''
      ]);
      acao = 'ADICIONAR';
      Logger.log('âž• Nova linha adicionada com QTD=' + quantidadeTotal);
    }
  }

  // ============================================
  // REGISTRAR NO HISTÃ“RICO (TODAS AS LOCALIZAÃ‡Ã•ES)
  // ============================================

  if (localizacoes.length > 0) {
    // Registrar cada localizaÃ§Ã£o separadamente no histÃ³rico
    localizacoes.forEach(function(loc) {
      historicoSheet.appendRow([
        dataHora,
        usuario,
        acao,
        sku,
        cor,
        quantidadeAnterior,
        parseInt(loc.quantidade) || 0,  // Quantidade especÃ­fica desta localizaÃ§Ã£o
        loc.localizacao || '',
        loc.corredor || '',
        loc.prateleira || ''
      ]);
    });
    Logger.log('ðŸ“ ' + localizacoes.length + ' entrada(s) registradas no histÃ³rico');
  } else {
    // Fallback: registrar entrada Ãºnica sem localizaÃ§Ã£o especÃ­fica
    historicoSheet.appendRow([
      dataHora,
      usuario,
      acao,
      sku,
      cor,
      quantidadeAnterior,
      quantidadeTotal,
      ultimaLocalizacao.localizacao || '',
      ultimaLocalizacao.corredor || '',
      ultimaLocalizacao.prateleira || ''
    ]);
    Logger.log('ðŸ“ 1 entrada no histÃ³rico (sem array de localizaÃ§Ãµes)');
  }

  return ContentService
    .createTextOutput(JSON.stringify({ 
      success: true, 
      message: 'OK',
      operation: acao,
      quantidadeTotal: quantidadeTotal,
      localizacoesProcessadas: localizacoes.length
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
}