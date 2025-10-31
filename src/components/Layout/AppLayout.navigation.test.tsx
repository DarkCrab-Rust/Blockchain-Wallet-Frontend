import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import AppLayout from './AppLayout'
import { WalletProvider } from '../../context/WalletContext'
import ErrorBoundary from '../ErrorBoundary'

// 简化 Drawer 以避免断点/Portal 影响测试可见性
jest.mock('@mui/material', () => {
  const original = jest.requireActual('@mui/material')
  return {
    __esModule: true,
    ...original,
    Drawer: (props: { children?: React.ReactNode }) => <div data-testid="drawer">{props.children}</div>,
  }
})

// Mock backend APIs to avoid network calls
jest.mock('../../services/api', () => {
  const original = jest.requireActual('../../services/api')
  return {
    __esModule: true,
    ...original,
    walletService: {
      listWallets: jest.fn(async () => [
        { id: 'w1', name: 'wallet-1', quantum_safe: false },
      ]),
    },
    systemService: {
      healthCheck: jest.fn(async () => ({ status: 'ok' })),
    },
  }
})

const PathIndicator = () => {
  const location = useLocation()
  return <div data-testid="path">{location.pathname}</div>
}

const renderWithRouter = () => render(
  <MemoryRouter initialEntries={["/"]}>
    <WalletProvider>
      <ErrorBoundary>
        <AppLayout>
          <Routes>
            <Route path="/" element={<h1>我的钱包</h1>} />
            <Route path="/send" element={<h1>发送交易</h1>} />
            <Route path="/history" element={<h1>交易历史</h1>} />
            <Route path="/bridge" element={<h1>跨链桥</h1>} />
            <Route path="/settings" element={<h1>API 基础设置</h1>} />
            <Route path="*" element={<PathIndicator />} />
          </Routes>
        </AppLayout>
      </ErrorBoundary>
    </WalletProvider>
  </MemoryRouter>
)

describe('AppLayout side menu navigation', () => {
  test('navigates to pages via side menu', async () => {
    renderWithRouter()

    // 初始渲染首页占位
    expect(await screen.findByText('我的钱包')).toBeInTheDocument()

    // 使用链接进行导航（ListItemButton 内部的 Link）
    const links = screen.getAllByRole('link')
    const byHref = (suffix: string) => links.find((l) => (l.getAttribute('href') || '').endsWith(suffix)) as HTMLAnchorElement

    await userEvent.click(byHref('/send'))
    expect(byHref('/send')).toHaveClass('Mui-selected')
    expect(await screen.findByRole('heading', { name: '发送交易' })).toBeInTheDocument()

    await userEvent.click(byHref('/history'))
    expect(byHref('/history')).toHaveClass('Mui-selected')
    expect(await screen.findByRole('heading', { name: '交易历史' })).toBeInTheDocument()

    await userEvent.click(byHref('/bridge'))
    expect(byHref('/bridge')).toHaveClass('Mui-selected')
    expect(await screen.findByRole('heading', { name: '跨链桥' })).toBeInTheDocument()

    await userEvent.click(byHref('/settings'))
    expect(byHref('/settings')).toHaveClass('Mui-selected')
    expect(await screen.findByRole('heading', { name: 'API 基础设置' })).toBeInTheDocument()
  })
})
