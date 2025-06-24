const SHEET_ID = '1Cnb-tqz1b5uvaW4rK3rlGjlYW3QJGEaz9sKPXCzEcxY';
const REQUESTS_SHEET_NAME = 'Pedidos Prescrição';
const ACCESS_SHEET_NAME = 'Acessos';

/**
 * Função principal que serve o painel do atendente.
 */
function doGet(e) {
  const accessInfo = checkUserAccess();
  // Mostra sempre o email detectado, mesmo se não tiver acesso
  if (accessInfo.hasAccess) {
    const template = HtmlService.createTemplateFromFile('painel');
    template.userName = accessInfo.nome;
    template.userEmail = accessInfo.email;
    template.userRole = accessInfo.role;
    return template.evaluate().setTitle('Painel do Atendente');
  } else {
    return HtmlService.createHtmlOutput(
      '<h1>Acesso Negado</h1><p>O seu email (<strong>' + 
      (accessInfo.email || 'Não identificado') + 
      '</strong>) não tem permissão para aceder a esta página. Por favor, contacte o administrador do sistema.</p>'
    );
  }
}

/**
 * Verifica se o utilizador atual tem acesso ao sistema.
 */
function checkUserAccess() {
  const userEmail = Session.getEffectiveUser().getEmail();
  if (!userEmail) return { hasAccess: false, nome: null, email: null, role: null };
  try {
    const accessSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCESS_SHEET_NAME);
    const data = accessSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1].trim().toLowerCase() === userEmail.trim().toLowerCase()) {
        return { hasAccess: true, nome: data[i][0], email: userEmail, role: data[i][2].trim() };
      }
    }
    return { hasAccess: false, nome: null, email: userEmail, role: null };
  } catch (e) {
    Logger.log('Erro ao verificar acesso para ' + userEmail + ': ' + e.message);
    return { hasAccess: false, nome: null, email: userEmail, role: null };
  }
}

/**
 * Retorna todos os pedidos para o painel.
 */
function getRequests() {
  const accessInfo = checkUserAccess();
  if (!accessInfo.hasAccess) throw new Error('Acesso não autorizado.');
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  data.shift(); // remove cabeçalho
  return data.map(row => ({
    protocolo: row[0],
    data: row[1].toLocaleString(),
    nome: row[2],
    status: row[8]
  }));
}

/**
 * Consulta TODOS os detalhes de um protocolo para o atendente.
 */
function consultarProtocoloCompleto(protocolo) {
  const accessInfo = checkUserAccess();
  if (!accessInfo.hasAccess) throw new Error('Acesso não autorizado.');
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === protocolo) {
      return {
        protocolo: data[i][0], data: data[i][1].toLocaleString(), nome: data[i][2],
        email: data[i][3], telefone: data[i][4], tipo: data[i][5], cdas: data[i][6],
        linkDocumentos: data[i][7], status: data[i][8], atendente: data[i][9], historico: data[i][10],
        attusSaj: data[i][12] // NOVO: Lê da coluna M (índice 12)
      };
    }
  }
  return { erro: 'Protocolo não encontrado.' };
}

/**
 * Atualiza o status de um pedido.
 */
function updateStatus(protocolo, status, historico, attusSaj) {
  const accessInfo = checkUserAccess();
  if (!accessInfo.hasAccess) throw new Error('Acesso negado para esta operação.');
  const atendente = accessInfo.nome;
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REQUESTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === protocolo) {
      const row = i + 1;
      const nomeContribuinte = data[i][2];
      const emailContribuinte = data[i][3];
      const statusAntigo = data[i][8];
      sheet.getRange(row, 9).setValue(status);
      sheet.getRange(row, 10).setValue(atendente);
      const oldHistorico = sheet.getRange(row, 11).getValue();
      const newHistoricoEntry = `\n${new Date().toLocaleString()} - ${atendente}: ${historico}`;
      sheet.getRange(row, 11).setValue(oldHistorico + newHistoricoEntry);
      sheet.getRange(row, 13).setValue(attusSaj); // NOVO: Salva o número do processo na coluna M
      if (status === 'Deferido' || status === 'Indeferido') {
        sheet.getRange(row, 12).setValue(new Date());
      }
      if (status !== statusAntigo) {
        sendStatusUpdateEmail(protocolo, nomeContribuinte, emailContribuinte, status, historico);
      }
      return true;
    }
  }
  return false;
}

/**
 * Envia um e-mail de notificação ao contribuinte sobre a atualização do status do protocolo.
 */
function sendStatusUpdateEmail(protocolo, nomeContribuinte, emailContribuinte, novoStatus, observacao) {
  try {
    const assunto = `Atualização do seu Protocolo: ${protocolo}`;
    const corpo = `
      <p>Prezado(a) ${nomeContribuinte},</p>
      <p>Houve uma atualização no seu pedido de Análise de Prescrição (protocolo <strong>${protocolo}</strong>).</p>
      <p><strong>Novo Status:</strong> ${novoStatus}</p>
      <p><strong>Observação do Atendente:</strong><br/>
      <i>${observacao}</i></p>
      <p>Você pode consultar o seu pedido a qualquer momento.</p>
      <p>Atenciosamente,<br>
      Equipe de Atendimento</p>
    `;
    MailApp.sendEmail({
      to: emailContribuinte,
      subject: assunto,
      htmlBody: corpo
    });
    Logger.log(`Email de atualização enviado para ${emailContribuinte} sobre o protocolo ${protocolo}.`);
  } catch (e) {
    Logger.log(`Falha ao enviar email de atualização para ${emailContribuinte}. Erro: ${e.message}`);
  }
}

/**
 * Retorna a lista de utilizadores.
 */
function getUsers() {
  const accessInfo = checkUserAccess();
  if (!accessInfo.hasAccess || accessInfo.role !== 'admin') {
    throw new Error('Acesso negado.');
  }
  const accessSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCESS_SHEET_NAME);
  const data = accessSheet.getDataRange().getValues();
  data.shift();
  return data.map(row => ({ nome: row[0], email: row[1], role: row[2] }));
}

/**
 * Adiciona ou atualiza um utilizador.
 */
function addOrUpdateUser(nome, email, role) {
  const accessInfo = checkUserAccess();
  if (!accessInfo.hasAccess || accessInfo.role !== 'admin') {
    throw new Error('Acesso negado.');
  }
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCESS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toLowerCase() === email.toLowerCase()) {
      sheet.getRange(i + 1, 1).setValue(nome);
      sheet.getRange(i + 1, 3).setValue(role);
      return { status: 'success', message: 'Utilizador atualizado.' };
    }
  }
  sheet.appendRow([nome, email, role]);
  return { status: 'success', message: 'Utilizador adicionado.' };
}

/**
 * Remove um utilizador.
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
    if (data[i][1].toLowerCase() === email.toLowerCase()) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Utilizador removido.' };
    }
  }
  throw new Error('Utilizador não encontrado.');
}