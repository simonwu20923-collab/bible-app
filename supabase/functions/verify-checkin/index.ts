// Records a check-in from a signed email link.
//
// Called by the /checkin page in the browser, never by the email client
// directly: mail scanners (Outlook Safe Links and similar) fetch every URL in a
// message to vet it, and a link that logged a reading on GET would let them
// record readings nobody did. Scanners do not run JavaScript, so requiring the
// browser to make this call is what keeps the data honest.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CHECKIN_SECRET = Deno.env.get("CHECKIN_SECRET") ?? "";
const MAX_AGE_DAYS = 2;

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const enc = new TextEncoder();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function b64urlDecode(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// Constant-time compare, so a wrong signature cannot be narrowed byte by byte.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verify(token: string) {
  // Anything malformed is simply an invalid link. Without this, a token like
  // "bogus.token" reaches atob() with undecodable base64 and throws, and an
  // unhandled error returns 500 with no CORS headers — which the browser then
  // reports as a CORS failure rather than a bad link.
  try {
    const [payloadPart, sigPart] = token.split(".");
    if (!payloadPart || !sigPart) return null;

    const payload = new TextDecoder().decode(b64urlDecode(payloadPart));
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(CHECKIN_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const expected = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, enc.encode(payload)),
    );
    if (!timingSafeEqual(expected, b64urlDecode(sigPart))) return null;

    const [userId, date, portion] = payload.split(".");
    if (!userId || !date || !portion) return null;
    if (portion !== "NT" && portion !== "OT") return null;
    return { userId, date, portion };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { "Content-Type": "application/json", ...CORS },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (CHECKIN_SECRET.length < 32) {
    return json({ ok: false, error: "server misconfigured" }, 500);
  }

  try {
    return await handle(req, json);
  } catch (e) {
    // Any unexpected throw must still answer with CORS headers, or the browser
    // reports a misleading CORS error instead of the real failure.
    console.error("verify-checkin failed:", e);
    return json({ ok: false, error: "unexpected server error" }, 500);
  }
});

async function handle(
  req: Request,
  json: (body: unknown, status?: number) => Response,
): Promise<Response> {

  let token = "";
  try { token = (await req.json()).token ?? ""; } catch { /* empty body */ }
  if (!token) return json({ ok: false, error: "missing token" }, 400);

  const claim = await verify(token);
  if (!claim) return json({ ok: false, error: "invalid or tampered link" }, 400);

  // A link stays usable for a couple of days, so someone reading Monday's email
  // on Tuesday still counts, but an old message cannot backfill the year.
  const ageDays =
    (Date.now() - new Date(claim.date + "T00:00:00Z").getTime()) / 86_400_000;
  if (ageDays > MAX_AGE_DAYS) {
    return json({ ok: false, error: "this link has expired", date: claim.date }, 410);
  }

  const { data: user } = await sb
    .from("users").select("id, name").eq("id", claim.userId).maybeSingle();
  if (!user) return json({ ok: false, error: "unknown reader" }, 404);

  // check-ins are keyed by name, so resolve the id before writing.
  const { data: existing } = await sb
    .from("checkins").select("id")
    .eq("name", user.name).eq("date", claim.date).eq("portion", claim.portion)
    .maybeSingle();

  if (existing) {
    return json({
      ok: true, already: true, name: user.name,
      date: claim.date, portion: claim.portion,
    });
  }

  const { error } = await sb.from("checkins")
    .insert({ name: user.name, date: claim.date, portion: claim.portion });

  // A unique index makes a double click land here rather than duplicating.
  if (error && !/duplicate|unique/i.test(error.message)) {
    return json({ ok: false, error: error.message }, 500);
  }

  return json({
    ok: true, already: !!error, name: user.name,
    date: claim.date, portion: claim.portion,
  });
}
