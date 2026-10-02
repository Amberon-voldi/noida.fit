import { Query } from "node-appwrite";
import { loadScriptEnv } from "./lib/env";
import { collectionKeys, getScriptCollections, getScriptConfig, getScriptDatabases } from "./lib/appwrite";
import { documentPermissions } from "./lib/permissions";

loadScriptEnv();

async function main() {
  if (process.argv.slice(2).some(arg => arg !== "--apply")) throw new Error("Use --apply to change permissions; otherwise this is a dry run.");
  const apply = process.argv.includes("--apply");
  const { databaseId } = getScriptConfig();
  const collections = getScriptCollections();
  const db = getScriptDatabases();
  const changes: { label: string; apply: () => Promise<unknown> }[] = [];

  // Validate every owner before making changes. Do not log IDs or document contents.
  for (const kind of collectionKeys) {
    const collectionId = collections[kind];
    const collection = await db.getCollection({ databaseId, collectionId });
    if (collection.$permissions.length || !collection.documentSecurity) {
      changes.push({ label: `${kind}: collection ACL`, apply: () => db.updateCollection({ databaseId, collectionId, name: collection.name, permissions: [], documentSecurity: true }) });
    }
    let cursor: string | undefined;
    while (true) {
      const { documents } = await db.listDocuments({ databaseId, collectionId, queries: [Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
      for (const row of documents) {
        const permissions = documentPermissions(kind, row);
        if (JSON.stringify([...row.$permissions].sort()) !== JSON.stringify(permissions)) {
          changes.push({ label: `${kind}: document ACL`, apply: () => db.updateDocument({ databaseId, collectionId, documentId: row.$id, permissions }) });
        }
      }
      if (documents.length < 100) break;
      cursor = documents[documents.length - 1].$id;
    }
  }
  for (const change of changes) {
    if (apply) await change.apply();
    console.log(`${apply ? "Updated" : "Would update"} ${change.label}`);
  }
  console.log(`${apply ? "Permissions synchronized" : "Dry run complete"}: ${changes.length} ACL changes; document data unchanged.`);
}

main().catch(() => {
  console.error("Permission sync failed. Check configuration, API-key scopes and document ownership. No credentials printed.");
  process.exitCode = 1;
});
