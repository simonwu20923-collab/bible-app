import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

// Confirmation page the unsubscribe edge function redirects to.
//
// The function does the database work and then sends the reader here, because
// the Supabase edge gateway serves every function response as text/plain with
// nosniff — HTML returned from a function shows up as raw source.

const MESSAGES = {
  ok: {
    emoji: '✅',
    title: 'Unsubscribed',
    body: 'You will no longer receive the daily reading email. Your reading history is untouched, and you can turn the email back on any time from your account.',
  },
  unknown: {
    emoji: '🤔',
    title: 'Link not recognised',
    body: 'This link may already have been used, or it belongs to an account that no longer exists. If you are still getting emails, let us know.',
  },
  missing: {
    emoji: '⚠️',
    title: "That link was incomplete",
    body: 'The unsubscribe code was missing from the address. Try clicking the link in the email again.',
  },
  error: {
    emoji: '⚠️',
    title: 'Something went wrong',
    body: 'We could not update your preference just now. Please try again in a moment.',
  },
};

export default function Unsubscribed() {
  const [params] = useSearchParams();
  const m = MESSAGES[params.get('status')] || MESSAGES.ok;

  return (
    <div className="page">
      <div className="welcome-card">
        <div className="welcome-emoji">{m.emoji}</div>
        <h1>{m.title}</h1>
        <p className="welcome-sub">{m.body}</p>
        <div className="checkin-actions">
          <Link className="start-btn" to="/">Back to Bible Reading →</Link>
        </div>
      </div>
    </div>
  );
}
