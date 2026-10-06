import { AppwriteException, IndexType, Query } from "node-appwrite";
import { loadScriptEnv } from "./lib/env";
import { getScriptConfig, getScriptDatabases } from "./lib/appwrite";

loadScriptEnv();

/** Explicit opt-in provisioning; never touches existing content/private table ACLs. */
async function main() {
  const id = process.env.APPWRITE_ADMIN_AUDIT_COLLECTION_ID;
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(id)) throw new Error("Set APPWRITE_ADMIN_AUDIT_COLLECTION_ID to your chosen private collection ID first");
  const { databaseId } = getScriptConfig();
  const db = getScriptDatabases();
  let collection;
  try { collection = await db.getCollection({ databaseId, collectionId: id }); }
  catch (error) {
    if (!(error instanceof AppwriteException && error.code === 404)) throw error;
    const sameName = await db.listCollections({ databaseId, queries: [Query.equal("name", "Admin audit")] });
    if (sameName.total) throw new Error("An Admin audit collection already exists. Use its ID; do not create a duplicate.");
    collection = await db.createCollection({ databaseId, collectionId: id, name: "Admin audit", permissions: [], documentSecurity: true });
  }
  if (!collection.documentSecurity || collection.$permissions.length) throw new Error("Audit collection must be private with document security; refusing to change existing ACLs");
  const fields = [
    { key: "actorId", size: 36 }, { key: "action", size: 80 }, { key: "target", size: 160 },
    { key: "reason", size: 300 }, { key: "status", size: 20 },
    { key: "occurredAt", datetime: true }, { key: "finishedAt", datetime: true, optional: true },
  ];
  for (const field of fields) {
    const attributes = await db.listAttributes({ databaseId, collectionId: id });
    const existing = attributes.attributes.find(attribute => attribute.key === field.key);
    if (existing) {
      if (existing.required !== !field.optional || existing.type !== (field.datetime ? "datetime" : "string") || (field.size && !("size" in existing && existing.size === field.size))) throw new Error(`Audit attribute mismatch: ${field.key}`);
    } else if (field.datetime) {
      await db.createDatetimeAttribute({ databaseId, collectionId: id, key: field.key, required: !field.optional });
    } else {
      await db.createStringAttribute({ databaseId, collectionId: id, key: field.key, size: field.size!, required: true });
    }
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const attribute = await db.getAttribute({ databaseId, collectionId: id, key: field.key }) as { status: string };
      if (attribute.status === "available") { ready = true; break; }
      if (["failed", "stuck"].includes(attribute.status)) throw new Error(`Audit attribute unavailable: ${field.key}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error(`Audit attribute timed out: ${field.key}`);
  }
  const indexes = await db.listIndexes({ databaseId, collectionId: id });
  const index = indexes.indexes.find(index => index.key === "audit_time");
  if (index && (index.type !== "key" || JSON.stringify(index.attributes) !== JSON.stringify(["occurredAt"]))) throw new Error("Audit time index mismatch");
  if (!index) await db.createIndex({ databaseId, collectionId: id, key: "audit_time", type: IndexType.Key, attributes: ["occurredAt"] });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const current = await db.getIndex({ databaseId, collectionId: id, key: "audit_time" });
    if (current.status === "available") { ready = true; break; }
    if (["failed", "stuck"].includes(current.status)) throw new Error("Audit time index unavailable");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Audit index timed out");
  console.log("PASS private admin audit schema ready. Existing platform collections, rows and ACLs were not changed.");
}
main().catch(error => {
  console.error(error instanceof Error && !(error instanceof AppwriteException) ? error.message : "Audit setup failed. Check configuration and schema-management key scopes; no credentials printed.");
  process.exitCode = 1;
});
