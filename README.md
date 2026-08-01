# Handoff: Faith over Fear

## Overview
A private journaling web app for logging fears and answering each one with a truth
statement and supporting scripture. Target stack (set by the product owner):
**React + Vite SPA, deployed on Vercel, Postgres via Neon, auth via Clerk**, plus a
server-side AI endpoint that suggests Bible verses for a given fear.

Core loop: write a fear → write the truth you're choosing → attach verses (AI-suggested or
manual) → revisit later and move it Active → Surrendered → Resolved.

## About the Design Files
The files here are **design references created in HTML** — a working prototype showing
intended look and behavior, not production code to copy. Recreate these designs in the
target codebase using its own patterns, routing, and data layer. The prototype's in-memory
state, seeded entries, and simulated AI delay all stand in for real API calls.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, rules, and interaction states.
Layout is fluid (clamp() + auto-fit/flex-wrap) rather than breakpoint-driven — you may
substitute real breakpoints, but keep the same collapse order.

## Design language (Modernist, blue)
Flat and architectural on a warm-light ground. Archivo throughout. **Zero border radius
anywhere.** 2px rules separate major blocks; 1px rules separate list rows. Everything is
flush left, including labels inside wide buttons.

The defining move: **the accent is #132AEC at 50% alpha, everywhere** — buttons, type,
rules, hovers, marks. Nothing renders the blue opaque. Because the accent is translucent,
anything sitting *on* an accent field (primary button labels, the sign-in poster copy) uses
--color-text ink rather than white, and the tint steps go lighter rather than the base going
darker.

## Design Tokens
Ground
- bg #f3f2f2 · surface #eae9e9 · text #201e1d
- neutral 100 #f8f4f4 · 200 #eae7e7 · 300 #d7d3d3 · 500 #9b9797 · 800 #444141 · 900 #2d2b2b
- divider: color-mix(in srgb, #201e1d 40%, transparent)
- muted text: color-mix(in srgb, #201e1d 55%, transparent)

Accent — all steps are #132aec at varying alpha over the ground:
- --color-accent / -solid / -600 / -700 / -800 / -900 → 50%
- -500 44% · -400 36% · -300 26% · -200 16% · -100 8%
(Steps 600–900 exist so the system's component classes keep working; they are deliberately
the same value as the base. Do not "fix" them to opaque darker blues.)

Type — Archivo (400 / 600 / 800). Headings 800, letter-spacing -0.015em, line-height 1.12.
h1 42px · h2 32px · h3 25px · h4 20px · body 15px/1.55 · small 13px · meta 11–12px.
Kickers: 11px, uppercase, letter-spacing .12em, accent.

Spacing 4 / 8 / 12 / 16 / 24 / 32. Radius 0 everywhere.
Shadows: sm 0 1px 2px rgba(45,43,43,.14) · md 0 3px 10px rgba(45,43,43,.16) ·
lg 0 12px 32px rgba(45,43,43,.22). Focus ring: 2px solid accent, offset 2px.

**Accessibility note the owner has accepted:** the 50%-alpha accent computes to roughly
2.5:1 on the light ground, below WCAG AA for text. It is an intentional aesthetic choice.
Never let accent color be the *only* carrier of meaning — status, selection, and validation
are all additionally marked by weight, rules, tags, or copy in the designs below. If you
ever need a compliant variant, darken via --color-accent-700 only, and flag it.

## Screens / Views

### 1. Sign in (Clerk)
Two equal columns, `grid-template-columns: repeat(auto-fit, minmax(340px,1fr))`; stacks
under ~700px.
- Left: full accent field (translucent blue), padding clamp(32px,6vw,72px). Small uppercase
  wordmark, display headline "Name the fear. / Answer it with truth." at
  clamp(34px,5.2vw,60px)/1.02, a 2px ink rule, a 15px paragraph at max 38ch, and a footer
  line "Private by default · Only you".
- Right: 380px max-width column, vertically centered. h2 "Sign in", muted subline, two
  full-width secondary OAuth buttons (Google, Apple; 42px min-height, labels flush left),
  an "or" divider, an email field, a primary "Continue" button, and the footnote
  "Secured by Clerk. No one else can read your entries."
- Replace wholesale with Clerk's `<SignIn />`, styled via its appearance API to these
  tokens, keeping the blue poster panel as the left half.

### 2. Dashboard / journal (default route)
Max-width 1120px, padding clamp(20px,4vw,44px) clamp(16px,4vw,40px) 80px.
- Sticky header: 10px accent square + wordmark left; "Journal" / "New entry" uppercase
  12px/800 links (current turns accent) + 30px square avatar. 2px bottom rule.
- Page head: accent date kicker, h1 "Your journal", muted count line
  ("15 entries · 9 still active · 6 answered"), primary "＋ New entry" right.
- 2px rule, then controls: search input (max 380px; matches fear + truth + topic + verse
  references + verse text), a 4-way segmented status filter (All / Active / Surrendered /
  Resolved), and a right-aligned **List / Topics** view toggle.

**List view** — one row per fear, 1px bottom rule, 20px padding, whole row clickable:
86px date gutter (day 13px/800, month uppercase 11px muted) · main column (min 240px) with
topic tag + status tag, the fear at clamp(17px,2.2vw,21px)/800, then the truth preview in
muted 14px behind a 2px accent vertical rule · right column (min 120px) with "3 verses"
uppercase meta and the reference list in accent 12px.

**Topics view (the word cloud)** — three stacked blocks sharing one 2px ink border:
1. *Cloud panel* — neutral-100 fill, padding clamp(28px,5vw,64px). Topics are centered,
   baseline-aligned, wrapping buttons at max-width 900px, gap clamp(10px,2vw,18px) /
   clamp(20px,4vw,44px). Font size = `26 + normalizedCount * 46` px, weight 800,
   letter-spacing -0.03em, with a small superscript count. Sizes are normalized across the
   min–max range so the spread is visible even when counts are close. **Order is woven, not
   sorted** — items alternate to the front and back of the array so the biggest word lands
   mid-cloud and it reads as a cloud rather than a ranked chart.
   Color encodes how unanswered a topic is: >60% active → accent; >20% → text at 85%;
   otherwise text at 68%. The selected topic takes the accent plus a 2px bottom rule; when
   any topic is selected the others drop to text at 52% (still clickable, so don't dim
   further).
2. *Legend strip* — bold 15px lead ("'Reputation' is the loudest thing on the list right
   now.") beside a 12px muted explanation of the encoding.
3. *Per-topic strip* — a wrapping flex row (`flex: 1 1 150px` per item, 1px right rules)
   so the last row always fills the width; each cell has the topic name, a 4px progress bar
   of active share over neutral-300, and "5 logged · 3 active" meta.
Below all that, an accent kicker showing the current filter ("Reputation" or "All entries")
against a 2px rule, then the same list rows. **Selecting a topic filters the list in both
views** and surfaces a tag + "Clear topic filter ✕" above it.

**Empty state** — 2px dashed box. First run: kicker "Start here", h3 "No fears written down
yet", body "Write the thing you're actually afraid of, in the words you'd use out loud. Then
answer it with what's true.", primary "Write the first one". The no-results variant reuses
the box with "Nothing matches" / "No entries match that".

Status tags: Active → `.tag-outline` · Surrendered → `.tag-accent` · Resolved →
`.tag-neutral`.

### 3. Fear detail (read view)
- Ghost "← Journal" back link, then topic tag + status tag + "Logged July 28, 2026".
- Kicker "The fear", h1 clamp(26px,4vw,40px) at max 24ch. 2px rule.
- Two columns `repeat(auto-fit, minmax(280px,1fr))`, gap clamp(24px,4vw,48px):
  left "The truth I'm choosing" at clamp(16px,2vw,19px)/1.55, max 46ch; right "Standing on",
  an accordion of references — reference 15px/800 flush left, +/− accent marker right, 1px
  rules between, expanding to the verse text at 14px/1.6 behind a 2px accent left rule.
  **Collapsed by default: reference only.**
- Footer after a 2px rule: "Move to" + three secondary status buttons; right-aligned primary
  "Edit" and secondary "Delete".

### 4. New / edit entry
Single 760px column, three numbered sections, each with an accent kicker.
- **01 — The fear**: single-line input, 56px tall, set in the heading face at
  clamp(16px,2.2vw,20px)/800. Placeholder "I'm afraid I will look like a fool if we fail."
  Character count right-aligned in the section label. Past 12 characters an AI-suggested
  topic appears as an accent tag with a "Change" ghost button that cycles the topic list.
- **02 — The truth I'm choosing**: textarea, 130px min-height, 15px/1.6.
- **03 — Verses to stand on**: label with a secondary "✦ Suggest verses" button, disabled
  until a fear is typed; label cycles "✦ Suggest verses" → "Searching…" → "Suggest again".
  Loading: a 1px-bordered strip with an 8px accent square pulsing (`ffPulse`, 1s ease-in-out
  infinite) beside "Reading your fear and searching scripture…". Results: a 2px accent-
  bordered panel of 4–5 references; each row is a reference button (tap to expand the text)
  plus a "+ Add" / "✓ Added" ghost toggle. Below it, the chosen verses each with "Remove",
  then a manual "Add a reference — e.g. Psalm 27:1" input + "Add verse".
- Footer: primary Save (disabled until fear AND truth are non-empty), secondary Cancel, and
  a right-aligned hint explaining any block. Saving routes to the detail view.

### 5. Delete confirmation
Modal over a 50% neutral-900 backdrop, 440px max, surface fill, shadow-lg, no radius.
"Delete this entry?", body quotes the fear, actions right: secondary "Keep it", primary
"Delete".

## Interactions & Behavior
- Row click → detail. Back link → dashboard. Nav links mark the current screen.
- Detail status buttons mutate immediately (no confirm) and are reflected in dashboard
  filters and in the cloud's color/bar encoding.
- Verse accordions are independent toggles; state resets when a different fear is opened.
- Clicking a cloud word or a per-topic cell toggles that topic filter and keeps you in
  Topics view.
- Suggest verses is faked with an 1100ms timeout — swap in the real call, keeping the
  pulsing strip and the disabled-button behavior.
- Entrances use `ffIn` (opacity 0→1, translateY 6px→0, 250–300ms ease).
- Validation: fear and truth both required. No inline errors — Save disables and the hint
  line explains.
- Responsive: fluid throughout; nav, control row, cloud, per-topic strip, and detail columns
  all wrap. Search keeps a 220px floor.

## State Management
Prototype state → production mapping:
- `signedIn` → Clerk session
- `screen` / `currentId` / `editingId` → routes `/`, `/fear/:id`, `/new`, `/fear/:id/edit`
- `fears[]` → Neon table (schema below), fetched/cached with TanStack Query
- `query`, `status`, `topic`, `view` → dashboard filter state; put these in URL search
  params so a filtered or cloud view is shareable
- `draft` → entry form (react-hook-form or equivalent)
- `suggesting` / `suggestions` / `openSuggestion` → AI request lifecycle
- `openVerse` → accordion state, local only
- `confirmId` → delete dialog

## Data model (suggested)
```sql
create table fears (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,                    -- Clerk user id
  fear       text not null,
  truth      text not null,
  topic      text not null,
  status     text not null default 'Active',   -- Active | Surrendered | Resolved
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table fear_verses (
  id        uuid primary key default gen_random_uuid(),
  fear_id   uuid references fears(id) on delete cascade,
  reference text not null,                     -- "Psalm 34:5"
  text      text,                              -- cached verse text
  position  int  not null default 0
);
create index on fears (user_id, created_at desc);
```
Endpoints: `GET/POST /api/fears`, `GET/PATCH/DELETE /api/fears/:id`,
`POST /api/suggest-verses` (body `{ fear }` → `{ topic, verses: [{reference, text, why}] }`).
Gate every route on the Clerk session and scope by `user_id`. The cloud's counts should come
from a single aggregate query (`select topic, status, count(*) … group by 1,2`), not by
counting client-side over a paginated list.

## AI verse suggestion
The prototype fakes it with keyword→reference matching (see `KEYS` in the logic class) so the
UI can be exercised offline. In production, call an LLM server-side with the fear text, ask
for 4–5 references plus a one-line reason each, then hydrate verse text from a Bible API or a
seeded verses table so translations stay licensed and consistent. Return the suggested topic
from the same call. Keep it under ~1.5s or the loading strip drags; never block saving on it.

## Assets
None. No images or icon files — the small marks (accent square, avatar, +/− markers, the ✦)
are text or CSS boxes. The design system specifies Lucide if you want real icons.
Photography, if ever added, goes through the `.grayscale` wrapper.

## Files
- `Faith Over Fear.dc.html` — the interactive prototype: all five screens, real filtering,
  search, CRUD, status changes, the Topics cloud, and the simulated AI flow. Open in a
  browser. It ships with 15 seeded entries across 7 topics specifically so the cloud has a
  believable distribution — seed something similar in dev.
- `support.js` — runtime needed to open the prototype locally. Not part of the deliverable.
- `styles.css` — the Modernist stylesheet (tokens + component classes). Port the `:root`
  block verbatim; recreate the component classes in your styling layer.
- `modernist-readme.md` — the design system's own do's and don'ts.

## Notes for implementation
- Never round a corner. Never center button labels or hero copy.
- Never render the accent opaque, and never soften the 2px rules to hairlines.
- One primary action per view. The accent also carries kickers, the verse rule, and cloud
  emphasis — nothing else.
- Text sitting on an accent field is ink (--color-text), not white.
