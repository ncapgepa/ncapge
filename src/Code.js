// ID da planilha de dados - Verifique se é o ID correto da sua planilha
const SHEET_ID = '1Cnb-tqz1b5uvaW4rK3rlGjlYW3QJGEaz9sKPXCzEcxY';
const SHEET_NAME = 'Pedidos Prescrição';
const DRIVE_FOLDER_NAME = 'Documentos Prescricao'; // Nome da pasta no Drive para guardar os docs

/**
 * Função principal que serve as páginas HTML do aplicativo.
 * @param {object} e O objeto de evento do Apps Script.
 * @returns {HtmlOutput} A página HTML a ser renderizada.
 */
function doGet(e) {
  // Define a página padrão como 'cidadao' se nenhum parâmetro for passado
  var page = e && e.parameter && e.parameter.page ? e.parameter.page : 'cidadao';
  
  if (page === 'painel') {
    // Retorna a página do painel do atendente
    return HtmlService.createTemplateFromFile('painel').evaluate().setTitle('Painel do Atendente');
  } else if (page === 'consulta') {
    // Retorna a página de consulta de protocolo
    return HtmlService.createTemplateFromFile('consulta').evaluate().setTitle('Consulta de Protocolo');
  } else {
    // Retorna a página principal do cidadão
    return HtmlService.createTemplateFromFile('cidadao').evaluate().setTitle('Análise de Prescrição de Dívida Ativa');
  }
}

/**
 * Inclui o conteúdo de outro arquivo HTML (para reuso de código).
 * @param {string} filename O nome do arquivo a ser incluído.
 * @returns {string} O conteúdo do arquivo HTML.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


/**
 * Processa a submissão do formulário do cidadão, incluindo o upload de arquivos.
 * @param {object} formObject O objeto do formulário enviado pelo cliente.
 * @returns {object} Um objeto com o protocolo gerado ou uma mensagem de erro.
 */
function submitForm(formObject) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`A planilha com o nome "${SHEET_NAME}" não foi encontrada.`);
    }

    // --- Geração de Protocolo ---
    const lastRow = sheet.getLastRow();
    const nextNumber = lastRow; // Simples contador baseado no número de linhas
    const protocolo = `PGE-PRESC-2024-${String(nextNumber).padStart(4, '0')}`;

    // --- Lógica de Upload de Arquivos para o Google Drive ---
    let driveFolder = getOrCreateFolder(DRIVE_FOLDER_NAME);
    let submissionFolder = driveFolder.createFolder(`${protocolo} - ${formObject.nome}`);
    let filesUrls = [];

    // Itera sobre todas as chaves do objeto do formulário para encontrar arquivos
    for (let key in formObject) {
      if (key.startsWith('doc_') && formObject[key] && formObject[key].getBlob) {
        let fileBlob = formObject[key];
        let file = submissionFolder.createFile(fileBlob);
        filesUrls.push(file.getUrl());
      }
    }
    const folderUrl = submissionFolder.getUrl();


    // --- Preparação dos dados para a Planilha ---
    // Junta os valores de CDA em uma única string, caso venham como array
    const cdas = Array.isArray(formObject['cda[]']) ? formObject['cda[]'].join(', ') : formObject['cda[]'];

    const newRow = [
      protocolo,
      new Date(),
      formObject.nome,
      formObject.email,
      formObject.telefone,
      formObject.tipo,
      cdas,
      folderUrl, // Link para a pasta no Drive com os documentos
      'Novo',
      '', // AtendenteResp
      `Pedido criado em ${new Date().toLocaleString()}`, // Histórico Inicial
      ''  // DataEncerramento
    ];
    
    sheet.appendRow(newRow);

    // Retorna o protocolo para o cliente
    return { protocolo: protocolo };

  } catch (error) {
    Logger.log(error.toString());
    return { erro: error.toString() };
  }
}

/**
 * Encontra ou cria uma pasta no Google Drive.
 * @param {string} folderName O nome da pasta.
 * @returns {Folder} O objeto da pasta do Drive.
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    // Pasta já existe
    return folders.next();
  } else {
    // Cria a pasta se não existir
    return DriveApp.createFolder(folderName);
  }
}


/**
 * Consulta um protocolo específico na planilha.
 * @param {string} protocolo O número do protocolo a ser consultado.
 * @returns {object} Os dados do protocolo ou uma mensagem de erro.
 */
function consultarProtocolo(protocolo) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  // Começa do 1 para pular o cabeçalho
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === protocolo) { // Coluna A: Protocolo
      return {
        protocolo: data[i][0],
        data: data[i][1].toLocaleString(),
        nome: data[i][2],
        email: data[i][3],
        telefone: data[i][4],
        tipo: data[i][5],
        cdas: data[i][6],
        linkDocumentos: data[i][7],
        status: data[i][8],
        atendente: data[i][9],
        historico: data[i][10]
      };
    }
  }
  return { erro: 'Protocolo não encontrado.' };
}

/**
 * Retorna todas as solicitações para o painel do atendente.
 * @returns {Array<object>} Uma lista de objetos, cada um representando uma solicitação.
 */
function getRequests() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Remove e armazena o cabeçalho
  
  const requests = data.map(row => {
    return {
      protocolo: row[0],
      data: row[1].toLocaleString(),
      nome: row[2],
      status: row[8]
    };
  });
  
  return requests;
}

/**
 * Atualiza o status e outras informações de uma solicitação.
 * @param {string} protocolo O protocolo a ser atualizado.
 * @param {string} status O novo status.
 * @param {string} historico O novo registro de histórico.
 * @param {string} atendente O nome do atendente.
 * @returns {boolean} True se foi bem-sucedido, false caso contrário.
 */
function updateStatus(protocolo, status, historico, atendente) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === protocolo) {
      let row = i + 1;
      sheet.getRange(row, 9).setValue(status); // Coluna I: Status
      sheet.getRange(row, 10).setValue(atendente); // Coluna J: AtendenteResp
      
      // Adiciona o novo histórico ao histórico existente
      const oldHistorico = sheet.getRange(row, 11).getValue();
      const newHistoricoEntry = `\n${new Date().toLocaleString()} - ${atendente}: ${historico}`;
      sheet.getRange(row, 11).setValue(oldHistorico + newHistoricoEntry);
      
      if (status === 'Deferido' || status === 'Indeferido') {
        sheet.getRange(row, 12).setValue(new Date()); // Coluna L: DataEncerramento
      }
      return true;
    }
  }
  return false;
}
