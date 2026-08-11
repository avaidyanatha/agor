export interface HomePageProps {
  recentBoardIds?: string[];
  currentUserId?: string;
  onBoardClick: (boardId: string) => void;
  onSessionClick: (sessionId: string) => void;
  onOpenCreateDialog: (
    tab: 'teammate' | 'branch' | 'board' | 'repository',
    boardId?: string
  ) => void;
  onOpenSettings: (section: 'repos' | 'mcp' | 'users') => void;
}
