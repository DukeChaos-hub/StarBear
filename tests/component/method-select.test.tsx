import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MethodSelect, HTTP_METHODS } from '@/components/request-editor/method-select';

describe('<MethodSelect>', () => {
  it('renders every HTTP method as an option', () => {
    render(<MethodSelect value="GET" onChange={() => {}} />);
    for (const m of HTTP_METHODS) {
      expect(screen.getByRole('option', { name: m })).toBeInTheDocument();
    }
  });

  it('calls onChange with the new method when the user picks one', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MethodSelect value="GET" onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox'), 'POST');
    expect(onChange).toHaveBeenCalledWith('POST');
  });

  it('reflects the current value', () => {
    render(<MethodSelect value="DELETE" onChange={() => {}} />);
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe('DELETE');
  });
});
