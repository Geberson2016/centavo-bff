# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## ⚠️ Leia o AGENTS.md primeiro: ele é obrigatório

**O [`AGENTS.md`](./AGENTS.md) é o regramento obrigatório.** Versão curta:

0. **Idioma**: inglês só no código e nas configs; comentários, commits e docs em português.
1. **Sem regra de negócio**: o BFF encaminha, agrega e adapta. Regra de domínio fica no Spring.
2. **Contrato**: o `openapi.yaml` da raiz descreve as rotas `/bff/*` (FE↔BFF); o client do Spring é gerado da cópia `contracts/backend.openapi.yaml`. Os `code` de erro RFC 7807 passam sem tradução.
3. **Config via env** validada em `src/config.ts`; sem segredos no git.
4. **TS strict, sem `any`**.

## Visão geral

BFF do Centavo em Fastify 5 + TypeScript (ESM, Node 24). Fica entre a UI (`centavo-frontend`) e a API Spring (`centavo-backend`). Expõe em `/bff/*` só o que a UI usa, repassando ao Spring, mais o `/health`. A autenticação é por sessão em cookie cifrado (`/bff/session`: login, usuário atual e logout); o JWT do Spring fica dentro do cookie e nunca vai para o browser (ver AGENTS.md §1.5 e `../docs/planos/plano-evolucao.md`).

## Comandos

```bash
npm run dev        # tsx em watch; lê o .env (precisa de SESSION_KEY; porta padrão 3000)
npm test           # Vitest
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # tsc → dist/
npm start          # roda o build (node dist/server.js)
npm run contract:sync  # copia o openapi.yaml do backend para contracts/ (outro caminho: env BACKEND_SPEC)
npm run api:generate   # gera src/backend/schema.ts (Spring) e src/contract/schema.ts (BFF)
npm run api:check      # sync + generate e falha se algo versionado ficou desatualizado
```

## Fluxo de uma rota

1. Descreva a rota no `openapi.yaml` (schemas do Spring via `$ref` para `./contracts/backend.openapi.yaml`) e rode `npm run api:generate`.
2. Implemente em `src/routes/`: chame o Spring com `app.backend.GET/POST(...)` (openapi-fetch tipado), passe o resultado no `unwrap()` e use `forwardAuth(request)` nas rotas autenticadas. Ele lê o JWT da sessão e lança 401 se não houver sessão.
3. Erros não são tratados na rota. O `unwrap()` lança `UpstreamResponseError`, que o error handler (`src/http/error-handler.ts`) repassa com o status, o content-type e o corpo do Spring. Falha de rede ou timeout vira `502 UPSTREAM_UNAVAILABLE`.
4. O `test/contract.test.ts` falha se uma operação do `openapi.yaml` não tiver rota registrada. Teste a rota em `test/routes.test.ts` contra o Spring falso (`startFakeBackend`), usando `loginCookie(app)` para obter a sessão.

## Convenções

- Imports relativos com extensão `.ts`. O `tsc` reescreve para `.js` no build (`rewriteRelativeImportExtensions`).
- Rota nova: plugin em `src/routes/`, registrado no `buildApp`, com teste via `app.inject()` em `test/`.
- Arquivos gerados (`src/*/schema.ts`) e `contracts/` nunca são editados à mão e ficam fora do Prettier e do ESLint.
- Prettier: aspas simples, ponto e vírgula, 2 espaços, trailing commas es5 (o mesmo do frontend).
- Ambiente local: a API Spring sobe pelo `docker compose` em `~/Projects/Centavo` (`localhost:8090`); o front roda em `localhost:5173`.
