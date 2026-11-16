import { AppwriteException, IndexType, Query } from "node-appwrite";
import { loadScriptEnv } from "./lib/env";
import { getScriptConfig, getScriptDatabases } from "./lib/appwrite";

loadScriptEnv();

type Field = { key: string; type: "string"; size: number; required: boolean } | { key: string; type: "integer"; min: number; max: number } | { key: string; type: "datetime" };

/** The gift link table (lib/services/gifts.ts): server-only rows, no client grants. */
const FIELDS: Field[] = [
  { key: "eventId", type: "string", size: 36, required: true },
  { key: "createdBy", type: "string", size: 36, required: true },
  { key: "label", type: "string", size: 120, required: false },
  { key: "note", type: "string", size: 500, required: false },
  { key: "spots", type: "integer", min: 1, max: 20 },
  { key: "status", type: "string", size: 20, required: true },
  { key: "createdAt", type: "datetime" },
];

async function waitFor(read: () => Promise<{ status: string }>, what: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    const { status } = await read();
    if (status === "available") return;
    if (["failed", "stuck"].includes(status)) throw new Error(`Gift links ${what} unavailable`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Gift links ${what} timed out`);
}

/** Explicit opt-in provisioning; never touches other tables, rows or ACLs. Safe to re-run. */
async function main() {
  const id = process.env.NEXT_PUBLIC_APPWRITE_GIFT_LINKS_COLLECTION_ID;
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(id)) throw new Error("Set NEXT_PUBLIC_APPWRITE_GIFT_LINKS_COLLECTION_ID (e.g. gift_links) first");
  const { databaseId } = getScriptConfig();
  const db = getScriptDatabases();
  let collection;
  try { collection = await db.getCollection({ databaseId, collectionId: id }); }
  catch (error) {
    if (!(error instanceof AppwriteException && error.code === 404)) throw error;
    const sameName = await db.listCollections({ databaseId, queries: [Query.equal("name", "Gift links")] });
    if (sameName.total) throw new Error("A Gift links collection already exists. Use its ID; do not create a duplicate.");
    collection = await db.createCollection({ databaseId, collectionId: id, name: "Gift links", permissions: [], documentSecurity: true });
  }
  // Link IDs are the claim secret: the table must never be readable from a browser.
  if (!collection.documentSecurity || collection.$permissions.length) throw new Error("Gift links collection must be private with document security; refusing to change existing ACLs");
  for (const field of FIELDS) {
    const attributes = await db.listAttributes({ databaseId, collectionId: id });
    const existing = attributes.attributes.find(attribute => attribute.key === field.key) as { type: string; required: boolean; size?: number } | undefined;
    if (existing) {
      const required = field.type === "string" ? field.required : true;
      if (existing.type !== field.type || existing.required !== required || (field.type === "string" && existing.size !== field.size)) throw new Error(`Gift links attribute mismatch: ${field.key}`);
      continue;
    }
    if (field.type === "string") await db.createStringAttribute({ databaseId, collectionId: id, key: field.key, size: field.size, required: field.required });
    else if (field.type === "integer") await db.createIntegerAttribute({ databaseId, collectionId: id, key: field.key, required: true, min: field.min, max: field.max });
    else await db.createDatetimeAttribute({ databaseId, collectionId: id, key: field.key, required: true });
    await waitFor(() => db.getAttribute({ databaseId, collectionId: id, key: field.key }) as Promise<{ status: string }>, `attribute ${field.key}`);
  }
  const indexes = await db.listIndexes({ databaseId, collectionId: id });
  const index = indexes.indexes.find(item => item.key === "gift_links_event");
  if (index && (index.type !== "key" || JSON.stringify(index.attributes) !== JSON.stringify(["eventId"]))) throw new Error("Gift links event index mismatch");
  if (!index) await db.createIndex({ databaseId, collectionId: id, key: "gift_links_event", type: IndexType.Key, attributes: ["eventId"] });
  await waitFor(() => db.getIndex({ databaseId, collectionId: id, key: "gift_links_event" }), "index");
  console.log("PASS private gift links schema ready. Existing platform collections, rows and ACLs were not changed.");
}
main().catch(error => {
  console.error(error instanceof Error && !(error instanceof AppwriteException) ? error.message : "Gift links setup failed. Check configuration and schema-management key scopes; no credentials printed.");
  process.exitCode = 1;
});
