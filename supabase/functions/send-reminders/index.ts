// Push reminders. Called hourly by cron with ?scheduled=1.
//
// Two jobs, both push only — never email, so the evening nudge costs nothing:
//
//   morning  at each reader's chosen hour, a note that today's portion is ready
//   evening  at 21:00 Los Angeles, a nudge to anyone who has not finished today
//
// The evening pass reads checkins first and stays silent for anyone already
// done. Someone who has read should never be told to read.

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const TZ = "America/Los_Angeles";
const EVENING_HOUR = 21;

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@churchincerritos.org",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const MORNING = {
  en: { title: "Today's reading", body: "Your portion is ready. Tap to open it." },
  es: { title: "La lectura de hoy", body: "Tu porción está lista. Toca para abrirla." },
  zh: { title: "今日讀經", body: "今天的進度已準備好，點擊開始閱讀。" },
  sc: { title: "今日读经", body: "今天的进度已准备好，点击开始阅读。" },
};

// Worded so it reads as an offer rather than a scolding, and it names what is
// actually left rather than assuming nothing has been read.
const EVENING = {
  en: {
    title: "Still time today",
    both: "Today's reading is waiting whenever you have a moment.",
    nt: "The New Testament portion is still open for today.",
    ot: "The Old Testament portion is still open for today.",
  },
  es: {
    title: "Aún hay tiempo hoy",
    both: "La lectura de hoy te espera cuando tengas un momento.",
    nt: "Falta la porción del Nuevo Testamento de hoy.",
    ot: "Falta la porción del Antiguo Testamento de hoy.",
  },
  zh: {
    title: "今天還來得及",
    both: "今日的讀經還在等你，隨時都可以開始。",
    nt: "今天的新約進度還沒完成。",
    ot: "今天的舊約進度還沒完成。",
  },
  sc: {
    title: "今天还来得及",
    both: "今日的读经还在等你，随时都可以开始。",
    nt: "今天的新约进度还没完成。",
    ot: "今天的旧约进度还没完成。",
  },
};

function isPrivileged(req: Request): boolean {
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return false;
  const envKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (envKey && bearer === envKey) return true;
  const parts = bearer.split(".");
  if (parts.length === 3) {
    try {
      let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      return JSON.parse(atob(b64)).role === "service_role";
    } catch { /* not a readable JWT */ }
  }
  return false;
}

type Sub = { endpoint: string; p256dh: string; auth: string; email: string; lang: string };

async function push(sub: Sub, title: string, body: string, tag: string) {
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify({ title, body, url: "/reading", tag }),
  );
}

Deno.serve(async (req) => {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b, null, 2), {
      status, headers: { "Content-Type": "application/json" },
    });

  if (!isPrivileged(req)) return json({ error: "forbidden" }, 403);

  const url = new URL(req.url);
  const forceHour = url.searchParams.get("hour");   // for testing a specific hour

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const hour = forceHour !== null ? Number(forceHour) : Number(p("hour")) % 24;
  const today = `${p("year")}-${p("month")}-${p("day")}`;

  const { data: subsRaw } = await sb.from("push_subscriptions")
    .select("endpoint, p256dh, auth, email, lang");
  const subs = (subsRaw ?? []) as Sub[];
  if (!subs.length) return json({ hour, sent: 0, note: "nobody subscribed" });

  const { data: users } = await sb.from("users").select("id, email, name, notify_at");
  const byEmail = new Map((users ?? []).map((u) => [u.email, u]));

  const dead: string[] = [];
  const results: { kind: string; email: string; ok: boolean }[] = [];

  // ── morning, at each reader's chosen hour ────────────────────────────────
  for (const s of subs) {
    const u = byEmail.get(s.email);
    const chosen = Number(String(u?.notify_at ?? "00:01").slice(0, 2));
    if (chosen !== hour) continue;
    const t = MORNING[(s.lang as keyof typeof MORNING)] ?? MORNING.en;
    try {
      await push(s, t.title, t.body, "daily-reading");
      results.push({ kind: "morning", email: s.email, ok: true });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) dead.push(s.endpoint);
      results.push({ kind: "morning", email: s.email, ok: false });
    }
  }

  // ── evening, only for what is still unread ───────────────────────────────
  let eveningSkipped = 0;
  if (hour === EVENING_HOUR) {
    const { data: done } = await sb.from("checkins")
      .select("name, portion, user_id").eq("date", today);
    // Indexed both ways: by account for rows that carry one, by name for the
    // rest. A reminder sent to someone who has already read is worse than none.
    const byName = new Map<string, Set<string>>();
    const byId = new Map<string, Set<string>>();
    (done ?? []).forEach((r) => {
      const nk = String(r.name).toLowerCase();
      if (!byName.has(nk)) byName.set(nk, new Set());
      byName.get(nk)!.add(r.portion);
      if (r.user_id) {
        if (!byId.has(r.user_id)) byId.set(r.user_id, new Set());
        byId.get(r.user_id)!.add(r.portion);
      }
    });

    for (const s of subs) {
      const u = byEmail.get(s.email);
      if (!u?.name) continue;
      // Union of both, so a day recorded either way counts as read.
      const got = new Set([
        ...(byId.get(u.id) ?? []),
        ...(byName.get(String(u.name).toLowerCase()) ?? []),
      ]);
      const needNT = !got.has("NT");
      const needOT = !got.has("OT");
      if (!needNT && !needOT) { eveningSkipped++; continue; }   // already finished

      const t = EVENING[(s.lang as keyof typeof EVENING)] ?? EVENING.en;
      const body = needNT && needOT ? t.both : needNT ? t.nt : t.ot;
      try {
        await push(s, t.title, body, "evening-reminder");
        results.push({ kind: "evening", email: s.email, ok: true });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
        results.push({ kind: "evening", email: s.email, ok: false });
      }
    }
  }

  if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);

  return json({
    hour, date: today,
    morningSent: results.filter((r) => r.kind === "morning" && r.ok).length,
    eveningSent: results.filter((r) => r.kind === "evening" && r.ok).length,
    eveningSkippedAlreadyRead: eveningSkipped,
    failed: results.filter((r) => !r.ok).length,
    removedDeadSubscriptions: dead.length,
  });
});
