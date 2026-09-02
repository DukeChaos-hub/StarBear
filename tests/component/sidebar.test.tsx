import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// next/navigation's usePathname and useRouter are read in this component and
// its children. jsdom doesn't ship with a router, so we stub both.
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/workspace'),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import { Sidebar } from '@/components/shell/sidebar';
import { usePathname } from 'next/navigation';

const mockPathname = vi.mocked(usePathname);

describe('<Sidebar>', () => {
  it('renders all five nav items with their labels', () => {
    render(<Sidebar />);
    for (const label of ['Overview', 'Environments', 'Tests', 'AI Agent', 'Settings']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('marks Overview as the current page when pathname is /workspace', () => {
    mockPathname.mockReturnValue('/workspace');
    render(<Sidebar />);
    const overviewLink = screen.getByRole('link', { name: /overview/i });
    expect(overviewLink).toHaveAttribute('aria-current', 'page');
  });

  it('marks Environments as the current page when on a nested route', () => {
    mockPathname.mockReturnValue('/workspace/environments');
    render(<Sidebar />);
    const link = screen.getByRole('link', { name: /environments/i });
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark Overview when on a sub-route like /workspace/tests', () => {
    mockPathname.mockReturnValue('/workspace/tests');
    render(<Sidebar />);
    const overviewLink = screen.getByRole('link', { name: /overview/i });
    expect(overviewLink).not.toHaveAttribute('aria-current', 'page');
    const testsLink = screen.getByRole('link', { name: /tests/i });
    expect(testsLink).toHaveAttribute('aria-current', 'page');
  });

  it('toggles sidebar collapsed state when the collapse button is clicked', async () => {
    const user = userEvent.setup();
    mockPathname.mockReturnValue('/workspace');
    const { container } = render(<Sidebar />);
    // Expanded by default — the v0.1 label is visible.
    expect(screen.getByText(/v0\.1/)).toBeInTheDocument();
    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    await user.click(collapseButton);
    // Collapsed — the version text disappears (only icons remain).
    expect(screen.queryByText(/v0\.1/)).toBeNull();
    // Sidebar width should drop to w-12.
    const aside = container.querySelector('aside');
    expect(aside?.className).toMatch(/w-12/);
  });
});
