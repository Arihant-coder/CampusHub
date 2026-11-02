/**
 * @file streak.ts
 * @description Centralized activity streak manager for CampusHub.
 */

const STORAGE_KEY = "campushub:activity_streak";

export interface AppStreakData {
  currentStreak: number;
  bestStreak: number;
  activeDates: string[];
}

export function formatStreakDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getAppStreak(): AppStreakData {
  const todayStr = formatStreakDate(new Date());

  let data: AppStreakData = {
    currentStreak: 5,
    bestStreak: 12,
    activeDates: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      data = JSON.parse(raw);
    } else {
      // Seed initial 5-day activity streak
      const seeded: string[] = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        seeded.push(formatStreakDate(d));
      }
      data.activeDates = seeded;
      data.currentStreak = 5;
      data.bestStreak = 8;
    }
  } catch {}

  // Ensure today is logged
  if (!data.activeDates.includes(todayStr)) {
    data.activeDates.push(todayStr);

    const activeSet = new Set(data.activeDates);
    let count = 0;
    const check = new Date();
    while (activeSet.has(formatStreakDate(check))) {
      count++;
      check.setDate(check.getDate() - 1);
    }

    data.currentStreak = count;
    data.bestStreak = Math.max(data.bestStreak || 0, count);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  return data;
}

