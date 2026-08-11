import type { Board } from '@agor-live/client';
import { render, screen } from '@testing-library/react';
import { App as AntApp } from 'antd';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BoardTeammatePanel } from './BoardTeammatePanel';

const board = { board_id: 'board-1' } as Board;

const renderPanel = (props: Partial<ComponentProps<typeof BoardTeammatePanel>> = {}) =>
  render(
    <AntApp>
      <BoardTeammatePanel
        board={board}
        activeTab="comments"
        onTabChange={vi.fn()}
        primaryTeammateInaccessible={false}
        onSessionClick={vi.fn()}
        client={null}
        {...props}
      />
    </AntApp>
  );

describe('BoardTeammatePanel controlled sections', () => {
  it('does not reset a controlled Comments section to the default on mount', () => {
    const onTabChange = vi.fn();

    renderPanel({ onTabChange });

    // The rail owns switching; the panel just shows the controlled section.
    expect(screen.getAllByText('Comments').length).toBeGreaterThan(0);
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('renders no tab bar (the icon rail owns section switching)', () => {
    renderPanel();

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});
