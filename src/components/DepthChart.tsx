import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export interface Level { price: number; size: number; }

interface Props {
  bids: Level[];
  asks: Level[];
  height?: number;
}

const DepthChart: React.FC<Props> = ({ bids, asks, height = 300 }) => {
  const data = useMemo(() => {
    const sortedBids = [...bids].sort((a, b) => a.price - b.price);
    const sortedAsks = [...asks].sort((a, b) => a.price - b.price);
    let cum = 0;
    const bidSeries = sortedBids.map((l) => {
      cum += l.size;
      return { price: l.price, bidCum: Number(cum.toFixed(6)), askCum: 0 };
    });
    cum = 0;
    const askSeries = sortedAsks.map((l) => {
      cum += l.size;
      return { price: l.price, bidCum: 0, askCum: Number(cum.toFixed(6)) };
    });
    const merged = [...bidSeries, ...askSeries].sort((a, b) => a.price - b.price);
    return merged;
  }, [bids, asks]);

  return (
    <div style={{ height }} aria-label="深度图">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="price" />
          <YAxis domain={[0, 'auto']} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="bidCum" stroke="#22c55e" fill="#22c55e" name="买盘累计" />
          <Area type="monotone" dataKey="askCum" stroke="#ef4444" fill="#ef4444" name="卖盘累计" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DepthChart;