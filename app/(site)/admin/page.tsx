import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/services/participation";
import { getAdminDashboardData } from "@/lib/services/admin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = { title: "Admin dashboard", description: "Private NOIDA.FIT platform operations dashboard and guide.", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/admin");
  if (!isAdminUser(session.user)) notFound();
  return <AdminDashboard data={await getAdminDashboardData(session.user)} />;
}
