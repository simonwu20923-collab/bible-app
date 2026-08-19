// Daily reading email.
//
// Sends today's devotional plus the NT and OT portions to everyone with
// users.daily_email = true. Each message carries two signed links that record a
// check-in without the reader signing in. Tokens are HMAC-signed rather than
// stored, so there is no table to expire and nothing guessable.
//
// Secrets required (npx supabase secrets set ...):
//   RESEND_API_KEY   sending key from resend.com
//   CHECKIN_SECRET   32+ random bytes, hex. Signs the check-in links.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://bible.churchincerritos.org";
const FROM = "Bible Reading <noreply@churchincerritos.org>";
const TZ = "America/Los_Angeles";
// Handled by an edge function, not the SPA: Gmail's one-click unsubscribe POSTs
// to this URL with no credentials and expects a 200, which a static page cannot do.
const UNSUB = `${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe`;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const CHECKIN_SECRET = Deno.env.get("CHECKIN_SECRET") ?? "";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── token minting ──────────────────────────────────────────────────────────
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function mintToken(userId: string, date: string, portion: string) {
  const payload = `${userId}.${date}.${portion}`;
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(CHECKIN_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return `${b64url(enc.encode(payload))}.${b64url(new Uint8Array(sig))}`;
}

// ── template ───────────────────────────────────────────────────────────────
const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Verse text arrives newline-separated as "Rm 15 :14 But I myself also am...".
// Split the reference off so it can be dimmed, the way the site renders it.
function verses(text: string): string {
  return String(text || "").split("\n").filter(Boolean).map((line) => {
    const m = line.match(/^(\S+\s*\d+\s*:\s*\d+)\s+([\s\S]*)$/);
    const ref = m ? m[1] : "";
    const body = m ? m[2] : line;
    return `<p style="margin:0 0 11px;font-size:16px;line-height:1.6;color:#1a1726">` +
      (ref ? `<span style="color:#8b86a0;font-size:12px">${esc(ref)}</span> ` : "") +
      `${esc(body)}</p>`;
  }).join("");
}

// A padded table cell, not a <button> — Outlook renders with Word's engine.
function button(href: string, label: string, bg: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0">
    <tr><td align="center" bgcolor="${bg}" style="border-radius:8px">
      <a href="${href}" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${label}</a>
    </td></tr></table>`;
}

// Audio cannot play inside an email — Gmail and Outlook strip <audio> outright.
// A labelled link out to the file is the honest substitute.
function listenLink(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;margin:0 10px 8px 0;padding:7px 14px;font-size:13px;font-weight:600;color:#6d28d9;text-decoration:none;border:1px solid #d6cdf3;border-radius:20px">&#9654;&nbsp; ${esc(label)}</a>`;
}

function devotional(db: Record<string, string> | null): string {
  if (!db) return "";
  const field = (label: string, value: string) => value
    ? `<div style="margin:0 0 14px">
         <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9;margin-bottom:4px">${esc(label)}</div>
         <div style="font-size:15px;line-height:1.6;color:#1a1726">${esc(value)}</div>
       </div>` : "";

  const links = [
    db.hymn_url ? `<a href="${esc(db.hymn_url)}" style="color:#6d28d9;font-weight:600;text-decoration:none">&#9834; ${esc(db.hymn_title || "Hymn")}</a>` : "",
    db.ls_url ? `<a href="${esc(db.ls_url)}" style="color:#6d28d9;font-weight:600;text-decoration:none">&#128214; ${esc(db.ls_title || "Life-study")}</a>` : "",
  ].filter(Boolean).join('<span style="color:#b3aec4"> &middot; </span>');

  const audio = [
    db.hymn_audio && /\.mp3(\?|$)/i.test(db.hymn_audio) ? listenLink(db.hymn_audio, "Play hymn") : "",
    db.ls_audio ? listenLink(db.ls_audio, "Play life-study") : "",
  ].filter(Boolean).join("");

  return `
    <tr><td style="padding:22px 28px 8px;border-top:1px solid #e3dfec">
      <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9;margin-bottom:14px">&#128218; Today's Reading</div>
      ${field("Topic", db.topic)}
      ${field("Key Verse", db.key_verse)}
      ${field("Emphasis", db.emphasis)}
      ${field("Musing", db.musing)}
      ${field("Prayer", db.prayer)}
      ${links ? `<div style="margin:14px 0 4px;font-size:14px">${links}</div>` : ""}
      ${audio ? `<div style="margin:8px 0 4px">${audio}</div>` : ""}
    </td></tr>`;
}

function renderEmail(o: {
  reading: Record<string, string>;
  bread: Record<string, string> | null;
  name: string;
  ntToken: string;
  otToken: string;
  date: string;
  unsubToken: string;
}): string {
  const { reading, bread, name, ntToken, otToken, date, unsubToken } = o;
  const pretty = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });

  const portion = (title: string, text: string, token: string, label: string, bg: string) => `
    <tr><td style="padding:26px 28px 6px;border-top:1px solid #e3dfec">
      <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9;margin-bottom:10px">${esc(title)}</div>
      ${verses(text)}
      ${button(`${SITE}/checkin.html?t=${token}`, label, bg)}
    </td></tr>`;

  // Deliberately a single light palette. Gmail — where most readers are — ignores
  // prefers-color-scheme and runs its own inversion, so a dark variant would only
  // have reached Apple Mail while adding a second palette to keep working.
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f2f9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f2f9;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden">

    <tr><td style="padding:26px 28px 18px;background:#7c3aed">
      <div style="font-size:20px;font-weight:700;color:#ffffff">Bible Reading</div>
      <div style="font-size:14px;color:#e2d9fb;margin-top:4px">${esc(pretty)}</div>
    </td></tr>

    <tr><td style="padding:20px 28px 0">
      <p style="margin:0;font-size:16px;color:#4a4459">Good morning${name ? ", " + esc(name) : ""} — here is today's reading. Tap <b>Finish</b> under each portion once you have read it.</p>
      <p style="margin:10px 0 0;font-size:14px"><a href="${SITE}/reading?date=${date}" style="color:#6d28d9">Open on the site for audio &rarr;</a></p>
    </td></tr>

    ${devotional(bread)}
    ${portion(reading.nt_title, reading.nt_text, ntToken, "Finish NT", "#059669")}
    ${portion(reading.ot_title, reading.ot_text, otToken, "Finish OT", "#7c3aed")}

    <tr><td style="padding:20px 28px 26px;border-top:1px solid #e3dfec;font-size:12px;color:#8b86a0;line-height:1.6">
      Church in Cerritos &middot; you are receiving this because you turned on daily reading emails.<br>
      <a href="${UNSUB}?t=${unsubToken}" style="color:#8b86a0">Unsubscribe</a>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}

// ── access control ─────────────────────────────────────────────────────────
// Only the scheduler may trigger a send. Edge Functions accept any valid JWT by
// default and the publishable key ships in the web bundle, so without this
// anyone reading the site's JavaScript could fire the whole mailing list.
//
// Two credential formats are accepted because this project has both key systems
// live: the current secret key (sb_secret_…, which is what Supabase injects as
// SUPABASE_SERVICE_ROLE_KEY here) and the legacy service_role JWT still shown in
// the dashboard. The platform gateway verifies a JWT's signature before this
// function runs, so a role claim that reaches us has already been authenticated.
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

// ── handler ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status, headers: { "Content-Type": "application/json" },
    });

  const url = new URL(req.url);

  if (!isPrivileged(req)) return json({ error: "forbidden" }, 403);

  // Refuse to sign with a weak or missing secret — an empty key would let
  // anyone forge a check-in link for any user.
  if (CHECKIN_SECRET.length < 32) {
    return json({ error: "CHECKIN_SECRET missing or shorter than 32 chars" }, 500);
  }
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not set" }, 500);

  const only = url.searchParams.get("test");        // ?test=me@example.com
  const dry = url.searchParams.get("dry") === "1";  // build but do not send
  const override = url.searchParams.get("date");    // ?date=2026-08-19, for previews

  const nowParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const part = (t: string) => nowParts.find((p) => p.type === t)?.value ?? "";
  const localHour = Number(part("hour")) % 24;
  const today = `${part("year")}-${part("month")}-${part("day")}`;

  // cron runs hourly and this gate picks the right hour, rather than cron firing
  // once at a fixed UTC time. pg_cron has no timezone awareness, so a fixed UTC
  // schedule would drift by an hour twice a year when Pacific switches to DST.
  if (url.searchParams.get("scheduled") === "1" && localHour !== 0) {
    return json({ skipped: true, reason: "not the send hour", localHour, tz: TZ });
  }

  const sendDate = override || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sendDate)) {
    return json({ error: "date must be YYYY-MM-DD" }, 400);
  }

  const { data: reading } = await sb
    .from("verses").select("*").eq("date", sendDate).maybeSingle();
  if (!reading) return json({ error: `no reading row for ${sendDate}` }, 404);

  // daily_bread repeats yearly, so it is keyed by MM-DD rather than a full date.
  const { data: bread } = await sb
    .from("daily_bread").select("*").eq("md", sendDate.slice(5)).eq("lang", "en").maybeSingle();

  let q = sb.from("users").select("id, name, email, email_token").eq("daily_email", true);
  if (only) q = q.eq("email", only);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);
  if (!subs?.length) return json({ date: sendDate, sent: 0, note: "nobody opted in" });

  const subject = `${reading.nt_title} · ${reading.ot_title}`;
  const messages = [];
  for (const u of subs) {
    const [ntToken, otToken] = await Promise.all([
      mintToken(u.id, sendDate, "NT"),
      mintToken(u.id, sendDate, "OT"),
    ]);
    messages.push({
      from: FROM,
      to: u.email,
      subject,
      html: renderEmail({
        reading, bread, name: u.name, ntToken, otToken,
        date: sendDate, unsubToken: u.email_token,
      }),
      headers: {
        "List-Unsubscribe": `<${UNSUB}?t=${u.email_token}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  }

  if (dry) {
    // The live check-in links come back too, so the landing page can be tested
    // without waiting for a message to arrive. Reaching this needs the service
    // role, so the tokens are not exposed to anyone who could not already send.
    return json({
      date: sendDate, attempted: messages.length, sent: 0, dry: true,
      devotional: bread ? "included" : "none for this date",
      subject,
      emails: messages.map((m) => ({
        to: m.to,
        bytes: m.html.length,
        finishNT: (m.html.match(/checkin\.html\?t=[^"]+/g) || [])[0],
        finishOT: (m.html.match(/checkin\.html\?t=[^"]+/g) || [])[1],
      })),
    });
  }

  // One batch request rather than one per recipient: the free tier allows only
  // 2 requests a second, so 60 individual sends would be throttled into 429s.
  // Resend caps a batch at 100, hence the chunking.
  const failed: unknown[] = [];
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const body = await res.json();
      if (res.ok) sent += (body.data?.length ?? chunk.length);
      else failed.push({ chunk: i / 100, status: res.status, body });
    } catch (e) {
      failed.push({ chunk: i / 100, error: String(e) });
    }
  }

  return json({
    date: sendDate,
    attempted: messages.length,
    sent,
    failed,
    devotional: bread ? "included" : "none for this date",
    dry: false,
  });
});
