// app.js — the profile handler under test.
//
// A profile page fetches a user record and renders it. A resolved fetch only
// tells you bytes arrived; it tells you nothing about whether those bytes form
// the object this code expects. This starter trusts the parsed shape completely:
// it parses the body and reaches straight into `data.user.name` and
// `data.user.roles` without a single check.
//
// That works the first hundred times, while the API returns the shape you
// assumed. It breaks the moment the API returns an error envelope, a proxy
// truncates the stream, or a field comes back as the wrong type — the handler
// throws inside the render path and the page goes blank, or it mis-uses a
// wrongly typed value and feeds corrupt data downstream toward a DOM write.
//
// `verify.js` runs a well-formed body plus three bad ones through loadProfile().
// In this starter the bad bodies make it throw or return a corrupt profile —
// the harness reports the vulnerability as REPRODUCED.

// A tiny stand-in for a fetch Response, so this lab stays framework- and
// network-free. `text()` returns the raw body; `json()` parses it (and throws
// on malformed JSON, exactly like the real thing).

const ALLOWED_ROLES = new Set(["admin"]);
export function makeResponse(body) {
  return {
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

// The naive handler. No safe-parse wrapper, no shape check, no bounds check.
export async function loadProfile(response) {
  // response.json() calls JSON.parse for you — and throws a SyntaxError on a
  // truncated or otherwise malformed body, with nothing here to catch it.
  let data;

  try {
    const body = await response.text();

    if (typeof body !== "string" || body.trim() === "") {
      return { ok: false, reason: "Empty or non-string response body" };
    }

    data = JSON.parse(body);
  } catch {
    return { ok: false, reason: "Invalid or unreadable JSON body" };
  }

  // TODO: This is the fix point. Right now the handler trusts the parsed shape:
  //   - it does not wrap the parse to convert a SyntaxError into a safe rejection
  //   - it does not confirm `data.user` exists and is an object before reading it
  //   - it does not check that `name` is a string or `roles` is a string[]
  //   - it does not enforce bounds (name length, allowed roles)
  // Replace the blind property access below with: safeParse -> shape validation
  // (Object.hasOwn for keys, typeof / Array.isArray for types) -> bounds checks,
  // returning { ok: true, profile } or { ok: false, reason } and never throwing.
  if (
    data === null ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Object.hasOwn(data, "user")
  ) {
    return { ok: false, reason: "Expected a user object" };
  }

  const user = data.user;

  if (
    user === null ||
    typeof user !== "object" ||
    Array.isArray(user) ||
    !Object.hasOwn(user, "id") ||
    !Object.hasOwn(user, "name") ||
    !Object.hasOwn(user, "roles")
  ) {
    return { ok: false, reason: "Expected a user with id, name, and roles" };
  }

  const { id, name, roles } = user;

  if (
    !Number.isFinite(id) ||
    typeof name !== "string" ||
    !Array.isArray(roles) ||
    !roles.every((role) => typeof role === "string")
  ) {
    return { ok: false, reason: "Invalid profile field types" };
  }

  if (name.length > 100) {
    return { ok: false, reason: "Name exceeds 100 characters" };
  }

  if (!roles.every((role) => ALLOWED_ROLES.has(role))) {
    return { ok: false, reason: "Profile contains an unsupported role" };
  }

  return { ok: true, profile: { name, roles } };
}
