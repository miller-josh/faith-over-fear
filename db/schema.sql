-- ─────────────────────────────────────────────────────────────────────────────
-- Faith over Fear — Neon Postgres schema
-- Run with:  npm run db:setup   (or paste into the Neon SQL editor)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists fears (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,                    -- Clerk user id
  fear       text not null,
  truth      text not null,
  topic      text not null,
  status     text not null default 'Active',   -- Active | Surrendered | Resolved
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fear_verses (
  id          uuid primary key default gen_random_uuid(),
  fear_id     uuid references fears(id) on delete cascade,
  reference   text not null,                   -- "Psalm 34:5"
  translation text not null default 'kjv',     -- per-verse translation code
  text        text,                            -- cached verse text
  position    int  not null default 0
);

-- Backfill for databases created before the translation column existed, and
-- normalize the default / any values that predate the current translation set
-- (esv | kjv | niv | nkjv | nasb) to KJV, the freely-available default.
alter table fear_verses add column if not exists translation text not null default 'kjv';
alter table fear_verses alter column translation set default 'kjv';
update fear_verses set translation = 'kjv'
  where translation not in ('esv', 'kjv', 'niv', 'nkjv', 'nasb');

create index if not exists fears_user_created_idx on fears (user_id, created_at desc);
create index if not exists fear_verses_fear_idx on fear_verses (fear_id, position);

-- Cache of hydrated verse text keyed by (reference, translation) so we don't
-- re-fetch the same passage from the Bible API. Shared across all users;
-- public-domain scripture text is not user data.
create table if not exists verse_cache (
  reference   text not null,
  translation text not null,
  text        text not null,
  fetched_at  timestamptz not null default now(),
  primary key (reference, translation)
);
