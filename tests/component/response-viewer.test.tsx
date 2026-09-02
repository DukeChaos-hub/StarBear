import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseViewer } from '@/components/response-viewer/response-viewer';

describe('<ResponseViewer>', () => {
  it('shows the empty state when there is no response yet', () => {
    render(<ResponseViewer state={null} />);
    expect(screen.getByTestId('response-empty')).toBeInTheDocument();
    expect(screen.getByText(/send a request/i)).toBeInTheDocument();
  });

  it('shows a loading indicator while a request is in flight', () => {
    render(<ResponseViewer state={{ kind: 'loading' }} />);
    expect(screen.getByText(/sending/i)).toBeInTheDocument();
  });

  it('renders an error banner with the upstream message', () => {
    render(
      <ResponseViewer
        state={{
          kind: 'error',
          status: 502,
          body: { error: 'upstream', message: 'connection reset' },
        }}
      />,
    );
    expect(screen.getByTestId('response-error')).toBeInTheDocument();
    expect(screen.getByText('upstream')).toBeInTheDocument();
    expect(screen.getByText('connection reset')).toBeInTheDocument();
  });

  it('reports SSRF-blocked reason when the server returns ssrf_blocked', () => {
    render(
      <ResponseViewer
        state={{
          kind: 'error',
          status: 400,
          body: { error: 'ssrf_blocked', reason: '10.0.0.1 is private' },
        }}
      />,
    );
    expect(screen.getByText(/10\.0\.0\.1 is private/)).toBeInTheDocument();
  });

  it('reports the unresolved variable name', () => {
    render(
      <ResponseViewer
        state={{ kind: 'error', status: 400, body: { error: 'unresolved_variable', name: 'base' } }}
      />,
    );
    expect(screen.getByText(/base/)).toBeInTheDocument();
  });

  it('renders a 200 OK response with status, latency, size, and headers table', async () => {
    const user = userEvent.setup();
    render(
      <ResponseViewer
        state={{
          kind: 'ok',
          result: {
            status: 200,
            statusText: 'OK',
            latencyMs: 123,
            size: 256,
            body: '{"hello":"world"}',
            bodyJson: { hello: 'world' },
            headers: { 'content-type': 'application/json', 'x-trace': 'abc' },
          },
        }}
      />,
    );
    expect(screen.getByTestId('response-ok')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText(/123 ms/)).toBeInTheDocument();
    expect(screen.getByText(/256 B/)).toBeInTheDocument();

    // Pretty mode is default for JSON, so the body is pretty-printed.
    expect(screen.getByText(/"hello"/)).toBeInTheDocument();

    // Switch to the Headers tab.
    await user.click(screen.getByRole('tab', { name: /Headers/i }));
    expect(screen.getByText('content-type')).toBeInTheDocument();
    expect(screen.getByText('application/json')).toBeInTheDocument();
    expect(screen.getByText('x-trace')).toBeInTheDocument();
  });

  it('falls back to raw body mode for non-JSON content', () => {
    render(
      <ResponseViewer
        state={{
          kind: 'ok',
          result: {
            status: 200,
            statusText: 'OK',
            latencyMs: 1,
            size: 5,
            body: 'hello',
            headers: {},
          },
        }}
      />,
    );
    // For non-JSON the default mode is 'raw'.
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
