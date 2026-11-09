# centavo-bff

BFF (_backend for frontend_) do Centavo: fica entre a UI React e a API Spring Boot.

```
React (Vite) → BFF (Fastify) → Spring Boot → Postgres
```

## Rodando

Requer Node 24.

```bash
npm install
cp .env.example .env   # e preencha SESSION_KEY com: openssl rand -hex 32
npm run dev            # http://localhost:3000/health
```

## Configuração

| Variável                | Padrão                  | Descrição                                         |
| ----------------------- | ----------------------- | ------------------------------------------------- |
| `NODE_ENV`              | `development`           | `development`, `test` ou `production`             |
| `HOST`                  | `127.0.0.1`             | Interface de escuta (`0.0.0.0` em container)      |
| `PORT`                  | `3000`                  | Porta HTTP                                        |
| `LOG_LEVEL`             | `info`                  | Nível do pino                                     |
| `BACKEND_URL`           | `http://localhost:8090` | URL base da API Spring                            |
| `BACKEND_TIMEOUT_MS`    | `10000`                 | Timeout de cada chamada ao Spring (estourou: 502) |
| `SESSION_KEY`           | — (obrigatória)         | Chave do cookie de sessão: 32 bytes em hex        |
| `SESSION_COOKIE_SECURE` | `true` só em produção   | Cookie só por HTTPS                               |

Contrato das rotas `/bff/*`: [`openapi.yaml`](./openapi.yaml). Regras do repositório: [`AGENTS.md`](./AGENTS.md).
