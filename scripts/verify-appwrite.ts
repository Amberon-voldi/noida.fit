import assert from "node:assert/strict";
import { Client, Databases, Query } from "node-appwrite";
import { loadScriptEnv } from "./lib/env";
import { getScriptCollections, getScriptConfig, getScriptDatabases } from "./lib/appwrite";

loadScriptEnv();
async function main() {
  const config = getScriptConfig();
  const collections = getScriptCollections();
  const admin = getScriptDatabases();
  const guest = new Databases(new Client().setEndpoint(config.endpoint).setProject(config.projectId));
  const publicKinds = ["activities", "events", "communities", "places"];
  for (const [kind, id] of Object.entries(collections)) {
    const collection = await admin.getCollection({databaseId:config.databaseId,collectionId:id});
    assert.equal(collection.documentSecurity,true,`${kind}: document security`);
    assert.deepEqual(collection.$permissions,[],`${kind}: no collection-wide access`);
    for (const attribute of collection.attributes) assert.equal(attribute.status,"available",`${kind}: attribute ${attribute.key}`);
    for (const index of collection.indexes) assert.equal(index.status,"available",`${kind}: index ${index.key}`);
    const response=await admin.listDocuments({databaseId:config.databaseId,collectionId:id,queries:[Query.limit(100)]});
    for (const row of response.documents) {
      assert.ok(!row.$permissions.some(p=>/^(create|update|delete|write)\(/.test(p)),`${kind}: no direct client writes`);
      if(!publicKinds.includes(kind)) assert.ok(!row.$permissions.includes('read("any")'),`${kind}: no public read`);
    }
    let guestCount=0;
    try {guestCount=(await guest.listDocuments({databaseId:config.databaseId,collectionId:id,queries:[Query.limit(1)]})).total;}
    catch(error){ if (!(error && typeof error === "object" && "code" in error && [401,403].includes(Number(error.code))))throw error; }
    if(!publicKinds.includes(kind))assert.equal(guestCount,0,`${kind}: anonymous access denied`);
    console.log(`PASS ${kind}: attributes/indexes ready; ACL verified; records=${response.total}`);
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
