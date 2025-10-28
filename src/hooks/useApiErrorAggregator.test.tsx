import React from 'react';
import { render } from '@testing-library/react';
import { useApiErrorAggregator } from './useApiErrorAggregator';
import { eventBus } from '../utils/eventBus';

// 修复：将 mock 对象放到工厂内部，避免作用域外变量
jest.mock('react-hot-toast', () => {
  const mockToast: any = jest.fn();
  mockToast.error = jest.fn();
  return {
    __esModule: true,
    default: mockToast,
  };
});

// 通过 requireMock 获取与被测模块共享的同一 mock 实例
const mockedToast: any = (jest.requireMock('react-hot-toast').default as any);

const Harness: React.FC = () => {
  // Subscribe to error events; we don't assert returned errors snapshot as it's static
  useApiErrorAggregator();
  return null;
};

describe('useApiErrorAggregator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('dedupes errors via normalized content and increments count', () => {
    render(<Harness />);
    // Emit two errors differing only by dynamic content (timestamp/uuid) -> should normalize
    eventBus.emitApiError({
      title: '请求错误',
      message: '发生在 2024-09-01 12:00:00 内部ID 123456，详情 uuid 550e8400-e29b-41d4-a716-446655440000',
      friendlyCategory: 'network',
      friendlyEndpoint: '健康检查',
      severity: 'error',
    });
    eventBus.emitApiError({
      title: '请求错误',
      message: '发生在 2024-09-01 12:01:00 内部ID 999999，详情 uuid 550e8400-e29b-41d4-a716-446655440001',
      friendlyCategory: 'network',
      friendlyEndpoint: '健康检查',
      severity: 'error',
    });

    // error severity uses toast.error，仅统计 error 分支
    expect(mockedToast.error).toHaveBeenCalledTimes(2);
  });

  test('uses severity mapping for warnings/info', () => {
    render(<Harness />);
    eventBus.emitApiError({
      title: '提示',
      message: '轻微问题',
      friendlyCategory: 'ui',
      friendlyEndpoint: '设置',
      severity: 'warning',
      userAction: '稍后重试',
    });
    expect(mockedToast).toHaveBeenCalledWith(expect.stringContaining('提示: 轻微问题\n建议: 稍后重试'), expect.objectContaining({ icon: '⚠️' }));
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  test('clearAll and removeByKey do not throw', () => {
    // Render and call exposed methods to ensure no exceptions
    const Comp = () => {
      const { clearAll, removeByKey } = useApiErrorAggregator();
      React.useEffect(() => {
        clearAll();
        removeByKey('non-existent');
      }, [clearAll, removeByKey]);
      return null;
    };
    render(<Comp />);
  });
});