// JSON.stringify safe-serialization lab — vulnerable starter.
//
// Feature: persist a rich session object to localStorage on write, and read it
// back on read.
//
// BOUNDARY: the outbound edge. serializeSession() turns the in-memory session
// into a string that gets stored. Whatever that string contains, leaves your
// control the moment it lands in localStorage (and from there, potentially logs,
// URLs, or telemetry).
//
// The harness (verify.js) calls serializeSession(session) with a session that
// carries a secret field, then checks whether that secret leaked into the output.

// The rich session object. It started clean, then upstream code stitched on a
// sessionToken (sensitive) and internalFlags (internal-only) — exactly the kind
// of fields that ride along on an object and were never meant to be emitted.
export const sessionState = {
  userId: 42,
  displayName: "Ada Lovelace",
  theme: "dark",
  sessionToken: "eyJhbGciOiJIUzI1NiJ9.payload.signature", // sensitive — must never serialize
  internalFlags: { betaCohort: true, debugTracing: true }, // internal-only
  lastSeen: new Date("2026-06-20T15:00:00Z"),
};

// Naive serialize: hands the WHOLE object to JSON.stringify. Every own enumerable
// property is emitted — including sessionToken and internalFlags.
export function serializeSession(session) {
  // TODO: This is the defense point. The line below stringifies the entire
  // object, so the sessionToken and internalFlags leak into the stored string.
  // Replace it so that ONLY an explicit allow-list of fields is emitted —
  // userId, displayName, theme, and lastSeen — and nothing else.
  //
  //   Hint: pass an allow-list array as the second argument to JSON.stringify,
  //   e.g. JSON.stringify(session, ["userId", "displayName", "theme", "lastSeen"]).
  //   (You could also use a replacer function or a toJSON method on a session
  //   model — any of the three enforces the allow-list.)
  return JSON.stringify(session);
}

// The persistence layer that actually uses the serializer.
export function save(session = sessionState) {
  localStorage.setItem("session", serializeSession(session));
}
