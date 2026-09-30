"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileSettings } from "@/types/user";
import { profileSettingsSchema, USERNAME_PATTERN } from "@/components/auth/validation";

interface SettingsFormProps {
  settings: ProfileSettings;
}

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-white";

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileSettings>(settings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setMessage("");
    setError("");
    const parsed = profileSettingsSchema.safeParse(form);
    if (!parsed.success) {
      setError("Check your profile details. Your username must start and end with a letter or number.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json() as { error?: string; settings?: ProfileSettings };
      if (!response.ok || !data.settings) {
        setError(response.status === 401 ? "Your session expired. Sign in again to save changes." : data.error || "Unable to save settings.");
        return;
      }
      setForm(data.settings);
      setMessage("Settings saved.");
      router.refresh();
    } catch {
      setError("Unable to save settings right now. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={saving} className="space-y-5 rounded-xl border border-border-subtle bg-surface p-5">
      <fieldset disabled={saving} className="space-y-4">
        <legend className="sr-only">Profile details</legend>
        <div><label htmlFor="settings-username" className="text-sm text-text-secondary">Username</label><input id="settings-username" name="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} minLength={3} maxLength={40} pattern={USERNAME_PATTERN} aria-describedby="settings-username-help" required className={inputClass} /><p id="settings-username-help" className="mt-1 text-xs text-text-secondary">3–40 characters. Start and end with a letter or number. Changing it also changes your public link.</p></div>
        <div><label htmlFor="settings-name" className="text-sm text-text-secondary">Display name</label><input id="settings-name" name="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} minLength={2} maxLength={128} required className={inputClass} /></div>
        <div><label htmlFor="settings-city" className="text-sm text-text-secondary">City</label><input id="settings-city" name="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={100} required className={inputClass} /></div>
        <div><label htmlFor="settings-bio" className="text-sm text-text-secondary">Bio</label><textarea id="settings-bio" name="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={1000} rows={3} className={inputClass} /></div>
      </fieldset>
      <fieldset disabled={saving} className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-white">Privacy</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm text-text-secondary"><input type="radio" name="visibility" value="private" checked={form.visibility === "private"} onChange={() => setForm({ ...form, visibility: "private" })} /> Private — only I can view my profile</label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-text-secondary"><input type="radio" name="visibility" value="public" checked={form.visibility === "public"} onChange={() => setForm({ ...form, visibility: "public" })} /> Public — anyone can view @{form.username || "username"}</label>
        <p className="text-xs leading-relaxed text-text-secondary">Public profiles show your display name, username, city, bio, Fitness ID and member-since date. Your email, saved plans and RSVP history stay private.</p>
        <label className="flex min-h-11 items-center gap-3 text-sm text-text-secondary"><input type="checkbox" checked={form.showActivity} disabled={form.visibility !== "public"} onChange={(e) => setForm({ ...form, showActivity: e.target.checked })} /> Also share verified activity totals and week streak</label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-text-secondary"><input type="checkbox" checked={form.showCommunities} disabled={form.visibility !== "public"} onChange={(e) => setForm({ ...form, showCommunities: e.target.checked })} /> Also share communities I follow</label>
        <p className="text-xs text-text-secondary">Nothing is shared while your profile is private, even if these preferences are selected.</p>
      </fieldset>
      <div><label className="flex min-h-11 items-center gap-3 text-sm text-text-secondary"><input type="checkbox" checked={form.notifications} disabled={saving} onChange={(e) => setForm({ ...form, notifications: e.target.checked })} /> Save my preference for product updates</label><p className="text-xs text-text-secondary">This preference is saved; email notifications are not active yet.</p></div>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
      <p role="status" aria-live="polite" className="text-sm text-velocity">{message}</p>
      <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-velocity px-4 py-2 text-sm font-bold text-background disabled:opacity-50">{saving ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
