-- Notifications for comment replies, reactions and @mentions.
-- Keyed by user NAME, like comments and check-ins: this app has no auth and
-- comments carry no user id, so a name is the only identity available. Read
-- state is therefore advisory rather than enforced.

create table if not exists notifications (
  id          bigserial primary key,
  recipient   text not null,          -- users.name
  actor       text not null,
  type        text not null,          -- 'reply' | 'reaction' | 'mention'
  -- comments.id is a UUID, not a bigint. Declaring this as bigint made every
  -- insert fail the type check silently: the comment posted, the notification
  -- did not, and the error only surfaced in the browser console.
  comment_id  text not null,          -- comment to jump to
  date        text not null,          -- reading date, for the /reading?date= link
  excerpt     text,
  emoji       text,                   -- reactions only
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on notifications (recipient, read, created_at desc);

alter table notifications enable row level security;

create policy "notifications read"   on notifications for select using (true);
create policy "notifications insert" on notifications for insert with check (true);
create policy "notifications update" on notifications for update using (true) with check (true);
create policy "notifications delete" on notifications for delete using (true);
