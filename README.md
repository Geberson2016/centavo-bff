# centavo-bff

BFF (_backend for frontend_) do Centavo: fica entre a UI React e a API Spring Boot.

```
React (Vite) → BFF (Fastify) → Spring Boot → Postgres
```

## Rodando

Requer Node 24.

```bash
npm install
cp .env.example .env   # opcional: todas as variáveis têm padrão
npm run dev            # http://localhost:3000/health
```

## Configuração

| Variável      | Padrão                  | Descrição                                    |
| ------------- | ----------------------- | -------------------------------------------- |
| `NODE_ENV`    | `development`           | `development`, `test` ou `production`        |
| `HOST`        | `127.0.0.1`             | Interface de escuta (`0.0.0.0` em container) |
| `PORT`        | `3000`                  | Porta HTTP                                   |
| `LOG_LEVEL`   | `info`                  | Nível do pino                                |
| `BACKEND_URL` | `http://localhost:8090` | URL base da API Spring                       |

Regras do repositório: [`AGENTS.md`](./AGENTS.md).
