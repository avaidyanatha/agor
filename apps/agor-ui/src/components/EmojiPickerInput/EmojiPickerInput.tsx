import { Flex, Typography } from 'antd';
import type { PickerProps } from 'emoji-picker-react';
import { lazy, Suspense } from 'react';

// Lazy-load the emoji-picker-react render (~60KB) so the library is fetched
// only when a picker is first opened, not at app mount. Types above are
// `import type` and erase at compile time, so they don't pull the library in.
const AgorEmojiPickerInner = lazy(() => import('./AgorEmojiPickerInner'));

/**
 * Sized placeholder matching the picker's footprint (350x400) so the popover
 * doesn't reflow when the lazy chunk resolves.
 */
const EmojiPickerFallback: React.FC = () => (
  <Flex align="center" justify="center" style={{ width: 350, height: 400 }}>
    <Typography.Text type="secondary">Loading…</Typography.Text>
  </Flex>
);

/**
 * Shared <EmojiPicker /> wrapper that pins CSP-safe and visually-consistent
 * defaults. Always use this instead of importing EmojiPicker directly — the
 * library defaults to EmojiStyle.APPLE which lazy-loads PNGs from
 * cdn.jsdelivr.net, blocked by Agor's default img-src CSP.
 */
export const AgorEmojiPicker: React.FC<Pick<PickerProps, 'onEmojiClick'>> = ({ onEmojiClick }) => (
  <Suspense fallback={<EmojiPickerFallback />}>
    <AgorEmojiPickerInner onEmojiClick={onEmojiClick} />
  </Suspense>
);
