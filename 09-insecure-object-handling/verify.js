// Attack harness for the insecure object-handling lab.
//
// This file is identical in the student and instructor trees. It drives the
// handler in app.js and reports the same way in both — only the verdict differs,
// because only app.js differs.
//
// What it checks: applyProfile() is handed a hostile profile that
//   - claims to update displayName but also smuggles isAdmin:true (mass assignment),
//   - steers the dynamic read to "constructor" (unsafe dynamic read), and
//   - sends tier as the string "1" (loose-equality bypass).
// A safe handler refuses all three. The primary assertion is that the privileged
// key isAdmin must NOT get assigned onto the user.
//
//   - Against the vulnerable starter, the bulk copy applies isAdmin:true, the
//     dynamic read returns the Object constructor, and the loose gate accepts "1".
//     The attack SUCCEEDS (FAIL — the lab's start state).
//   - Against the hardened reference, isAdmin stays false, the read returns
//     undefined, and the gate rejects "1", while the benign profile still applies
//     its allowed fields. The attack is BLOCKED (PASS).

import { applyProfile, makeUser } from "./app.js";

function report(passed, lines) {
  const el = document.getElementById("result");
  const verdict = passed ? "PASS" : "FAIL";
  const text = verdict + "\n\n" + lines.join("\n");
  if (el) {
    el.className = passed ? "pass" : "fail";
    el.textContent = text;
  }
  (passed ? console.log : console.error)("[object-handling verify] " + verdict);
  for (const line of lines) console.log("  " + line);
}

function run() {
  const lines = [];

  // --- Hostile profile: privilege injection + dynamic-key steering + coercion ---
  const hostile = {
    displayName: "x",
    isAdmin: true,          // must never be applied
    internalId: "u-9",      // must never be applied
    preferredKey: "constructor", // must not resolve to a prototype-chain value
    tier: "1",              // string, must not satisfy a numeric gate
  };

  const userA = makeUser();
  let resA;
  try {
    resA = applyProfile(userA, hostile);
  } catch (err) {
    lines.push("applyProfile() threw on the hostile profile: " + err.message);
    report(false, lines);
    return;
  }

  const adminInjected = userA.isAdmin === true;
  const internalInjected = Object.hasOwn(userA, "internalId");
  const dynamicReadLeaked =
    resA.chosen !== undefined && typeof resA.chosen !== "string";
  const looseGatePassed = resA.isTierOne === true;

  lines.push("After applying the hostile profile:");
  lines.push("  user.isAdmin        = " + userA.isAdmin + "   (must be false)");
  lines.push("  user.internalId     = " + (internalInjected ? userA.internalId : "<absent>") + "   (must be absent)");
  lines.push("  chosen (dynamic read) = " + String(resA.chosen) + "   (must be undefined)");
  lines.push("  isTierOne (\"1\" gate)  = " + resA.isTierOne + "   (must be false)");
  lines.push("");

  if (adminInjected || internalInjected || dynamicReadLeaked || looseGatePassed) {
    lines.push("ATTACK SUCCEEDS: the handler mishandled untrusted input.");
    if (adminInjected) lines.push("  - mass assignment: isAdmin:true was applied to the user.");
    if (internalInjected) lines.push("  - mass assignment: internalId was applied to the user.");
    if (dynamicReadLeaked) lines.push("  - unsafe dynamic read: settings[\"constructor\"] returned a prototype-chain value.");
    if (looseGatePassed) lines.push("  - loose-equality bypass: the string \"1\" satisfied the tier gate.");
    lines.push("");
    lines.push("This is the vulnerable starting state. Apply the fixes at the TODO");
    lines.push("in app.js (allow-list copy, guarded dynamic read, strict gate),");
    lines.push("then re-open this page.");
    report(false, lines);
    return;
  }

  // --- Sanity: the legitimate path must still work ---
  const benign = { displayName: "Grace", theme: "light", tier: 1, preferredKey: "light" };
  const userB = makeUser();
  const resB = applyProfile(userB, benign);

  const benignOk =
    userB.displayName === "Grace" &&
    userB.theme === "light" &&
    userB.tier === 1 &&
    userB.isAdmin === false &&
    resB.chosen === "#fff" &&
    resB.isTierOne === true;

  if (!benignOk) {
    lines.push("ATTACK BLOCKED, but the legitimate profile did not apply correctly.");
    lines.push("  user = " + JSON.stringify(userB));
    lines.push("  chosen = " + String(resB.chosen) + ", isTierOne = " + resB.isTierOne);
    lines.push("The safe handler must still apply benign allow-listed fields.");
    report(false, lines);
    return;
  }

  lines.push("ATTACK BLOCKED: isAdmin and internalId were never applied, the");
  lines.push("dynamic read for \"constructor\" returned undefined, and the string");
  lines.push("\"1\" did not satisfy the numeric gate. The benign profile still");
  lines.push("applied its allow-listed fields correctly.");
  report(true, lines);
}

run();
