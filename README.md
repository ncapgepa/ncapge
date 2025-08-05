# SisNCA Completo

Este projeto reúne três módulos principais, cada um com funcionalidades específicas para o gerenciamento de atendimentos, integração com cidadãos e automação de e-mails via Google Apps Script.

## Estrutura do Projeto

- **Atendimento/**: Responsável pelo gerenciamento de atendimentos, incluindo interface e lógica de controle.
  - `src/appsscript.json`: Configurações do projeto Apps Script.
  - `src/Code.js`: Código principal do script de atendimento.
  - `src/painel.html`: Interface do painel de atendimento.

- **Cidadao/**: Voltado para a interação com cidadãos, consultas e funcionalidades relacionadas.
  - `src/appsscript.json`: Configurações do projeto Apps Script.
  - `src/Código.js`: Código principal do módulo cidadão.
  - `src/cidadao.html`: Interface do cidadão.
  - `src/consulta.html`: Interface de consulta.
  - `VERSOES.md`: Histórico de versões do módulo cidadão.

- **Email/**: Automatiza o envio de e-mails e integra com planilhas Google via Apps Script.
  - `src/appsscript.json`: Configurações do projeto Apps Script.
  - `src/Código.js`: Código principal do script de envio de e-mails.

Cada módulo está em uma pasta separada e pode ser desenvolvido de forma independente.

## Como clonar e configurar o projeto

1. Clone o repositório principal:
   ```powershell
   git clone https://github.com/ncapgepa/sisnca.git
   ```

2. Não há mais submódulos. Todo o código está neste repositório.

## Manual de Instruções

### 1. Estrutura de Pastas
- Os arquivos principais de cada módulo estão na pasta `src/` de cada subdiretório.

### 2. Email (Google Apps Script)
- Para editar ou publicar o módulo Email, utilize o [clasp](https://github.com/google/clasp) para sincronizar com o Google Apps Script.
- Exemplo de clonagem:
  ```powershell
  clasp clone <scriptId> --rootDir Email/src
  ```
  Substitua `<scriptId>` pelo ID do script correspondente.

#### Permissões necessárias para o Email
O projeto utiliza as seguintes permissões:
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/script.send_mail`
- `https://www.googleapis.com/auth/script.container.ui`

- O projeto está configurado para rodar na timezone America/Sao_Paulo.
- O acesso ao webapp está liberado para qualquer usuário anônimo.

### 3. Recomendações Gerais
- Consulte este README para instruções detalhadas de uso e configuração.
- Para dúvidas ou problemas, entre em contato com o responsável pelo projeto.

---

Este manual serve como guia rápido para instalação, configuração e uso dos módulos do SisNCA Completo.
