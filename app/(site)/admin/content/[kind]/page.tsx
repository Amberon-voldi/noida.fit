import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { auditConfigured } from "@/lib/admin/audit";
import { contentKinds, contentTemplates } from "@/lib/content-schema";
import { listAdminContent, type ListedContent } from "@/lib/admin/content";
import { AdminContentManager } from "@/components/admin/AdminContentManager";

// Constant metadata never reveals a listing name or payload before authorization.
export const metadata = { title: "Content management · Admin", robots: { index: false, follow: false } };

export default async function AdminContentPage({ params }: { params: Promise<{ kind: string }> }) {
  const user = await requireAdminPage("/admin");
  const { kind } = await params;
  if (!contentKinds.includes(kind as typeof contentKinds[number])) notFound();
  let records: ListedContent[] = [];
  let initialError = "";
  try { records = await listAdminContent(user, kind); }
  catch { initialError = "Content could not be loaded. Retry without losing an open draft."; }
  return <div className="admin-page"><AdminContentManager key={kind} kind={kind as typeof contentKinds[number]} initialRecords={records} initialError={initialError} template={contentTemplates[kind as typeof contentKinds[number]]} writesEnabled={auditConfigured()} /></div>;
}
