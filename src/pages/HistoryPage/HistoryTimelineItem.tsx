import React from 'react';
import { Typography, Box, IconButton, Tooltip } from '@mui/material';
import { TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot } from '@mui/lab';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Transaction } from '../../types';

interface HistoryTimelineItemProps {
  tx: Transaction;
  network: string;
}

const shorten = (s: string) => (s && s.length > 12 ? `${s.slice(0, 6)}...${s.slice(-4)}` : s);
const explorerBase = (net: string) => {
  switch (net) {
    case 'eth':
      return { tx: 'https://etherscan.io/tx/', address: 'https://etherscan.io/address/' };
    case 'polygon':
      return { tx: 'https://polygonscan.com/tx/', address: 'https://polygonscan.com/address/' };
    case 'bsc':
      return { tx: 'https://bscscan.com/tx/', address: 'https://bscscan.com/address/' };
    case 'btc':
      return { tx: 'https://mempool.space/tx/', address: 'https://mempool.space/address/' };
    default:
      return { tx: '#', address: '#' } as any;
  }
};
const statusColor = (status: Transaction['status']) => {
  if (status === 'confirmed') return 'success';
  if (status === 'pending') return 'warning';
  return 'error';
};
const NETWORK_SYMBOL: Record<string, string> = { eth: 'ETH', polygon: 'MATIC', bsc: 'BNB', btc: 'BTC' };

const HistoryTimelineItem: React.FC<HistoryTimelineItemProps> = ({ tx, network }) => {
  const base = explorerBase(network);
  const txUrl = base.tx ? `${base.tx}${tx.id}` : '#';
  const fromUrl = (base.address || base.account) ? `${(base.address || base.account)}${tx.from_address}` : '#';
  const toUrl = (base.address || base.account) ? `${(base.address || base.account)}${tx.to_address}` : '#';
  const copyId = () => {
    try {
      navigator.clipboard.writeText(tx.id);
    } catch {}
  };
  const copyFrom = () => {
    try {
      navigator.clipboard.writeText(tx.from_address);
    } catch {}
  };
  const copyTo = () => {
    try {
      navigator.clipboard.writeText(tx.to_address);
    } catch {}
  };

  return (
    <TimelineItem>
      <TimelineSeparator>
        <TimelineDot color={statusColor(tx.status) as any} />
        <TimelineConnector />
      </TimelineSeparator>
      <TimelineContent>
        <Typography variant="subtitle2" color="textSecondary">
          {new Date(tx.timestamp * 1000).toLocaleString()}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {tx.amount} {NETWORK_SYMBOL[network] || 'ETH'} · {tx.status}
        </Typography>
        {/* 新增字段行：网络、确认数、手续费 */}
        <Box display="flex" alignItems="center" gap={2} mt={0.5}>
          <Typography variant="body2" color="textSecondary">网络：{tx.network || network}</Typography>
          <Typography variant="body2" color="textSecondary">确认数：{typeof tx.confirmations === 'number' ? tx.confirmations : '-'}</Typography>
          <Typography variant="body2" color="textSecondary">手续费：{typeof tx.fee === 'number' ? tx.fee : '-'}</Typography>
        </Box>
        {/* 交易哈希行：复制与打开浏览器 */}
        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
          <Typography variant="body2" color="textSecondary">Tx: {shorten(tx.id)}</Typography>
          <Tooltip title="复制交易ID"><IconButton size="small" onClick={copyId} aria-label="复制交易ID"><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
          <Tooltip title="在区块浏览器查看"><IconButton size="small" component="a" href={txUrl} target="_blank" rel="noopener noreferrer"><OpenInNewIcon fontSize="inherit" /></IconButton></Tooltip>
        </Box>
        {/* 地址行：from -> to，每个提供复制与浏览器链接 */}
        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
          <Typography variant="body2" color="textSecondary">从 {shorten(tx.from_address)}</Typography>
          <Tooltip title="复制地址"><IconButton size="small" onClick={copyFrom} aria-label="复制发起地址"><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
          <Tooltip title="在区块浏览器查看"><IconButton size="small" component="a" href={fromUrl} target="_blank" rel="noopener noreferrer"><OpenInNewIcon fontSize="inherit" /></IconButton></Tooltip>
          <Typography variant="body2" color="textSecondary">到 {shorten(tx.to_address)}</Typography>
          <Tooltip title="复制地址"><IconButton size="small" onClick={copyTo} aria-label="复制接收地址"><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
          <Tooltip title="在区块浏览器查看"><IconButton size="small" component="a" href={toUrl} target="_blank" rel="noopener noreferrer"><OpenInNewIcon fontSize="inherit" /></IconButton></Tooltip>
        </Box>
      </TimelineContent>
    </TimelineItem>
  );
};

export default React.memo(
  HistoryTimelineItem,
  (prev, next) => (
    prev.network === next.network &&
    prev.tx.id === next.tx.id &&
    prev.tx.status === next.tx.status &&
    prev.tx.amount === next.tx.amount &&
    prev.tx.timestamp === next.tx.timestamp &&
    prev.tx.from_address === next.tx.from_address &&
    prev.tx.to_address === next.tx.to_address
  )
);