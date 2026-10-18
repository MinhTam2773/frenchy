import type { FSRSParameters } from 'ts-fsrs';

/**
 * The one scheduler setting set for the app. FSRS default weights (G-11) and default learning
 * steps (1m, 10m; relearning 10m). Fuzz is on in production so cards added together don't all
 * come back on the same day; tests build a scheduler with it off.
 */
export const FSRS_CONFIG = {
  requestRetention: 0.9,
  /** Days. One year: the course runs for months, and a cap keeps long gaps from hiding forgotten cards. */
  maximumInterval: 365,
  enableFuzz: true,
} as const;

export function toFsrsParameters(
  overrides: { enableFuzz?: boolean } = {},
): Partial<FSRSParameters> {
  return {
    request_retention: FSRS_CONFIG.requestRetention,
    maximum_interval: FSRS_CONFIG.maximumInterval,
    enable_fuzz: overrides.enableFuzz ?? FSRS_CONFIG.enableFuzz,
  };
}
