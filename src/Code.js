// ID da planilha de dados
const SHEET_ID = '1Cnb-tqz1b5uvaW4rK3rlGjlYW3QJGEaz9sKPXCzEcxY';
const REQUESTS_SHEET_NAME = 'Pedidos Prescrição';
const ACCESS_SHEET_NAME = 'Acessos'; // Nova folha de acessos
const DRIVE_FOLDER_NAME = 'Documentos Prescricao';

/**
 * Função principal que serve as páginas HTML do aplicativo.
 * @param {object} e O objeto de evento do Apps Script.
 * @returns {HtmlOutput} A página HTML a ser renderizada.
 */
function doGet(e) {
  // Define a página padrão como 'cidadao' se nenhum parâmetro for passado
  var page = e && e.parameter && e.parameter.page ? e.parameter.page : 'cidadao';
  
  // --- LÓGICA DE SEGURANÇA ---
  if (page === 'painel') {
    const accessInfo = checkUserAccess();
    if (accessInfo.hasAccess) {
      const template = HtmlService.createTemplateFromFile('painel');
      template.userEmail = accessInfo.email;
      template.userRole = accessInfo.role;
      return template.evaluate().setTitle('Painel do Atendente');
    } else {
      return HtmlService.createHtmlOutput('<h1>Acesso Negado</h1><p>Você não tem permissão para aceder a esta página.</p>');
    }
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
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
    if (!sheet) {
      throw new Error(`A planilha com o nome "${REQUESTS_SHEET_NAME}" não foi encontrada.`);
    }

    // --- Geração de Protocolo ---
    const lastRow = sheet.getLastRow();
    const nextNumber = lastRow; // Simples contador baseado no número de linhas
    const protocolo = `PGE-PRESC-2024-${String(nextNumber).padStart(4, '0')}`;

    // --- Lógica de Upload de Arquivos para o Google Drive ---
    let driveFolder = getOrCreateFolder(DRIVE_FOLDER_NAME);
    let submissionFolder = driveFolder.createFolder(`${protocolo} - ${formObject.nome}`);
    
    // Itera sobre todas as chaves do objeto do formulário para encontrar arquivos
    for (let key in formObject) {
      // ******** INÍCIO DA CORREÇÃO ********
      // A forma correta de identificar um Blob de um upload de formulário
      // é verificar se é um objeto com métodos como 'getName' ou 'getContentType'.
      // A verificação anterior '.getBlob' estava incorreta para este contexto.
      if (key.startsWith('doc_') && formObject[key] && typeof formObject[key].getName === 'function') {
        let fileBlob = formObject[key]; // O objeto já é o blob
        submissionFolder.createFile(fileBlob);
      }
      // ******** FIM DA CORREÇÃO ********
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
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
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
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
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
 * @returns {boolean} True se foi bem-sucedido, false caso contrário.
 */
function updateStatus(protocolo, status, historico) {
  const accessInfo = checkUserAccess();
  if (!accessInfo.hasAccess) {
    throw new Error('Acesso negado para esta operação.');
  }
  const atendente = accessInfo.email;
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
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

/**
 * Verifica o acesso do usuário atual.
 * @returns {object} Objeto contendo informações sobre o acesso do usuário.
 */
function checkUserAccess() {
  const userEmail = Session.getActiveUser().getEmail();
  if (!userEmail) return { hasAccess: false };
  try {
    const accessSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCESS_SHEET_NAME);
    const data = accessSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toLowerCase() === userEmail.toLowerCase()) {
        return { hasAccess: true, email: userEmail, role: data[i][1] };
      }
    }
    return { hasAccess: false, email: userEmail, role: null };
  } catch (e) {
    Logger.log('Erro ao verificar acesso: ' + e.message);
    return { hasAccess: false, email: userEmail, role: null };
  }
}

/**
 * Retorna a lista de usuários com acesso (apenas para admin).
 * @returns {Array<object>} Lista de usuários com acesso.
 */
function getUsers() {
  const accessInfo = checkUserAccess();
  if (!accessInfo.hasAccess || accessInfo.role !== 'admin') {
    throw new Error('Acesso negado.');
  }
  const accessSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCESS_SHEET_NAME);
  const data = accessSheet.getDataRange().getValues();
  data.shift();
  return data.map(row => ({ email: row[0], role: row[1] }));
}

/**
 * Adiciona ou atualiza um usuário na lista de acessos (apenas para admin).
 * @param {string} email O e-mail do usuário.
 * @param {string} role O papel do usuário (ex: admin, atendente).
 * @returns {object} Resultado da operação.
 */
function addOrUpdateUser(email, role) {
  const accessInfo = checkUserAccess();
  if (!accessInfo.hasAccess || accessInfo.role !== 'admin') {
    throw new Error('Acesso negado.');
  }
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCESS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === email.toLowerCase()) {
      sheet.getRange(i + 1, 2).setValue(role);
      return { status: 'success', message: 'Utilizador atualizado.' };
    }
  }
  sheet.appendRow([email, role]);
  return { status: 'success', message: 'Utilizador adicionado.' };
}

/**
 * Remove um usuário da lista de acessos (apenas para admin).
 * @param {string} email O e-mail do usuário a ser removido.
 * @returns {object} Resultado da operação.
 */
function removeUser(email) {
  const accessInfo = checkUserAccess();
  if (!accessInfo.hasAccess || accessInfo.role !== 'admin') {
    throw new Error('Acesso negado.');
  }
  if (email.toLowerCase() === accessInfo.email.toLowerCase()) {
    throw new Error('Não pode remover-se a si próprio.');
  }
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCESS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][0].toLowerCase() === email.toLowerCase()) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Utilizador removido.' };
    }
  }
  throw new Error('Utilizador não encontrado.');
}
