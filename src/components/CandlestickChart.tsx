import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Customized
  , Brush
} from 'recharts';

export interface CandleDatum {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
  ema7?: number;
  bbU20?: number;
  bbL20?: number;
  rsi14?: number;
}

interface Props {
  data: CandleDatum[];
  height?: number;
}

const CandlestickChart: React.FC<Props> = ({ data, height = 300 }) => {
  const showSMA = data.some(d => typeof d.sma20 === 'number');
  const showEMA = data.some(d => typeof d.ema7 === 'number');
  const showBB = data.some(d => typeof d.bbU20 === 'number' || typeof d.bbL20 === 'number');
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  const minPrice = React.useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    for (const d of data) {
      min = Math.min(min, d.low);
      if (typeof d.bbL20 === 'number') min = Math.min(min, d.bbL20);
    }
    return Number.isFinite(min) ? min : 0;
  }, [data]);
  const maxPrice = React.useMemo(() => {
    let max = Number.NEGATIVE_INFINITY;
    for (const d of data) {
      max = Math.max(max, d.high);
      if (typeof d.bbU20 === 'number') max = Math.max(max, d.bbU20);
    }
    return Number.isFinite(max) ? max : 1;
  }, [data]);

  const CandleOverlay: React.FC<any> = (chartProps: any) => {
    const margin = { top: 10, right: 16, left: 0, bottom: 0 };
    const width = chartProps.width || 0;
    const height = chartProps.height || 0;
    const innerW = Math.max(0, width - margin.left - margin.right);
    const innerH = Math.max(0, height - margin.top - margin.bottom);
    const left = margin.left;
    const top = margin.top;
    const n = data.length;
    if (!n || innerW <= 0 || innerH <= 0) return null;
    const step = innerW / n;
    const bodyW = Math.max(2, Math.min(18, step * 0.7));
    const yScale = (v: number) => {
      const r = (maxPrice - minPrice) || 1;
      return top + (maxPrice - v) / r * innerH;
    };
    const elements: React.ReactNode[] = [];
    data.forEach((d, i) => {
      const x = left + i * step + step / 2;
      const yHigh = yScale(d.high);
      const yLow = yScale(d.low);
      const yOpen = yScale(d.open);
      const yClose = yScale(d.close);
      const bull = d.close >= d.open;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyBottom = Math.max(yOpen, yClose);
      const bodyH = Math.max(1, bodyBottom - bodyTop);
      const color = bull ? '#16a34a' : '#ef4444';
      // Wick
      elements.push(
        <line key={`w-${i}`} x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
      );
      // Body
      elements.push(
        <rect key={`b-${i}`} x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} opacity={0.85} />
      );
    });
    return <g aria-label="蜡烛叠加">{elements}</g>;
  };

  const CrosshairOverlay: React.FC<any> = (chartProps: any) => {
    const margin = { top: 10, right: 16, left: 0, bottom: 0 };
    const width = chartProps.width || 0;
    const height = chartProps.height || 0;
    const innerW = Math.max(0, width - margin.left - margin.right);
    const innerH = Math.max(0, height - margin.top - margin.bottom);
    const left = margin.left;
    const top = margin.top;
    const n = data.length;
    if (hoverIdx == null || n <= 0 || innerW <= 0 || innerH <= 0) return null;
    const step = innerW / n;
    const x = left + hoverIdx * step + step / 2;
    const yScale = (v: number) => {
      const r = (maxPrice - minPrice) || 1;
      return top + (maxPrice - v) / r * innerH;
    };
    const y = yScale(data[hoverIdx].close);
    const lineColor = '#94a3b8'; // slate-400
    const price = data[hoverIdx].close;
    const labelW = 72; const labelH = 22; const labelX = left + innerW - labelW; const labelY = Math.max(top, Math.min(top + innerH - labelH, y - labelH / 2));
    return (
      <g aria-label="十字光标">
        <line x1={x} x2={x} y1={top} y2={top + innerH} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
        <line x1={left} x2={left + innerW} y1={y} y2={y} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
        {/* 价格标签 */}
        <rect x={labelX} y={labelY} width={labelW} height={labelH} fill="#111827" stroke="#334155" rx={4} ry={4} />
        <text x={labelX + 8} y={labelY + 15} fill="#e5e7eb" fontSize={12}>{price}</text>
      </g>
    );
  };

  return (
    <div style={{ height }} aria-label="K线图(简化)">
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          onMouseMove={(state: any) => {
            if (state && typeof state.activeTooltipIndex === 'number') {
              setHoverIdx(state.activeTooltipIndex);
            }
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
          <YAxis yAxisId="price" domain={[minPrice, maxPrice]} />
          <YAxis yAxisId="vol" orientation="right" domain={[0, 'auto']} />
          <Tooltip
            cursor={false}
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const d = data.find(x => x.time === label) || payload[0].payload;
              return (
                <div style={{ background: 'rgba(17,24,39,0.9)', color: '#e5e7eb', padding: 8, borderRadius: 6, border: '1px solid #334155' }}>
                  <div>时间：{new Date(Number(label)).toLocaleString()}</div>
                  <div>开：{d.open} 高：{d.high} 低：{d.low} 收：{d.close}</div>
                  {typeof d.sma20 === 'number' && <div>SMA(20)：{d.sma20}</div>}
                  {typeof d.ema7 === 'number' && <div>EMA(7)：{d.ema7}</div>}
                  {typeof d.bbU20 === 'number' && typeof d.bbL20 === 'number' && (
                    <div>BB：上 {d.bbU20} 下 {d.bbL20}</div>
                  )}
                  {typeof d.volume === 'number' && <div>量：{d.volume}</div>}
                </div>
              );
            }}
          />
          <Legend />
          {/* 蜡烛叠加（实体+影线），对齐交易所视觉 */}
          <Customized component={CandleOverlay} />
          {/* 十字光标 */}
          <Customized component={CrosshairOverlay} />
          {/* 可选叠加指标线 */}
          <Line yAxisId="price" type="monotone" dataKey="close" stroke="#0ea5e9" dot={false} name="收盘价" />
          {showSMA && (
            <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#f59e0b" dot={false} name="SMA(20)" />
          )}
          {showEMA && (
            <Line yAxisId="price" type="monotone" dataKey="ema7" stroke="#8b5cf6" dot={false} name="EMA(7)" />
          )}
          {showBB && (
            <Line yAxisId="price" type="monotone" dataKey="bbU20" stroke="#22c55e" dot={false} name="BB Upper" strokeDasharray="4 4" />
          )}
          {showBB && (
            <Line yAxisId="price" type="monotone" dataKey="bbL20" stroke="#ef4444" dot={false} name="BB Lower" strokeDasharray="4 4" />
          )}
          {/* 成交量条 */}
          <Bar yAxisId="vol" dataKey="volume" fill="#22c55e" name="成交量" />
          {/* 区间选择缩放 */}
          <Brush dataKey="time" height={16} travellerWidth={8} tickFormatter={(v: number) => new Date(v).toLocaleTimeString()} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CandlestickChart;