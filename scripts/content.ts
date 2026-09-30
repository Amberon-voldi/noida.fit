import { readFileSync } from "node:fs";
import { z } from "zod";
import { Permission, Query, Role } from "node-appwrite";
import { loadScriptEnv } from "./lib/env";
import { getScriptCollections, getScriptConfig, getScriptDatabases } from "./lib/appwrite";

loadScriptEnv();
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/);
const slug=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const safeUrl=z.string().url().refine(url=>new URL(url).protocol==="https:").optional();
const category=z.enum(["running","cycling","strength","sports","wellness","outdoor"]);
const common={id,slug,status:z.enum(["draft","published","cancelled"]),demo:z.boolean(),description:z.string().min(20).max(12000),tags:z.array(z.string().max(60)).max(20).optional()};
const schemas={
  activities:z.object({...common,name:z.string().min(2).max(128),emoji:z.string().max(16),imageUrl:safeUrl}).strict(),
  places:z.object({...common,name:z.string().min(2).max(128),category:z.string().max(80),sector:z.string().max(100),address:z.string().max(500),coordinates:z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180)}),amenities:z.array(z.string().max(100)),activities:z.array(slug),activeCommunitiesCount:z.literal(0).default(0),publicHours:z.string().max(200).optional(),parkingInfo:z.string().max(500).optional(),priceIndicator:z.string().max(100).optional(),featured:z.boolean().default(false),coverImageUrl:safeUrl,website:safeUrl}).strict(),
  communities:z.object({...common,name:z.string().min(2).max(128),category,activityId:id,tagline:z.string().max(250),baseLocation:z.string().max(100),primaryVenueSlug:slug,membersCount:z.literal(0).default(0),verified:z.boolean().default(false),featured:z.boolean().default(false),meetingDays:z.array(z.string().max(20)),captains:z.array(z.object({name:z.string().max(100),role:z.string().max(100),bio:z.string().max(500).optional()})),socialLinks:z.object({instagram:safeUrl,whatsapp:safeUrl,website:safeUrl,strava:safeUrl}),bannerUrl:safeUrl,crestUrl:safeUrl}).strict(),
  events:z.object({...common,title:z.string().min(2).max(200),category,activityId:id,communitySlug:slug,communityName:z.string().max(128),venueSlug:slug,venueName:z.string().max(128),sector:z.string().max(100),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),startTime:z.string().regex(/^\d{1,2}:\d{2} (AM|PM)$/),endTime:z.string().regex(/^\d{1,2}:\d{2} (AM|PM)$/),startsAt:z.string().datetime({offset:true}),endsAt:z.string().datetime({offset:true}),price:z.string().max(30),capacity:z.number().int().min(1).max(100000),attendeesCount:z.literal(0).default(0),featured:z.boolean().default(false),organizerUserId:id.optional(),coverImageUrl:safeUrl,level:z.string().max(100).optional(),distance:z.string().max(100).optional(),pace:z.string().max(200).optional(),routeOverview:z.string().max(2000).optional(),whatToBring:z.array(z.string().max(200)).optional()}).strict(),
};
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
    id.parse(input);if(confirm!=="--confirm")throw new Error("Deletion requires --confirm; prefer unpublish to preserve linked participation.");
    await db.deleteDocument({databaseId,collectionId,documentId:input});console.log("Content deleted; linked participation was preserved.");return;
  }
  if(operation==="unpublish"){
    id.parse(input);await db.updateDocument({databaseId,collectionId,documentId:input,data:{status:"draft"},permissions:[]});console.log("Content unpublished and public Appwrite read permission removed.");return;
  }
  const parsed=schemas[kind as keyof typeof schemas].parse(JSON.parse(readFileSync(input,"utf8")));
  const record=parsed as unknown as Record<string,unknown>;
  if(kind==="events" && Date.parse(String(record.endsAt))<=Date.parse(String(record.startsAt)))throw new Error("Event end must follow start");
  const columnKeys={events:["title","activityId","communitySlug","venueSlug","sector","date","startsAt","endsAt","capacity","featured","organizerUserId"],communities:["activityId"],places:["sector","featured"],activities:["name","emoji"]}[kind as keyof typeof schemas];
  const fields=Object.fromEntries(columnKeys.filter(key=>record[key]!==undefined).map(key=>[key,record[key]]));
  await db.upsertDocument({databaseId,collectionId,documentId:parsed.id,data:{...fields,slug:parsed.slug,status:parsed.status,demo:parsed.demo,payload:JSON.stringify(parsed)},permissions:parsed.status==="published"?[Permission.read(Role.any())]:[]});
  console.log("Content saved. Published content is public-read only; drafts remain private.");
}
main().catch(error=>{console.error(error instanceof z.ZodError ? `Content validation failed: ${error.issues.map(issue=>issue.path.join(".")).join(", ")}` : error instanceof Error && !("code" in error) ? error.message : "Content operation failed; check IDs, schema and API-key scopes.");process.exitCode=1;});
