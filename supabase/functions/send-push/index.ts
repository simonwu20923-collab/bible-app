// Web push sender.
//
// Two modes:
//   { "to": "someone@example.com", ... }  one reader, used for @mention pings
//   { "all": true, ... }                  everyone subscribed, the daily nudge
//
// Endpoints that answer 404 or 410 are gone for good — the browser dropped the
// subscription — so those rows are deleted rather than retried forever.
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@churchincerritos.org",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

// The default reminder, per language. An explicit title/body in the request
// still wins — a mention ping carries its own words.
const TEMPLATES = {
  en: { title: "Today's reading", body: "Your portion is ready. Tap to open it." },
  es: { title: "La lectura de hoy", body: "Tu porción está lista. Toca para abrirla." },
  zh: { title: "今日讀經", body: "今天的進度已準備好，點擊開始閱讀。" },
  sc: { title: "今日读经", body: "今天的进度已准备好，点击开始阅读。" },
};

// Same reasoning as the mail sender: the publishable key is public in the web
// bundle, so a valid JWT alone cannot be the gate on something that notifies
// every reader at once.
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

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status, headers: { "Content-Type": "application/json" },
    });

  if (!isPrivileged(req)) return json({ error: "forbidden" }, 403);

  let input: Record<string, unknown> = {};
  try { input = await req.json(); } catch { /* empty body */ }

  const title = input.title != null ? String(input.title) : null;
  const body = input.body != null ? String(input.body) : null;
  const url = String(input.url ?? "/reading");
  const tag = input.tag ? String(input.tag) : undefined;
  const to = input.to ? String(input.to) : null;
  const all = input.all === true;

  if (!to && !all) return json({ error: "pass either \"to\" or \"all\": true" }, 400);

  let q = sb.from("push_subscriptions").select("endpoint, p256dh, auth, email, lang");
  if (to) q = q.eq("email", to);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);
  if (!subs?.length) return json({ sent: 0, note: "nobody subscribed" });

  let sent = 0;
  const dead: string[] = [];
  const failed: { endpoint: string; status?: number; message: string }[] = [];

  for (const s of subs) {
    // Each device gets the language it was subscribed from, which is the system
    // language of that device rather than whatever the site was last set to.
    const strings = TEMPLATES[s.lang as keyof typeof TEMPLATES] ?? TEMPLATES.en;
    const payload = JSON.stringify({
      title: title ?? strings.title,
      body: body ?? strings.body,
      url, tag,
    });
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) dead.push(s.endpoint);
      else failed.push({ endpoint: s.endpoint.slice(-24), status, message: String(e).slice(0, 120) });
    }
  }

  if (dead.length) {
    await sb.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return json({
    attempted: subs.length,
    sent,
    removedDeadSubscriptions: dead.length,
    failed,
  });
});
