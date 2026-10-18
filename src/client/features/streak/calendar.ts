import type { LocalDate, StreakResponse } from '@shared/schemas';

export type DayState = 'practiced' | 'freeze' | 'missed' | 'today' | 'future' | 'none';

export type DayCell = {
  date: LocalDate;
  day: number;
  state: DayState;
  /** Today can also be practiced; it keeps the practiced fill and gains the today ring. */
  isToday: boolean;
  label: string;
};

/** A month as a Monday-first grid: `null` pads the first week. */
export type MonthGrid = (DayCell | null)[];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const STATUS_LABELS = { practiced: 'practiced', freeze: 'freeze used', missed: 'missed' } as const;

/** Months since year 0, so months compare and step with plain integers. */
export function monthIndexOf(date: LocalDate): number {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
}

export function monthTitle(monthIndex: number): string {
  return `${MONTH_NAMES[monthIndex % 12]} ${Math.floor(monthIndex / 12)}`;
}

/**
 * Cell states come from the server's `calendar`; today and the future are decided here because the
 * server only lists today once it is practiced. A past date with no status (before the first
 * active day) is `none`, not "missed".
 */
export function buildMonth(
  monthIndex: number,
  { today, calendar }: Pick<StreakResponse, 'today' | 'calendar'>,
): MonthGrid {
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex % 12;
  const statusByDate = new Map(calendar.map((entry) => [entry.date, entry.status]));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const mondayOffset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

  const grid: MonthGrid = Array.from({ length: mondayOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = statusByDate.get(date);
    const isToday = date === today;
    let state: DayState = 'none';
    if (status === 'practiced' || status === 'freeze') state = status;
    else if (isToday) state = 'today';
    else if (date > today) state = 'future';
    else if (status) state = status;

    const notes = [isToday ? 'today' : null, status ? STATUS_LABELS[status] : null].filter(Boolean);
    grid.push({
      date,
      day,
      state,
      isToday,
      label: [`${MONTH_NAMES[month]} ${day}`, ...notes].join(', '),
    });
  }
  return grid;
}
