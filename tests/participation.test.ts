import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyParticipantCheckInToken, eventWindow, rsvpDocumentId, savedItemDocumentId, checkInInputSchema, CHECKIN_TOKEN_TTL } from "../lib/services/participation";
import { assertSameOrigin, assertRateLimit, safeCallbackUrl, readJson, HttpError } from "../lib/http";
import { participantQrValue, participantTokenFromQr } from "../lib/check-in-qr";
import { z } from "zod";

const secret="test-only-check-in-signing-key-".repeat(3);
process.env.APPWRITE_CHECKIN_SECRET=secret;
function signed(payload: object) {const value=Buffer.from(JSON.stringify(payload)).toString("base64url");return `${value}.${createHmac("sha256",secret).update(value).digest("base64url")}`;}

test("signed participant check-in rejects forged, expired, wrong-purpose and oversized tokens",()=>{
  const now=Date.now();
  const payload={v:1,purpose:"participant-checkin",fitnessId:"NF-0123456789ABCDEF",iat:now-100,exp:now+CHECKIN_TOKEN_TTL-100};
  const token=signed(payload);
  assert.equal(verifyParticipantCheckInToken(token).fitnessId,payload.fitnessId);
  assert.throws(()=>verifyParticipantCheckInToken(signed({...payload,purpose:"event-checkin"})),HttpError);
  assert.throws(()=>verifyParticipantCheckInToken(token.slice(0,-2)+"xx"),HttpError);
  assert.throws(()=>verifyParticipantCheckInToken(signed({...payload,iat:now-1000,exp:now-1})),HttpError);
  assert.throws(()=>verifyParticipantCheckInToken(signed({...payload,exp:now+CHECKIN_TOKEN_TTL+1000})),HttpError);
  assert.throws(()=>verifyParticipantCheckInToken(signed({...payload,iat:now+10000})),HttpError);
  assert.throws(()=>checkInInputSchema.parse({eventId:"event",token:"x".repeat(2100)}));
});
test("participant QR framing never treats public profile links as attendance credentials",()=>{
  const token=signed({v:1,purpose:"participant-checkin",fitnessId:"NF-0123456789ABCDEF",iat:Date.now(),exp:Date.now()+1000});
  assert.equal(participantTokenFromQr(participantQrValue(token)),token);
  assert.equal(participantTokenFromQr(` ${token} `),token);
  for(const value of ["https://noida.fit/@member","https://noida.fit/check-in?token=old","NF-0123456789ABCDEF", "NF-CHECKIN:invalid"]) assert.throws(()=>participantTokenFromQr(value));
});
test("only the operator desk gets a bounded higher throughput; ordinary mutation limits remain unchanged",()=>{
  const request=new Request("https://noida.fit/api/check-in/organizer");
  for(let i=0;i<5;i++)assertRateLimit(request,"ordinary-checkin-test","member");
  assert.throws(()=>assertRateLimit(request,"ordinary-checkin-test","member"),HttpError);
  for(let i=0;i<120;i++)assertRateLimit(request,"operator-checkin-test","operator",120);
  assert.throws(()=>assertRateLimit(request,"operator-checkin-test","operator",120),HttpError);
});
test("deterministic IDs stay private and separate users and entity types",()=>{
  const id=rsvpDocumentId("event-1","user-1");
  assert.equal(id,rsvpDocumentId("event-1","user-1"));assert.equal(id.length,36);
  assert.notEqual(id,rsvpDocumentId("event-1","user-2"));
  assert.notEqual(savedItemDocumentId("event","one","user"),savedItemDocumentId("place","one","user"));
});
test("check-in window bounds and malformed times",()=>{
  const w=eventWindow({startsAt:"2026-10-01T06:00:00+05:30",endsAt:"2026-10-01T07:00:00+05:30"});
  assert.equal(w.start-w.opensAt,30*60_000);assert.equal(w.closesAt-w.end,60*60_000);
  assert.throws(()=>eventWindow({startsAt:"junk",endsAt:"junk"}),HttpError);
});
test("CSRF protection rejects missing/cross origins and callbacks cannot escape site",()=>{
  const original=process.env.NEXT_PUBLIC_SITE_URL;delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    assert.doesNotThrow(()=>assertSameOrigin(new Request("https://noida.fit/api/test",{headers:{origin:"https://noida.fit"}})));
    assert.throws(()=>assertSameOrigin(new Request("https://noida.fit/api/test",{headers:{origin:"https://evil.test"}})),HttpError);
    assert.throws(()=>assertSameOrigin(new Request("https://noida.fit/api/test")),HttpError);
    assert.throws(()=>assertSameOrigin(new Request("https://noida.fit/api/test",{headers:{origin:"https://noida.fit","sec-fetch-site":"cross-site"}})),HttpError);
  }finally {if(original)process.env.NEXT_PUBLIC_SITE_URL=original;}
  for(const value of ["//evil.test","https://evil.test","/\\evil.test","/\n/evil.test"])assert.equal(safeCallbackUrl(value),"/account");
  assert.equal(safeCallbackUrl("/events?activity=running"),"/events?activity=running");
});
test("body validation enforces content-type and actual stream limits",async()=>{
  const schema=z.object({value:z.string()}).strict();
  await assert.rejects(()=>readJson(new Request("https://noida.fit",{method:"POST",body:'{}'}),schema),HttpError);
  await assert.rejects(()=>readJson(new Request("https://noida.fit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({value:"x".repeat(9000)})}),schema),HttpError);
  const result=await readJson(new Request("https://noida.fit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({value:"hello"})}),schema);
  assert.equal(result.value,"hello");
});
