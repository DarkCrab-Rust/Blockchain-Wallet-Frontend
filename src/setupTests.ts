// Global test setup for CRA (picked up automatically)
import '@testing-library/jest-dom';

// Disable MUI ripple effects to avoid act warnings and DOM animation side-effects in tests
// TouchRipple is used by ButtonBase to render ripple effects; mock it to a no-op component
jest.mock('@mui/material/ButtonBase/TouchRipple', () => {
  const React = require('react');
  const TouchRippleMock = React.forwardRef((props: any, ref: any) => {
    const api = { start: () => {}, stop: () => {}, pulsate: () => {} };
    if (typeof ref === 'function') {
      ref(api);
    } else if (ref && typeof ref === 'object') {
      ref.current = api;
    }
    return null;
  });
  return { __esModule: true, default: TouchRippleMock };
});

// MUI v7 lazy ripple hook; stub to disable and provide empty handlers
jest.mock('@mui/material/useLazyRipple/useLazyRipple', () => {
  return {
    __esModule: true,
    default: () => ({
      enableRipple: false,
      getRippleHandlers: () => ({}),
      start: () => {},
      stop: () => {},
      pulsate: () => {},
    }),
  };
});

// Some environments may rely on matchMedia; provide a sane default for tests
if (!window.matchMedia) {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Mock react-transition-group to avoid asynchronous transitions in tests
jest.mock('react-transition-group', () => {
  const React = require('react');
  const Noop = ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children);
  return {
    __esModule: true,
    Transition: Noop,
    CSSTransition: Noop,
    TransitionGroup: Noop,
  };
});

// Mock common MUI transition components to render children synchronously
// Use forwardRef so parent components (e.g., FocusTrap/Modal) can attach refs without warnings
jest.mock('@mui/material/Collapse', () => {
  const React = require('react');
  const Mock = React.forwardRef((props: any, ref: any) => React.createElement('div', { ref }, props.children));
  return { __esModule: true, default: Mock };
});
jest.mock('@mui/material/Grow', () => {
  const React = require('react');
  const Mock = React.forwardRef((props: any, ref: any) => React.createElement('div', { ref }, props.children));
  return { __esModule: true, default: Mock };
});
jest.mock('@mui/material/Fade', () => {
  const React = require('react');
  const Mock = React.forwardRef((props: any, ref: any) => React.createElement('div', { ref }, props.children));
  return { __esModule: true, default: Mock };
});
jest.mock('@mui/material/Slide', () => {
  const React = require('react');
  const Mock = React.forwardRef((props: any, ref: any) => React.createElement('div', { ref }, props.children));
  return { __esModule: true, default: Mock };
});
jest.mock('@mui/material/Zoom', () => {
  const React = require('react');
  const Mock = React.forwardRef((props: any, ref: any) => React.createElement('div', { ref }, props.children));
  return { __esModule: true, default: Mock };
});

// Polyfill ResizeObserver for libraries like recharts' ResponsiveContainer in jsdom
if (typeof (window as any).ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (window as any).ResizeObserver = ResizeObserverMock;
}

// 全局清理：每个测试后清空 localStorage，避免跨用例污染
afterEach(() => {
  try {
    window.localStorage.clear();
  } catch {}
});

// 过滤 react-router v7 future flags 的提示性 warning，不影响断言但噪音较大
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('React Router Future Flag Warning')) {
    return;
  }
  // 过滤 MUI Select 越界值警告（在控件选项修复后应不再出现；此处双保险降噪）
  if (typeof args[0] === 'string' && args[0].startsWith('MUI: You have provided an out-of-range value')) {
    return;
  }
  return originalWarn.apply(console, args as any);
};

// 在 jsdom 环境下，MUI 输入控件/Portal 以及 Provider 副作用偶尔会触发
// "not wrapped in act(...)" 的提示性错误日志。我们已在关键交互中显式使用了 act，
// 为了保持测试输出整洁，这里仅过滤这类特定信息，不影响其它真实错误。
const originalError = console.error;
console.error = (...args: any[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('not wrapped in act(')) {
    return;
  }
  return originalError.apply(console, args as any);
};

// 降噪：有些页面在渲染时会使用 console.time/console.timeEnd 做性能测量，
// 会在测试输出中产生大量无关日志，这里在测试环境中将其置为 no-op。
// 不影响业务逻辑（console.time* 本身无返回值且只用于日志）。
// 若未来需要在个别测试校验性能日志，可在对应测试内 spyOn 恢复。
console.time = (..._args: any[]) => {};
console.timeEnd = (..._args: any[]) => {};
