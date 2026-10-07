import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

// The normal unit command selects react-server. Render real component HTML in a
// regular React subprocess; no app server, backend requests or mocked cards.
const rendered = spawnSync(process.execPath, ["--input-type=module"], {
  cwd: process.cwd(), encoding: "utf8", input: `
    import { build } from 'esbuild';
    import { createRequire } from 'node:module';
    const require = createRequire(process.cwd() + '/package.json');
    const { createElement } = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime');
    const output = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: \`
      export { HomeHub } from './components/home/HomeHub';
      export { EventCard } from './components/cards/EventCard';
      export { CommunityCard } from './components/cards/CommunityCard';
      export { PlaceCard } from './components/cards/PlaceCard';
      export { default as AboutPage } from './app/(site)/about/page';
      export { default as StoriesPage } from './app/(site)/stories/page';
      export { default as ForOrganizersPage } from './app/(site)/for-organizers/page';
    \` }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', loader: { '.css': 'empty' } });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
    const render = (name, props) => renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: {} }, createElement(mod.exports[name], props)));
    const event = { id: 'synthetic-event', slug: 'synthetic-event', title: 'Synthetic session', category: 'running', date: '2026-10-07', startTime: '06:00 AM', price: 'FREE', communitySlug: 'synthetic-club', communityName: 'Synthetic club', venueName: 'Synthetic venue', sector: 'Sector 1', demo: true, imageUrl: '/images/synthetic.png' };
    const community = { id: 'synthetic-club', slug: 'synthetic-club', name: 'Synthetic club', category: 'running', meetingDays: ['Monday'], baseLocation: 'Sector 1', demo: true, verified: true, bannerUrl: '/images/synthetic.png' };
    const place = { id: 'synthetic-place', slug: 'synthetic-place', name: 'Synthetic venue', category: 'park', sector: 'Sector 1', amenities: [], publicHours: '6 AM–8 PM', demo: true, imageUrl: '/images/synthetic.png' };
    const highlights = { activities: [], events: [event], communities: [community], places: [place], eventWindow: 'week', hasDemo: true };
    const cards = [['EventCard', 'event', event], ['CommunityCard', 'community', community], ['PlaceCard', 'place', place]].map(([name, prop, item]) => ({ name, regular: render(name, { [prop]: item }), compact: render(name, { [prop]: item, compact: true }) }));
    const headers = ['AboutPage', 'StoriesPage', 'ForOrganizersPage'].map(name => ({ name, html: render(name) }));
    console.log(JSON.stringify({
      home: render('HomeHub', { highlights }),
      member: render('HomeHub', { highlights, memberName: 'Synthetic member' }),
      realOnly: render('HomeHub', { highlights: { ...highlights, hasDemo: false, events: [{ ...event, demo: false }], communities: [{ ...community, demo: false }], places: [{ ...place, demo: false }] } }),
      empty: render('HomeHub', { highlights: { activities: [], events: [], communities: [], places: [], eventWindow: 'upcoming', hasDemo: false } }),
      unavailable: render('HomeHub', { highlights: null }), cards, headers
    }));
  `,
});
assert.equal(rendered.status, 0, rendered.stderr);
const html = JSON.parse(rendered.stdout) as {
  home: string; member: string; realOnly: string; empty: string; unavailable: string;
  cards: { name: string; regular: string; compact: string }[];
  headers: { name: string; html: string }[];
};

test("home renders three compact card types, a small greeting and GET discovery search", () => {
  assert.match(html.home, /<h1 id="home-heading">Welcome\.<\/h1>/);
  assert.match(html.member, /<h1 id="home-heading">Hi, Synthetic member\.<\/h1>/);
  assert.equal((html.home.match(/<article /g) ?? []).length, 3);
  assert.match(html.home, /action="\/discover" method="get"/);
  for (const path of ["events", "communities", "places", "activities"]) assert.match(html.home, new RegExp(`href="/${path}"`));
  assert.doesNotMatch(html.home, /<aside|<img |<button[^>]+type="button"|href="\/(account|check-in|organizer|signup|fitness-id)/);
  assert.match(html.home, /06:00 AM/);
  assert.match(html.home, /Synthetic venue/);
  assert.match(html.home, /Monday/);
  assert.match(html.home, /6 AM–8 PM/);
});

test("home uses one honest illustrative notice without demo badges or false verification", () => {
  assert.equal((html.home.match(/class="hub-demo-note"/g) ?? []).length, 1);
  assert.match(html.home, /not confirmed sessions, clubs or venues/);
  assert.doesNotMatch(html.home, />Demo<|>Verified</);
  assert.doesNotMatch(html.realOnly, /hub-demo-note/);
  assert.match(html.realOnly, />Verified</, "real verified clubs retain their trust state");
});

test("card defaults retain demo badges and imagery outside the compact hub", () => {
  for (const card of html.cards) {
    assert.match(card.regular, />Demo</, card.name);
    assert.match(card.regular, /<img /, card.name);
    assert.match(card.compact, />Demo</, `${card.name} compact does not silently suppress its default badge`);
    assert.doesNotMatch(card.compact, /<img /, card.name);
  }
  assert.match(html.cards[0].regular, /aria-label="Save event"/);
});

test("an empty home directory is distinct from a backend outage", () => {
  assert.match(html.empty, /No upcoming sessions listed yet/);
  assert.match(html.empty, /No published clubs yet/);
  assert.match(html.empty, /No published places yet/);
  assert.doesNotMatch(html.empty, /role="alert"|hub-demo-note/);
  assert.match(html.unavailable, /role="alert"/);
  assert.match(html.unavailable, /Directory temporarily unavailable/);
  assert.match(html.unavailable, /href="\/home"/);
  assert.doesNotMatch(html.unavailable, /No upcoming sessions listed yet|No published clubs yet|No published places yet/);
});

test("static public headers are concise while organizer controls and safety instructions remain", () => {
  const titles: Record<string, string> = { AboutPage: "About", StoriesPage: "Stories", ForOrganizersPage: "For organizers" };
  for (const page of html.headers) {
    const header = page.html.match(/<header[\s\S]*?<\/header>/)?.[0];
    assert.ok(header, page.name);
    assert.match(header, new RegExp(`>${titles[page.name]}</h1>`));
    assert.doesNotMatch(header, /<p|eyebrow|NOIDA &amp; GREATER NOIDA/);
    assert.equal((page.html.match(/<h1 /g) ?? []).length, 1);
    if (page.name === "ForOrganizersPage") {
      assert.match(header, /organizer-submit-cta/);
      assert.match(header, /href="#faq"/);
      assert.match(page.html, /Sample listings are not partnerships/);
      assert.match(page.html, /not an online submission form/);
    }
    if (page.name === "AboutPage") assert.match(page.html, /Do not travel or pay based on a demo listing/);
  }
});
