import { requireAdminPage } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import "@/components/admin/admin.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <div className="admin-shell"><AdminNav />{children}</div>;
}
