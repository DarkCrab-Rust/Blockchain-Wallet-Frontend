import React from 'react';
import { Box, Tabs, Tab, Skeleton, Typography } from '@mui/material';
import CandlestickChart, { CandleDatum } from '../../../components/CandlestickChart';
import TradingViewWidget from '../../../components/TradingViewWidget';
import DepthChart from '../../../components/DepthChart';

type Props = {
  candles: CandleDatum[];
  height?: number;
  tab: 'kline' | 'depth';
  setTab: (t: 'kline' | 'depth') => void;
  interval: string;
  setInterval: (i: string) => void;
  chartEngine: 'local' | 'tv';
  symbol: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  tvStudies?: string[];
};

const ChartPanel: React.FC<Props> = ({ candles, height = 320, tab, setTab, interval, setInterval, chartEngine, symbol, bids, asks, tvStudies }) => {
  return (
    <Box role="region" aria-label="行情图表">
      <Tabs
        value={tab}
        aria-label="图表类型切换"
        onChange={(_, v) => setTab(v)}
      >
        <Tab label="K线" value="kline" aria-label="K线图" />
        <Tab label="深度" value="depth" aria-label="深度图" />
      </Tabs>

      <Tabs
        value={interval}
        aria-label="时间周期切换"
        onChange={(_, v) => setInterval(v)}
        sx={{ mt: 1 }}
      >
        <Tab label="1m" value="1m" />
        <Tab label="5m" value="5m" />
        <Tab label="1h" value="1h" />
        <Tab label="1d" value="1d" />
      </Tabs>

      <Box mt={1} sx={{ height }}>
        {chartEngine === 'tv' ? (
          <TradingViewWidget
            symbol={(symbol === 'BTC/USDT' ? 'BINANCE:BTCUSDT' : symbol === 'ETH/USDT' ? 'BINANCE:ETHUSDT' : 'BINANCE:USDCUSDT')}
            interval={interval}
            studies={tvStudies || []}
            height={height}
          />
        ) : tab === 'kline' ? (
          candles.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Skeleton variant="rectangular" height={(height || 320) - 16} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                暂无K线数据，切换时间周期试试~
              </Typography>
            </Box>
          ) : (
            <CandlestickChart data={candles} height={height} />
          )
        ) : (
          <DepthChart bids={bids} asks={asks} height={height} />
        )}
      </Box>
    </Box>
  );
};

export default ChartPanel;