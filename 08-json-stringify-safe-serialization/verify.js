// Attack harness for the JSON.stringify safe-serialization lab.
//
// This file is identical in the student and instructor trees. It drives the
// serializer in app.js and reports the same way in both — only the verdict
// differs, because only app.js differs.
//
// What it checks: serializeSession() is handed a session that carries a secret
// (sessionToken) and an internal-only field (internalFlags). A safe serializer
// emits only the allow-listed fields, so the secret must NOT appear in the output.
//
//   - Against the vulnerable starter, the whole object is stringified, the secret
//     leaks into the string, and the attack SUCCEEDS (FAIL — the lab's start state).
//   - Against the hardened reference, the allow-list drops the secret, the leak is
//     BLOCKED, and the legitimate fields still serialize (PASS).

import { serializeSession, sessionState } from "./app.js";

// The exact secret value that must never cross the outbound boundary.
const SECRET = "eyJhbGciOiJIUzI1NiJ9.payload.signature";

function report(passed, lines) {
  const el = document.getElementById("result");
  const verdict = passed ? "PASS" : "FAIL";
  const text = verdict + "\n\n" + lines.join("\n");
  if (el) {
    el.className = passed ? "pass" : "fail";
    el.textContent = text;
  }
  (passed ? console.log : console.error)("[serialization-leak verify] " + verdict);
  for (const line of lines) console.log("  " + line);
}

function run() {
  const lines = [];

  let output;
  let threw = null;
  try {
    output = serializeSession(sessionState);
  } catch (err) {
    threw = err;
  }

  if (threw) {
    lines.push("serializeSession() threw: " + threw.message);
    lines.push("The serializer must not throw on the legitimate session.");
    report(false, lines);
    return;
  }

  lines.push("Serialized output:");
  lines.push("  " + output);
  lines.push("");

  // The core assertion: the secret token must not be anywhere in the output.
  const secretLeaked = output.includes(SECRET);
  // Secondary check: the internal-only field must not be emitted either.
  const internalLeaked = output.includes("internalFlags") || output.includes("debugTracing");
  // Sanity check: the legitimate fields must still be present.
  const legitOk =
    output.includes("\"userId\"") &&
    output.includes("\"displayName\"") &&
    output.includes("\"theme\"") &&
    output.includes("\"lastSeen\"");

  if (secretLeaked || internalLeaked) {
    lines.push("ATTACK SUCCEEDS: sensitive data leaked into the serialized string.");
    if (secretLeaked) lines.push("  - sessionToken value appears in the output.");
    if (internalLeaked) lines.push("  - internalFlags / debugTracing appears in the output.");
    lines.push("");
    lines.push("This is the vulnerable starting state. Apply the allow-list at the");
    lines.push("TODO in app.js so only userId, displayName, theme, and lastSeen are");
    lines.push("emitted, then re-open this page.");
    report(false, lines);
    return;
  }

  if (!legitOk) {
    lines.push("LEAK BLOCKED, but the legitimate fields did not all serialize.");
    lines.push("The safe path must still emit userId, displayName, theme, and lastSeen.");
    report(false, lines);
    return;
  }

  lines.push("ATTACK BLOCKED: the secret never appears in the serialized string,");
  lines.push("and the four allow-listed fields still serialize correctly.");
  report(true, lines);
}

run();
