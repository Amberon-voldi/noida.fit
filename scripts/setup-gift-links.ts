import { AppwriteException, IndexType, Query } from "node-appwrite";
import { loadScriptEnv } from "./lib/env";
import { getScriptConfig, getScriptDatabases } from "./lib/appwrite";

loadScriptEnv();

type Field = { key: string; type: "string"; size: number; required: boolean } | { key: string; type: "integer"; min: number; max: number } | { key: string; type: "boolean" } | { key: string; type: "datetime" };
interface Table { variable: string; name: string; fields: Field[]; index: string }

/** The gift tables (lib/services/gifts.ts): server-only rows, no client grants. */
const TABLES: Table[] = [
  {
    variable: "NEXT_PUBLIC_APPWRITE_GIFT_LINKS_COLLECTION_ID", name: "Gift links", index: "gift_links_event",
    fields: [
      { key: "eventId", type: "string", size: 36, required: true },
      { key: "createdBy", type: "string", size: 36, required: true },
      { key: "label", type: "string", size: 120, required: false },
      { key: "note", type: "string", size: 500, required: false },
      { key: "spots", type: "integer", min: 1, max: 20 },
      // Optional: links made before the organizer could choose need an account.
      { key: "allowGuests", type: "boolean" },
      { key: "status", type: "string", size: 20, required: true },
      { key: "createdAt", type: "datetime" },
    ],
  },
  {
    // Guests who claimed without an account. Row IDs are guest pass IDs; names and mobile numbers are for the organizer.
    variable: "NEXT_PUBLIC_APPWRITE_GIFT_GUESTS_COLLECTION_ID", name: "Gift guests", index: "gift_guests_event",
    fields: [
      { key: "eventId", type: "string", size: 36, required: true },
      { key: "linkId", type: "string", size: 36, required: true },
      { key: "name", type: "string", size: 80, required: true },
      { key: "phone", type: "string", size: 10, required: true },
      { key: "createdAt", type: "datetime" },
    ],
  },
];

async function waitFor(read: () => Promise<{ status: string }>, what: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    const { status } = await read();
    if (status === "available") return;
    if (["failed", "stuck"].includes(status)) throw new Error(`${what} unavailable`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`${what} timed out`);
}

async function ensureTable(databaseId: string, { variable, name, fields, index: indexKey }: Table): Promise<void> {
  const id = process.env[variable];
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(id)) throw new Error(`Set ${variable} (e.g. ${name.toLowerCase().replace(" ", "_")}) first`);
  const db = getScriptDatabases();
  let collection;
  try { collection = await db.getCollection({ databaseId, collectionId: id }); }
  catch (error) {
    if (!(error instanceof AppwriteException && error.code === 404)) throw error;
    const sameName = await db.listCollections({ databaseId, queries: [Query.equal("name", name)] });
    if (sameName.total) throw new Error(`A ${name} collection already exists. Use its ID; do not create a duplicate.`);
    collection = await db.createCollection({ databaseId, collectionId: id, name, permissions: [], documentSecurity: true });
  }
  // Link and pass IDs are claim secrets, and guests' numbers are private: never readable from a browser.
  if (!collection.documentSecurity || collection.$permissions.length) throw new Error(`${name} collection must be private with document security; refusing to change existing ACLs`);
  for (const field of fields) {
    const attributes = await db.listAttributes({ databaseId, collectionId: id });
    const existing = attributes.attributes.find(attribute => attribute.key === field.key) as { type: string; required: boolean; size?: number } | undefined;
    if (existing) {
      const required = field.type === "string" ? field.required : field.type !== "boolean";
      if (existing.type !== field.type || existing.required !== required || (field.type === "string" && existing.size !== field.size)) throw new Error(`${name} attribute mismatch: ${field.key}`);
      continue;
    }
    if (field.type === "string") await db.createStringAttribute({ databaseId, collectionId: id, key: field.key, size: field.size, required: field.required });
    else if (field.type === "integer") await db.createIntegerAttribute({ databaseId, collectionId: id, key: field.key, required: true, min: field.min, max: field.max });
    else if (field.type === "boolean") await db.createBooleanAttribute({ databaseId, collectionId: id, key: field.key, required: false, xdefault: false });
    else await db.createDatetimeAttribute({ databaseId, collectionId: id, key: field.key, required: true });
    await waitFor(() => db.getAttribute({ databaseId, collectionId: id, key: field.key }) as Promise<{ status: string }>, `${name} attribute ${field.key}`);
  }
  const indexes = await db.listIndexes({ databaseId, collectionId: id });
  const index = indexes.indexes.find(item => item.key === indexKey);
  if (index && (index.type !== "key" || JSON.stringify(index.attributes) !== JSON.stringify(["eventId"]))) throw new Error(`${name} event index mismatch`);
  if (!index) await db.createIndex({ databaseId, collectionId: id, key: indexKey, type: IndexType.Key, attributes: ["eventId"] });
  await waitFor(() => db.getIndex({ databaseId, collectionId: id, key: indexKey }), `${name} index`);
}

/** Explicit opt-in provisioning; never touches other tables, rows or ACLs. Safe to re-run. */
async function main() {
  const { databaseId } = getScriptConfig();
  for (const table of TABLES) await ensureTable(databaseId, table);
  console.log("PASS private gift link and gift guest schemas ready. Existing platform collections, rows and ACLs were not changed.");
}
main().catch(error => {
  console.error(error instanceof Error && !(error instanceof AppwriteException) ? error.message : "Gift links setup failed. Check configuration and schema-management key scopes; no credentials printed.");
  process.exitCode = 1;
});
