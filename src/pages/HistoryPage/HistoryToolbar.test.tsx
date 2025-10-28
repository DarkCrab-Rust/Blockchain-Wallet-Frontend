import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryToolbar from './HistoryToolbar';

describe('HistoryToolbar', () => {
  test('clicking Export CSV triggers handler', async () => {
    const onExportCSV = jest.fn();
    render(
      <HistoryToolbar
        currentNetwork="eth"
        onChangeNetwork={jest.fn()}
        fetchHistory={jest.fn()}
        loading={false}
        autoRefresh={false}
        onToggleAutoRefresh={jest.fn()}
        timeRange="all"
        onChangeTimeRange={jest.fn()}
        statusFilter="all"
        onChangeStatusFilter={jest.fn()}
        searchQuery=""
        onChangeSearchQuery={jest.fn()}
        pageSize={20}
        onChangePageSize={jest.fn()}
        displayEmpty={false}
        onExportCSV={onExportCSV}
      />
    );

    const exportBtn = screen.getByRole('button', { name: '导出 CSV' });
    await userEvent.click(exportBtn);
    expect(onExportCSV).toHaveBeenCalledTimes(1);
  });
});