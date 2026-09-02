import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Hoist the mock factories so vi.mock can reference them before they exist.
const { mockUsePathname, mockRouter } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(() => '/workspace'),
  mockRouter: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
  useRouter: () => mockRouter,
}));

// Mock the EnvSwitcher child so we don't need to stub the /api/environments
// fetch just to test Topbar-level wiring (logo, search button, pane toggle).
vi.mock('@/components/shell/env-switcher', () => ({
  EnvSwitcher: () => <div data-testid="env-switcher-mock">EnvSwitcher</div>,
}));

import { Topbar } from '@/components/shell/topbar';
import { useWorkspace } from '@/lib/stores/workspace';

describe('<Topbar>', () => {
  it('renders the brand, env switcher, search, and right-pane toggle', () => {
    render(<Topbar />);
    expect(screen.getByText('StarBear')).toBeInTheDocument();
    expect(screen.getByTestId('env-switcher-mock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /⌘K/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle right pane/i })).toBeInTheDocument();
  });

  it('opens the command palette when the search button is clicked', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: /⌘K/ }));
    // CommandPalette is a Radix dialog with role="dialog".
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('toggles the right pane state on the workspace store', async () => {
    const user = userEvent.setup();
    useWorkspace.setState({ rightPaneOpen: true, sidebarCollapsed: false });
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: /toggle right pane/i }));
    expect(useWorkspace.getState().rightPaneOpen).toBe(false);
    await user.click(screen.getByRole('button', { name: /toggle right pane/i }));
    expect(useWorkspace.getState().rightPaneOpen).toBe(true);
  });
});
