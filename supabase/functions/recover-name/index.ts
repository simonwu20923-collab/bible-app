// "What was my name again?" — email the account name to the address on file.
//
// Deployed with --no-verify-jwt because it is called from the sign-in screen,
// where nobody is signed in yet.
//
// The reply is identical whether or not the address is known. Saying "no such
// account" would let anyone test which of a congregation's addresses are
// registered, and the person asking learns nothing useful from it either.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://bible.churchincerritos.org";
const FROM = "Bible Reading <noreply@churchincerritos.org>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function body(name: string, aliases: string[]): string {
  const also = aliases.length
    ? `<p style="margin:0 0 16px;font-size:14px;color:#6b6580">You can also sign in with:
         ${aliases.map((a) => `<b>${esc(a)}</b>`).join(", ")}</p>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f2f9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f2f9;padding:28px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="padding:24px 28px 16px;background:#7c3aed">
      <div style="font-size:19px;font-weight:700;color:#ffffff">Bible Reading</div>
    </td></tr>
    <tr><td style="padding:24px 28px 28px">
      <p style="margin:0 0 8px;font-size:15px;color:#4a4459">The name on your account is</p>
      <p style="margin:0 0 18px;font-size:26px;font-weight:700;color:#1a1726">${esc(name)}</p>
      ${also}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" bgcolor="#7c3aed" style="border-radius:8px">
          <a href="${SITE}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">Sign in</a>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#8b86a0;line-height:1.6">
        If you did not ask for this, you can ignore it — nothing about your account has changed.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status, headers: { "Content-Type": "application/json", ...CORS },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  let email = "";
  try { email = String((await req.json()).email ?? "").trim().toLowerCase(); }
  catch { /* empty body */ }

  // Same answer either way.
  const same = { ok: true, sent: true };
  if (!email || !email.includes("@")) return json(same);

  const { data: accounts } = await sb.from("users")
    .select("id, name").eq("email", email).order("created_at", { ascending: true }).limit(1);
  const account = accounts?.[0];
  if (!account) return json(same);

  const { data: aliasRows } = await sb.from("user_aliases")
    .select("name").eq("user_id", account.id);
  const aliases = (aliasRows ?? []).map((a) => a.name);

  if (!RESEND_API_KEY) { console.error("RESEND_API_KEY not set"); return json(same); }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: "Your Bible Reading sign-in name",
        html: body(account.name, aliases),
      }),
    });
    if (!res.ok) console.error("recover-name send failed", await res.text());
  } catch (e) {
    console.error("recover-name send threw", e);
  }

  return json(same);
});
