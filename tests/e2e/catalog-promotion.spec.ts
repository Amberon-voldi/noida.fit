import { expect, test } from "@playwright/test";

const paidEvents = [
  { title: "Alpha doubles: rotate and rally", slug: "alpha-doubles-rotate-and-rally", price: "₹199" },
  { title: "Sector 79 seven-a-side", slug: "sector-79-seven-a-side", price: "₹299" },
  { title: "Core & coffee: mat Pilates", slug: "core-coffee-mat-pilates", price: "₹299" },
  { title: "Alpha beginner doubles clinic", slug: "alpha-beginner-doubles-clinic", price: "₹199" },
] as const;

type EventStructuredData = {
  "@type"?: string;
  name?: string;
  url?: string;
  offers?: { priceCurrency?: string } | Array<{ priceCurrency?: string }>;
};

test("paid event directory has exactly the four promoted cards without demo badges", async ({ page }) => {
  const response = await page.goto("/events?price=paid");
  expect(response?.status()).toBe(200);

  const results = page.locator('section[aria-labelledby="results-events"]');
  await expect(results).toBeVisible();
  await expect(results.getByRole("heading", { level: 2 })).toContainText("(4)");
  const cards = results.locator("article");
  await expect(cards).toHaveCount(4);
  await expect(cards.getByText("Demo", { exact: true })).toHaveCount(0);

  for (const paidEvent of paidEvents) {
    const card = cards.filter({ hasText: paidEvent.title });
    await expect(card).toHaveCount(1);
    await expect(card.getByRole("link", { name: paidEvent.title, exact: true })).toHaveAttribute("href", `/event/${paidEvent.slug}`);
    await expect(card.getByText(paidEvent.price, { exact: true })).toBeVisible();
  }
});

test("promoted event details show the paid cost and valid event structured data", async ({ page }) => {
  for (const paidEvent of paidEvents) {
    const response = await page.goto(`/event/${paidEvent.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: paidEvent.title, exact: true })).toBeVisible();
    await expect(page.locator("dt").filter({ hasText: "Cost" }).locator("..").locator("dd")).toHaveText(paidEvent.price);
    await expect(page.getByText("Demo listing", { exact: true })).toHaveCount(0);

    const structuredData = page.locator('script[type="application/ld+json"]');
    await expect(structuredData).toHaveCount(1);
    const jsonLd = await structuredData.evaluate((node) => {
      const parsed: unknown = JSON.parse(node.textContent ?? "");
      if (!parsed || typeof parsed !== "object") throw new Error("Event JSON-LD is not an object");
      return parsed as EventStructuredData;
    });
    expect(jsonLd["@type"]).toBe("SportsEvent");
    expect(jsonLd.name).toBe(paidEvent.title);
    expect(jsonLd.url && new URL(jsonLd.url).pathname).toBe(`/event/${paidEvent.slug}`);
    const offers = jsonLd.offers ? (Array.isArray(jsonLd.offers) ? jsonLd.offers : [jsonLd.offers]) : [];
    for (const offer of offers) expect(offer.priceCurrency).toBe("INR");
  }
});

test("About explains the promoted directory and does not show retired demo copy", async ({ page }) => {
  const response = await page.goto("/about");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "About", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "About the directory", exact: true })).toBeVisible();
  await expect(page.locator("body")).toContainText("Listings cover communities, venues and sessions across Noida and Greater Noida.");
  await expect(page.locator("body")).toContainText("An RSVP records your intent to participate; it does not replace an organizer's booking or payment process.");
  await expect(page.locator("body")).not.toContainText(/\b(?:demo|sample)\b/i);
});

test("venue directory cards have no ticket amounts or demo badges", async ({ page }) => {
  const response = await page.goto("/places");
  expect(response?.status()).toBe(200);

  const results = page.locator('section[aria-labelledby="results-places"]');
  await expect(results).toBeVisible();
  const cards = results.locator("article");
  await expect(cards).toHaveCount(18);
  await expect(cards.getByText("Demo", { exact: true })).toHaveCount(0);
  for (const text of await cards.allTextContents()) expect(text).not.toMatch(/(?:₹|INR|Rs\.?)\s*[\d,]+/i);
});
