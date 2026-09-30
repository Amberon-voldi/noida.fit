export type IntegrationStatus = "available" | "not_configured" | "native_required" | "coming_soon";

export interface IntegrationInfo {
  id: "strava" | "apple-health" | "cult" | "fitpass";
  name: string;
  status: IntegrationStatus;
  message: string;
}

/** Truthful capability catalogue. No provider is presented as connected here. */
export const integrations: IntegrationInfo[] = [
  { id: "strava", name: "Strava", status: "not_configured", message: "Strava OAuth is not configured for this deployment." },
  { id: "apple-health", name: "Apple Health", status: "native_required", message: "Apple Health requires the native mobile bridge; the web app cannot read it directly." },
  { id: "cult", name: "Cult", status: "coming_soon", message: "Cult integration is coming soon." },
  { id: "fitpass", name: "FITPASS", status: "coming_soon", message: "FITPASS integration is coming soon." },
];

export function getIntegration(id: IntegrationInfo["id"]): IntegrationInfo {
  return integrations.find((integration) => integration.id === id) || integrations[0];
}
