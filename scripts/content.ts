import { readFileSync } from "node:fs";
import { z } from "zod";
import { Permission, Query, Role } from "node-appwrite";
import { contentIdSchema, contentSchemas as schemas, validateSchedule } from "../lib/content-schema";
import { loadScriptEnv } from "./lib/env";
import { getScriptCollections, getScriptConfig, getScriptDatabases } from "./lib/appwrite";

loadScriptEnv();
async function main(){
  const [kind,operation,input,confirm]=process.argv.slice(2);
  if(!(kind in schemas)||!["list","put","unpublish","delete"].includes(operation))throw new Error("Usage: tsx scripts/content.ts events|places|communities|activities list|put|unpublish|delete [json-file|document-id] [--confirm]");
  const collectionId=getScriptCollections()[kind as keyof typeof schemas];const {databaseId}=getScriptConfig();const db=getScriptDatabases();
  if(operation==="list"){
    const data=await db.listDocuments({databaseId,collectionId,queries:[Query.limit(100)]});
    for(const row of data.documents)console.log(`${row.$id}\t${row.slug}\t${row.status}\tdemo=${row.demo}`);
    return;
  }
  if(operation==="delete"){
    contentIdSchema.parse(input);if(confirm!=="--confirm")throw new Error("Deletion requires --confirm; prefer unpublish to preserve linked participation.");
    await db.deleteDocument({databaseId,collectionId,documentId:input});console.log("Content deleted; linked participation was preserved.");return;
  }
  if(operation==="unpublish"){
    contentIdSchema.parse(input);await db.updateDocument({databaseId,collectionId,documentId:input,data:{status:"draft"},permissions:[]});console.log("Content unpublished and public Appwrite read permission removed.");return;
  }
  const parsed=schemas[kind as keyof typeof schemas].parse(JSON.parse(readFileSync(input,"utf8")));
  const record=parsed as unknown as Record<string,unknown>;
  validateSchedule(parsed);
  const columnKeys={events:["title","activityId","communitySlug","venueSlug","sector","date","startsAt","endsAt","capacity","featured","organizerUserId"],communities:["activityId"],places:["sector","featured"],activities:["name","emoji"]}[kind as keyof typeof schemas];
  const fields=Object.fromEntries(columnKeys.filter(key=>record[key]!==undefined).map(key=>[key,record[key]]));
  await db.upsertDocument({databaseId,collectionId,documentId:parsed.id,data:{...fields,slug:parsed.slug,status:parsed.status,demo:parsed.demo,payload:JSON.stringify(parsed)},permissions:parsed.status==="published"?[Permission.read(Role.any())]:[]});
  console.log("Content saved. Published content is public-read only; drafts remain private.");
}
main().catch(error=>{console.error(error instanceof z.ZodError ? `Content validation failed: ${error.issues.map(issue=>issue.path.join(".")).join(", ")}` : error instanceof Error && !("code" in error) ? error.message : "Content operation failed; check IDs, schema and API-key scopes.");process.exitCode=1;});
