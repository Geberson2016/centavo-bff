# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## ⚠️ Leia o AGENTS.md primeiro: ele é obrigatório

**O [`AGENTS.md`](./AGENTS.md) é o regramento obrigatório.** Versão curta:

0. **Idioma**: inglês só no código e nas configs; comentários, commits e docs em português.
1. **Sem regra de negócio**: o BFF encaminha, agrega e adapta. Regra de domínio fica no Spring.
2. **Contrato**: tipos/client do Spring gerados do `openapi.yaml` do `centavo-backend`. Os `code` de erro RFC 7807 passam sem tradução.
3. **Config via env** validada em `src/config.ts`; sem segredos no git.
4. **TS strict, sem `any`**.

## Visão geral

BFF do Centavo em Fastify 5 + TypeScript (ESM, Node 24). Fica entre a UI (`centavo-frontend`) e a API Spring (`centavo-backend`). Por enquanto (C14) só expõe o `/health`. O encaminhamento para o Spring entra no C15 e a sessão em cookie no C16 (ver `../docs/planos/plano-evolucao.md`).

## Comandos

```bash
npm run dev        # tsx em watch; lê .env se existir (porta padrão 3000)
npm test           # Vitest
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # tsc → dist/
npm start          # roda o build (node dist/server.js)
```

## Convenções

- Imports relativos com extensão `.ts`. O `tsc` reescreve para `.js` no build (`rewriteRelativeImportExtensions`).
- Rota nova: plugin em `src/routes/`, registrado no `buildApp`, com teste via `app.inject()` em `test/`.
- Prettier: aspas simples, ponto e vírgula, 2 espaços, trailing commas es5 (o mesmo do frontend).
- Ambiente local: a API Spring sobe pelo `docker compose` em `~/Projects/Centavo` (`localhost:8090`); o front roda em `localhost:5173`.
