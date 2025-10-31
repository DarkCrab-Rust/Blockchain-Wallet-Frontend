export type NetworkOption = { id: string; name: string };

// 统一只支持 Bitcoin 与 EVM 生态网络
const NETWORKS: NetworkOption[] = [
  // 按用户要求调整顺序：BTC → ETH → BSC
  { id: 'btc', name: 'Bitcoin (Taproot)' },
  { id: 'eth', name: 'Ethereum' },
  { id: 'bsc', name: 'BSC' },
];

export const getAvailableNetworks = (): NetworkOption[] => {
  return NETWORKS;
};