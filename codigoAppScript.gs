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
    let historicoSheet = ss.getSheetByName('Histórico');

    if (!prateleiraSheet) {
      prateleiraSheet = ss.insertSheet('Prateleiras');
      prateleiraSheet.getRange(10, 1, 1, 8).setValues([['Última Modificação', 'Modificado Por', 'SKU', 'Cor', 'Quantidade', 'Corredor', 'Prateleira', 'Localização']]);
      formatHeader(prateleiraSheet, 10);
      prateleiraSheet.setFrozenRows(10);
    } else {
      ensureHeaderAtRow10(prateleiraSheet);
    }
    ensureTotalsBlock(prateleiraSheet);

    if (!historicoSheet) {
      historicoSheet = ss.insertSheet('Histórico');
      historicoSheet.appendRow(['Data/Hora', 'Usuário', 'Ação', 'SKU', 'Cor', 'Qtd Anterior', 'Qtd Nova', 'Localização', 'Corredor', 'Prateleira']);
      formatHeader(historicoSheet, 1);
    }

    var action = null;
    var payloadJson = null;
    if (e && e.postData && e.postData.type === 'application/json' && e.postData.contents) {
      try {
        payloadJson = JSON.parse(e.postData.contents);
        action = payloadJson.action || null;
      } catch(err) {}
    } else {
      action = e.parameter.action || null;
    }

    if (action === 'summaryTotals') {
      var totals = null;
      var usuario = 'Sistema';
      if (payloadJson && payloadJson.totals) {
        totals = payloadJson.totals;
        usuario = payloadJson.usuario || 'Sistema';
      } else {
        totals = {
          produtosUnicos: parseInt(e.parameter.produtosUnicos) || 0,
          quantidadeTotal: parseInt(e.parameter.quantidadeTotal) || 0,
          coresDiferentes: parseInt(e.parameter.coresDiferentes) || 0,
          corredores: parseInt(e.parameter.corredores) || 0,
          timestamp: e.parameter.timestamp || new Date().toISOString()
        };
        usuario = e.parameter.usuario || 'Sistema';
      }
      return updateSummaryTotals(prateleiraSheet, totals, usuario);
    }

    if (action === 'bulkShelves') {
      if (payloadJson && Array.isArray(payloadJson.products)) {
        return bulkSyncShelves(prateleiraSheet, payloadJson);
      }
      var productsParam = null;
      if (e.parameter.products) {
        try {
          productsParam = JSON.parse(e.parameter.products);
        } catch (err) {
          productsParam = [];
        }
        var usuarioBulk = e.parameter.usuario || 'Sistema';
        return bulkSyncShelves(prateleiraSheet, { usuario: usuarioBulk, products: productsParam });
      }
    }

    if (action === 'bulkTotals' && payloadJson && Array.isArray(payloadJson.products)) {
      return bulkUpdateTotals(prateleiraSheet, payloadJson);
    }

    if (action === 'updateTotal') {
      var skuSingle = (payloadJson && payloadJson.sku) ? payloadJson.sku : (e.parameter.sku || '');
      var corSingle = (payloadJson && payloadJson.cor) ? payloadJson.cor : (e.parameter.cor || '');
      var qtdSingle = parseInt((payloadJson && payloadJson.quantidade) ? payloadJson.quantidade : (e.parameter.quantidade || 0)) || 0;
      return updateSingleTotal(prateleiraSheet, skuSingle, corSingle, qtdSingle);
    }

    if (action === 'upsertShelfRow') {
      var skuOne = (payloadJson && payloadJson.sku) ? payloadJson.sku : (e.parameter.sku || '');
      var corOne = (payloadJson && payloadJson.cor) ? payloadJson.cor : (e.parameter.cor || '');
      var qtdOne = parseInt((payloadJson && payloadJson.quantidade) ? payloadJson.quantidade : (e.parameter.quantidade || 0)) || 0;
      var corredorOne = (payloadJson && payloadJson.corredor) ? payloadJson.corredor : (e.parameter.corredor || '');
      var prateleiraOne = (payloadJson && payloadJson.prateleira) ? payloadJson.prateleira : (e.parameter.prateleira || '');
      var localizacaoOne = (payloadJson && payloadJson.localizacao) ? payloadJson.localizacao : (e.parameter.localizacao || '');
      var usuarioOne = (payloadJson && payloadJson.usuario) ? payloadJson.usuario : (e.parameter.usuario || 'Sistema');
      return upsertShelfRow(prateleiraSheet, skuOne, corOne, qtdOne, corredorOne, prateleiraOne, localizacaoOne, usuarioOne);
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

    const acaoParam = (e.parameter.acao || e.parameter.action || '').toUpperCase();
    const qtdAnteriorParam = parseInt(e.parameter.qtdAnterior || e.parameter.from) || 0;
    const qtdAtualParam = parseInt(e.parameter.qtdAtual || e.parameter.to) || 0;
    const totalAnteriorParam = parseInt(e.parameter.totalAnterior) || null;
    const totalAtualParam = parseInt(e.parameter.totalAtual) || null;

    const data = {
      sku: e.parameter.sku || '',
      cor: e.parameter.cor || '',
      quantidadeTotal: parseInt(e.parameter.quantidade) || 0,
      usuario: e.parameter.usuario || 'Sistema',
      dataMovimentacao: new Date().toLocaleString('pt-BR'),
      // ðŸ†• Última localização (para aba Prateleiras - totalizador)
      ultimaLocalizacao: {
        corredor: e.parameter.corredor || '',
        prateleira: e.parameter.prateleira || '',
        localizacao: e.parameter.localizacao || ''
      },
      // ðŸ†• Todas as localizações (para aba Histórico - detalhado)
      localizacoes: localizacoesArray,
      // ðŸ†• Metadados da última alteração por localização (quando disponíveis)
      ultimaAlteracao: {
        acao: acaoParam || '',
        qtdAnterior: qtdAnteriorParam,
        qtdAtual: qtdAtualParam,
        totalAnterior: totalAnteriorParam,
        totalAtual: totalAtualParam
      }
    };

    if (!data.sku) throw new Error('SKU não fornecido');

    Logger.log('ðŸ“¦ Dados recebidos: SKU=' + data.sku + ' COR=' + data.cor + ' QTD=' + data.quantidadeTotal);
    Logger.log('ðŸ“ Localizações recebidas: ' + localizacoesArray.length);

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
  Logger.log('ðŸ“ Total de localizações: ' + localizacoes.length);

  // ============================================
  // ATUALIZAR ABA PRATELEIRAS (TOTALIZADOR)
  // ============================================

  const lastRow = prateleiraSheet.getLastRow();
  let prateleiraRow = -1;
  let quantidadeAnterior = 0;

  if (lastRow >= 11) {
    const dataRange = prateleiraSheet.getRange(11, 1, lastRow - 10, 8).getValues();
    for (let i = 0; i < dataRange.length; i++) {
      const rowSKU = String(dataRange[i][2] || '').toUpperCase().trim();
      const rowCOR = String(dataRange[i][3] || '').toUpperCase().trim();
      if (rowSKU === sku && rowCOR === cor) {
        prateleiraRow = 11 + i;
        quantidadeAnterior = parseInt(dataRange[i][4]) || 0;
        Logger.log('âœ… Linha encontrada: ' + prateleiraRow + ' (Qtd anterior: ' + quantidadeAnterior + ')');
        break;
      }
    }
  }

  let acao = '';

  if (quantidadeTotal === 0) {
    // REMOVER - Produto zerado em todas as localizações
    if (prateleiraRow > 0) {
      prateleiraSheet.deleteRow(prateleiraRow);
      acao = 'REMOVER';
      Logger.log('ðŸ—‘ï¸ Linha removida: ' + prateleiraRow);
    } else {
      Logger.log('âš ï¸ Tentou remover mas linha não existe');
      acao = 'REMOVER';
    }
  } else {
    if (prateleiraRow > 0) {
      // ATUALIZAR linha existente com Última localização
      prateleiraSheet.getRange(prateleiraRow, 1, 1, 8).setValues([[
        dataHora,
        usuario,
        sku,
        cor,
        quantidadeTotal,  // ðŸ†• Quantidade TOTAL consolidada
        ultimaLocalizacao.corredor || '',      // ðŸ†• Última localização
        ultimaLocalizacao.prateleira || '',    // ðŸ†• Última localização
        ultimaLocalizacao.localizacao || ''    // ðŸ†• Última localização
      ]]);
      acao = quantidadeAnterior === 0 ? 'ADICIONAR' : 'ATUALIZAR';
      Logger.log('âœï¸ Linha atualizada: ' + prateleiraRow + ' com QTD=' + quantidadeTotal);
    } else {
      // ADICIONAR nova linha com Última localização
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
  // REGISTRAR NO HISTÓRICO (DETALHES POR LOCALIZAÇÃO)
  // ============================================

  var acaoHistoricoGlobal = acao; // padrão derivado do totalizador
  var acaoUltima = (data.ultimaAlteracao && data.ultimaAlteracao.acao) ? String(data.ultimaAlteracao.acao).toUpperCase() : '';
  var qtdAnteriorUltima = (data.ultimaAlteracao && (data.ultimaAlteracao.qtdAnterior || data.ultimaAlteracao.qtdAnterior === 0)) ? parseInt(data.ultimaAlteracao.qtdAnterior) : null;
  var qtdAtualUltima = (data.ultimaAlteracao && (data.ultimaAlteracao.qtdAtual || data.ultimaAlteracao.qtdAtual === 0)) ? parseInt(data.ultimaAlteracao.qtdAtual) : null;

  if (localizacoes.length > 0) {
    var acaoParaHistorico = acaoUltima || acaoHistoricoGlobal;
    var qtdAnteriorParaHistorico = (qtdAnteriorUltima != null) ? qtdAnteriorUltima : quantidadeAnterior;
    localizacoes.forEach(function(loc) {
      var qtdNovaLoc = (qtdAtualUltima != null) ? qtdAtualUltima : (parseInt(loc.quantidade) || 0);
      historicoSheet.appendRow([
        dataHora,
        usuario,
        acaoParaHistorico,
        sku,
        cor,
        qtdAnteriorParaHistorico,
        qtdNovaLoc,
        loc.localizacao || '',
        loc.corredor || '',
        loc.prateleira || ''
      ]);
    });
    Logger.log('📝 ' + localizacoes.length + ' entrada(s) registradas no Histórico (granular)');
  } else {
    var acaoParaHistorico = acaoUltima || acaoHistoricoGlobal;
    var qtdAnteriorParaHistorico = (qtdAnteriorUltima != null) ? qtdAnteriorUltima : quantidadeAnterior;
    var qtdNovaLoc = (qtdAtualUltima != null) ? qtdAtualUltima : quantidadeTotal;
    historicoSheet.appendRow([
      dataHora,
      usuario,
      acaoParaHistorico,
      sku,
      cor,
      qtdAnteriorParaHistorico,
      qtdNovaLoc,
      ultimaLocalizacao.localizacao || '',
      ultimaLocalizacao.corredor || '',
      ultimaLocalizacao.prateleira || ''
    ]);
    Logger.log('📝 1 entrada no Histórico (fallback)');
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

function formatHeader(sheet, headerRow) {
  const row = headerRow || 1;
  const headerRange = sheet.getRange(row, 1, 1, sheet.getLastColumn());
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
}
function updateSummaryTotals(sheet, totals, usuario) {
  const produtosUnicos = totals && totals.produtosUnicos ? parseInt(totals.produtosUnicos) : 0;
  const quantidadeTotal = totals && totals.quantidadeTotal ? parseInt(totals.quantidadeTotal) : 0;
  const coresDiferentes = totals && totals.coresDiferentes ? parseInt(totals.coresDiferentes) : 0;
  const corredores = totals && totals.corredores ? parseInt(totals.corredores) : 0;
  const timestamp = totals && totals.timestamp ? String(totals.timestamp) : new Date().toISOString();

  sheet.getRange(1, 1).setValue('Resumo');
  sheet.getRange(1, 2).setValue(usuario + ' ' + timestamp);
  sheet.getRange(2, 1).setValue('Produtos Únicos');
  sheet.getRange(2, 2).setValue(produtosUnicos);
  sheet.getRange(3, 1).setValue('Quantidade Total');
  sheet.getRange(3, 2).setValue(quantidadeTotal);
  sheet.getRange(4, 1).setValue('Cores Diferentes');
  sheet.getRange(4, 2).setValue(coresDiferentes);
  sheet.getRange(5, 1).setValue('Corredores');
  sheet.getRange(5, 2).setValue(corredores);

  

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, updated: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
function ensureTotalsBlock(sheet) {
  var ss = sheet.getParent();
  var totalRange = sheet.getRange(1, 1, 5, 3);
  var c2 = sheet.getRange(2, 3);
  var c3 = sheet.getRange(3, 3);
  var c4 = sheet.getRange(4, 3);
  var c5 = sheet.getRange(5, 3);
  c2.setFormula('=COUNTA(UNIQUE(FILTER(C11:C; C11:C<>"")))');
  c3.setFormula('=SUM(E11:E)');
  c4.setFormula('=COUNTA(UNIQUE(FILTER(D11:D; D11:D<>"")))');
  c5.setFormula('=COUNTA(UNIQUE(FILTER(F11:F; F11:F<>"")))');
  try {
    var ranges = ss.getNamedRanges();
    var existing = null;
    for (var i = 0; i < ranges.length; i++) { if (ranges[i].getName() === 'TOTALIZADORES') { existing = ranges[i]; break; } }
    if (existing) { existing.setRange(totalRange); } else { ss.addNamedRange('TOTALIZADORES', totalRange); }
  } catch (e) {}
}
function ensureHeaderAtRow10(sheet) {
  var lastRow = sheet.getLastRow();
  var headerRowDetect = -1;
  var maxCheck = Math.min(lastRow, 20);
  if (maxCheck >= 1) {
    var checkValues = sheet.getRange(1, 1, maxCheck, sheet.getLastColumn()).getValues();
    for (var i = 0; i < checkValues.length; i++) {
      var row = checkValues[i];
      if (String(row[2] || '').toUpperCase().trim() === 'SKU' && String(row[3] || '').toUpperCase().trim() === 'COR') {
        headerRowDetect = i + 1;
        break;
      }
    }
  }
  if (headerRowDetect > 0 && headerRowDetect !== 10) {
    if (headerRowDetect < 10) {
      sheet.insertRows(1, 10 - headerRowDetect);
    }
    sheet.setFrozenRows(10);
    formatHeader(sheet, 10);
  } else if (headerRowDetect < 0) {
    sheet.getRange(10, 1, 1, 8).setValues([['Última Modificação', 'Modificado Por', 'SKU', 'Cor', 'Quantidade', 'Corredor', 'Prateleira', 'Localização']]);
    formatHeader(sheet, 10);
    sheet.setFrozenRows(10);
  }
}

function bulkSyncShelves(prateleiraSheet, payload) {
  var usuario = payload.usuario || 'Sistema';
  var products = payload.products || [];
  var dataHora = new Date().toLocaleString('pt-BR');
  var lastRow = prateleiraSheet.getLastRow();
  var map = {};
  var dataRange = [];
  if (lastRow >= 11) {
    dataRange = prateleiraSheet.getRange(11, 1, lastRow - 10, 8).getValues();
    for (var i = 0; i < dataRange.length; i++) {
      var rowSKU = String(dataRange[i][2] || '').toUpperCase().trim();
      var rowCOR = String(dataRange[i][3] || '').toUpperCase().trim();
      var key = rowSKU + '|' + rowCOR;
      map[key] = { row: 11 + i, quantidade: parseInt(dataRange[i][4]) || 0 };
    }
  }
  var addValues = [];
  var updateOps = [];
  var deleteRows = [];
  for (var p = 0; p < products.length; p++) {
    var sku = String(products[p].sku || '').toUpperCase().trim();
    var cor = String(products[p].cor || '').toUpperCase().trim();
    var quantidadeTotal = parseInt(products[p].quantidade) || 0;
    var corredor = products[p].corredor || '';
    var prat = products[p].prateleira || '';
    var loc = products[p].localizacao || '';
    var key = sku + '|' + cor;
    var existing = map[key] || null;
    if (quantidadeTotal === 0) {
      if (existing && existing.row > 0) {
        deleteRows.push(existing.row);
      }
    } else {
      if (existing && existing.row > 0) {
        updateOps.push({ row: existing.row, values: [dataHora, usuario, sku, cor, quantidadeTotal, corredor, prat, loc] });
      } else {
        addValues.push([dataHora, usuario, sku, cor, quantidadeTotal, corredor, prat, loc]);
      }
    }
  }
  for (var u = 0; u < updateOps.length; u++) {
    var op = updateOps[u];
    prateleiraSheet.getRange(op.row, 1, 1, 8).setValues([op.values]);
  }
  if (addValues.length > 0) {
    var lr = prateleiraSheet.getLastRow();
    prateleiraSheet.getRange(lr + 1, 1, addValues.length, 8).setValues(addValues);
  }
  if (deleteRows.length > 0) {
    deleteRows.sort(function(a, b) { return b - a; });
    for (var d = 0; d < deleteRows.length; d++) {
      try {
        prateleiraSheet.deleteRow(deleteRows[d]);
      } catch (err) {}
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true, processed: products.length })).setMimeType(ContentService.MimeType.JSON);
}

function bulkUpdateTotals(prateleiraSheet, payload) {
  var products = payload.products || [];
  var lastRow = prateleiraSheet.getLastRow();
  if (lastRow < 11) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, processed: 0 })).setMimeType(ContentService.MimeType.JSON);
  }
  var range = prateleiraSheet.getRange(11, 1, lastRow - 10, 8).getValues();
  var qtyRange = prateleiraSheet.getRange(11, 5, lastRow - 10, 1);
  var qtyValues = qtyRange.getValues();
  var indexMap = {};
  for (var i = 0; i < range.length; i++) {
    var rowSKU = String(range[i][2] || '').toUpperCase().trim();
    var rowCOR = String(range[i][3] || '').toUpperCase().trim();
    indexMap[rowSKU + '|' + rowCOR] = i;
  }
  var processed = 0;
  for (var p = 0; p < products.length; p++) {
    var sku = String(products[p].sku || '').toUpperCase().trim();
    var cor = String(products[p].cor || '').toUpperCase().trim();
    var quantidade = parseInt(products[p].quantidade) || 0;
    var key = sku + '|' + cor;
    if (typeof indexMap[key] !== 'undefined') {
      var idx = indexMap[key];
      qtyValues[idx][0] = quantidade;
      processed++;
    }
  }
  qtyRange.setValues(qtyValues);
  return ContentService.createTextOutput(JSON.stringify({ success: true, processed: processed })).setMimeType(ContentService.MimeType.JSON);
}

function updateSingleTotal(prateleiraSheet, sku, cor, quantidade) {
  var lastRow = prateleiraSheet.getLastRow();
  if (lastRow < 11) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, processed: 0 })).setMimeType(ContentService.MimeType.JSON);
  }
  var range = prateleiraSheet.getRange(11, 1, lastRow - 10, 8).getValues();
  var targetRow = -1;
  for (var i = 0; i < range.length; i++) {
    var rowSKU = String(range[i][2] || '').toUpperCase().trim();
    var rowCOR = String(range[i][3] || '').toUpperCase().trim();
    if (rowSKU === String(sku || '').toUpperCase().trim() && rowCOR === String(cor || '').toUpperCase().trim()) {
      targetRow = 11 + i;
      break;
    }
  }
  if (targetRow > 0) {
    prateleiraSheet.getRange(targetRow, 5).setValue(parseInt(quantidade) || 0);
    return ContentService.createTextOutput(JSON.stringify({ success: true, processed: 1 })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true, processed: 0 })).setMimeType(ContentService.MimeType.JSON);
}

function upsertShelfRow(prateleiraSheet, sku, cor, quantidade, corredor, prateleira, localizacao, usuario) {
  var dataHora = new Date().toLocaleString('pt-BR');
  var lastRow = prateleiraSheet.getLastRow();
  var targetRow = -1;
  if (lastRow >= 11) {
    var range = prateleiraSheet.getRange(11, 1, lastRow - 10, 8).getValues();
    for (var i = 0; i < range.length; i++) {
      var rowSKU = String(range[i][2] || '').toUpperCase().trim();
      var rowCOR = String(range[i][3] || '').toUpperCase().trim();
      if (rowSKU === String(sku || '').toUpperCase().trim() && rowCOR === String(cor || '').toUpperCase().trim()) {
        targetRow = 11 + i;
        break;
      }
    }
  }
  var q = parseInt(quantidade) || 0;
  if (q === 0) {
    if (targetRow > 0) {
      try { prateleiraSheet.deleteRow(targetRow); } catch (err) {}
      return ContentService.createTextOutput(JSON.stringify({ success: true, removed: 1 })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, removed: 0 })).setMimeType(ContentService.MimeType.JSON);
  }
  var values = [[dataHora, usuario || 'Sistema', String(sku || '').toUpperCase().trim(), String(cor || '').toUpperCase().trim(), q, corredor || '', prateleira || '', localizacao || '']];
  if (targetRow > 0) {
    prateleiraSheet.getRange(targetRow, 1, 1, 8).setValues(values);
    return ContentService.createTextOutput(JSON.stringify({ success: true, updated: 1 })).setMimeType(ContentService.MimeType.JSON);
  } else {
    prateleiraSheet.getRange(prateleiraSheet.getLastRow() + 1, 1, 1, 8).setValues(values);
    return ContentService.createTextOutput(JSON.stringify({ success: true, added: 1 })).setMimeType(ContentService.MimeType.JSON);
  }
}
