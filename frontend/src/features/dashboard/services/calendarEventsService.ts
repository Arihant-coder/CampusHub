/**
 * @file calendarEventsService.ts
 * @description Manages calendar events, test reminders, and daily usage streaks.
 */

export type CalendarEventType = "test" | "assignment" | "exam" | "reminder" | "event";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  time?: string;
  description?: string;
}

export interface UserActivityStreak {
  currentStreak: number;
  bestStreak: number;
  activeDates: string[]; // YYYY-MM-DD
}

const EVENTS_STORAGE_KEY = "campushub:calendar_events";
const ACTIVITY_STORAGE_KEY = "campushub:activity_streak";

/** Formats a Date object to YYYY-MM-DD using local timezone */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const calendarEventsService = {
  /**
   * Loads all saved calendar events from localStorage.
   * If none exist, seeds default student events (including the requested Nov 5 class test).
   */
  getEvents(): CalendarEvent[] {
    try {
      const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as CalendarEvent[];
      }
    } catch (e) {
      console.error("Failed to parse calendar events", e);
    }

    const today = new Date();
    const currentYear = today.getFullYear();

    // Default sample events for student curriculum
    const defaultEvents: CalendarEvent[] = [
      {
        id: "evt-test-1",
        title: "Class Test - Database Systems",
        date: `${currentYear}-11-05`,
        type: "test",
        time: "10:30 AM",
        description: "Units 1 & 2: Relational algebra, SQL joins, normalization, and indexing.",
      },
      {
        id: "evt-assign-1",
        title: "Algorithms Problem Set 3 Due",
        date: `${currentYear}-11-08`,
        type: "assignment",
        time: "11:59 PM",
        description: "Dynamic Programming and Graph Theory practice sets.",
      },
      {
        id: "evt-test-2",
        title: "Operating Systems Mid-term",
        date: `${currentYear}-11-15`,
        type: "test",
        time: "02:00 PM",
        description: "Process synchronization, semaphores, and CPU scheduling algorithms.",
      },
      {
        id: "evt-event-1",
        title: "Campus Coding Hackathon",
        date: `${currentYear}-11-20`,
        type: "event",
        time: "09:00 AM",
        description: "Auditorium Hall B - 24-hour sprint.",
      },
    ];

    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(defaultEvents));
    } catch {}

    return defaultEvents;
  },

  /**
   * Adds a new calendar event and persists it.
   */
  addEvent(event: Omit<CalendarEvent, "id">): CalendarEvent {
    const events = this.getEvents();
    const newEvent: CalendarEvent = {
      ...event,
      id: "evt-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    };
    const updated = [newEvent, ...events];
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save calendar event", e);
    }
    return newEvent;
  },

  /**
   * Deletes an event by its ID.
   */
  deleteEvent(id: string): void {
    const events = this.getEvents();
    const updated = events.filter((e) => e.id !== id);
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete calendar event", e);
    }
  },

  /**
   * Retrieves user activity streak and logs today's visit.
   */
  getActivityStreak(): UserActivityStreak {
    const todayStr = formatDateKey(new Date());

    let data: UserActivityStreak = {
      currentStreak: 5,
      bestStreak: 12,
      activeDates: [],
    };

    try {
      const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (stored) {
        data = JSON.parse(stored) as UserActivityStreak;
      } else {
        // Seed initial activity streak (past 4 days + today)
        const seededDates: string[] = [];
        for (let i = 4; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          seededDates.push(formatDateKey(d));
        }
        data.activeDates = seededDates;
        data.currentStreak = 5;
        data.bestStreak = 8;
      }
    } catch {}

    // Record today as active if not already present
    if (!data.activeDates.includes(todayStr)) {
      data.activeDates.push(todayStr);

      // Calculate streak dynamically
      const activeSet = new Set(data.activeDates);
      let streakCount = 0;
      const checkDate = new Date();

      while (activeSet.has(formatDateKey(checkDate))) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      data.currentStreak = streakCount;
      data.bestStreak = Math.max(data.bestStreak || 0, streakCount);

      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(data));
      } catch {}
    }

    return data;
  },
};

