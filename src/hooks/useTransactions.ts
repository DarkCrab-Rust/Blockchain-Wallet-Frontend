import { useQuery, useQueryClient } from '@tanstack/react-query';
import { walletService } from '../services/api';
import { eventBus } from '../utils/eventBus';
import type { Transaction } from '../types';

export type UseTransactionsParams = {
  walletName: string | undefined;
  network: string | undefined;
  autoRefresh?: boolean;
  pageVisible?: boolean;
};

export function useTransactions({ walletName, network, autoRefresh = false, pageVisible = true }: UseTransactionsParams) {
  const queryClient = useQueryClient();
  const key = ['history', walletName || '', network || ''];
  const q = useQuery<Transaction[], Error>({
    queryKey: key,
    enabled: !!walletName,
    queryFn: async ({ signal }) => {
      try {
        const res = await walletService.getTransactionHistory(String(walletName), network, { signal });
        return Array.isArray(res?.transactions) ? res.transactions : [];
      } catch (err: any) {
        const status = err?.response?.status as number | undefined;
        eventBus.emitApiError({
          title: '获取交易历史失败',
          message: err?.message || '无法获取交易历史',
          category: status && status >= 500 ? 'server_error' : 'network',
          endpoint: 'wallets.history',
          friendlyMessage: '无法获取交易历史，稍后重试或检查后端服务',
          userAction: '检查网络/后端配置，或启用 Mock 后端',
          errorContext: err,
          severity: status && status >= 500 ? 'critical' : 'medium',
        });
        throw err;
      }
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (prev) => prev ?? [],
    refetchInterval: autoRefresh && pageVisible ? 60_000 : false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  return { ...q, invalidate };
}