import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listAdminAudit } from "@/lib/admin/audit";

export const metadata: Metadata = { title: "Admin · Audit trail", robots: { index: false, follow: false } };
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  const actor = await requireAdminPage("/admin/audit");
  const { offset: raw } = await searchParams;
  const offset = /^\d+$/.test(raw ?? "") ? Math.min(Number(raw), 100_000) : 0;
  let result: Awaited<ReturnType<typeof listAdminAudit>> | null = null;
  try { result = await listAdminAudit(actor, offset); } catch { /* Render a truthful read failure, never raw SDK errors. */ }
  return <div className="admin-page"><p className="eyebrow">Privileged history</p><h1 className="admin-title">Audit trail</h1><p className="admin-intro">Durable intent is recorded before each admin change. A started entry may indicate an interrupted action; inspect the target before retrying. The server record retains actor attribution without displaying authentication identifiers here.</p>{!result ? <p className="admin-error" role="alert">The audit store could not be read. Check its collection, index and server document scopes.</p> : !result.configured ? <p className="admin-warning">Audit not configured. <Link href="/admin/guide#setup" className="underline">Read setup instructions.</Link> Admin browser writes stay locked.</p> : <><div className="admin-table-wrap"><table className="admin-table"><caption>50 entries per page, newest first</caption><thead><tr><th>Time · IST</th><th>Action</th><th>Target</th><th>Reason</th><th>State</th></tr></thead><tbody>{result.entries.map(entry => <tr key={entry.id}><td>{new Date(entry.occurredAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><th scope="row">{entry.action}</th><td>{entry.target}</td><td>{entry.reason}</td><td>{entry.status}</td></tr>)}{!result.entries.length && <tr><td colSpan={5}>No actions recorded on this page.</td></tr>}</tbody></table></div><nav className="admin-actions mt-5" aria-label="Audit pagination">{offset > 0 && <Link className="button-secondary" href={`/admin/audit?offset=${Math.max(0, offset - 50)}`}>Previous</Link>}{result.entries.length === 50 && <Link className="button-secondary" href={`/admin/audit?offset=${offset + 50}`}>Next</Link>}</nav></>}</div>;
}
