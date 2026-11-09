# AGENTS.md — Centavo BFF

**Este arquivo é o regramento obrigatório deste repositório.** Todo código (escrito por humano ou agente) precisa cumpri-lo. O `CLAUDE.md` é o guia de operação do Claude Code e aponta para cá. Os `AGENTS.md` irmãos em `centavo-backend` e `centavo-frontend` têm as mesmas convenções compartilhadas (§0 e §1). Mantenha essas seções sincronizadas.

O Centavo é um app de finanças pessoais: **React (Vite) → BFF (Node/TS) → Spring Boot → Postgres**. Este repositório é o **BFF** (_backend for frontend_): a única porta de entrada da UI. Ele não tem regra de negócio.

---

## 0. Política de idioma (obrigatória em todo o projeto)

- **Inglês**: APENAS o código (identificadores de variáveis, funções, tipos, rotas) e as configurações técnicas (nomes de variáveis de `.env`, chaves de `docker-compose`, paths/`operationId`/schemas do OpenAPI).
- **Português**: TODO o resto do texto humano: comentários, mensagens de commit, `AGENTS.md`, `CLAUDE.md`, `README`, ADRs e documentos de planejamento.
- Commits seguem Conventional Commits: prefixo técnico (`feat:`, `fix:`, `chore:`…) e texto em português.
- Os **documentos de planejamento** ficam em `Centavo/docs/planos/` (repositório `centavo-docs`, irmão deste), por serem cross-repo.

---

## 1. Convenções inegociáveis

Uma mudança que viole qualquer uma delas não está "pronta".

### 1.1 Sem regra de negócio

O BFF **encaminha, agrega e adapta**. Ele monta view-models para a UI, junta chamadas e cuida da sessão. Toda regra de domínio (validação de negócio, cálculo, permissão sobre dados) fica no Spring. Se uma regra parece precisar morar aqui, ela vai para o backend.

### 1.2 Contrato

- O contrato com o Spring é o `openapi.yaml` do `centavo-backend` (`src/main/resources/openapi.yaml`). O client e os tipos para chamar o Spring são **gerados** dele, não escritos à mão (a partir do C15).
- Erros do Spring chegam como RFC 7807 com `code` estável. O BFF **repassa o `code`** sem traduzir: quem resolve a mensagem localizada é o frontend.
- Endpoints que o BFF expõe para a UI também são descritos em OpenAPI.

### 1.3 Configuração e segredos

- Tudo vem de variáveis de ambiente, validadas no boot em `src/config.ts` (zod). Config inválida derruba o processo na subida.
- O `.env.example` é versionado. O `.env` com valores reais nunca entra no git.

### 1.4 Type safety

TypeScript `strict`, sem `any`. Dados externos (env, respostas do Spring, corpo de request) passam por validação ou por tipos gerados antes de serem usados. Dinheiro nunca é manipulado como `float`: é repassado como veio do Spring.

### 1.5 Segurança da sessão (C16+)

A sessão vai em cookie `httpOnly`, `Secure` e `SameSite`. O JWT do Spring nunca chega ao browser.

### 1.6 Definition of Done

- [ ] Código em inglês; comentários e docs em português.
- [ ] Sem regra de negócio; tipos do Spring gerados a partir do `openapi.yaml`.
- [ ] Config nova entra no `src/config.ts` e no `.env.example`.
- [ ] `npm run typecheck`, `npm run lint` e `npm test` passam.
- [ ] Rota nova tem teste com `app.inject()`.
- [ ] Commit em Conventional Commits, texto em português.

---

## 2. Arquitetura

```
src/
  config.ts        lê e valida o env (zod) → Config tipada
  app.ts           buildApp(config): monta o Fastify sem listen (usado pelos testes)
  server.ts        ponto de entrada: loadConfig → buildApp → listen + encerramento gracioso
  routes/          um plugin Fastify por grupo de rotas
test/              Vitest; rotas testadas com app.inject(), sem abrir porta
```

- **Fastify 5** em ESM e TypeScript. Em dev roda com `tsx`; o build é `tsc` para `dist/`.
- **Logs**: pino, nativo do Fastify. Em dev usa `pino-pretty`; em produção, JSON.
- **Plugins**: cada grupo de rotas é um `FastifyPluginAsync` registrado no `buildApp`. A config chega via `app.config` (decorator).
