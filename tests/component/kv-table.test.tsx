import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KvTable, type KeyValueRow } from '@/components/request-editor/kv-table';

describe('<KvTable>', () => {
  it('renders existing rows and shows an empty-state message when none', () => {
    const { rerender } = render(<KvTable rows={[]} onChange={() => {}} />);
    expect(screen.getByText(/no entries yet/i)).toBeInTheDocument();

    const rows: KeyValueRow[] = [
      { key: 'foo', value: '1', enabled: true },
      { key: 'bar', value: '2', enabled: false },
    ];
    rerender(<KvTable rows={rows} onChange={() => {}} />);
    expect(screen.getByDisplayValue('foo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('appends a new row when "Add row" is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KvTable rows={[]} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /add row/i }));
    expect(onChange).toHaveBeenCalledWith([{ key: '', value: '', enabled: true }]);
  });

  it('removes a row when the trash button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const rows: KeyValueRow[] = [
      { key: 'a', value: '1', enabled: true },
      { key: 'b', value: '2', enabled: true },
    ];
    render(<KvTable rows={rows} onChange={onChange} />);
    const removeButtons = screen.getAllByRole('button', { name: /remove row/i });
    await user.click(removeButtons[0]!);
    expect(onChange).toHaveBeenCalledWith([{ key: 'b', value: '2', enabled: true }]);
  });

  it('toggles the enabled checkbox for a row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const rows: KeyValueRow[] = [{ key: 'k', value: 'v', enabled: true }];
    render(<KvTable rows={rows} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox', { name: 'Enabled' }));
    expect(onChange).toHaveBeenCalledWith([{ key: 'k', value: 'v', enabled: false }]);
  });

  it('dims a row when disabled', () => {
    const rows: KeyValueRow[] = [{ key: 'a', value: '1', enabled: false }];
    const { container } = render(<KvTable rows={rows} onChange={() => {}} />);
    // The header row is the first .grid; the data row is the second one.
    const grids = container.querySelectorAll('.grid.grid-cols-\\[auto_1fr_1fr_auto\\]');
    const dataRow = grids[1];
    expect(dataRow).toBeDefined();
    expect(dataRow!.className).toMatch(/opacity-50/);
  });
});
