import { test, expect, request as makeRequest, type APIRequestContext } from "@playwright/test";
import { Account, Client, Databases, ID, Permission, Query, Role, Users } from "node-appwrite";
import { createHash, randomBytes } from "node:crypto";
import { getScriptCollections, getScriptConfig } from "../../scripts/lib/appwrite";

const config = getScriptConfig();
const collections = getScriptCollections();
const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
const db = new Databases(client);
const users = new Users(client);
const createdUsers: string[] = [];
const createdEvents: string[] = [];
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const origin = new URL(baseURL).origin;
const participationDocumentId = (eventId: string, userId: string) => createHash("sha256").update(JSON.stringify(["participation", eventId, userId])).digest("hex").slice(0, 36);

async function testAccount() {
  const email = `nf-test-${randomBytes(8).toString("hex")}@example.com`;
  const password = `Nf!${randomBytes(18).toString("base64url")}7`;
  const user = await users.create({userId:ID.unique(),email,password,name:"Test participant"});
  createdUsers.push(user.$id);
  const session = await new Account(client).createEmailPasswordSession({email,password});
  const context = await makeRequest.newContext({baseURL,extraHTTPHeaders:{origin,Cookie:`noidafit_appwrite_session=${session.secret}`}});
  return {id:user.$id,context};
}
async function makeEvent(owner: string, capacity = 1) {
  const id = `test_${randomBytes(8).toString("hex")}`;
  const [community,place,activity] = await Promise.all([collections.communities,collections.places,collections.activities].map(collectionId=>db.listDocuments({databaseId:config.databaseId,collectionId,queries:[Query.limit(1)]})));
  const startsAt=new Date(Date.now()+15*60_000).toISOString();
  const endsAt=new Date(Date.now()+75*60_000).toISOString();
  const date=new Date(startsAt).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  const time=(iso:string)=>new Date(iso).toLocaleTimeString("en-US",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hour12:true});
  const placeData=JSON.parse(place.documents[0].payload);
  const communityData=JSON.parse(community.documents[0].payload);
  const payload={id,slug:id,title:"Verification session — temporary test",category:"running",activityId:activity.documents[0].$id,communitySlug:community.documents[0].slug,communityName:communityData.name,venueSlug:place.documents[0].slug,venueName:placeData.name,sector:place.documents[0].sector,date,startTime:time(startsAt),endTime:time(endsAt),startsAt,endsAt,price:"FREE",capacity,attendeesCount:0,description:"Temporary automated test fixture. Not a real event.",featured:false,demo:true,status:"published",organizerUserId:owner};
  await db.createDocument({databaseId:config.databaseId,collectionId:collections.events,documentId:id,permissions:[Permission.read(Role.any())],data:{slug:id,title:payload.title,activityId:payload.activityId,communitySlug:payload.communitySlug,venueSlug:payload.venueSlug,sector:payload.sector,date,startsAt,endsAt,featured:false,capacity,status:"published",demo:true,organizerUserId:owner,payload:JSON.stringify(payload)}});
  createdEvents.push(id);
  return {id,place:place.documents[0].$id,community:community.documents[0].$id};
}
async function mutation(context:APIRequestContext,path:string,data:object,method="POST") {return context.fetch(path,{method,data,headers:{origin}});}

// Fixtures contain no real users. Cleanup is strictly constrained to IDs created here.
test.afterAll(async()=>{
  for(const userId of createdUsers) {
    for(const collectionId of [collections.rsvps,collections.savedItems,collections.memberships,collections.checkins,collections.participations,collections.profiles,collections.fitnessIds]) {
      const rows=await db.listDocuments({databaseId:config.databaseId,collectionId,queries:[Query.equal("userId",userId),Query.limit(100)]});
      for(const row of rows.documents)await db.deleteDocument({databaseId:config.databaseId,collectionId,documentId:row.$id});
    }
    await users.delete({userId});
  }
  for(const documentId of createdEvents)await db.deleteDocument({databaseId:config.databaseId,collectionId:collections.events,documentId});
});

test("discovery is usable at mobile and desktop widths with a real backend",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.name));
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    for(const path of ["/","/discover?q=running","/activities","/places","/communities","/events"]){
      const response=await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByText("Demo directory.", {exact:true})).toHaveCount(0);
      if (width < 768 && ["/discover?q=running", "/places", "/communities", "/events"].includes(path)) {
        await expect(page.getByRole("navigation", {name:"Quick activity filters"})).toBeHidden();
        const firstCard = page.locator(".directory-results article").first();
        if (await firstCard.count()) expect((await firstCard.boundingBox())!.y).toBeLessThan(360);
        expect((await page.locator(".directory-header").boundingBox())!.height).toBeLessThanOrEqual(64);
      }
      const bottomNav = page.getByRole("navigation", {name:"Quick navigation"});
      if (width < 1024) {
        await expect(bottomNav).toBeVisible();
        expect((await bottomNav.boundingBox())!.width).toBe(width);
        await expect(bottomNav.getByRole("link")).toHaveCount(5);
      } else {
        await expect(bottomNav).toBeHidden();
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await page.getByRole("button",{name:"Open navigation menu"}).click();
  const menu = page.getByRole("dialog",{name:"Navigation menu"});
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", {name:"Events", exact:true})).toHaveCount(0);
  await expect(menu.getByRole("link", {name:"All activities", exact:true})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button",{name:"Open navigation menu"})).toBeFocused();
  await page.goto("/activities/running");await expect(page.locator("h1")).toContainText(/running/i);
  await page.goto("/discover?q=zzzznomatch123");await expect(page.getByText(/no .*match|nothing.*yet|no .*found/i).first()).toBeVisible();
  await page.goto("/login");
  const bottomNav = page.getByRole("navigation", {name:"Quick navigation"});
  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole("link", {name:"Account"})).toHaveAttribute("aria-current", "page");
  await bottomNav.getByRole("link", {name:"Home", exact:true}).click();
  await expect(page).toHaveURL(`${origin}/`);
  expect(errors).toEqual([]);
});

test("mobile filter sheet preserves search, submits filters, and respects reduced motion", async ({page}) => {
  await page.setViewportSize({width:320,height:740});
  await page.goto("/discover?type=events&q=running");
  const filters = page.getByRole("button", {name:/^Filters/});
  await expect(page.locator("#filter-type")).toHaveCount(0);
  await filters.click();
  const sheet = page.getByRole("dialog", {name:"Refine your search"});
  await expect(sheet).toBeVisible();
  expect(await sheet.evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await sheet.evaluate(node => node.contains(document.activeElement))).toBe(true);
  await sheet.getByRole("combobox", {name:"Activity",exact:true}).selectOption("running");
  await sheet.getByRole("group", {name:"Cost",exact:true}).getByText("Free", {exact:true}).click();
  await sheet.getByRole("group", {name:"Date · events only",exact:true}).getByText("Weekend", {exact:true}).click();
  await page.getByLabel("Sector / neighbourhood").fill("Sector 21A");
  await page.keyboard.press("Escape");
  await expect(filters).toBeFocused();
  await filters.click();
  await expect(sheet.getByRole("radio", {name:"Free",exact:true})).toBeChecked();
  expect(await page.locator("form[role=search]").evaluate(node => new FormData(node as HTMLFormElement).getAll("price"))).toEqual(["free"]);
  await page.getByRole("button", {name:"Apply filters",exact:true}).click();
  await page.waitForURL(url => url.searchParams.get("price") === "free" && url.searchParams.get("date") === "weekend");
  const params = new URL(page.url()).searchParams;
  expect(params.get("q")).toBe("running");
  expect(params.get("type")).toBe("events");
  expect(params.get("activity")).toBe("running");
  expect(params.get("sector")).toBe("Sector 21A");
  await expect(sheet).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await filters.click();
  await sheet.getByRole("link", {name:"Reset",exact:true}).click();
  await page.waitForURL(url => !url.search);
  const dock = page.getByRole("navigation", {name:"Quick navigation"});
  await dock.getByRole("link", {name:"Events",exact:true}).click();
  await expect(dock.getByRole("link", {name:"Events",exact:true})).toHaveAttribute("aria-current","page");
  expect(await dock.locator(".mobile-dock-inner").evaluate(node => getComputedStyle(node).getPropertyValue("--active-tab").trim())).toBe("2");
  for (const link of await dock.getByRole("link").all()) {
    const box = (await link.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  expect(await page.locator("h1").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  expect(await dock.locator(".mobile-dock-indicator").evaluate(node => parseFloat(getComputedStyle(node).transitionDuration))).toBeLessThan(0.01);
  await page.goto("/discover");
  await page.getByRole("button", {name:/^Filters/}).click();
  await expect(sheet).toBeVisible();
  expect(await sheet.locator(".filter-dialog-panel").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  await page.setViewportSize({width:1440,height:900});
  await sheet.getByRole("combobox", {name:"Cost",exact:true}).selectOption("paid");
  expect(await page.locator("form[role=search]").evaluate(node => new FormData(node as HTMLFormElement).getAll("price"))).toEqual(["paid"]);
  await page.setViewportSize({width:390,height:844});
  await expect(sheet.getByRole("radio", {name:"Paid",exact:true})).toBeChecked();
});

test("signup → save/follow/RSVP → organizer check-in → private/public Fitness ID → logout",async({page})=>{
  test.setTimeout(240_000);
  const email=`nf-test-${randomBytes(8).toString("hex")}@example.com`;
  const password=`Nf!${randomBytes(18).toString("base64url")}7`;
  const username=`test-${randomBytes(6).toString("hex")}`;
  await page.goto("/signup?callbackUrl=/account");
  await page.getByLabel("Display name",{exact:true}).fill("Noida Test Member");
  await page.getByLabel("Username",{exact:true}).fill(username);
  await page.getByLabel("Email",{exact:true}).fill(email);
  await page.getByLabel("Password",{exact:true}).fill(password);
  const signup=page.waitForResponse(r=>r.url().includes("/api/auth/signup")&&r.request().method()==="POST");
  await page.getByRole("button",{name:"Create Fitness ID",exact:true}).click();
  expect((await signup).status()).toBe(200);
  // Read identity in the test runner only, never send an API key to the browser.
  const user=(await users.list({queries:[Query.equal("email",email)]})).users[0];
  expect(Boolean(user)).toBe(true);createdUsers.push(user.$id);
  await expect(page).toHaveURL(/\/account/);
  const cookie=(await page.context().cookies()).find(c=>c.name==="noidafit_appwrite_session");
  expect(Boolean(cookie?.httpOnly)).toBe(true);expect(cookie?.sameSite).toBe("Lax");
  const ctx=page.request;
  const event=await makeEvent(user.$id);
  const guest=await makeRequest.newContext({baseURL});
  try {
    expect((await guest.get(`/api/profile/public?username=${username}`)).status()).toBe(404);
    expect((await guest.post("/api/participation/rsvp",{data:{eventId:event.id},headers:{origin}})).status()).toBe(401);
    for(const item of [{itemType:"event",itemId:event.id},{itemType:"place",itemId:event.place},{itemType:"community",itemId:event.community}])expect((await mutation(ctx,"/api/participation/saved",item)).status()).toBe(200);
    expect((await mutation(ctx,"/api/participation/follow",{communityId:event.community})).status()).toBe(200);
    await page.goto(`/event/${event.id}`);
    const rsvpButton = page.getByRole("button",{name:"RSVP",exact:true});
    await expect(rsvpButton).toBeEnabled();
    await rsvpButton.click();
    await expect(page.getByRole("button",{name:"You're going",exact:true})).toBeVisible();
    const pair=await Promise.all([mutation(ctx,"/api/participation/rsvp",{eventId:event.id}),mutation(ctx,"/api/participation/rsvp",{eventId:event.id})]);
    expect(pair.map(r=>r.status())).toEqual([200,200]);
    expect((await ctx.post("/api/participation/saved",{data:{itemType:"event",itemId:event.id},headers:{origin:"https://cross-origin.invalid"}})).status()).toBe(403);
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 900});
      await page.goto("/account");
      await expect(page.getByRole("heading", {name:/Fitness ID/}).first()).toBeVisible();
      await expect(page.getByRole("heading", {name:"Your plans", exact:true})).toBeVisible();
      await expect(page.getByRole("heading", {name:"Account & privacy", exact:true})).toBeVisible();
      await expect(page.getByRole("navigation", {name:"Account sections"}).getByRole("link")).toHaveCount(4);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
      await page.getByRole("link", {name:"Profile & privacy", exact:true}).click();
      await expect(page.getByRole("heading", {name:/^Profile settings/})).toBeVisible();
      await expect(page.getByLabel("Display name", {exact:true})).toBeVisible();
    }
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto("/account");
    await expect(page.getByText("Verification session — temporary test").first()).toBeVisible();
    await page.getByRole("button",{name:/Open Fitness ID for/}).click();await page.getByRole("button",{name:"Card details",exact:true}).click();
    await expect(page.getByText("Your profile is private",{exact:true})).toBeVisible();
    const second=await testAccount();const third=await testAccount();
    try {
      expect((await mutation(second.context,"/api/participation/rsvp",{eventId:event.id})).status()).toBe(409);
      expect((await mutation(second.context,"/api/check-in/organizer",{eventId:event.id})).status()).toBe(403);
      const race=await makeEvent(user.$id,1);
      const racing=await Promise.all([mutation(second.context,"/api/participation/rsvp",{eventId:race.id}),mutation(third.context,"/api/participation/rsvp",{eventId:race.id})]);
      expect(racing.map(r=>r.status()).sort()).toEqual([200,409]);
      await page.goto("/organizer");
      await expect(page.getByRole("heading", {name:"Run the session, not the spreadsheet."})).toBeVisible();
      await expect(page.getByRole("heading", {name:"Open event check-in"})).toBeVisible();
      await expect(page.getByText("privacy-safe attendee list", {exact:false}).first()).toBeVisible();
      const codeResponse=await mutation(ctx,"/api/check-in/organizer",{eventId:event.id});expect(codeResponse.status()).toBe(200);
      const {token}=await codeResponse.json();
      expect((await mutation(second.context,"/api/check-in",{token})).status()).toBe(403);
      expect((await mutation(ctx,"/api/check-in",{token:token.slice(0,-2)+"xx"})).status()).toBe(400);
      await db.createDocument({databaseId:config.databaseId,collectionId:collections.participations,documentId:participationDocumentId(event.id,user.$id),permissions:[Permission.read(Role.user(user.$id))],data:{userId:user.$id,eventId:event.id,activityId:"activity_test",title:"Pending attendance",occurredAt:new Date().toISOString(),source:"self_reported",status:"pending"}});
      expect((await mutation(ctx,"/api/check-in",{token})).status()).toBe(200);
      const repairedParticipation=await db.getDocument({databaseId:config.databaseId,collectionId:collections.participations,documentId:participationDocumentId(event.id,user.$id)});
      expect(repairedParticipation.status).toBe("verified");
      expect(repairedParticipation.source).toBe("organizer_checkin");
      expect((await mutation(ctx,"/api/check-in",{token})).status()).toBe(200);
      expect((await mutation(ctx,"/api/participation/rsvp",{eventId:event.id},"DELETE")).status()).toBe(409);
    } finally {await second.context.dispose();await third.context.dispose();}
    expect((await guest.get("/api/participation?view=controls")).status()).toBe(401);
    const controlsResponse = await ctx.get("/api/participation?view=controls");
    expect(controlsResponse.status()).toBe(200);
    expect(controlsResponse.headers()["cache-control"]).toBe("private, no-store");
    const controls = await controlsResponse.json();
    expect(Object.keys(controls).sort()).toEqual(["memberships", "rsvps", "savedItems"]);
    const participation=await (await ctx.get("/api/participation")).json();
    expect(controls).toEqual({ memberships: participation.memberships, rsvps: participation.rsvps, savedItems: participation.savedItems });
    expect(participation.rsvps.length).toBe(1);expect(participation.savedItems.length).toBe(3);expect(participation.memberships.length).toBe(1);expect(participation.checkins.length).toBe(1);expect(participation.participations.length).toBe(1);expect(participation.participations[0].status).toBe("verified");
    const settings=await mutation(ctx,"/api/profile",{visibility:"public",showActivity:true,showCommunities:true},"PATCH");expect(settings.status()).toBe(200);
    const publicResponse=await guest.get(`/api/profile/public?username=${username}`);expect(publicResponse.status()).toBe(200);
    const publicBody=await publicResponse.text();expect(publicBody.includes(email)).toBe(false);expect(publicBody.includes(user.$id)).toBe(false);expect(publicBody.includes("password")).toBe(false);
    const profile=JSON.parse(publicBody).profile;expect(profile.activity.verifiedActivities).toBe(1);expect(profile.activity.eventsAttended).toBe(1);
    await page.goto(`/@${username}`);await expect(page.locator("h1")).toBeVisible();
    await page.getByRole("button",{name:/Open Fitness ID for/}).click();await page.getByRole("button",{name:"Show profile QR",exact:true}).click();
    await expect(page.getByRole("img",{name:`Public profile QR code for @${username}`})).toBeVisible();
    // Owner reads allowed, guest/owner writes denied at the Appwrite layer too.
    const ownerDb=new Databases(new Client().setEndpoint(config.endpoint).setProject(config.projectId).setSession(cookie!.value));
    expect(Boolean(await ownerDb.getDocument({databaseId:config.databaseId,collectionId:collections.profiles,documentId:user.$id}))).toBe(true);
    let writeDenied=false;try{await ownerDb.updateDocument({databaseId:config.databaseId,collectionId:collections.profiles,documentId:user.$id,data:{bio:"A direct client must not change this field"}});}catch{writeDenied=true;}expect(writeDenied).toBe(true);
    const hide=await mutation(ctx,"/api/profile",{visibility:"private"},"PATCH");expect(hide.status()).toBe(200);expect((await guest.get(`/api/profile/public?username=${username}`)).status()).toBe(404);
    expect((await mutation(ctx,"/api/auth/logout",{})).status()).toBe(200);
    expect((await ctx.get("/api/participation")).status()).toBe(401);
    const restored=await mutation(ctx,"/api/auth/login",{email,password,callbackUrl:"/events"});expect(restored.status()).toBe(200);
    expect((await ctx.get("/api/participation")).status()).toBe(200);
    await mutation(ctx,"/api/auth/logout",{});
  }finally {await guest.dispose();}
});
