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
