import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";
import { auditConfigured } from "@/lib/admin/audit";
import { AdminMembers } from "@/components/admin/AdminMembers";
import { listAdminMembers } from "@/lib/admin/members";

export const metadata: Metadata = { title: "Admin · Members", robots: { index: false, follow: false } };
export default async function MembersPage() {
  const actor = await requireAdminPage("/admin/members");
  let initialData: Awaited<ReturnType<typeof listAdminMembers>> = { total: 0, members: [] };
  let initialError = "";
  try { initialData = await listAdminMembers(actor); } catch { initialError = "Accounts could not be loaded. Check Appwrite users.read scope or retry."; }
  return <div className="admin-page"><p className="eyebrow">Support & access</p><h1 className="admin-title">Member management</h1><p className="admin-intro">Search accounts, manage access and remove unsafe public visibility. Changes require typed confirmation and an audit reason; personal plans and contact data remain private.</p><AdminMembers writesEnabled={auditConfigured()} initialData={initialData} initialError={initialError} /></div>;
}
