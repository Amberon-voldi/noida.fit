# Fitness ID, passport and account UX — research notes

> Research and design hypotheses, not an approved implementation specification.
> Reviewed against application revision `66b0da4`. This study changes no product UI.
> Evidence comes from published guidance, documented product examples and source-code inspection. No NOIDA.FIT participant study, authenticated visual audit or measured UX improvement was conducted for this research.

## 1. Design objective

Make NOIDA.FIT a distinctive, useful identity for real-world participation, not a decorative dashboard or an imitation social network.

Keep three responsibilities clear:

- **Fitness ID:** Who I am in this community; a compact introduction I can show or share.
- **Participation passport:** Where and when I actually showed up; a meaningful record with provenance.
- **Account:** What I am doing next, what I saved, and what I allow others to see.

These can live in one experience without putting every feature inside the card. Preserve the requested standalone card, actual logo and small share icon. Do not restore a large card-around-the-card or a permanent “Copy profile link” button.

Local constraints: [product principles](../product/product-principles.md), [responsive design](responsive-design.md), [accessibility](accessibility.md), [motion](../brand/motion.md) and [future vision](../strategy/future-vision.md). The future-vision document is context, not permission to implement its roadmap.

## 2. What the UX sources teach

| Source | Relevant lesson | Application to NOIDA.FIT |
| --- | --- | --- |
| [NN/g: 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Show system status; speak familiar language; favor recognition; support recovery; minimize irrelevant information. These are evaluation principles, not proof of a particular layout. | Show actual public/private and saved/confirmed/verified states. Prefer task labels over internal or poetic jargon. Put useful feedback beside its action. |
| [NN/g: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Defer advanced or infrequent options, not frequently needed features. The path to hidden content must be obvious and well labeled. | Keep ID actions and next plans directly available. Disclose detailed history, preferences and unavailable integrations. Privacy must still have a direct entry point. |
| [NN/g: icon usability](https://www.nngroup.com/articles/icon-usability/) | Most icons are ambiguous; visible labels generally improve comprehension. Hover-only explanations do not translate well to touch. | Respect the small-share-icon requirement, but treat recognizability as a test question. An accessible name helps assistive technology; it does not automatically make the icon clear to sighted users. |
| [GOV.UK: learning user needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs) | Start with what users need to accomplish. Designer opinions remain assumptions until researched. | Validate whether people most often visit account to show an ID, find their next meetup or control privacy. Do not infer that visual novelty equals better UX. |
| [GOV.UK: moderated usability testing](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing) | Observe actual or likely users performing believable tasks; do not hint at the answer. Include assistive-technology users and protect research data. | Test sharing, QR discovery, meetup details and privacy changes, not just whether a screenshot looks attractive. |
| [GOV.UK: summary lists](https://design-system.service.gov.uk/components/summary-list/) | Pair key facts with clear contextual actions. Do not add summary-card containers for small amounts of information. | Use simple account detail rows and precise edit labels; do not wrap every fact in another card. This is a pattern reference, not a mandate to adopt government styling. |
| [Carbon: contained lists](https://carbondesignsystem.com/components/contained-list/usage/) | Group items with a consistent row structure, concise titles and inline actions; avoid excessive nesting. | RSVP, saved and followed lists should have predictable title/metadata/action positions. Do not shrink touch targets to copy dense enterprise examples. |
| [W3C: target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | WCAG 2.2 AA specifies 24×24 CSS px or qualifying exceptions/spacing. Larger targets are recommended for important controls. | Retain the project's stronger 44×44px target for sharing, QR, disclosures and navigation, even when the visible glyph is small. Do not misstate 44px as the WCAG AA minimum. |
| [W3C: animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | Non-essential interaction-triggered motion can be disabled; this criterion is AAA. | Card content and controls remain available with reduced motion. Rotation is optional presentation, not a dependency of the sharing flow. |
| [DENSO WAVE: QR code area](https://www.qrcode.com/en/howto/code.html) | A normal QR symbol requires a clear four-module margin on every side. | Preserve a clean white quiet zone, high contrast and no decorative overlap. Real-device scanning tests determine whether rendered size is adequate; there is no universal pixel-size guarantee. |

### Card, profile and participation precedents

| Reference | Documented pattern | What to borrow — and what not to claim |
| --- | --- | --- |
| [Apple: pass design and creation](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Creating.html) | Generic passes include gym membership cards. Important front fields are short and prominent; additional/support information belongs in back details. Barcodes reference records and need real-world scan tests. | Borrow the hierarchy and separation of primary identity from details. This is an archived 2018 guide, not current implementation instructions or evidence that animated flipping is superior. |
| [Google Wallet: generic pass template](https://developers.google.com/wallet/generic/resources/template) | Separates logo/issuer/title, structured rows, barcode and bottom details; recommends at most two custom card rows. | Borrow a stable identity/scan/details hierarchy. A wallet's constrained template is not a rule that every custom web card must have exactly two rows. |
| [Strava: profile page](https://support.strava.com/en-us/articles/15402175-your-strava-profile-page) | Profiles summarize recorded activities, statistics and achievements; visibility depends on privacy settings. | Borrow clear summary/detail separation, not telemetry-heavy dashboards or follower competition. Activity uploads are not evidence of NOIDA.FIT organizer-verified attendance. The help text is not an inspection of the current mobile app. |
| [Strava: privacy controls FAQ](https://support.strava.com/hc/en-us/articles/360025920332-Profile-Page-Privacy-Controls) | The legacy URL currently serves the privacy FAQ. Profile and activity audiences are separate; some default changes do not retrospectively update old activities. | Explain visibility boundaries and the effect of changes. Do not copy Strava's restricted-profile semantics: NOIDA.FIT's private profile should remain unavailable to strangers under its existing policy. |
| [parkrun: results](https://support.parkrun.com/hc/en-us/articles/200565343-4-1-Results) | Records completed participation after finish-line barcode scanning; maintains history and provides a local-team correction path. Results can be delayed. | Borrow a distinction between intent, recorded participation and corrections. NOIDA.FIT check-in proves its defined attendance condition, not necessarily completion of a workout. Do not promise a correction tool that does not exist. |
| [parkrun: milestones](https://support.parkrun.com/hc/en-us/articles/200565303-4-3-What-are-parkrun-milestones) | Recognizes count-based participation and volunteering, with icons and optional rewards. Junior wristband eligibility is explicitly trust-based. | Borrow inclusive, understandable milestone rules if a future feature is approved. This is a product precedent, not evidence that badges increase adherence or that every reward is independently verified. |

The strongest combined lesson: make the useful identity and scan action easy to access; keep detailed history and private account management separate. None of these references establishes that passports, 3D flips, badges or streaks improve NOIDA.FIT engagement.

## 3. Candidate user tasks — hypotheses to validate

| Context | Task | UI consequence |
| --- | --- | --- |
| New member | Understand the ID and find a first local gathering. | Brief explanation and one useful empty-state action; do not overwhelm with zero statistics. |
| Returning participant | Find the next confirmed meetup's time and meeting place. | A compact “Up next” block close to the ID; not buried below decorations and multiple summaries. |
| Member introducing themselves | Share the public profile or let someone scan it. | An obvious QR affordance and small share control adjacent to the card. |
| Privacy-conscious member | Learn exactly what strangers see and make the profile private. | Direct “Profile visibility” access, plain-language disclosure and public-preview path. |
| Public-profile visitor | Understand the person and their shared participation. | Public-safe profile data only; no email, RSVP history, owner settings or implied access rights. |
| Organizer | Open organizer tools and verify attendance. | Role-specific tools separate from the public-profile QR. |

A profile QR opens a profile. It is not an admission ticket, organizer authorization, proof of identity, or the signed event check-in QR. Design and copy must preserve that distinction.

## 4. Current implementation: strengths and concerns

### Keep

- Standalone Fitness ID with real logo and compact external share control.
- Private-by-default profiles and explicit public-sharing preferences.
- No public QR for private profiles.
- Public profile DTO boundaries; private email and plans stay in account.
- Real RSVP, save, follow and organizer verification flows.
- Keyboard-operable flip, separate flip control, reduced-motion support and back-face regression coverage.
- Empty states with discovery actions and honest integration availability.

### Investigate before another visual pass

| Observation from current code | User-experience risk | Recommended direction |
| --- | --- | --- |
| `FitnessCard.tsx` displays “Active member”, a check icon and a live-style dot without a computed membership/activity status. | People may interpret decorative status as verified identity, current activity or entitlement. | Use neutral membership wording, or a clearly defined data-backed status. Verification belongs beside the actual verified attendance information. |
| Public QR appears only on the reverse; the visible control says “Flip ID”. | A new user may not discover the action they need. | Prototype a purpose-based label such as “Show profile QR”; keep flipping as character, not the only clue. Preserve a private-state equivalent. |
| Front content has several 9–11px labels and a number of decorative elements. | Narrow-screen, zoom and outdoor reading may become harder. This is not a measured contrast or accessibility failure. | Reduce secondary fields before reducing type size. Make name, state and action dominant. Test real devices, long names and large text. |
| Account repeats identity explanations, visibility notes and status indicators around the card. | Repetition consumes the first screen and competes with the ID and plans. | One clear visibility statement and one direct control; one short explanation, not several. |
| Next RSVPs follow the overview and statistical panel. | Returning users may have to scan more than necessary to find their next destination. | Keep the ID as the product hero, with the next real plan immediately below on phones and beside it on desktop. Validate order with actual tasks. |
| `ProfileActions.tsx` tells users to copy the browser URL when native share and clipboard both fail. On `/account` or `/fitness-id`, that URL is not the public profile URL. | The fallback may lead to sharing the wrong page. | Reveal the actual public URL in a compact selectable fallback only after failure. No permanent copy button is needed. |
| Settings combine personal details, visibility, sharing preferences and update preferences. | Different task types compete, and username edits can unexpectedly change an existing shared link. | Clearly group “Profile”, “Privacy” and “Preferences”; explain link changes near username edits and preserve recovery/error feedback. |
| “Services” has prominent jump-navigation placement, while every catalog integration is currently unavailable or unconfigured. | Apparent feature prominence may exceed real utility. | Keep honest capability information discoverable under settings, without making it a primary task destination. |

These are evidence-linked hypotheses, not observations of participant behavior. No changes were made while recording them.

## 5. Recommended design direction

### Fitness ID: a purposeful member pass

- **Front:** real logo, member name, handle, broad city, truthful public/private context; no more than a few useful supporting facts.
- **Reverse:** clean profile QR, clear “Scan to open public profile” purpose and a readable identifier. For private profiles, show the private explanation rather than a non-working QR.
- **Action rail outside the card:** QR/flip control, small share icon when public, and direct visibility access for the owner. Do not put separate nested buttons inside the card's button.
- Keep bounded width and strong typography. A subtle material texture or local graphic signature can create personality without repeated glows, seals and ornamental labels.
- Keep the card recognizable in all three contexts: account, own ID page and public profile. Context-specific owner controls remain outside the shared card.
- If scanning is a frequent task, test a direct QR view against mandatory flipping. Do not assume one option is better before comparing task performance.

### Visual character: one memorable motif, not more decoration

A useful creative direction is **a city-issued-looking community pass without pretending to be an official credential**: real NOIDA.FIT logo, a strong member-name hierarchy, existing dark/velocity-accent tokens, disciplined alignment and one quiet local grid or route-line motif. Do not add government seals, invented certification, fake holographic security or online-status effects.

Use passport-inspired date/venue stamps for existing private participation records, while keeping a normal chronological reading order. A digital passport does not need a book animation, page-turning controls or forced horizontal swipes. Give the account surrounding whitespace and simple rows so the ID remains the memorable object.

Preserve the user's choices: card without a large outer frame, actual logo, small share icon and working front/back interaction. Any change to those choices should be proposed and validated, not silently reversed in the name of a design guideline.

### Passport: participation with a story, not invented achievements

- Start with the existing verified participation history, styled as a readable journey: event, date, place when legitimately available, and verification source/status.
- Make each stamp or record meaningful. A stamp should describe a real attended session, not an RSVP, follow, saved item or app visit.
- Keep pending, self-reported, connected and organizer-verified records visibly distinct. A decorative stamp is not new cryptographic proof.
- Avoid fake locked achievements, fabricated streaks, follower rankings, punitive reminders and progress bars with no valid completion target.
- Treat public passport/history sharing as a separate future privacy decision. Current public activity-total sharing does not authorize publication of detailed locations or attendance history.
- New badges, wallet exports and cross-provider participation need explicit scope, rules, persistence and revocation behavior. They are not approved by this research.

### Account: identity first, next action close by

Proposed information hierarchy, not a final wireframe:

```text
Compact greeting                         Profile/settings entry

STANDALONE FITNESS ID                    Up next
QR / small share / visibility            Time · venue · confirmed state
                                         Open event / manage RSVP

Your plans
Saved items                              Communities you follow

Your participation
Short verified summary → detailed private history

Profile & privacy / Preferences / Services
Sign out
```

On phones, use the same priority order in one column: card → compact actions → next plan → saved/followed rows → history and settings. Avoid extra sticky bars competing with the existing bottom dock. On desktop, use space for clear relationships, not for adding more widgets.

## 6. Feature-design method for future changes

For every proposed feature, write these before choosing colors or components:

1. **User outcome:** What real task becomes easier?
2. **Trigger and context:** Who needs it, when, and on what device?
3. **Data and authority:** What state is real, who can change it, and what is public?
4. **Smallest complete flow:** Entry → action → pending → success → recovery.
5. **State matrix:** New/empty, populated, private/public, loading, unavailable, expired session and error. Add cancellation where relevant.
6. **Acceptance checks:** Task completion, understandable feedback, keyboard access, target size, long content, small screen and reduced motion.
7. **Validation:** Observe likely users; keep or revise based on their behavior, not screenshot preferences alone.

Visual character should come from hierarchy, local identity and carefully chosen detail. It must not imply a feature, status or proof that the application does not provide.

## 7. Prioritized next work — not implemented

| Priority | Candidate | Why |
| --- | --- | --- |
| P0 | Clarify card/QR/status meaning and recover the real public URL on sharing failure. | Prevent misunderstanding and unsuccessful sharing. |
| P1 | Reduce repeated account framing; place the next real meetup close to the standalone ID. | Improve scanning without demoting the Fitness ID MVP. |
| P1 | Prototype a purpose-labeled QR control and compact visibility/preview flow. | Make important actions discoverable while preserving minimal controls. |
| P2 | Re-present existing verified history as a private participation passport. | Add distinctive meaning without inventing a reward system. |
| Later | Real milestones, native wallet passes, provider imports or public history. | Require separately approved product, privacy and backend work. |

## 8. How to validate improvement

Begin with a small formative round, for example 5–6 likely users spanning new members, regular participants and accessibility needs. That size is a practical starting point, not a guarantee of coverage or statistical significance. Include organizer tasks in a separate role-specific check where appropriate.

Neutral test prompts:

- “A person you have just met wants to open your public fitness profile. Show how you would help them.”
- “You are about to leave for your next meetup. Find when and where to go.”
- “You want people to see your name, but not your activity totals. Set that up.”
- “You no longer want strangers to view your profile. Change that.”
- “Explain what this activity number means and what this QR code does.”

Compare current and candidate designs with the same tasks and equivalent fixtures. Record unassisted completion, time on task, wrong turns, misunderstood states and recovery failures. Report raw observations; do not invent a percentage UX improvement. Counterbalance order if participants try both versions.

Additional checks: 320/390/768/1440px, 200% zoom, long names/handles, zero and populated history, public/private transitions, canceled sharing, unavailable clipboard, keyboard and screen reader, reduced motion and real-device QR scanning under different lighting. Automated regression tests complement, but do not replace, usability observation.

Use synthetic or consented staging data. Do not record passwords, sessions, private attendance records or other unnecessary personal information.

## 9. Applied UI direction

The subsequent requested UI enhancement applies the following parts of this research:

- Standalone member ID, real logo, neutral membership wording and readable facts; no invented active/live status.
- Purpose-based public QR/private details controls and a small external share icon on one action rail.
- Native share → clipboard → selectable canonical public URL recovery, only when needed.
- A compact account greeting, ID-first overview and earliest confirmed upcoming session close by.
- Simple plan lists, a private dated participation passport with explicit verification states, and retained detailed history.
- Direct visibility/public-preview access, grouped settings/preferences and secondary integration information.

No new badges, public attendance history, wallet integration or reward system was introduced. Authorization and persistence remain in the existing server flows. The route loads private account data; `AccountWorkspace` is its server-rendered presentation, not a client-side account store.

Regression coverage includes synthetic account/card/share browser fixtures, India-date and account-record unit tests, and standard project checks. Real-device QR scanning, native share-sheet behavior and participant usability studies remain separate manual validation. The implementation does not establish a measured UX or engagement improvement.
