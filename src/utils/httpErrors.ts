import type { AxiosError } from 'axios';

export type DescribedError = {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  status?: number;
};

export function describeAxiosError(error: AxiosError): DescribedError {
  const status = error.response?.status;
  const url = error.config?.url || '';

  // 超时
  if (error.code === 'ECONNABORTED') {
    return {
      title: '请求超时',
      message: `请求耗时过长，请稍后重试 @ ${url}`,
      severity: 'warning',
      status,
    };
  }

  // 无响应：网络错误 / CORS / 后端不可达
  if (!error.response) {
    return {
      title: '网络错误或后端不可达',
      message: `无法连接后端，请检查网络与服务状态 @ ${url}`,
      severity: 'error',
      status,
    };
  }

  // 具体状态码分类
  if (status === 401) {
    return {
      title: '未认证',
      message: '请检查 API Key 是否配置正确',
      severity: 'warning',
      status,
    };
  }
  if (status === 403) {
    return {
      title: '禁止访问',
      message: '权限不足或 API Key 无效',
      severity: 'error',
      status,
    };
  }
  if (status === 404) {
    return {
      title: '接口不存在',
      message: '请检查 API URL 或升级前后端版本',
      severity: 'warning',
      status,
    };
  }
  if (status && status >= 500) {
    return {
      title: '服务器错误',
      message: '后端服务异常，请稍后重试或查看日志',
      severity: 'error',
      status,
    };
  }

  // 其它情况
  const rawMsg = (typeof error.response.data === 'object' && (error.response.data as any)?.message)
    || error.message
    || '请求失败';
  return {
    title: '请求失败',
    message: `${rawMsg} @ ${url}`,
    severity: 'error',
    status,
  };
}