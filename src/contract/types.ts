// Nomes curtos para os schemas do contrato do BFF (src/contract/schema.ts, gerado).
import type { components } from './schema.ts';

type Schemas = components['schemas'];

export type UserRequest = Schemas['UserRequest'];
export type AuthRequest = Schemas['AuthRequest'];
export type AccountRequest = Schemas['AccountRequest'];
export type CategoryRequest = Schemas['CategoryRequest'];
export type TransactionRequest = Schemas['TransactionRequest'];
export type DashboardView = Schemas['DashboardView'];
export type SessionUser = Schemas['SessionUser'];
