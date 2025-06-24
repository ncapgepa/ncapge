// ID da planilha de dados
const SHEET_ID = '1Cnb-tqz1b5uvaW4rK3rlGjlYW3QJGEaz9sKPXCzEcxY';
const REQUESTS_SHEET_NAME = 'Pedidos Prescrição';
const ACCESS_SHEET_NAME = 'Acessos';
const DRIVE_FOLDER_NAME = 'Documentos Prescricao';

/**
 * Função principal que serve as páginas HTML do aplicativo.
 */
function doGet(e) {
  var page = e.parameter && e.parameter.page ? e.parameter.page : 'cidadao';
  if (page === 'painel') {
    const accessInfo = checkUserAccess();
    if (accessInfo.hasAccess) {
      const template = HtmlService.createTemplateFromFile('painel');
      template.userEmail = accessInfo.email;
      template.userRole = accessInfo.role;
      return template.evaluate().setTitle('Painel do Atendente');
    } else {
      return HtmlService.createHtmlOutput('<h1>Acesso Negado</h1><p>Você não tem permissão para aceder a esta página. Contacte o administrador do sistema.</p>');
    }
  } else if (page === 'consulta') {
    return HtmlService.createTemplateFromFile('consulta').evaluate().setTitle('Consulta de Protocolo');
  } else {
    return HtmlService.createTemplateFromFile('cidadao').evaluate().setTitle('Análise de Prescrição de Dívida Ativa');
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function checkUserAccess() {
  const userEmail = Session.getEffectiveUser().getEmail();
  if (!userEmail) return { hasAccess: false, email: null, role: null };
  try {
    const accessSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCESS_SHEET_NAME);
    const data = accessSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].trim().toLowerCase() === userEmail.trim().toLowerCase()) {
        return { hasAccess: true, email: userEmail, role: data[i][1].trim() };
      }
    }
    return { hasAccess: false, email: userEmail, role: null };
  } catch (e) {
    Logger.log('Erro ao verificar acesso para ' + userEmail + ': ' + e.message);
    return { hasAccess: false, email: userEmail, role: null };
  }
}

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

function submitForm(formObject) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
    if (!sheet) {
      throw new Error(`A planilha com o nome "${REQUESTS_SHEET_NAME}" não foi encontrada.`);
    }
    const lastRow = sheet.getLastRow();
    const nextNumber = lastRow;
    const protocolo = `PGE-PRESC-2024-${String(nextNumber).padStart(4, '0')}`;
    let driveFolder = getOrCreateFolder(DRIVE_FOLDER_NAME);
    let submissionFolder = driveFolder.createFolder(`${protocolo} - ${formObject.nome}`);
    for (let key in formObject) {
      if (key.startsWith('doc_') && formObject[key] && typeof formObject[key].getName === 'function') {
        let fileBlob = formObject[key];
        submissionFolder.createFile(fileBlob);
      }
    }
    const folderUrl = submissionFolder.getUrl();
    const cdas = Array.isArray(formObject['cda[]']) ? formObject['cda[]'].join(', ') : formObject['cda[]'];
    const newRow = [
      protocolo, new Date(), formObject.nome, formObject.email, formObject.telefone,
      formObject.tipo, cdas, folderUrl, 'Novo', '', `Pedido criado em ${new Date().toLocaleString()}`, ''
    ];
    sheet.appendRow(newRow);
    // ***** NOVO: Enviar email de confirmação *****
    sendConfirmationEmail(protocolo, formObject.email, formObject.nome);
    return { protocolo: protocolo };
  } catch (error) {
    Logger.log(error.toString());
    return { erro: error.toString() };
  }
}

/**
 * Envia um email de confirmação para o cidadão com o número do protocolo.
 */
function sendConfirmationEmail(protocolo, destinatario, nome) {
  const assunto = `Confirmação de Recebimento - Protocolo ${protocolo}`;
  const corpo = `
    <p>Prezado(a) ${nome},</p>
    <p>A sua solicitação de Análise de Prescrição de Dívida Ativa foi recebida com sucesso.</p>
    <p>O seu número de protocolo é: <strong>${protocolo}</strong></p>
    <p>Guarde este número para futuras consultas sobre o andamento do seu pedido.</p>
    <p>Atenciosamente,<br>
    Procuradoria-Geral do Estado do Pará</p>
  `;
  try {
    MailApp.sendEmail({
      to: destinatario,
      subject: assunto,
      htmlBody: corpo
    });
    Logger.log(`Email de confirmação enviado para ${destinatario} para o protocolo ${protocolo}.`);
  } catch (e) {
    Logger.log(`Falha ao enviar email para ${destinatario}. Erro: ${e.message}`);
  }
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

function consultarProtocolo(protocolo) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === protocolo) {
      return {
        protocolo: data[i][0], data: data[i][1].toLocaleString(), nome: data[i][2],
        email: data[i][3], telefone: data[i][4], tipo: data[i][5], cdas: data[i][6],
        linkDocumentos: data[i][7], status: data[i][8], atendente: data[i][9], historico: data[i][10]
      };
    }
  }
  return { erro: 'Protocolo não encontrado.' };
}

function getRequests() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.map(row => ({
    protocolo: row[0], data: row[1].toLocaleString(), nome: row[2], status: row[8]
  }));
}

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
      sheet.getRange(row, 9).setValue(status);
      sheet.getRange(row, 10).setValue(atendente);
      const oldHistorico = sheet.getRange(row, 11).getValue();
      const newHistoricoEntry = `\n${new Date().toLocaleString()} - ${atendente}: ${historico}`;
      sheet.getRange(row, 11).setValue(oldHistorico + newHistoricoEntry);
      if (status === 'Deferido' || status === 'Indeferido') {
        sheet.getRange(row, 12).setValue(new Date());
      }
      return true;
    }
  }
  return false;
}
