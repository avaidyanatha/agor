import { AppstoreOutlined, BranchesOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown, Layout, Modal, Segmented, Select, Typography, theme } from 'antd';
import type React from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { DEFAULT_BACKGROUNDS } from '../../constants/ui';
import {
  type AgorState,
  agorStore,
  shallow,
  useAgorStore,
  useStoreWithEqualityFn,
} from '../../store/agorStore';
import { selectBoardById } from '../../store/selectors';
import { isDarkTheme } from '../../utils/theme';
import { HomeBoardsSection } from './HomeBoardsSection';
import { HomeSessionsSection } from './HomeSessionsSection';
import { JumpBackInSection } from './JumpBackInSection';
import { OnboardingCard } from './OnboardingCard';
import type { HomePageProps } from './types';

const { Content } = Layout;
const ONBOARDING_HIDDEN_KEY = 'agor:onboarding-card-hidden';

// Direct map-value iteration with an early exit — avoids materializing an array
// of every session on each store notify just to test for one visible match.
function hasVisibleSession(sessionById: AgorState['sessionById'], currentUserId?: string): boolean {
  for (const s of sessionById.values()) {
    if (!s.archived && (!currentUserId || s.created_by === currentUserId)) return true;
  }
  return false;
}

const NEW_MENU_ITEMS: MenuProps['items'] = [
  { key: 'teammate', label: 'New AI teammate', icon: <RobotOutlined /> },
  { key: 'branch', label: 'New branch', icon: <BranchesOutlined /> },
  { key: 'board', label: 'New board', icon: <AppstoreOutlined /> },
];

/**
 * Gate around OnboardingCard that owns the onboarding-progress subscription,
 * so its per-notification cost (including a session scan for `hasSessions`)
 * exists ONLY while the card can appear. HomePage unmounts this once the card
 * is dismissed — the common case for established users — leaving the page
 * with zero onboarding subscription cost; when every step is done it renders
 * nothing while parked on the (rarely notified) shallow-equal booleans.
 */
const HomeOnboarding: React.FC<{
  currentUserId?: string;
  onNewSession: () => void;
  onOpenCreateDialog: HomePageProps['onOpenCreateDialog'];
  onOpenSettings: HomePageProps['onOpenSettings'];
  onDismiss: () => void;
}> = ({ currentUserId, onNewSession, onOpenCreateDialog, onOpenSettings, onDismiss }) => {
  // Booleans with shallow equality: entity patches only re-render this gate
  // when a step actually flips (e.g. first repo connected). `sessionById`
  // keeps archived sessions around for deep links, so `hasSessions` must
  // filter !archived (and scope to the current user when known); `.some`
  // exits the scan at the first match.
  const { hasBoards, hasRepos, hasMcp, hasTeammates, hasSessions } = useStoreWithEqualityFn(
    agorStore,
    (state) => ({
      hasBoards: state.boardById.size > 0,
      hasRepos: state.repoById.size > 0,
      hasMcp: state.mcpServerById.size > 0,
      hasTeammates: state.userById.size > 1,
      hasSessions: hasVisibleSession(state.sessionById, currentUserId),
    }),
    shallow
  );

  const steps = useMemo(() => {
    return [
      {
        id: 'repo',
        label: 'Connect a repository',
        done: hasRepos,
        cta: 'Connect →',
        onClick: () => onOpenSettings('repos'),
      },
      {
        id: 'board',
        label: 'Create your first board',
        done: hasBoards,
        cta: 'Create →',
        onClick: () => onOpenCreateDialog('board'),
      },
      {
        id: 'session',
        label: 'Launch an AI session',
        done: hasSessions,
        cta: 'Start →',
        onClick: onNewSession,
      },
      {
        id: 'mcp',
        label: 'Configure MCP tools',
        done: hasMcp,
        cta: 'Set up →',
        onClick: () => onOpenSettings('mcp'),
      },
      {
        id: 'invite',
        label: 'Invite a teammate',
        done: hasTeammates,
        cta: 'Invite →',
        onClick: () => onOpenSettings('users'),
      },
    ];
  }, [
    hasBoards,
    hasRepos,
    hasMcp,
    hasTeammates,
    hasSessions,
    onOpenCreateDialog,
    onOpenSettings,
    onNewSession,
  ]);

  if (steps.every((s) => s.done)) return null;

  return <OnboardingCard steps={steps} onDismiss={onDismiss} />;
};

export const HomePage = memo(function HomePage(props: HomePageProps) {
  const { token } = theme.useToken();
  const homeBackground = DEFAULT_BACKGROUNDS[isDarkTheme(token) ? 'dark' : 'light'];

  // HomePage deliberately subscribes to NOTHING session-shaped: sections that
  // display session data subscribe themselves, so a streaming session patch
  // wakes only those sections — never this whole page. Boards are the one
  // whole-map subscription left (board options + default board for the create
  // modal); board patches are rare.
  const boardById = useAgorStore(selectBoardById);

  const [onboardingHidden, setOnboardingHidden] = useState(
    () => localStorage.getItem(ONBOARDING_HIDDEN_KEY) === 'true'
  );

  const defaultBoardId = useMemo(() => {
    const firstRecent = (props.recentBoardIds ?? []).find(
      (id) => boardById.get(id)?.archived === false
    );
    if (firstRecent) return firstRecent;
    for (const board of boardById.values()) {
      if (!board.archived) return board.board_id;
    }
    return undefined;
  }, [boardById, props.recentBoardIds]);

  const boardOptions = useMemo(
    () =>
      Array.from(boardById.values())
        .filter((b) => !b.archived)
        .map((b) => ({ value: b.board_id, label: `${b.icon || '📋'} ${b.name}` })),
    [boardById]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();
  const [createType, setCreateType] = useState<'teammate' | 'branch'>('teammate');

  const handleNewSession = useCallback(
    (defaultType: 'teammate' | 'branch' = 'teammate') => {
      setCreateType(defaultType);
      setSelectedBoardId(defaultBoardId);
      setCreateOpen(true);
    },
    [defaultBoardId]
  );

  const handleConfirmCreate = useCallback(() => {
    setCreateOpen(false);
    props.onOpenCreateDialog(createType, selectedBoardId);
  }, [props.onOpenCreateDialog, createType, selectedBoardId]);

  return (
    <>
      <div style={{ height: '100%', overflow: 'hidden', background: homeBackground }}>
        <Layout style={{ height: '100%', background: 'transparent' }}>
          <Content
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              padding: 'clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px) 80px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
              }}
            >
              {/* Slim action row — boards and sessions are the page */}
              <header
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginBottom: 16,
                }}
              >
                <Dropdown
                  menu={{
                    items: NEW_MENU_ITEMS,
                    onClick: ({ key }) => {
                      if (key === 'teammate' || key === 'branch') {
                        handleNewSession(key);
                      } else {
                        props.onOpenCreateDialog(key as 'board');
                      }
                    },
                  }}
                  trigger={['click']}
                >
                  <Button type="primary" icon={<PlusOutlined />}>
                    New
                  </Button>
                </Dropdown>
              </header>

              {/* Get started onboarding card — gate unmounted once dismissed */}
              {!onboardingHidden && (
                <HomeOnboarding
                  currentUserId={props.currentUserId}
                  onNewSession={handleNewSession}
                  onOpenCreateDialog={props.onOpenCreateDialog}
                  onOpenSettings={props.onOpenSettings}
                  onDismiss={() => {
                    localStorage.setItem(ONBOARDING_HIDDEN_KEY, 'true');
                    setOnboardingHidden(true);
                  }}
                />
              )}

              {/* Jump back in — awaiting sessions (renders nothing when none) */}
              <JumpBackInSection
                currentUserId={props.currentUserId}
                onSessionClick={props.onSessionClick}
              />

              {/* My Sessions — flex: 1 fills remaining viewport height */}
              <HomeSessionsSection
                currentUserId={props.currentUserId}
                onSessionClick={props.onSessionClick}
              />

              {/* Boards grid */}
              <div style={{ marginTop: 24 }}>
                <HomeBoardsSection
                  recentBoardIds={props.recentBoardIds}
                  onBoardClick={props.onBoardClick}
                  onOpenCreateDialog={props.onOpenCreateDialog}
                />
              </div>
            </div>
          </Content>
        </Layout>
      </div>

      <Modal
        title={createType === 'branch' ? 'New branch' : 'New AI teammate'}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        width={420}
        footer={
          boardOptions.length === 0
            ? [
                <Button key="cancel" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>,
                <Button
                  key="create"
                  type="primary"
                  onClick={() => {
                    setCreateOpen(false);
                    props.onOpenCreateDialog('board');
                  }}
                >
                  Create a board first
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>,
                <Button
                  key="start"
                  type="primary"
                  disabled={!selectedBoardId}
                  onClick={handleConfirmCreate}
                >
                  {createType === 'teammate' ? 'Start AI teammate' : 'Create branch'}
                </Button>,
              ]
        }
      >
        {boardOptions.length === 0 ? (
          <div style={{ padding: '8px 0 4px' }}>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
              You don't have any boards yet. Create one first to organise your work.
            </Typography.Text>
          </div>
        ) : (
          <div style={{ padding: '8px 0 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Segmented
              value={createType}
              onChange={(v) => setCreateType(v as 'teammate' | 'branch')}
              block
              options={[
                { value: 'teammate', label: 'AI teammate', icon: <RobotOutlined /> },
                { value: 'branch', label: 'Branch / Worktree', icon: <BranchesOutlined /> },
              ]}
            />
            <div>
              <Typography.Text style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                Which board?
              </Typography.Text>
              <Select
                value={selectedBoardId}
                onChange={setSelectedBoardId}
                options={boardOptions}
                placeholder="Select a board"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
});

export default HomePage;
