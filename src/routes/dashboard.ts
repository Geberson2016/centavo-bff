import type { FastifyPluginAsync } from 'fastify';
import type { DashboardView } from '../contract/types.ts';
import { forwardAuth, unwrap } from '../http/upstream.ts';

// View-model da tela inicial: três chamadas ao Spring em paralelo, uma ida e volta
// para a UI. Só agrega — nenhum cálculo novo (AGENTS.md §1.1).
export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/bff/dashboard', async (request): Promise<DashboardView> => {
    const auth = forwardAuth(request);
    const [summary, recentTransactions, accounts] = await Promise.all([
      app.backend.GET('/api/v1/dashboard/summary', auth),
      app.backend.GET('/api/v1/transactions/recent', auth),
      app.backend.GET('/api/v1/accounts/accountSummary', auth),
    ]);

    return {
      summary: unwrap(summary),
      recentTransactions: unwrap(recentTransactions),
      accounts: unwrap(accounts),
    };
  });
};
