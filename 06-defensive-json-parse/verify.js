// verify.js — attack harness for the defensive-parse lab.
//
// This file is byte-identical in the student and instructor trees. It does not
// change; only the loadProfile() it drives changes. Against the naive starter
// the bad bodies throw or yield a corrupt profile, so the harness reports the
// vulnerability REPRODUCED. Against the hardened reference every bad body is
// rejected cleanly and the good one is accepted, so it reports BLOCKED.

import { makeResponse, loadProfile } from "./app.js";

// One well-formed body plus three realistic bad ones.
const FIXTURES = {
  valid: '{ "user": { "id": 7, "name": "Ada", "roles": ["admin"] } }',
  // Cut off mid-array: not valid JSON. JSON.parse throws.
  truncated: '{ "user": { "id": 7, "name": "Ada", "roles": ["adm',
  // Valid JSON, but an error envelope with no user key.
  wrongShape: '{ "error": "forbidden" }',
  // Valid JSON, but id is a string, name is null, roles is not an array.
  wrongTypes: '{ "user": { "id": "7", "name": null, "roles": "admin" } }',
};

// A returned profile is only "usable" if name is a string and roles is an
// array of strings. Anything else handed back as ok:true is silent corruption.
function isUsableProfile(profile) {
  return (
    profile != null &&
    typeof profile.name === "string" &&
    Array.isArray(profile.roles) &&
    profile.roles.every((r) => typeof r === "string")
  );
}

// Run one fixture through the handler, capturing every possible outcome:
// a thrown error, an accepted-but-corrupt profile, a clean rejection, or a
// clean acceptance.
async function run(label, body) {
  try {
    const result = await loadProfile(makeResponse(body));
    if (result && result.ok) {
      const usable = isUsableProfile(result.profile);
      return { label, outcome: usable ? "accepted" : "accepted-corrupt", result };
    }
    return { label, outcome: "rejected", reason: result && result.reason };
  } catch (e) {
    return { label, outcome: "threw", error: e.message };
  }
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

async function main() {
  const valid = await run("valid", FIXTURES.valid);
  const truncated = await run("truncated", FIXTURES.truncated);
  const wrongShape = await run("wrong-shape", FIXTURES.wrongShape);
  const wrongTypes = await run("wrong-types", FIXTURES.wrongTypes);
  const all = [valid, truncated, wrongShape, wrongTypes];

  // The hostile fixtures must all be cleanly rejected; the valid one accepted.
  const hostile = [truncated, wrongShape, wrongTypes];
  const leaked = hostile.filter(
    (r) => r.outcome === "threw" || r.outcome === "accepted-corrupt"
  );
  const validAccepted = valid.outcome === "accepted";
  const allRejected = hostile.every((r) => r.outcome === "rejected");

  const lines = all.map((r) => {
    const detail =
      r.outcome === "threw"
        ? `threw: ${r.error}`
        : r.outcome === "rejected"
        ? `rejected (${r.reason})`
        : r.outcome === "accepted-corrupt"
        ? "accepted a CORRUPT profile"
        : "accepted a usable profile";
    return `  ${r.label.padEnd(12)} -> ${detail}`;
  });

  if (validAccepted && allRejected) {
    render(
      {
        pass: true,
        headline:
          "BLOCKED — the handler failed closed: every malformed/hostile body " +
          "was rejected with a distinct reason and the valid body was accepted.",
      },
      lines
    );
  } else {
    const why = leaked
      .map((r) => `${r.label} ${r.outcome === "threw" ? "crashed the handler" : "passed corrupt data downstream"}`)
      .join("; ");
    render(
      {
        pass: false,
        headline:
          "VULNERABILITY REPRODUCED — the handler trusts the parsed shape. " +
          (why ? `Hostile bodies got through: ${why}.` : "A bad body was not failed closed.") +
          " Fix loadProfile() so each bad body returns { ok: false, reason } without throwing.",
      },
      lines
    );
  }
}

main();
