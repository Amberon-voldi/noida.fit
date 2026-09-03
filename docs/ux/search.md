# Search Experience & Query Architecture — NOIDA.FIT

## 1. Search Philosophy: Fast, Practical & Structured

Users come to search with real-world intent:
> *"I want to run in Sector 137 tomorrow morning."*  
> *"Are there badminton groups in Greater Noida?"*  
> *"Track intervals Noida Stadium."*

For V1, **we do not introduce heavy, slow, or expensive AI/LLM search backends**. Instead, we build a **blisteringly fast, client-side structured tokenizer and query matcher** that understands natural language intent and maps it directly to entity attributes.

---

## 2. Search Modalities

NOIDA.FIT provides two entry points to the search experience:

### 1. Global Command Palette (`Cmd+K` / `Ctrl+K` Modal)
- Accessible from anywhere on the site by pressing `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux), or clicking the search trigger in the header.
- Instant keyboard navigation (Arrow Up/Down to navigate results, Enter to jump to page, Escape to close).
- Segmented instant results:
  - **Upcoming Events** (matches by title, date, sector)
  - **Communities** (matches by club name, activity, base sector)
  - **Places** (matches by stadium/park name, address)
  - **Editorial Guides** (matches by topic, route)

### 2. Full Search & Discovery Page (`/search` or `/discover?q=...`)
- Comprehensive results view with deep filtering toggles, category pills, and full card previews.

---

## 3. Query Intent Tokenizer (Natural Language Parsing)

The search engine parses user input strings against a dictionary of recognized Noida tokens:

```text
User Query: "morning running clubs near sector 137"
   │
   ├── Token 1: "morning"    -> Time Filter: 05:00 AM - 08:30 AM
   ├── Token 2: "running"    -> Category Filter: "running"
   ├── Token 3: "clubs"      -> Entity Type: "Community"
   └── Token 4: "sector 137" -> Location Filter: "Sector 137"
   │
Result: High-confidence filter state matching UPRUN and Expressway Long Run sessions.
```

### Recognized Token Dictionaries (V1 Static Map)

1. **Activity Terms:**
   - `run`, `running`, `runner`, `marathon`, `track`, `intervals` -> `activity: "running"`
   - `cycle`, `cycling`, `bike`, `ride`, `peloton` -> `activity: "cycling"`
   - `strength`, `bootcamp`, `crossfit`, `hiit`, `calisthenics` -> `activity: "strength"`
   - `badminton`, `tennis`, `pickleball`, `football`, `squash` -> `activity: "sports"`
   - `yoga`, `mobility`, `stretch`, `breathwork` -> `activity: "wellness"`

2. **Time Terms:**
   - `morning`, `dawn`, `sunrise`, `early`, `am` -> `timeOfDay: "morning"`
   - `evening`, `sunset`, `dusk`, `pm` -> `timeOfDay: "evening"`
   - `weekend`, `saturday`, `sunday` -> `dateWindow: "weekend"`
   - `today` -> `dateWindow: "today"`
   - `tomorrow` -> `dateWindow: "tomorrow"`

3. **Noida Sector / Landmark Terms:**
   - `stadium`, `sector 21a`, `21a` -> `sector: "Sector 21A"`
   - `137`, `advant`, `sector 137`, `142` -> `sector: "Expressway / Sector 137"`
   - `greater noida`, `gr noida`, `pari chowk` -> `sector: "Greater Noida"`
   - `meghdootam`, `50`, `sector 50` -> `sector: "Sector 50"`
   - `sector 62`, `62` -> `sector: "Sector 62"`

---

## 4. Search Ranking & Score Algorithm

Results are scored and ranked based on relevance:
1. **Exact Entity Name Match:** (Score: 100) — e.g. User types "UPRUN", community appears at top.
2. **Category + Sector Match:** (Score: 75) — e.g. "Running Sector 137".
3. **Date / Upcoming Session Match:** (Score: 50) — Sessions happening within next 48 hours receive a recency boost.
4. **Fuzzy Text Match:** (Score: 25) — Description or host bio mentions the search keyword.
