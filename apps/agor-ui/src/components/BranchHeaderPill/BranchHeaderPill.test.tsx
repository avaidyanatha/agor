import type { Branch, Repo } from '@agor-live/client';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

type MockMenuItem = {
  key?: string | number;
  label?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  type?: string;
};

type MockMenu = {
  items?: MockMenuItem[];
  onClick?: (info: { key: string; domEvent: React.MouseEvent }) => void;
};

vi.mock('antd', async () => {
  const React = await import('react');

  return {
    Dropdown: ({ menu, children }: { menu?: MockMenu; children: React.ReactNode }) =>
      React.createElement(
        React.Fragment,
        null,
        children,
        React.createElement(
          'div',
          { role: 'menu' },
          (menu?.items ?? [])
            .filter((item): item is MockMenuItem => !!item && item.type !== 'divider')
            .map((item) =>
              React.createElement(
                'button',
                {
                  key: String(item.key),
                  type: 'button',
                  role: 'menuitem',
                  disabled: item.disabled,
                  onClick: (e: React.MouseEvent) =>
                    menu?.onClick?.({ key: String(item.key), domEvent: e }),
                },
                item.label
              )
            )
        )
      ),
    Spin: ({
      indicator,
      size: _size,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & {
      indicator?: React.ReactNode;
      size?: string;
    }) => React.createElement('span', props, indicator ?? 'loading'),
    Tooltip: ({
      children,
      trigger,
    }: {
      children: React.ReactNode;
      trigger?: string | string[];
    }) => {
      if (!React.isValidElement(children)) {
        return React.createElement(React.Fragment, null, children);
      }

      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        'data-tooltip-trigger': Array.isArray(trigger) ? trigger.join(',') : trigger,
      });
    },
    Tag: Object.assign(
      ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) =>
        React.createElement('span', props, children),
      {
        CheckableTag: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) =>
          React.createElement('span', props, children),
      }
    ),
    theme: {
      useToken: () => ({
        token: {
          colorBorderSecondary: '#ddd',
          colorError: '#f00',
          colorInfo: '#00f',
          colorSuccess: '#0a0',
          colorTextDisabled: '#999',
          colorWarning: '#fa0',
          fontFamilyCode: 'monospace',
          fontSizeSM: 12,
        },
      }),
    },
  };
});

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    role: 'admin',
    isAdmin: true,
    isSuperAdmin: false,
    hasRole: () => true,
  }),
}));

const confirmNukeMock = vi.fn((run: () => void) => run());
vi.mock('../../hooks/useConfirmNukeEnvironment', () => ({
  useConfirmNukeEnvironment: () => confirmNukeMock,
}));

import { BranchHeaderPill } from './BranchHeaderPill';

const repo = {
  repo_id: 'repo-1',
  slug: 'preset-io/agor',
  environment_config: {
    up_command: 'pnpm dev',
    down_command: 'pnpm stop',
    nuke_command: 'docker compose down -v',
    logs_command: 'docker compose logs',
  },
} as Repo;

const branch = {
  branch_id: 'branch-1',
  repo_id: repo.repo_id,
  name: 'feature/remove-nuke',
  nuke_command: 'docker compose down -v',
  others_can: 'all',
  environment_instance: { status: 'stopped' },
} as Branch;

const defaultProps = {
  repo,
  branch,
  onOpenBranch: vi.fn(),
  onStartEnvironment: vi.fn(),
  onStopEnvironment: vi.fn(),
  onViewLogs: vi.fn(),
  onNukeEnvironment: vi.fn(),
};

function renderPill(props: Partial<React.ComponentProps<typeof BranchHeaderPill>> = {}) {
  return render(
    <MemoryRouter basename="/ui" initialEntries={['/ui/']}>
      <BranchHeaderPill {...defaultProps} {...props} />
    </MemoryRouter>
  );
}

function menuItem(name: string | RegExp) {
  return within(screen.getByRole('menu')).getByRole('menuitem', { name });
}

describe('BranchHeaderPill', () => {
  it('renders the identity as a menu trigger without inline action buttons', () => {
    renderPill();

    const identity = screen.getByRole('button', {
      name: 'preset-io/agor / feature/remove-nuke',
    });
    expect(identity).toHaveAttribute('aria-haspopup', 'menu');
    expect(identity).toHaveAttribute('data-tooltip-trigger', 'hover,focus');

    // The old inline shortcut/env buttons are gone from the pill surface.
    expect(screen.queryByRole('button', { name: 'Start environment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sessions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit branch' })).not.toBeInTheDocument();
  });

  it('exposes branch modal tabs and environment actions through the menu', () => {
    renderPill({ sessionCount: 3 });

    for (const name of [
      'General',
      'Sessions (3)',
      'Environment',
      'Files',
      'Schedule',
      'Knowledge',
      'Start environment',
      'Stop environment',
      'View logs',
      'Nuke environment',
    ]) {
      expect(menuItem(name)).toBeInTheDocument();
    }
    // Non-teammate branches get no teammate tab entry.
    expect(
      within(screen.getByRole('menu')).queryByRole('menuitem', { name: 'Teammate' })
    ).not.toBeInTheDocument();
  });

  it('opens the branch modal at the selected tab', () => {
    const onOpenBranch = vi.fn();
    renderPill({ onOpenBranch });

    fireEvent.click(menuItem('Files'));
    expect(onOpenBranch).toHaveBeenCalledWith('branch-1', 'files');

    fireEvent.click(menuItem('General'));
    expect(onOpenBranch).toHaveBeenCalledWith('branch-1', undefined);
  });

  it('drives environment actions from the menu with state-aware disabling', () => {
    const onStartEnvironment = vi.fn();
    renderPill({ onStartEnvironment });

    // Stopped environment: start enabled, stop disabled.
    expect(menuItem('Stop environment')).toBeDisabled();
    const start = menuItem('Start environment');
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(onStartEnvironment).toHaveBeenCalledWith('branch-1');
  });

  it('routes nuke through the confirmation hook', () => {
    const onNukeEnvironment = vi.fn();
    renderPill({ onNukeEnvironment });

    fireEvent.click(menuItem('Nuke environment'));
    expect(confirmNukeMock).toHaveBeenCalled();
    expect(onNukeEnvironment).toHaveBeenCalledWith('branch-1');
  });

  it('omits the nuke action in compact mode and when explicitly hidden', () => {
    const { unmount } = renderPill({ compact: true });
    expect(
      within(screen.getByRole('menu')).queryByRole('menuitem', { name: 'Nuke environment' })
    ).not.toBeInTheDocument();
    unmount();

    renderPill({ showNukeEnvironment: false });
    expect(
      within(screen.getByRole('menu')).queryByRole('menuitem', { name: 'Nuke environment' })
    ).not.toBeInTheDocument();
  });

  it('adds an Open session entry when an identity link is supplied', () => {
    renderPill({ identityLink: '/s/abc123/' });
    expect(menuItem('Open session')).toBeInTheDocument();
  });

  it('keeps the truncateToFit identity accessible and content-sized', () => {
    renderPill({ truncateToFit: true });

    const identity = screen.getByRole('button', {
      name: 'preset-io/agor / feature/remove-nuke',
    });
    expect(identity).toHaveStyle({
      flex: '1 1 auto',
      minWidth: '0',
    });
    expect(identity.parentElement).toHaveStyle({
      display: 'inline-flex',
      maxWidth: '100%',
      minWidth: '0',
    });

    expect(screen.getByText(repo.slug)).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    expect(screen.getByText(branch.name)).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
  });

  it('renders the starting-environment spinner as an icon aligned with sibling status icons', () => {
    renderPill({
      branch: { ...branch, environment_instance: { status: 'starting' } } as Branch,
    });

    // Spin uses a LoadingOutlined indicator sized like the other status icons.
    const indicator = screen.getByRole('img', { name: 'loading' });
    expect(indicator.className).toContain('anticon-spin');
    expect(indicator).toHaveStyle({ fontSize: '11px' });
    // The Spin wrapper centers the indicator instead of leaving it on the
    // inherited 22px text baseline.
    expect(indicator.parentElement).toHaveStyle({
      display: 'inline-flex',
      alignItems: 'center',
    });
  });
});
