# FilaFlow

Base full-stack para filas digitais multiempresa. O foco desta etapa é segurança, isolamento de dados e uma estrutura simples para a evolução do produto.

## Stack

- Next.js, React e TypeScript no frontend
- NestJS, Prisma e PostgreSQL no backend
- Docker Compose para execução local

## Executar localmente

1. Copie `.env.example` para `.env` e defina uma senha local.
2. Execute `docker compose up --build`.
3. Acesse `http://localhost:3000`; a API responde em `http://localhost:3001/api/v1/health`.

Para executar sem Docker, instale as dependências em cada app, copie seus respectivos `.env.example` e execute `npm run prisma:generate --prefix backend`, `npm run prisma:migrate --prefix backend`, `npm run dev --prefix backend` e `npm run dev --prefix frontend`.

## Arquitetura e segurança

O backend usa controllers finos, serviços de aplicação e Prisma como infraestrutura. Cada sessão carrega a organização e o papel autorizados no servidor; nenhum `organizationId` recebido do cliente decide acesso. Consultas protegidas filtram recursos pela organização da sessão.

A autenticação usa senha com Argon2id e cookies de sessão opacos, `HttpOnly`, `SameSite=Strict` e `Secure` em produção. Só o hash SHA-256 do token aleatório é persistido. Renovação rotaciona o token, logout o invalida, mutações autenticadas exigem CSRF de dupla submissão e login possui limite de requisições e atraso controlado em falhas.

Helmet, CSP, CORS por allowlist, limite global de requisições, limite do body do Express, validação com whitelist e erros sem detalhes internos complementam a proteção. Swagger existe apenas fora de produção.

## Limites atuais

Esta fundação não inclui entrada de clientes, chamada de próximos, WebSockets, pagamentos, mensagens, uploads ou relatórios. Esses fluxos devem manter o isolamento multiempresa e ampliar a cobertura de integração contra um PostgreSQL exclusivo de teste.
