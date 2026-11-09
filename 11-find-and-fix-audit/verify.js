// Attack harness — IDENTICAL in the student and instructor trees.
//
// It replays the proof-of-concept payloads from attacks.md against the app's
// real entry points and reports PASS/FAIL purely from how the app behaved:
//   - against the VULNERABLE starter the payloads SUCCEED (script nodes reach
//     the DOM, a javascript: href is written, an inline onclick is injected,
//     a malformed body throws, and Object.prototype is polluted) -> FAIL;
//   - against the FIXED app every payload is neutralized -> PASS.
//
// Each check maps to one finding, so the report tells you which path is still
// open. Detection is concrete: DOM inspection for live nodes, attribute reads,
// a thrown-error trap, and an Object.prototype read-back.

(function () {
  "use strict";

  // ---- Proof-of-concept payloads (mirror of attacks.md). ----
  const P = {
    search: "<img src=x onerror=alert(1)>",
    bio: "<img src=x onerror=alert(2)>",
    website: "javascript:alert(3)",
    name: "x') ; alert(4) ; ('",
    badConfig: '{"title":"oops', // truncated -> JSON.parse throws
    proto: '{"theme":"dark","__proto__":{"isAdmin":true}}',
  };

  const lines = [];
  function check(ok, msg) {
    const tag = ok ? "PASS" : "FAIL";
    const line = "[" + tag + "] " + msg;
    lines.push(line);
    if (ok) { console.log(line); } else { console.error(line); }
    return ok;
  }

  function el(id) { return document.getElementById(id); }

  function runHarness() {
    const needed = ["renderSearch", "renderMembers", "parseConfig", "applySettings"];
    for (const fn of needed) {
      if (typeof window[fn] !== "function") {
        const r = el("result");
        r.className = "fail";
        r.textContent = "FAIL — window." + fn + "() not found; a script did not load.";
        return;
      }
    }

    let allPass = true;
    try { delete Object.prototype.isAdmin; } catch (e) {}

    // Finding 1 — DOM-based XSS: ?q= search term -> search sink.
    const searchEl = el("search-results");
    searchEl.replaceChildren();
    window.renderSearch(P.search, searchEl);
    const searchImg = searchEl.querySelector("img");
    allPass = check(!searchImg,
      "Finding 1 (search term): payload rendered inert — live <img> in search: " +
      !!searchImg) && allPass;

    // Findings 2, 3, 4 — stored bio / profile href / inline onclick.
    const membersEl = el("members");
    window.renderMembers([{ name: P.name, bio: P.bio, website: P.website }], membersEl);

    const bioImg = membersEl.querySelector("img");
    allPass = check(!bioImg,
      "Finding 2 (stored bio): payload rendered inert — live <img> in bio: " +
      !!bioImg) && allPass;

    const link = membersEl.querySelector("a");
    const href = link ? (link.getAttribute("href") || "") : "";
    const jsHref = /^javascript:/i.test(href);
    allPass = check(!jsHref,
      "Finding 3 (profile href): javascript: scheme rejected — href written: " +
      JSON.stringify(href)) && allPass;

    const btn = membersEl.querySelector("button");
    const inlineOnclick = btn ? btn.getAttribute("onclick") : null;
    allPass = check(!inlineOnclick,
      "Finding 4 (say-hi button): no inline onclick built from the name — " +
      "onclick attribute: " + JSON.stringify(inlineOnclick)) && allPass;

    // Finding 5 — defensive parse: a malformed config must fail closed.
    let configThrew = false;
    try { window.parseConfig(P.badConfig); } catch (e) { configThrew = true; }
    allPass = check(!configThrew,
      "Finding 5 (config parse): malformed body fails closed with no thrown " +
      "exception — threw: " + configThrew) && allPass;

    // Finding 6 — prototype pollution: __proto__ in settings must be guarded.
    try { delete Object.prototype.isAdmin; } catch (e) {}
    try { window.applySettings(P.proto); } catch (e) {}
    const polluted = ({}).isAdmin;
    allPass = check(polluted === undefined,
      "Finding 6 (settings merge): pollution guard held — ({}).isAdmin === " +
      String(polluted) + " (expected undefined)") && allPass;
    try { delete Object.prototype.isAdmin; } catch (e) {}

    const summary =
      (allPass ? "PASS" : "FAIL") + " — " +
      (allPass
        ? "Every payload in attacks.md is neutralized: no script node reaches " +
          "the DOM, no javascript: href or inline onclick is written, the " +
          "config parse fails closed, and Object.prototype is intact. All " +
          "findings are FIXED."
        : "At least one path is still open (see the FAIL lines above). Each " +
          "FAIL names the finding whose source still reaches its sink. The app " +
          "is VULNERABLE.") +
      "\n\n" + lines.join("\n");

    const r = el("result");
    r.className = allPass ? "pass" : "fail";
    r.textContent = summary;
    console.log("[verify] summary: " + (allPass ? "PASS" : "FAIL"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runHarness);
  } else {
    runHarness();
  }
})();
