import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

describe('<Textarea>', () => {
  it('renders the value and reflects user input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea value="hello" onChange={onChange} aria-label="Body" />);
    const el = screen.getByLabelText<HTMLTextAreaElement>('Body');
    expect(el.value).toBe('hello');
    await user.type(el, '!');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('<Input>', () => {
  it('is disabled when the disabled prop is set', () => {
    render(<Input value="x" disabled onChange={() => {}} aria-label="API key" />);
    expect(screen.getByLabelText('API key')).toBeDisabled();
  });
});
