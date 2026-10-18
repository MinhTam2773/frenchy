import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderAt } from '@client/mocks/renderAt';
import { api } from '@client/lib/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openSettings() {
  renderAt('/me');
  await screen.findByRole('radiogroup', { name: 'Daily goal' });
}

test('shows the profile row with the name and streak', async () => {
  await openSettings();
  expect(screen.getByRole('heading', { name: 'Me' })).toBeInTheDocument();
  expect(screen.getByText('Léa')).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: /day streak/ })).toHaveAttribute(
    'href',
    '/streak',
  );
});

test('daily goal persists through the profile API after a reload', async () => {
  await openSettings();
  fireEvent.click(screen.getByRole('radio', { name: '60 min' }));
  await waitFor(async () => expect((await api.profile.get()).dailyGoalMinutes).toBe(60));

  cleanup();
  await openSettings();
  expect(screen.getByRole('radio', { name: '60 min' })).toHaveAttribute('aria-checked', 'true');
});

test('the chapter picker saves the chosen chapter', async () => {
  await openSettings();
  fireEvent.click(screen.getByRole('button', { name: /Book chapter/ }));
  const sheet = screen.getByRole('dialog', { name: 'Choose your book chapter' });
  const options = within(sheet).getAllByRole('button', { pressed: false });
  const target = options[0];
  if (!target) throw new Error('no chapter options');
  fireEvent.click(target);
  await waitFor(async () => expect((await api.profile.get()).currentChapterId).not.toBe('ch10'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('play-on-tap and speed merge into settings', async () => {
  await openSettings();
  fireEvent.click(screen.getByRole('switch', { name: 'Play words when tapped' }));
  fireEvent.change(screen.getByLabelText('Speed'), { target: { value: '0.6' } });
  await waitFor(async () => {
    const { settings } = await api.profile.get();
    expect(settings).toEqual({ voiceURI: null, rate: 0.6, playOnTap: false });
  });
});

test('the time zone can follow the device', async () => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await openSettings();
  fireEvent.click(await screen.findByRole('button', { name: `Use this device: ${zone}` }));
  await waitFor(async () => expect((await api.profile.get()).timeZone).toBe(zone));
  expect(screen.queryByRole('button', { name: /Use this device/ })).not.toBeInTheDocument();
});

test('says so when speech is not supported', async () => {
  await openSettings();
  expect(screen.getByText('Not supported in this browser')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hear a sample' })).not.toBeInTheDocument();
});

test('lists French voices and saves the pick', async () => {
  const voices = [
    { voiceURI: 'v-fr', name: 'Amelie', lang: 'fr-FR', localService: true },
    { voiceURI: 'v-en', name: 'Alex', lang: 'en-US', localService: true },
  ];
  vi.stubGlobal('SpeechSynthesisUtterance', function () {});
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => voices,
    addEventListener: () => {},
    removeEventListener: () => {},
    cancel: () => {},
    speak: () => {},
  });
  await openSettings();
  const select = await screen.findByLabelText('Voice');
  expect(within(select).queryByText(/Alex/)).not.toBeInTheDocument();
  fireEvent.change(select, { target: { value: 'v-fr' } });
  await waitFor(async () => expect((await api.profile.get()).settings.voiceURI).toBe('v-fr'));
});

test('sign out sends the user back to the welcome screen', async () => {
  await openSettings();
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Me' })).not.toBeInTheDocument(),
  );
});
