// One-click unsubscribe for the daily reading email.
//
// Deployed with --no-verify-jwt because both callers arrive without credentials:
// a reader clicking the footer link in their mail app, and Gmail's
// List-Unsubscribe one-click POST. The email_token is an unguessable uuid,
// which is what protects it.
//
// GET  -> unsubscribes, then redirects to a confirmation page on the site.
// POST -> unsubscribes, returns 200 (what one-click expects).
//
// The confirmation page lives on the site rather than here because the Supabase
// edge gateway forces Content-Type: text/plain with nosniff and a sandbox CSP on
// every function response — HTML returned from here is shown as raw source.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://bible.churchincerritos.org";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const seeOther = (status: string) =>
  new Response(null, { status: 303, headers: { Location: `${SITE}/unsubscribed?status=${status}` } });

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const isPost = req.method === "POST";

  if (!token) {
    return isPost ? new Response("missing token", { status: 400 }) : seeOther("missing");
  }

  const { data, error } = await sb
    .from("users").update({ daily_email: false })
    .eq("email_token", token).select("name").maybeSingle();

  if (error) {
    return isPost ? new Response("error", { status: 500 }) : seeOther("error");
  }

  // Unknown token: one-click still answers 200 so the mail client does not keep
  // retrying a link that will never work.
  if (!data) {
    return isPost ? new Response("ok", { status: 200 }) : seeOther("unknown");
  }

  return isPost ? new Response("ok", { status: 200 }) : seeOther("ok");
});
