// ID da planilha de dados
const SHEET_ID = '1Cnb-tqz1b5uvaW4rK3rlGjlYW3QJGEaz9sKPXCzEcxY';
const SHEET_NAME = 'Pedidos Prescrição';

// Função principal que decide qual página mostrar
function doGet(e) {
  var page = e && e.parameter && e.parameter.page ? e.parameter.page : 'cidadao';
  if (page === 'painel') {
    return HtmlService.createHtmlOutputFromFile('painel');
  } else if (page === 'consulta') {
    return HtmlService.createHtmlOutputFromFile('consulta');
  } else {
    return HtmlService.createHtmlOutputFromFile('cidadao');
  }
}

// Função para submissão do formulário do cidadão
function submitForm(formData) {
  // Exemplo de geração de protocolo
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const nextNumber = data.length;
  const protocolo = `PGE-PRESC-2024-${String(nextNumber).padStart(4, '0')}`;

  // Monta a linha para inserir na planilha
  const row = [
    protocolo,
    new Date(),
    formData.nomeSolicitante,
    formData.email,
    formData.telefone,
    formData.tipoPessoa,
    formData.cdas,
    formData.linkDocumentos || '',
    'Novo',
    '', // AtendenteResp
    '', // Historico
    ''  // DataEncerramento
  ];
  sheet.appendRow(row);

  // Retorna o protocolo gerado
  return { protocolo };
}

// Função para consulta de protocolo
function consultarProtocolo(protocolo) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === protocolo) {
      return {
        protocolo: data[i][0],
        data: data[i][1],
        status: data[i][8]
      };
    }
  }
  return { erro: 'Protocolo não encontrado.' };
}

// Funções do painel do atendente
function getRequests() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  // Retorna todas as solicitações, exceto o cabeçalho
  return data.slice(1);
}

function updateStatus(protocolo, status, historico, atendente) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === protocolo) {
      sheet.getRange(i + 1, 9).setValue(status); // Coluna Status
      sheet.getRange(i + 1, 10).setValue(atendente); // Coluna AtendenteResp
      sheet.getRange(i + 1, 11).setValue(historico); // Coluna Historico
      if (status === 'Deferido' || status === 'Indeferido') {
        sheet.getRange(i + 1, 12).setValue(new Date()); // DataEncerramento
      }
      return true;
    }
  }
  return false;
}
