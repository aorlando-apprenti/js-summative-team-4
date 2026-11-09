// verify.js — attack harness for the prototype-pollution lab.
//
// This file is byte-identical in the student and instructor trees. It does not
// change; only the merge in app.js changes. Against the naive starter the attack
// payloads flip Object.prototype globally, so the harness reports the attack
// REPRODUCED. Against the hardened reference the prototype stays clean and the
// benign update still applies, so it reports BLOCKED.
//
// IMPORTANT: a pollution test corrupts the shared prototype for the whole page.
// After every merge this harness scrubs the probe keys off Object.prototype so
// the page stays usable no matter which tree it runs in.

import { parseSettings, applySettings } from "./app.js";

// The probe keys an attack would inject onto the prototype.
const PROBES = ["isAdmin", "polluted"];

const PAYLOADS = {
  // A benign nested settings update — the legitimate path that must keep working.
  valid: '{ "theme": "dark", "profile": { "displayName": "Ada" } }',
  // Flat attack: writes onto the prototype directly through the top-level merge.
  protoAttack: '{ "__proto__": { "isAdmin": true, "polluted": "yes" } }',
  // Nested attack: defeats any guard that only inspects top-level keys.
  nestedAttack: '{ "profile": { "__proto__": { "isAdmin": true, "polluted": "yes" } } }',
};

// Read whether the prototype currently carries any probe key. A fresh, unrelated
// {} is used so we only ever see INHERITED (polluted) values, never own keys.
function prototypeIsPolluted() {
  const witness = {}; // never given any probe key
  return PROBES.some(
    (k) => Object.hasOwn(Object.prototype, k) || witness[k] !== undefined
  );
}

// Remove any probe keys from the shared prototype, restoring a clean page.
function scrubPrototype() {
  for (const k of PROBES) {
    if (Object.hasOwn(Object.prototype, k)) {
      delete Object.prototype[k];
    }
  }
}

// Merge one payload and report whether it polluted the prototype. Always scrubs
// afterward, even if applySettings throws.
function runMerge(label, rawText) {
  try {
    const parsed = parseSettings(rawText);
    const merged = applySettings(parsed);
    const polluted = prototypeIsPolluted();
    return { label, polluted, merged, error: null };
  } catch (e) {
    const polluted = prototypeIsPolluted();
    return { label, polluted, merged: null, error: e.message };
  } finally {
    scrubPrototype();
  }
}

// The benign update is "applied" only if its values landed on the result object.
function validUpdateApplied(merged) {
  return (
    merged != null &&
    merged.theme === "dark" &&
    merged.profile != null &&
    merged.profile.displayName === "Ada"
  );
}

function render(verdict, lines) {
  const el = document.getElementById("result");
  if (el) {
    el.className = verdict.pass ? "pass" : "fail";
    el.textContent = `${verdict.headline}\n\n${lines.join("\n")}`;
  }
  const log = verdict.pass ? console.log : console.warn;
  log(`[verify] ${verdict.headline}`);
  for (const line of lines) console.log(`[verify] ${line}`);
}

function main() {
  // Start from a known-clean prototype regardless of any earlier run.
  scrubPrototype();

  const valid = runMerge("valid", PAYLOADS.valid);
  const proto = runMerge("proto-attack", PAYLOADS.protoAttack);
  const nested = runMerge("nested-attack", PAYLOADS.nestedAttack);
  const all = [valid, proto, nested];

  const anyPollution = proto.polluted || nested.polluted;
  const legitWorks = validUpdateApplied(valid.merged) && !valid.polluted;

  // Final safety: prove the page is clean now that the harness has finished.
  const cleanAfter = !prototypeIsPolluted();

  const lines = all.map((r) => {
    const status = r.error
      ? `threw (${r.error})`
      : r.polluted
      ? "POLLUTED Object.prototype"
      : "no pollution";
    return `  ${r.label.padEnd(14)} -> ${status}`;
  });
  lines.push(`  prototype clean after run -> ${cleanAfter ? "yes" : "NO"}`);

  if (!anyPollution && legitWorks) {
    render(
      {
        pass: true,
        headline:
          "BLOCKED — the merge held: neither attack payload reached " +
          "Object.prototype (flat or nested), and the benign settings update " +
          "still applied. A key is data, not an instruction.",
      },
      lines
    );
  } else {
    const which = [proto, nested].filter((r) => r.polluted).map((r) => r.label);
    render(
      {
        pass: false,
        headline:
          "ATTACK REPRODUCED — a crafted payload wrote onto Object.prototype " +
          `(${which.join(", ") || "see log"}), so an unrelated {} now inherits ` +
          "isAdmin/polluted. Fix applySettings(): null-prototype base, a key " +
          "guard at EVERY level, own-key reads, and an optional parse reviver.",
      },
      lines
    );
  }
}

main();
