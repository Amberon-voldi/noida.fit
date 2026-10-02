import assert from "node:assert/strict";
import { Client, Databases, Query } from "node-appwrite";
import { loadScriptEnv } from "./lib/env";
import { collectionKeys, getScriptCollections, getScriptConfig, getScriptDatabases } from "./lib/appwrite";
import { documentPermissions, publicCollections } from "./lib/permissions";

loadScriptEnv();
async function main() {
  const config = getScriptConfig();
  const collections = getScriptCollections();
  const admin = getScriptDatabases();
  const guest = new Databases(new Client().setEndpoint(config.endpoint).setProject(config.projectId));
  for (const kind of collectionKeys) {
    const id = collections[kind];
    const collection = await admin.getCollection({databaseId:config.databaseId,collectionId:id});
    assert.equal(collection.documentSecurity,true,`${kind}: document security`);
    assert.deepEqual(collection.$permissions,[],`${kind}: no collection-wide access`);
    for (const attribute of collection.attributes) assert.equal(attribute.status,"available",`${kind}: attribute ${attribute.key}`);
    for (const index of collection.indexes) assert.equal(index.status,"available",`${kind}: index ${index.key}`);
    let cursor: string | undefined;
    let records = 0;
    let published = 0;
    while (true) {
      const response=await admin.listDocuments({databaseId:config.databaseId,collectionId:id,queries:[Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])]});
      records += response.documents.length;
      for (const row of response.documents) {
        // Avoid assertion diffs that could print owner IDs.
        assert.ok(JSON.stringify([...row.$permissions].sort()) === JSON.stringify(documentPermissions(kind, row)), `${kind}: document ACL does not match policy`);
        if (publicCollections.has(kind) && row.status === "published") published++;
      }
      if (response.documents.length < 100) break;
      cursor = response.documents[response.documents.length - 1].$id;
    }
    let guestCount=0;
    try {guestCount=(await guest.listDocuments({databaseId:config.databaseId,collectionId:id,queries:[Query.limit(1)]})).total;}
    catch(error){ if (!(error && typeof error === "object" && "code" in error && [401,403].includes(Number(error.code))))throw error; }
    assert.equal(guestCount, publicCollections.has(kind) ? published : 0, `${kind}: guests must see exactly the published public records`);
    console.log(`PASS ${kind}: attributes/indexes ready; ACL verified; records=${records}; anonymous=${guestCount}`);
  }
  const [events,communities,places,activities]=await Promise.all([collections.events,collections.communities,collections.places,collections.activities].map(collectionId=>admin.listDocuments({databaseId:config.databaseId,collectionId,queries:[Query.limit(100)]})));
  for(const event of events.documents){
    assert.ok(communities.documents.some(c=>c.slug===event.communitySlug),"event community reference exists");
    assert.ok(places.documents.some(p=>p.slug===event.venueSlug),"event venue reference exists");
    assert.ok(activities.documents.some(a=>a.$id===event.activityId),"event activity reference exists");
    assert.ok(Date.parse(event.endsAt)>Date.parse(event.startsAt),"event duration positive");
  }
  console.log("PASS content references and schedules; no credentials printed.");
}
main().catch(error=>{console.error("Appwrite verification failed:",error instanceof assert.AssertionError ? error.message : "backend request failed (check configuration/scopes)");process.exitCode=1;});
