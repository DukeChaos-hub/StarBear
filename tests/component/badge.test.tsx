import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('<Badge>', () => {
  it('renders children with the default variant', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies the success variant class', () => {
    render(<Badge variant="success">Passed</Badge>);
    const el = screen.getByText('Passed');
    expect(el.className).toMatch(/emerald/i);
  });

  it('applies the danger variant class', () => {
    render(<Badge variant="danger">Failed</Badge>);
    expect(screen.getByText('Failed').className).toMatch(/destructive/i);
  });
});
