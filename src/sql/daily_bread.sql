-- Daily devotional + life-study for each day of schedule.js (see fetchDailyBread.js).
-- Keyed by MM-DD, matching schedule.js, which repeats every year.
-- One row per (day, language) — adding Spanish later is rows, not columns.

create table if not exists daily_bread (
  md          text not null,           -- 'MM-DD'
  lang        text not null,           -- 'en' | 'zh' | 'sc'
  verses_ref  text,
  topic       text,
  key_verse   text,
  emphasis    text,
  musing      text,
  prayer      text,
  hymn_title  text,
  hymn_url    text,
  hymn_audio  text,                    -- mp3 url or a youtube embed url
  ls_title    text,
  ls_url      text,
  ls_audio    text,
  primary key (md, lang)
);

alter table daily_bread enable row level security;

-- Writes stay open to the publishable key so fetchDailyBread.js works the same
-- way the other scrapers in this repo do. No delete policy — a bad run can
-- overwrite a day, but it can't empty the table.
create policy "daily_bread read"   on daily_bread for select using (true);
create policy "daily_bread insert" on daily_bread for insert with check (true);
create policy "daily_bread update" on daily_bread for update using (true) with check (true);
