import { expect, test } from 'vitest';
import { shouldShowIosHint, type InstallEnv } from './platform';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const IPAD_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

const env = (over: Partial<InstallEnv>): InstallEnv => ({
  userAgent: IPHONE_SAFARI,
  maxTouchPoints: 5,
  standalone: false,
  ...over,
});

test('shows the hint in iPhone Safari', () => {
  expect(shouldShowIosHint(env({}))).toBe(true);
});

test('shows the hint in iPadOS Safari, which reports as a Mac', () => {
  expect(shouldShowIosHint(env({ userAgent: IPAD_SAFARI, maxTouchPoints: 5 }))).toBe(true);
});

test('does not show it on a real Mac', () => {
  expect(shouldShowIosHint(env({ userAgent: IPAD_SAFARI, maxTouchPoints: 0 }))).toBe(false);
});

test('does not show it once installed', () => {
  expect(shouldShowIosHint(env({ standalone: true }))).toBe(false);
});

test('does not show it in Chrome for iOS or on Android', () => {
  expect(shouldShowIosHint(env({ userAgent: IPHONE_CHROME }))).toBe(false);
  expect(shouldShowIosHint(env({ userAgent: ANDROID_CHROME }))).toBe(false);
});
