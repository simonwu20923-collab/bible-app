// Daily reading email.
//
// Sends today's NT and OT portions to everyone with users.daily_email = true.
// Each message carries two signed links that record a check-in without the
// reader logging in. Tokens are HMAC-signed rather than stored, so there is no
// table to expire and nothing guessable.
//
// Secrets required (npx supabase secrets set ...):
//   RESEND_API_KEY   sending key from resend.com
//   CHECKIN_SECRET   32+ random bytes, hex. Signs the check-in links.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://bible.churchincerritos.org";
const FROM = "Bible Reading <noreply@churchincerritos.org>";
const TZ = "America/Los_Angeles";

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
const esc = (s: string) =>
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

function renderEmail(o: {
  reading: Record<string, string>;
  name: string;
  ntToken: string;
  otToken: string;
  date: string;
  unsubToken: string;
}): string {
  const { reading, name, ntToken, otToken, date, unsubToken } = o;
  const pretty = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });

  const portion = (title: string, text: string, token: string, label: string, bg: string) => `
    <tr><td style="padding:26px 28px 6px;border-top:1px solid #e3dfec">
      <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9;margin-bottom:10px">${esc(title)}</div>
      ${verses(text)}
      ${button(`${SITE}/checkin?t=${token}`, label, bg)}
    </td></tr>`;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f2f9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f2f9;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden">

    <tr><td style="padding:26px 28px 18px;background:#7c3aed">
      <div style="font-size:20px;font-weight:700;color:#ffffff">Bible Reading</div>
      <div style="font-size:14px;color:#e2d9fb;margin-top:4px">${esc(pretty)}</div>
    </td></tr>

    <tr><td style="padding:20px 28px 0">
      <p style="margin:0;font-size:16px;color:#4a4459">Good morning${name ? ", " + esc(name) : ""} — here is today's reading. Tap <b>Finished</b> under each portion to log it.</p>
      <p style="margin:10px 0 0;font-size:14px"><a href="${SITE}/reading?date=${date}" style="color:#6d28d9">Open on the site for audio &rarr;</a></p>
    </td></tr>

    ${portion(reading.nt_title, reading.nt_text, ntToken, "&#10003; Finished NT", "#059669")}
    ${portion(reading.ot_title, reading.ot_text, otToken, "&#10003; Finished OT", "#7c3aed")}

    <tr><td style="padding:20px 28px 26px;border-top:1px solid #e3dfec;font-size:12px;color:#8b86a0;line-height:1.6">
      Church in Cerritos &middot; you are receiving this because you turned on daily reading emails.<br>
      <a href="${SITE}/unsubscribe?t=${unsubToken}" style="color:#8b86a0">Unsubscribe</a>
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

  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });

  const { data: reading } = await sb
    .from("verses").select("*").eq("date", today).maybeSingle();
  if (!reading) return json({ error: `no reading row for ${today}` }, 404);

  let q = sb.from("users").select("id, name, email, email_token").eq("daily_email", true);
  if (only) q = q.eq("email", only);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);
  if (!subs?.length) return json({ date: today, sent: 0, note: "nobody opted in" });

  const results: { email: string; ok: boolean; detail?: string }[] = [];

  for (const u of subs) {
    const [ntToken, otToken] = await Promise.all([
      mintToken(u.id, today, "NT"),
      mintToken(u.id, today, "OT"),
    ]);
    const html = renderEmail({
      reading, name: u.name, ntToken, otToken, date: today, unsubToken: u.email_token,
    });

    if (dry) {
      results.push({ email: u.email, ok: true, detail: `${html.length} bytes` });
      continue;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: u.email,
          subject: `${reading.nt_title} · ${reading.ot_title}`,
          html,
          headers: {
            "List-Unsubscribe": `<${SITE}/unsubscribe?t=${u.email_token}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });
      const body = await res.json();
      results.push({
        email: u.email,
        ok: res.ok,
        detail: res.ok ? body.id : JSON.stringify(body),
      });
    } catch (e) {
      results.push({ email: u.email, ok: false, detail: String(e) });
    }
  }

  return json({
    date: today,
    attempted: results.length,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok),
    dry,
  });
});
