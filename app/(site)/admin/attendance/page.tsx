import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";
import { auditConfigured } from "@/lib/admin/audit";
import { getOrganizerEvents } from "@/lib/data";
import { AdminAttendance } from "@/components/admin/AdminAttendance";

export const metadata: Metadata = { title: "Admin · Attendance", robots: { index: false, follow: false } };
export default async function AttendancePage() {
  const user = await requireAdminPage("/admin/attendance");
  const events = await getOrganizerEvents(user.id, true);
  return <div className="admin-page"><p className="eyebrow">Attendance & recovery</p><h1 className="admin-title">Attendance desk</h1><p className="admin-intro">Review RSVP versus attendance, export a privacy-safe roster, and repair passport records from existing trusted check-ins. For live QR generation, use the organizer workspace.</p><AdminAttendance events={events.map(event => ({ id: event.id, title: event.title, status: event.status }))} writesEnabled={auditConfigured()} /></div>;
}
