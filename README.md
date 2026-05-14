# Lâminas UMC

Sistema MVC multi-page para cadastro, consulta e comparação de lâminas veterinárias.

## Paginas

- `index.html` / `login.html`
- `register.html`
- `home.html`
- `upload.html`
- `compare.html`
- `admin.html`
- `species.html`
- `anatomy.html`

## Backend e Autenticação

O projeto usa uma API Node.js/Express em `server/server.js` para:

- enviar código de confirmação por e-mail antes do cadastro;
- validar o código recebido antes de criar a conta;
- salvar usuários com senha protegida por bcrypt;
- autenticar login com token;
- listar, aprovar e rejeitar solicitações pendentes;
- liberar permissões específicas para alunos;
- gravar espécies, raças, lesões de órgão, lesões ósseas, lâminas, imagens e vínculos de comparação no MySQL.

Para o código chegar no e-mail do usuário, configure `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` no `.env`. Também são aceitas as variáveis `GMAIL_USER` e `GMAIL_APP_PASS` para contas Gmail.

Conta admin inicial:

```txt
E-mail: admin@umc.br
Senha: admin
```

## Banco de dados

Importe `database/laminas_umc.sql` no MySQL, ajuste as variáveis do `.env` e inicie:

```bash
npm install
npm run dev
```

Depois acesse `http://localhost:3000/login.html`.
