import { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { AgentChat } from '@/components/ai-chat/agent-chat';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <AppShell right={<AgentChat />}>{children}</AppShell>;
}
