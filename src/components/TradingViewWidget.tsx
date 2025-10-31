import React, { useEffect, useRef, useState } from 'react';

interface Props {
  symbol: string; // e.g., BINANCE:BTCUSDT
  interval?: string; // '1' | '60' | 'D'
  height?: number;
  studies?: string[]; // TradingView 指标配置，如 ['RSI@tv-basicstudies']
}

// 使用 TradingView 高级图表的嵌入脚本
const TradingViewWidget: React.FC<Props> = ({ symbol, interval = '60', height = 300, studies = ['RSI@tv-basicstudies', 'BB@tv-basicstudies'] }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string>(`tv_${(typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setLoadError(null);
    // 清理上一次的内容（避免使用 innerHTML）
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.id = widgetIdRef.current;
    container.appendChild(inner);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme: 'light',
      style: '1',
      locale: 'zh_CN',
      allow_symbol_change: true,
      hide_top_toolbar: false,
      hide_legend: false,
      withdateranges: true,
      studies,
    });
    script.onerror = () => {
      setLoadError('无法加载 TradingView 图表脚本');
    };
    container.appendChild(script);
    return () => {
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, [symbol, interval, studies, containerRef, widgetIdRef]);

  return (
    <div style={{ height }}>
      <div className="tradingview-widget-container" ref={containerRef} aria-label="TradingView高级图表" role="img" />
      {loadError && (
        <div aria-live="polite" style={{ padding: 8, color: '#b91c1c' }}>{loadError}</div>
      )}
    </div>
  );
};

export default TradingViewWidget;