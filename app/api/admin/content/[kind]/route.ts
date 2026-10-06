import { z } from "zod";
import { HttpError, jsonError, jsonOk, readJson } from "@/lib/http";
import { requireAdminMutationUser, requireAdminUser } from "@/lib/admin/auth";
import { contentKinds } from "@/lib/content-schema";
import { createAdminContent, deleteAdminContent, listAdminContent, updateAdminContent } from "@/lib/admin/content";

const reason = z.string().trim().min(5).max(300);
const createBody = z.object({ record: z.record(z.string(), z.unknown()), reason }).strict();
const editBody = createBody.extend({ id: z.string().min(1), expectedUpdatedAt: z.string().min(1) }).strict();
const deleteBody = z.object({ id: z.string(), confirm: z.string(), reason, expectedUpdatedAt: z.string().min(1) }).strict();
function isKind(value: string): boolean { return contentKinds.includes(value as typeof contentKinds[number]); }
function invalidKind(): never { throw new HttpError(404, "CONTENT_NOT_FOUND", "Content type was not found"); }
function contentError(error: unknown, fallback: string): Response {
  if (error instanceof z.ZodError) {
    const fields = [...new Set(error.issues.map(issue => issue.path.join(".") || "record"))].slice(0, 12).join(", ");
    return jsonError(new HttpError(400, "INVALID_CONTENT", `Check these record fields: ${fields}`));
  }
  return jsonError(error, fallback);
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const user = await requireAdminUser();
    const { kind } = await params;
    if (!isKind(kind)) invalidKind();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    if (status && !["all", "draft", "published", "cancelled"].includes(status)) throw new HttpError(400, "INVALID_INPUT", "Status filter is invalid");
    return jsonOk({ kind, records: await listAdminContent(user, kind, { status, search }) });
  } catch (error) { return contentError(error, "Content could not be loaded"); }
}

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const user = await requireAdminMutationUser(request, "admin-content");
    const { kind } = await params;
    if (!isKind(kind)) invalidKind();
    const body = await readJson(request, createBody, 65536);
    return jsonOk({ record: await createAdminContent(user, kind, body.record, body.reason) }, 201);
  } catch (error) { return contentError(error, "Content could not be created"); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const user = await requireAdminMutationUser(request, "admin-content");
    const { kind } = await params;
    if (!isKind(kind)) invalidKind();
    const body = await readJson(request, editBody, 65536);
    return jsonOk({ record: await updateAdminContent(user, kind, body.id, body.record, body.expectedUpdatedAt, body.reason) });
  } catch (error) { return contentError(error, "Content could not be updated"); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const user = await requireAdminMutationUser(request, "admin-content");
    const { kind } = await params;
    if (!isKind(kind)) invalidKind();
    const body = await readJson(request, deleteBody, 65536);
    await deleteAdminContent(user, kind, body.id, body.confirm, body.reason, body.expectedUpdatedAt);
    return jsonOk({ deleted: body.id });
  } catch (error) { return contentError(error, "Content could not be deleted"); }
}
