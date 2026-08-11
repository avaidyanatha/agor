import type { AgorClient, BoardID } from '@agor-live/client';

export interface TeammateWelcomeNoteInput {
  client: AgorClient | null;
  boardId: BoardID | string;
  teammateName: string;
}

/** Adds the initial markdown note on a teammate board when missing. */
export async function ensureTeammateWelcomeNote({
  client,
  boardId,
  teammateName,
}: TeammateWelcomeNoteInput): Promise<void> {
  if (!client || !boardId) return;

  try {
    await client.service('boards').ensureTeammateWelcomeNote({
      boardId,
      teammateName,
    });
  } catch (error) {
    console.warn('Failed to create teammate welcome note:', error);
  }
}
