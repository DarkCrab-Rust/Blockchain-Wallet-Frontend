import React from 'react';
import { eventBus } from '../utils/eventBus';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    try {
      eventBus.emitApiError({
        title: '界面异常',
        message: error?.message || '渲染过程中发生错误',
        friendlyCategory: 'ui',
        friendlyEndpoint: '界面渲染',
        severity: 'error',
        userAction: '请刷新页面或返回首页',
        errorContext: { error, info },
      });
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 16 }}>
          <h2>页面出现错误</h2>
          <p>请尝试刷新页面或返回首页。</p>
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem('feature_mock'); } catch {}
              try { window.location.reload(); } catch {}
            }}
          >刷新页面</button>
        </div>
      );
    }
    return this.props.children;
  }
}