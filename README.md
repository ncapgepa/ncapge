# SisNCA - Painel do Atendente (Análise de Prescrição de Dívida Ativa)

Este projeto implementa o painel interno para acompanhamento e gestão dos pedidos de análise de prescrição de dívida ativa do Estado do Pará, utilizando Google Apps Script, Google Drive e Google Sheets.

> **Integração:**
> Este painel está interligado ao sistema público [sisnca-cidadao](https://github.com/ncapgepa/sisnca-cidadao), onde os contribuintes realizam suas solicitações e acompanham o andamento dos protocolos.

## Estrutura do Projeto

- **/src**: Contém todos os arquivos do Google Apps Script (backend e interfaces HTML).
- **README.md**: Este arquivo de documentação e controle de versões.

## Como usar

1. **Desenvolvimento Local**
   - Edite os arquivos em `/src`.
   - Mantenha a raiz do repositório limpa para facilitar o deploy no Google Apps Script.

2. **Deploy no Google Apps Script**
   - Copie apenas os arquivos de `/src` para a raiz do projeto Apps Script.
   - Publique como Web App para uso do Painel do Atendente.

## Funcionalidades
- Painel do Atendente: Dashboard, filtros, atualização de status, histórico, gestão de usuários e envio de notificações automáticas por e-mail.
- Integração com Google Drive e Google Sheets.
- Envio assíncrono de e-mails via fila e gatilho para maior confiabilidade.
- Controle de acesso por e-mail e função (admin/usuário).

## Controle de Versões
- **v0.2.0** (24/06/2025): Integração com fila de e-mails, envio assíncrono, melhorias de segurança e interligação com o sisnca-cidadao.
- **v0.1.0** (23/06/2025): Estrutura inicial, interfaces HTML, esqueleto do backend Apps Script.

## Como contribuir
- Faça um fork, crie uma branch e envie um pull request.

## Estrutura da Planilha Google

A planilha utilizada pelo sistema deve conter uma aba chamada **Pedidos Prescrição** com as seguintes colunas:

| Coluna           | Descrição                                                                                                    | Exemplo de Conteúdo                                      |
|------------------|-------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|
| Protocolo        | Gerado automaticamente pelo sistema. Único e não editável.                                                  | PGE-PRESC-2024-0001                                      |
| Timestamp        | Data e hora do envio do formulário. Preenchido automaticamente.                                             | 23/06/2024 14:30:15                                      |
| NomeSolicitante  | Nome do Titular ou Representante Legal.                                                                     | José da Silva                                            |
| Email            | E-mail de contato.                                                                                          | jose.silva@email.com                                     |
| Telefone         | Telefone de contato com DDD.                                                                                | (91) 99999-8888                                          |
| TipoPessoa       | Tipo de pessoa (Pessoa Física, Empresário, Sócio, Procurador).                                              | Pessoa Física                                            |
| CDAs             | Números das CDAs, separados por vírgula.                                                                    | 12345, 67890, 11223                                      |
| LinkDocumentos   | Link para a pasta no Google Drive com os documentos do solicitante.                                         | https://drive.google.com/drive/folders/123xyz...         |
| Status           | Status atual do pedido. Controlado pelo atendente.                                                          | Novo, Em Análise, Pendente, Deferido, Indeferido         |
| AtendenteResp    | Nome do atendente que está com o caso.                                                                      | Maria Souza                                              |
| Historico        | Registros de cada mudança de status e observações internas.                                                 | 24/06: Análise inicial. 25/06: Documentação pendente.    |
| DataEncerramento | Data em que o status foi mudado para Deferido/Indeferido.                                                   | 30/06/2024                                               |

Cada linha representa um pedido único realizado pelo Portal do Cidadão (sisnca-cidadao).  
Os campos são utilizados tanto para acompanhamento pelo solicitante quanto para gestão interna pelo atendente.

## Como acessar as páginas do sistema

Após o deploy como Web App, utilize as seguintes URLs (ajuste conforme o link gerado pelo Apps Script):

- **Painel do Atendente:**
  - URL padrão do Web App (exemplo: `https://script.google.com/macros/s/SEU_ID/exec`)
  - Área restrita para a equipe interna gerenciar e atualizar os pedidos.

> **Importante:**
> O acesso ao Painel do Atendente é restrito por validação de login Google e permissões cadastradas na aba "Acessos" da planilha.

---

**Desenvolvido por ncapgepa**
