import type React from 'react';
import { type ImperativePanelHandle, Panel, PanelGroup } from 'react-resizable-panels';
import { WorkspaceResizeHandle } from './WorkspaceResizeHandle';

export interface WorkspaceLayoutProps {
  /** Outer group layout callback (side-panel size persistence). */
  onMainLayout: (sizes: number[]) => void;
  /** Nested canvas/session group layout callback (session-panel size persistence). */
  onContentLayout: (sizes: number[]) => void;
  contentPanelWidthPercent: number;

  canvasDefaultSize: number;
  canvasMinSize: number;
  canvasContent: React.ReactNode;

  /** Session slot (session panel / tool choice / event stream / empty state). */
  sessionSlotOpen: boolean;
  sessionPanelRef: React.Ref<ImperativePanelHandle>;
  sessionPanelDefaultSize: number;
  sessionPanelMinSize: number;
  sessionPanelMaxSize: number;
  onSessionHandleDragging: (isDragging: boolean) => void;
  sessionContent: React.ReactNode;

  /** Right side panel (teammate/sessions/branches/comments, or collapsed rail). */
  sidePanelRef: React.Ref<ImperativePanelHandle>;
  sidePanelCollapsed: boolean;
  sidePanelCollapsedSize: number;
  sidePanelDefaultSize: number;
  sidePanelMinSize: number;
  sidePanelMaxSize: number;
  sidePanelMinWidthPx: number;
  onSideHandleDragging: (isDragging: boolean) => void;
  sideContent: React.ReactNode;
}

/**
 * The board workspace shell: canvas + session slot in a nested group, with the
 * teammate side panel on the right edge. Purely presentational — all sizing
 * state, persistence, and slot contents are owned by App.
 */
export function WorkspaceLayout({
  onMainLayout,
  onContentLayout,
  contentPanelWidthPercent,
  canvasDefaultSize,
  canvasMinSize,
  canvasContent,
  sessionSlotOpen,
  sessionPanelRef,
  sessionPanelDefaultSize,
  sessionPanelMinSize,
  sessionPanelMaxSize,
  onSessionHandleDragging,
  sessionContent,
  sidePanelRef,
  sidePanelCollapsed,
  sidePanelCollapsedSize,
  sidePanelDefaultSize,
  sidePanelMinSize,
  sidePanelMaxSize,
  sidePanelMinWidthPx,
  onSideHandleDragging,
  sideContent,
}: WorkspaceLayoutProps) {
  return (
    <PanelGroup id="main-layout" direction="horizontal" style={{ flex: 1 }} onLayout={onMainLayout}>
      <Panel id="content-panel" order={1} defaultSize={contentPanelWidthPercent} minSize={40}>
        <PanelGroup
          id="canvas-session"
          direction="horizontal"
          style={{ flex: 1 }}
          onLayout={onContentLayout}
        >
          <Panel
            id="canvas-panel"
            order={1}
            defaultSize={canvasDefaultSize}
            minSize={canvasMinSize}
          >
            <div style={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
              {canvasContent}
            </div>
          </Panel>
          {sessionSlotOpen && (
            <>
              <WorkspaceResizeHandle onDragging={onSessionHandleDragging} />
              <Panel
                id="session-panel"
                order={2}
                ref={sessionPanelRef}
                defaultSize={sessionPanelDefaultSize}
                minSize={sessionPanelMinSize}
                maxSize={sessionPanelMaxSize}
              >
                {sessionContent}
              </Panel>
            </>
          )}
        </PanelGroup>
      </Panel>
      <WorkspaceResizeHandle disabled={sidePanelCollapsed} onDragging={onSideHandleDragging} />
      <Panel
        id="teammate-panel"
        order={2}
        ref={sidePanelRef}
        collapsible
        defaultSize={sidePanelCollapsed ? sidePanelCollapsedSize : sidePanelDefaultSize}
        collapsedSize={sidePanelCollapsedSize}
        minSize={sidePanelCollapsed ? sidePanelCollapsedSize : sidePanelMinSize}
        maxSize={sidePanelMaxSize}
        style={{ minWidth: sidePanelMinWidthPx }}
      >
        {sideContent}
      </Panel>
    </PanelGroup>
  );
}
