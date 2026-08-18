// Validates that a request genuinely came from Twilio.
// https://www.twilio.com/docs/usage/security#validating-requests
export async function validateTwilioSignature(request, authToken, rawBody) {
  const signature = request.headers.get("X-Twilio-Signature");
  if (!signature || !authToken) return false;

  const params = new URLSearchParams(rawBody);
  const keys = [...params.keys()].sort();

  let data = request.url;
  for (const key of keys) {
    data += key + params.get(key);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  const expected = base64FromBytes(new Uint8Array(digest));

  return timingSafeEqual(expected, signature);
}

function base64FromBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
