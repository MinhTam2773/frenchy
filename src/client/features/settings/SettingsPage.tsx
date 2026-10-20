import { useId, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DAILY_GOAL_OPTIONS, TTS_RATE } from '@shared/constants';
import { getCourse, routeChapters } from '@shared/content';
import type { Profile, ProfilePatch } from '@shared/schemas';
import { BottomSheet, Button, Icon, Link, StreakChip, Toggle } from '@client/ui';
import { api } from '@client/lib/api';
import { queryKeys, useProfile } from '@client/lib/query';
import { useSession } from '@client/lib/session';
import { useTts } from '@client/lib/tts/useTts';

const SAMPLE_SENTENCE = 'Bonjour, je m’appelle Léa.';
/** The "automatic" option's value; the profile stores it as `voiceURI: null`. */
const AUTO_VOICE = '';

const chapters = routeChapters(getCourse());

function chapterLabel(id: string | null) {
  const chapter = chapters.find((c) => c.id === id);
  if (!chapter) return 'Not chosen yet';
  const number = /^\d/.test(chapter.number) ? `Ch ${chapter.number}` : `App ${chapter.number}`;
  return `${number} · ${chapter.shortTitle}`;
}

function timeZoneOptions(current: string) {
  const zones = Intl.supportedValuesOf('timeZone');
  return zones.includes(current) ? zones : [current, ...zones];
}

function usePatchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api.profile.patch(patch),
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile, profile),
  });
}

const rowClass = 'flex min-h-[50px] items-center gap-2.5 px-3.5 py-1';
const labelClass = 'flex-1 text-[15px] font-bold';
const valueClass = 'text-sm font-bold text-muted';
const controlClass =
  'h-11 min-w-0 max-w-[60%] rounded-btn-sm border-2 border-line bg-surface px-2 text-sm font-bold text-ink';
const choiceClass = (selected: boolean) =>
  selected ? 'border-primary bg-primary-soft text-primary' : 'border-line text-ink';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="mx-1 font-display text-sm font-semibold tracking-[0.06em] text-muted uppercase">
        {title}
      </h2>
      <div className="divide-y-2 divide-chip overflow-hidden rounded-[18px] border-2 border-line bg-surface">
        {children}
      </div>
    </section>
  );
}

function ProfileRow({ saveState }: { saveState: 'saving' | 'error' | 'synced' }) {
  const { user } = useSession();
  const streak = useQuery({ queryKey: queryKeys.streak, queryFn: api.streak });
  const name = user?.name ?? 'You';
  const status = {
    saving: 'Saving…',
    error: 'Could not save. Try again.',
    synced: 'Synced to your account',
  }[saveState];
  return (
    <section className="flex items-center gap-3.5 rounded-card border-2 border-line bg-surface px-3.5 py-3">
      <span
        aria-hidden="true"
        className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-primary font-display text-[22px] font-bold text-white"
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[17px] font-extrabold">{name}</span>
        <span role="status" className="text-[13px] font-bold text-muted">
          {status}
        </span>
      </span>
      {streak.data && <StreakChip count={streak.data.current} to="/streak" />}
    </section>
  );
}

function ChapterRow({ profile, onPick }: { profile: Profile; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${rowClass} w-full text-left`}
      >
        <span className={labelClass}>Book chapter</span>
        <span className={valueClass}>{chapterLabel(profile.currentChapterId)}</span>
        <Icon name="forward" size={18} className="text-faint" />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} label="Choose your book chapter">
        <h2 className="font-display text-xl font-semibold">Where are you in the book?</h2>
        <ul className="-mx-1 flex max-h-[55vh] flex-col gap-1 overflow-y-auto px-1 py-1">
          {chapters.map((chapter) => {
            const selected = chapter.id === profile.currentChapterId;
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onPick(chapter.id);
                    setOpen(false);
                  }}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-btn-sm border-2 px-3 text-left text-[15px] font-bold ${choiceClass(selected)}`}
                >
                  <span className="flex-1">{chapterLabel(chapter.id)}</span>
                  {selected && <Icon name="check" size={18} />}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}

function GoalRow({
  current,
  onPick,
}: {
  current: number;
  onPick: (minutes: (typeof DAILY_GOAL_OPTIONS)[number]) => void;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1.5 px-3.5 py-2">
      <span id={labelId} className={labelClass}>
        Daily goal
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex gap-1.5">
        {DAILY_GOAL_OPTIONS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            role="radio"
            aria-checked={minutes === current}
            onClick={() => onPick(minutes)}
            className={`h-11 flex-1 rounded-btn-sm border-2 text-sm font-extrabold ${choiceClass(minutes === current)}`}
          >
            {minutes} min
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeZoneRow({ current, onPick }: { current: string; onPick: (zone: string) => void }) {
  const id = useId();
  // The device's own zone is the suggestion; the stored one stays until the user says otherwise.
  const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="flex flex-col gap-1 px-3.5 py-2">
      <div className="flex items-center gap-2.5">
        <label htmlFor={id} className={labelClass}>
          Time zone
        </label>
        <select
          id={id}
          value={current}
          onChange={(event) => onPick(event.target.value)}
          className={controlClass}
        >
          {timeZoneOptions(current).map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>
      {device !== current && (
        <Button variant="ghost" size="sm" onClick={() => onPick(device)} className="self-start">
          Use this device: {device}
        </Button>
      )}
    </div>
  );
}

function AudioSection({
  settings,
  onChange,
}: {
  settings: Profile['settings'];
  onChange: (settings: Partial<Profile['settings']>) => void;
}) {
  const voiceId = useId();
  const rateId = useId();
  const { voices, supported, speak } = useTts();
  const savedMissing =
    settings.voiceURI !== null && !voices.some((voice) => voice.voiceURI === settings.voiceURI);
  return (
    <Section title="Audio">
      <div className={rowClass}>
        <label htmlFor={voiceId} className={labelClass}>
          Voice
        </label>
        {supported && voices.length > 0 ? (
          <select
            id={voiceId}
            value={settings.voiceURI ?? AUTO_VOICE}
            onChange={(event) => onChange({ voiceURI: event.target.value || null })}
            className={controlClass}
          >
            <option value={AUTO_VOICE}>Best available</option>
            {savedMissing && (
              <option value={settings.voiceURI ?? AUTO_VOICE}>
                Saved voice (not on this device)
              </option>
            )}
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        ) : (
          <span id={voiceId} className={valueClass}>
            {supported ? 'No French voice found' : 'Not supported in this browser'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-3.5 py-2">
        <div className="flex items-center gap-2.5">
          <label htmlFor={rateId} className={labelClass}>
            Speed
          </label>
          <span aria-hidden="true" className={valueClass}>
            {settings.rate.toFixed(1)}×
          </span>
        </div>
        <input
          id={rateId}
          type="range"
          min={TTS_RATE.min}
          max={TTS_RATE.max}
          step={0.1}
          value={settings.rate}
          aria-valuetext={`${settings.rate.toFixed(1)} times`}
          onChange={(event) => onChange({ rate: Number(event.target.value) })}
          className="h-11 w-full accent-primary"
        />
        {supported && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() =>
              void speak(SAMPLE_SENTENCE, {
                rate: settings.rate,
                ...(settings.voiceURI ? { voiceURI: settings.voiceURI } : {}),
              })
            }
          >
            Hear a sample
          </Button>
        )}
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Play words when tapped</span>
        <Toggle
          checked={settings.playOnTap}
          onChange={(playOnTap) => onChange({ playOnTap })}
          aria-label="Play words when tapped"
        />
      </div>
    </Section>
  );
}

export function SettingsPage() {
  const profile = useProfile();
  const patch = usePatchProfile();
  const { signOut } = useSession();
  const saveState = patch.isPending ? 'saving' : patch.isError ? 'error' : 'synced';

  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      <h1 className="px-1 pt-4 font-display text-[26px] font-semibold">Me</h1>
      <ProfileRow saveState={saveState} />
      {profile.isPending && <p className="px-1 text-muted">Loading your settings…</p>}
      {profile.isError && (
        <div role="alert" className="flex flex-col items-start gap-2 px-1 text-danger-ink">
          <p>Could not load your settings.</p>
          <Button variant="secondary" size="sm" onClick={() => void profile.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {profile.data && (
        <>
          <Section title="Learning">
            <ChapterRow
              profile={profile.data}
              onPick={(currentChapterId) => patch.mutate({ currentChapterId })}
            />
            <GoalRow
              current={profile.data.dailyGoalMinutes}
              onPick={(dailyGoalMinutes) => patch.mutate({ dailyGoalMinutes })}
            />
            <TimeZoneRow
              current={profile.data.timeZone}
              onPick={(timeZone) => patch.mutate({ timeZone })}
            />
          </Section>
          <AudioSection
            settings={profile.data.settings}
            onChange={(settings) => patch.mutate({ settings })}
          />
        </>
      )}
      <Section title="About">
        <Link to="/credits" className={rowClass}>
          <span className={labelClass}>Credits</span>
          <Icon name="forward" size={18} className="text-faint" />
        </Link>
      </Section>
      <Button variant="secondary" fullWidth onClick={() => void signOut()} className="text-fem">
        Sign out
      </Button>
    </div>
  );
}
