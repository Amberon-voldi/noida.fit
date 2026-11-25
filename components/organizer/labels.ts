import type { CheckInWindowState } from "@/types/organizer";

export function checkInLabel(state: CheckInWindowState): string {
  return {
    open: "Check-in open",
    "not-open": "Check-in not open yet",
    closed: "Check-in closed",
    cancelled: "Event cancelled",
    unavailable: "Not published",
    invalid: "Schedule needs review",
  }[state];
}

/** The session dashboard's tabs, in order; `?tab=` deep-links to one. */
export const DASHBOARD_TABS = ["overview", "guests", "checkin", "gifts", "coupons"] as const;
export type DashboardTab = (typeof DASHBOARD_TABS)[number];
