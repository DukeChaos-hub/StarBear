import { create } from 'zustand';

interface WorkspaceState {
  rightPaneOpen: boolean;
  toggleRightPane: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  rightPaneOpen: true,
  toggleRightPane: () => set((s) => ({ rightPaneOpen: !s.rightPaneOpen })),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
