import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock recharts components to avoid DOM size/layout requirements in tests
jest.mock('recharts', () => {
  const React = require('react');
  // Swallow children to avoid SVG-specific tags (e.g., linearGradient) rendering in JSDOM
  const Dummy = (props: any) => React.createElement('div', props);
  return {
    ResponsiveContainer: Dummy,
    LineChart: Dummy,
    Line: Dummy,
    XAxis: Dummy,
    YAxis: Dummy,
    Tooltip: Dummy,
    CartesianGrid: Dummy,
    BarChart: Dummy,
    Bar: Dummy,
    PieChart: Dummy,
    Pie: Dummy,
    Cell: Dummy,
    Legend: Dummy,
    RadialBarChart: Dummy,
  };
});

test('App renders without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeInTheDocument();
});
