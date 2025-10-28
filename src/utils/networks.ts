import { getFeatureFlags } from './featureFlags';

export type NetworkOption = { id: string; name: string };

const BASE_NETWORKS: NetworkOption[] = [
  { id: 'eth', name: 'Ethereum' },
  { id: 'bsc', name: 'BSC' },
  { id: 'polygon', name: 'Polygon' },
];

const OPTIONAL_NETWORKS: NetworkOption[] = [
  { id: 'solana', name: 'Solana' },
  { id: 'btc', name: 'Bitcoin (Taproot)' },
];

export const getAvailableNetworks = (): NetworkOption[] => {
  const flags = getFeatureFlags();
  const include: string[] = [];
  if (flags.enableSolana) include.push('solana');
  if (flags.enableBtcTaproot) include.push('btc');
  const optional = OPTIONAL_NETWORKS.filter((n) => include.includes(n.id));
  return [...BASE_NETWORKS, ...optional];
};