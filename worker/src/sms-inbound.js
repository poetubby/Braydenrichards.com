import { validateTwilioSignature } from "./lib/twilio.js";

const TAG_PATTERN = /#[\w-]+/g;
const REMINDER_PATTERN = /\b(remind me|reminder|text me)\b/i;

export async function handleSmsInbound(request, env) {
  const rawBody = await request.text();

  const isValid = await validateTwilioSignature(request, env.TWILIO_AUTH_TOKEN, rawBody);
  if (!isValid) {
    return new Response("Invalid signature", { status: 403 });
  }

  const params = new URLSearchParams(rawBody);
  const from = params.get("From") || "";
  const messageBody = (params.get("Body") || "").trim();

  if (env.OWNER_PHONE_NUMBER && from !== env.OWNER_PHONE_NUMBER) {
    // Not us — ack silently so Twilio doesn't retry, but write nothing.
    return twiml();
  }

  if (!messageBody) {
    return twiml();
  }

  const tags = extractTags(messageBody);
  const hasReminderPhrase = REMINDER_PATTERN.test(messageBody);
  // TODO(Step 5): parse the actual reminder time (e.g. via chrono-node) and
  // store it here instead of null.
  const remindAt = null;

  await env.DB.prepare(
    `INSERT INTO notes (id, body, tags, created_at, remind_at, reminded)
     VALUES (?, ?, ?, ?, ?, 0)`
  )
    .bind(crypto.randomUUID(), messageBody, tags, Math.floor(Date.now() / 1000), remindAt)
    .run();

  const confirmation = tags ? `Saved [${tags.replaceAll(",", " ")}]` : "Saved";
  const suffix = hasReminderPhrase ? " (reminder scheduling coming soon)" : "";
  return twiml(`${confirmation}${suffix}`);
}

function extractTags(body) {
  const matches = body.match(TAG_PATTERN) || [];
  return [...new Set(matches.map((tag) => tag.toLowerCase()))].join(",");
}

function twiml(message) {
  const body = message
    ? `<Response><Message>${escapeXml(message)}</Message></Response>`
    : "<Response></Response>";
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str) {
  const escapes = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" };
  return str.replace(/[<>&'"]/g, (c) => escapes[c]);
}
