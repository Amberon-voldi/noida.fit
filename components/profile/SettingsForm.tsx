"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileSettings } from "@/types/user";
import { profileSettingsSchema, USERNAME_PATTERN } from "@/components/auth/validation";

interface SettingsFormProps {
  settings: ProfileSettings;
  className?: string;
}

export function SettingsForm({ settings, className = "" }: SettingsFormProps) {
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
    <form onSubmit={submit} aria-busy={saving} className={`space-y-4 ${className}`}>
      <fieldset disabled={saving} className="settings-group">
        <legend>Profile details</legend>
        <div><label htmlFor="settings-username" className="settings-label">Username</label><input id="settings-username" name="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} minLength={3} maxLength={40} pattern={USERNAME_PATTERN} aria-invalid={Boolean(error)} aria-describedby={error ? "settings-username-help settings-error" : "settings-username-help"} required autoCapitalize="none" spellCheck={false} className="settings-input" /><p id="settings-username-help" className="settings-hint mt-1.5">3–40 characters. Start and end with a letter or number. Changing it also changes your public link.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="settings-name" className="settings-label">Display name</label><input id="settings-name" name="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} minLength={2} maxLength={128} required className="settings-input" /></div>
          <div><label htmlFor="settings-city" className="settings-label">City</label><input id="settings-city" name="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={100} required className="settings-input" /></div>
        </div>
        <div><label htmlFor="settings-bio" className="settings-label">Bio</label><textarea id="settings-bio" name="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={1000} rows={3} placeholder="Morning runs, weekend rides…" className="settings-input resize-y" /></div>
      </fieldset>
      <fieldset disabled={saving} className="settings-group">
        <legend>Privacy</legend>
        <div className="settings-choices">
          <label className="settings-choice"><input type="radio" name="visibility" value="private" checked={form.visibility === "private"} onChange={() => setForm({ ...form, visibility: "private" })} /><span><strong>Private</strong><small>Only you can view your profile</small></span></label>
          <label className="settings-choice"><input type="radio" name="visibility" value="public" checked={form.visibility === "public"} onChange={() => setForm({ ...form, visibility: "public" })} /><span><strong>Public</strong><small>Anyone can view @{form.username || "username"}</small></span></label>
        </div>
        <p className="settings-hint">Public profiles show your display name, username, city, bio, .fit ID and member-since date. Your email, saved plans and RSVP history stay private.</p>
        <div className="divide-y divide-border-subtle">
          <label className="settings-switch"><span>Share verified activity totals and week streak</span><input type="checkbox" role="switch" checked={form.showActivity} disabled={form.visibility !== "public"} onChange={(e) => setForm({ ...form, showActivity: e.target.checked })} /></label>
          <label className="settings-switch"><span>Share communities I follow</span><input type="checkbox" role="switch" checked={form.showCommunities} disabled={form.visibility !== "public"} onChange={(e) => setForm({ ...form, showCommunities: e.target.checked })} /></label>
        </div>
        <p className="settings-hint">Nothing is shared while your profile is private, even if these are switched on.</p>
      </fieldset>
      <fieldset disabled={saving} className="settings-group">
        <legend>Preferences</legend>
        <label className="settings-switch"><span>Product updates</span><input type="checkbox" role="switch" checked={form.notifications} onChange={(e) => setForm({ ...form, notifications: e.target.checked })} /></label>
        <p className="settings-hint">We save this preference now; email updates aren’t switched on yet.</p>
      </fieldset>
      {error && <p id="settings-error" role="alert" className="text-sm text-rose-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className="settings-save">{saving ? "Saving…" : "Save settings"}</button>
        <p role="status" aria-live="polite" className="text-sm text-velocity">{message}</p>
      </div>
    </form>
  );
}
