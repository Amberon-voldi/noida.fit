import "server-only";

import { randomBytes, randomInt } from "node:crypto";
import { cache } from "react";
import type { Models } from "node-appwrite";
import { appwriteCollections } from "@/lib/appwrite/config";
import {
  createAppwriteDocument,
  getAppwriteDocument,
  listAppwriteDocuments,
  Query,
  userDocumentPermissions,
} from "@/lib/appwrite/database";
import { getAdminServices, getAppwriteDatabaseConfig } from "@/lib/appwrite/server";
import { getAccountParticipation, type AccountParticipation } from "@/lib/participation";
import { getCommunities } from "@/lib/data";
import type { FitnessProfile, ProfileSettings } from "@/types/user";
import { profileSettingsSchema, usernameSchema } from "@/components/auth/validation";

/** Exact storage payload; never submit Appwrite `$` metadata. */
export interface ProfileData {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  city: string;
  fitnessId: string;
  memberSince: string;
  visibility: "public" | "private";
  showActivity: boolean;
  showCommunities: boolean;
  notifications: boolean;
}

interface FitnessIdData {
  userId: string;
  publicId: string;
  status: string;
  memberSince: string;
}

export class UsernameConflictError extends Error {
  constructor() {
    super("That username is already in use. Choose another one.");
    this.name = "UsernameConflictError";
  }
}

function isConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 409;
}

export function isValidUsername(value: string): boolean {
  const parsed = usernameSchema.safeParse(value);
  return parsed.success && parsed.data === value;
}

/** Lowercase ASCII handle text: accents dropped, anything else becomes single hyphens. */
function handleText(value: string, max: number): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").slice(0, max).replace(/^-+|-+$/g, "");
}

/** A readable base for a new username: the name, else the email's local part (without +tags), else "member". */
export function usernameBase(name: string, email = ""): string {
  const fromName = handleText(name, 30);
  if (fromName.length >= 3) return fromName;
  const fromEmail = handleText(email.split("@")[0].split("+")[0], 30);
  return fromEmail.length >= 3 ? fromEmail : "member";
}

/**
 * Candidates in the order they are tried against the unique username index:
 * "rahul-sharma", then a short number, then a longer one, then random hex. All stay within 40 characters.
 */
export function usernameCandidate(base: string, attempt: number): string {
  if (attempt === 0) return base;
  if (attempt === 1) return `${base}-${randomInt(10, 100)}`;
  if (attempt === 2) return `${base}-${randomInt(1000, 10000)}`;
  return `${base}-${randomBytes(4).toString("hex")}`;
}

async function findProfileByUsername(username: string): Promise<ProfileData | null> {
  const rows = await listAppwriteDocuments<ProfileData>(appwriteCollections.profiles, [
    Query.equal("username", username), Query.limit(1),
  ]);
  return rows[0] ?? null;
}

export async function assertUsernameAvailable(username: string, currentUserId?: string): Promise<void> {
  if (!isValidUsername(username)) throw new Error("Invalid username");
  const existing = await findProfileByUsername(username);
  if (existing && existing.userId !== currentUserId) throw new UsernameConflictError();
}

export async function getProfileDocumentByUserId(userId: string): Promise<ProfileData | null> {
  return getAppwriteDocument<ProfileData>(appwriteCollections.profiles, userId);
}

async function ensureFitnessId(profile: ProfileData, fresh = false): Promise<void> {
  if (!fresh && await getAppwriteDocument<FitnessIdData>(appwriteCollections.fitnessIds, profile.userId)) return;
  try {
    await createAppwriteDocument<FitnessIdData>(appwriteCollections.fitnessIds, {
      userId: profile.userId,
      publicId: profile.fitnessId,
      status: "active",
      memberSince: profile.memberSince,
    }, profile.userId, userDocumentPermissions(profile.userId));
  } catch (error) {
    if (!isConflict(error) || !(await getAppwriteDocument<FitnessIdData>(appwriteCollections.fitnessIds, profile.userId))) throw error;
  }
}

/**
 * Idempotent repair for interrupted signup. Existing settings are never reset.
 * Login without a profile uses a random-suffixed username, avoiding conflicts
 * from display names. Only explicit signup/settings handles claim an exact name.
 */
export async function ensureProfileForUser(
  user: Models.User<Models.Preferences>,
  options: {
    preferredUsername?: string; displayName?: string;
    /** Used for the generated username when the name gives too little to work with. */
    email?: string;
    /** The account was created in this request: skip lookups for rows that cannot exist yet. */
    fresh?: boolean;
  } = {},
): Promise<ProfileData> {
  let profile = options.fresh ? null : await getProfileDocumentByUserId(user.$id);
  if (!profile) {
    // A signup preflight already checked an explicit choice; repairs re-check it here.
    if (options.preferredUsername && !options.fresh) await assertUsernameAvailable(options.preferredUsername, user.$id);
    const base = usernameBase(options.displayName || user.name, options.email ?? user.email);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const data: ProfileData = {
        userId: user.$id,
        // No preflight query for generated names: the unique index decides, and a clash tries the next candidate.
        username: options.preferredUsername || usernameCandidate(base, attempt),
        displayName: options.displayName || user.name || "Noida member",
        city: "Noida",
        fitnessId: `NF-${randomBytes(8).toString("hex").toUpperCase()}`,
        memberSince: user.$createdAt || new Date().toISOString(),
        visibility: "private",
        showActivity: false,
        showCommunities: false,
        notifications: false,
      };
      try {
        profile = await createAppwriteDocument<ProfileData>(
          appwriteCollections.profiles, data, user.$id, userDocumentPermissions(user.$id),
        );
        break;
      } catch (error) {
        if (!isConflict(error)) throw error;
        // Another request may already have repaired this exact account.
        profile = await getProfileDocumentByUserId(user.$id);
        if (profile) break;
        if (options.preferredUsername) await assertUsernameAvailable(options.preferredUsername, user.$id);
        if (attempt === 3) throw error;
      }
    }
  }
  if (!profile) throw new Error("Profile could not be created");
  await ensureFitnessId(profile, options.fresh);
  return profile;
}

export function profileSettings(profile: ProfileData): ProfileSettings {
  return {
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio || "",
    city: profile.city,
    visibility: profile.visibility === "public" ? "public" : "private",
    showActivity: profile.showActivity === true,
    showCommunities: profile.showCommunities === true,
    notifications: profile.notifications === true,
  };
}

function indiaWeek(value: string): number | null {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const local = new Date(timestamp + 330 * 60_000);
  local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7);
  local.setUTCHours(0, 0, 0, 0);
  return local.getTime();
}

/** Only actual organizer-verified records count. RSVPs and saves never do. */
export function participationStats(data: AccountParticipation, now = new Date()) {
  const occurred = (value: string) => Number.isFinite(Date.parse(value)) && Date.parse(value) <= now.getTime();
  const checkins = data.checkins.filter((item) => occurred(item.timestamp));
  const eventDates = new Map(checkins.map((item) => [item.eventId, item.timestamp]));
  const verified = data.participations.filter((item) => item.status === "verified" && occurred(item.occurredAt));
  for (const item of verified) {
    if (item.eventId && !eventDates.has(item.eventId)) eventDates.set(item.eventId, item.occurredAt);
  }
  // A check-in and its derived participation are one activity, even if a
  // repaired record has a different timestamp. They cannot extend two weeks.
  const dates = [...eventDates.values(), ...verified.filter((item) => !item.eventId).map((item) => item.occurredAt)];
  const weeks = new Set(dates.map(indiaWeek).filter((value): value is number => value !== null));
  let cursor = indiaWeek(now.toISOString())!;
  const week = 7 * 24 * 60 * 60_000;
  // A member keeps last week's streak while this week is still in progress.
  if (!weeks.has(cursor)) cursor -= week;
  let streakWeeks = 0;
  while (weeks.has(cursor)) { streakWeeks += 1; cursor -= week; }
  return {
    verifiedActivities: dates.length,
    eventsAttended: eventDates.size,
    communitiesJoined: new Set(data.memberships.filter((item) => item.status === "active").map((item) => item.communityId)).size,
    streakWeeks,
  };
}

export function toFitnessProfile(
  profile: ProfileData,
  data: AccountParticipation,
  publicView = false,
  communitySlugs: string[] = [],
): FitnessProfile {
  if (publicView && profile.visibility !== "public") throw new Error("Profile is private");
  const stats = participationStats(data);
  const showActivity = !publicView || profile.showActivity === true;
  const showCommunities = !publicView || profile.showCommunities === true;
  // Explicit allowlist: no auth id/email/prefs/doc metadata/raw history.
  return {
    id: profile.fitnessId,
    name: profile.displayName,
    slug: profile.username,
    handle: `@${profile.username}`,
    cardNumber: profile.fitnessId,
    joinedAt: profile.memberSince,
    ...(profile.bio ? { bio: profile.bio } : {}),
    ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    city: profile.city,
    visibility: profile.visibility === "public" ? "public" : "private",
    showActivity: profile.showActivity === true,
    showCommunities: profile.showCommunities === true,
    communityMemberships: showCommunities ? communitySlugs : [],
    stats: {
      verifiedActivities: showActivity ? stats.verifiedActivities : null,
      eventsAttended: showActivity ? stats.eventsAttended : null,
      streakWeeks: showActivity ? stats.streakWeeks : null,
      communitiesJoined: showCommunities ? stats.communitiesJoined : null,
    },
  };
}

export async function getProfileByUserId(userId: string): Promise<FitnessProfile | null> {
  const profile = await getProfileDocumentByUserId(userId);
  return profile ? toFitnessProfile(profile, await getAccountParticipation(userId)) : null;
}

export const getPublicProfileByUsername = cache(async (username: string): Promise<FitnessProfile | null> => {
  const clean = username.replace(/^@/, "").trim().toLowerCase();
  if (!isValidUsername(clean)) return null;
  const profile = await findProfileByUsername(clean);
  if (!profile || profile.visibility !== "public") return null;
  const empty: AccountParticipation = { rsvps: [], savedItems: [], memberships: [], participations: [], checkins: [] };
  const participation = profile.showActivity || profile.showCommunities
    ? await getAccountParticipation(profile.userId) : empty;
  const communities = profile.showCommunities ? await getCommunities() : [];
  const ids = new Set(participation.memberships.filter((item) => item.status === "active").map((item) => item.communityId));
  return toFitnessProfile(profile, participation, true, communities.filter((item) => ids.has(item.id)).map((item) => item.slug));
});

export async function updateProfileForUser(
  user: Models.User<Models.Preferences>,
  updates: Partial<ProfileSettings>,
): Promise<ProfileSettings> {
  const validated = profileSettingsSchema.partial().parse(updates);
  const existing = await ensureProfileForUser(user);
  if (validated.username !== undefined) await assertUsernameAvailable(validated.username, user.$id);
  const { databases } = getAdminServices();
  const { databaseId } = getAppwriteDatabaseConfig();
  // Only settings can be changed; no userId, fitnessId, dates or $ fields.
  const data = profileSettingsSchema.parse({ ...profileSettings(existing), ...validated });
  try {
    await databases.updateDocument({ databaseId, collectionId: appwriteCollections.profiles, documentId: user.$id, data });
  } catch (error) {
    if (isConflict(error)) throw new UsernameConflictError();
    throw error;
  }
  return data;
}

export function toPublicProfileDto(profile: FitnessProfile) {
  if (profile.visibility !== "public") throw new Error("Profile is private");
  return {
    username: profile.slug,
    displayName: profile.name,
    ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    ...(profile.bio ? { bio: profile.bio } : {}),
    city: profile.city,
    fitnessId: profile.cardNumber,
    memberSince: profile.joinedAt,
    ...(profile.showActivity ? { activity: { verifiedActivities: profile.stats.verifiedActivities, eventsAttended: profile.stats.eventsAttended, streakWeeks: profile.stats.streakWeeks } } : {}),
    ...(profile.showCommunities ? { communities: profile.communityMemberships, communitiesFollowed: profile.stats.communitiesJoined } : {}),
  };
}
