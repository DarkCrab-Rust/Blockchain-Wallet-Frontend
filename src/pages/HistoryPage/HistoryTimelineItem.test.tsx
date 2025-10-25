import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryTimelineItem from './HistoryTimelineItem';
import { Transaction } from '../../types';

const makeTx = (): Transaction => ({
  id: '0x1234567890abcdef1234567890abcdef12345678',
  timestamp: Math.floor(Date.now() / 1000) - 60,
  status: 'confirmed',
  amount: 1.2345,
  from_address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  to_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
});

const setupClipboardMock = () => {
  const writeText = jest.fn();
  Object.assign(navigator, { clipboard: { writeText } });
  return writeText;
};

describe('HistoryTimelineItem', () => {
  test('renders timestamp, amount with network symbol and status', () => {
    const tx = makeTx();
    render(<HistoryTimelineItem tx={tx} network="polygon" />);
    // 时间戳呈现（toLocaleString）
    expect(screen.getByText(new Date(tx.timestamp * 1000).toLocaleString())).toBeInTheDocument();
    // 金额 + 网络符号 + 状态
    expect(screen.getByText(/MATIC/)).toBeInTheDocument();
    expect(screen.getByText(/confirmed/)).toBeInTheDocument();
  });

  test('shortened ids and addresses are shown', () => {
    const tx = makeTx();
    render(<HistoryTimelineItem tx={tx} network="eth" />);
    // Tx 行包含 shortened id（前6 + ... + 后4）
    const shortIdStart = tx.id.slice(0, 6);
    const shortIdEnd = tx.id.slice(-4);
    expect(screen.getByText(new RegExp(`Tx: ${shortIdStart}.*${shortIdEnd}`))).toBeInTheDocument();
    // 地址行包含 shortened from/to
    const fromStart = tx.from_address.slice(0, 6);
    const fromEnd = tx.from_address.slice(-4);
    const toStart = tx.to_address.slice(0, 6);
    const toEnd = tx.to_address.slice(-4);
    expect(screen.getByText(new RegExp(`从 ${fromStart}.*${fromEnd}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`到 ${toStart}.*${toEnd}`))).toBeInTheDocument();
  });

  test('copy buttons call clipboard.writeText with correct values', async () => {
    // 旧版 user-event 不支持 setup，直接使用全局实例
    const tx = makeTx();
    const writeText = setupClipboardMock();
    const { container } = render(<HistoryTimelineItem tx={tx} network="eth" />);

    // 第一个复制按钮是交易ID的复制
    const copyButtons = container.querySelectorAll('button');
    expect(copyButtons.length).toBeGreaterThanOrEqual(3);
    await userEvent.click(copyButtons[0]);
    expect(writeText).toHaveBeenCalledWith(tx.id);

    // 第二个复制按钮是 from 地址
    await userEvent.click(copyButtons[1]);
    expect(writeText).toHaveBeenCalledWith(tx.from_address);

    // 第三个复制按钮是 to 地址
    await userEvent.click(copyButtons[2]);
    expect(writeText).toHaveBeenCalledWith(tx.to_address);
  });

  test('external links point to correct explorer URLs', () => {
    const tx = makeTx();
    const { container } = render(<HistoryTimelineItem tx={tx} network="eth" />);
    const links = container.querySelectorAll('a[href]');
    // 预期有3个外链：tx、from、to
    expect(links.length).toBe(3);
    // 验证以 etherscan 前缀
    expect(links[0].getAttribute('href')).toMatch(`https://etherscan.io/tx/${tx.id}`);
    expect(links[1].getAttribute('href')).toMatch(`https://etherscan.io/address/${tx.from_address}`);
    expect(links[2].getAttribute('href')).toMatch(`https://etherscan.io/address/${tx.to_address}`);
  });
});