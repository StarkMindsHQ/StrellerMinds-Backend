import { SetMetadata } from '@nestjs/common';

export const DEBOUNCE_KEY = 'debounce';

/**
 * Marks an endpoint for debounce protection.
 * @param windowMs  Time window in ms during which duplicate requests are rejected (default 1000ms)
 * @param keyBy     Request property used to identify the caller: 'ip' | 'user' (default 'ip')
 */
export const Debounce = (windowMs = 1_000, keyBy: 'ip' | 'user' = 'ip') =>
  SetMetadata(DEBOUNCE_KEY, { windowMs, keyBy });
