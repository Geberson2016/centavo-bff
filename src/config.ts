import { z } from 'zod';

// Configuração do BFF, lida só de variáveis de ambiente (AGENTS.md §1.5).
// Valida no boot: config inválida derruba o processo com a lista de problemas,
// em vez de falhar mais tarde no meio de uma request.
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // Local só escuta no loopback; em container defina HOST=0.0.0.0.
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  // URL base da API Spring (sem o /api/v1), consumida a partir do C15.
  BACKEND_URL: z.url().default('http://localhost:8090'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
