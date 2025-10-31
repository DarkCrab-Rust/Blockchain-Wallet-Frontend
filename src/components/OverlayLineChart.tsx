import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export interface OverlayDatum {
  t: number;
  eth?: number;
  bsc?: number;
  predict?: number;
}

interface Props {
  data: OverlayDatum[];
  height?: number;
  showEth?: boolean;
  showBsc?: boolean;
  showPredict?: boolean;
}

const OverlayLineChart: React.FC<Props> = ({ data, height = 240, showEth = true, showBsc = true, showPredict = true }) => {
  return (
    <div style={{ height }} aria-label="多链叠加与AI预测图">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleTimeString()} />
          <Legend />
          {showEth && <Line type="monotone" dataKey="eth" stroke="#6366F1" dot={false} name="ETH" />}
          {showBsc && <Line type="monotone" dataKey="bsc" stroke="#22C55E" dot={false} name="BSC" />}
          {showPredict && <Line type="monotone" dataKey="predict" stroke="#F59E0B" dot={false} strokeDasharray="5 5" name="AI预测" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OverlayLineChart;