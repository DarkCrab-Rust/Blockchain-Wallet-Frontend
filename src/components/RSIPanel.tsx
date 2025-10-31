import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ReferenceLine,
} from 'recharts';

export interface CandleDatum {
  time: number;
  close: number;
  rsi14?: number;
}

export const RSIPanel: React.FC<{ data: CandleDatum[]; height?: number }> = ({ data, height = 120 }) => {
  const showRSI = data.some(d => typeof d.rsi14 === 'number');
  const series = showRSI
    ? data
    : data.map((d, i, arr) => ({ ...d, rsi14: undefined }));

  return (
    <div style={{ height }} aria-label="RSI指标">
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
          <YAxis domain={[0, 100]} ticks={[0, 30, 50, 70, 100]} />
          <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleTimeString()} />
          <Legend />
          <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="3 3" />
          {showRSI && (
            <Line type="monotone" dataKey="rsi14" stroke="#0ea5e9" dot={false} name="RSI(14)" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};