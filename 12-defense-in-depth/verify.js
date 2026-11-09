// Attack harness — IDENTICAL in the student and instructor trees.
//
// Two parts, exactly as the lab describes:
//
//  A) A SCRIPTED ATTACK SET — a fixed list of payloads run against the widget,
//     each with an asserted outcome. Every payload must render inert or be
//     rejected, no script may execute, ({}).isAdmin must be undefined, and
//     malformed bodies must fail closed with no uncaught exception.
//
//  B) An INDEPENDENCE TEST — disable one control (bypass DOMPurify), replay a
//     script-in-text payload, and confirm a DIFFERENT layer (the safe sink for
//     the plain text field) still neutralizes it. The control is restored
//     immediately afterward.
//
// Verdict is driven purely by the widget's behavior:
//   - VULNERABLE starter: payloads land and/or the safe sink is absent -> FAIL;
//   - HARDENED reference: every payload neutralized and the safe sink holds with
//     the sanitizer disabled -> PASS.

(function () {
  "use strict";

  function base(extra) {
    const c = {
      author: "Real Person",
      timestamp: "2026-06-20",
      text: "nice post",
      website: "https://example.com/me",
      richText: "<p>hello</p>",
    };
    return Object.assign(c, extra);
  }

  // A) The scripted attack set. Each `body` is a raw response body (text).
  const ATTACK_SET = [
    { name: "script in text",   body: JSON.stringify(base({ text: "<img src=x onerror=alert(1)>" })) },
    { name: "script in author", body: JSON.stringify(base({ author: "<img src=x onerror=alert(2)>" })) },
    { name: "javascript: url",  body: JSON.stringify(base({ website: "javascript:alert(3)" })) },
    { name: "script in rich",   body: JSON.stringify(base({ richText: "<img src=x onerror=alert(4)><p>hi</p>" })) },
    { name: "proto pollution",  body: '{"author":"a","timestamp":"t","text":"x","website":"https://e.com","richText":"<p>x</p>","__proto__":{"isAdmin":true}}' },
    { name: "over-long field",  body: JSON.stringify(base({ text: "A".repeat(10000) })) },
    { name: "truncated body",   body: '{"author":"a","text":"oops' },
  ];

  // ---- Sentinel: capture any script execution. ----
  let alertFired = false;
  const originalAlert = window.alert;
  window.alert = function () { alertFired = true; return undefined; };

  const lines = [];
  function check(ok, msg) {
    const tag = ok ? "PASS" : "FAIL";
    const line = "[" + tag + "] " + msg;
    lines.push(line);
    if (ok) { console.log(line); } else { console.error(line); }
    return ok;
  }

  function root() { return document.getElementById("comments"); }

  function driveOne(body) {
    const r = root();
    r.replaceChildren();
    alertFired = false;
    let threw = false;
    let comment = null;
    try {
      comment = window.validateComment(body);
      if (comment) window.renderComment(comment, r);
    } catch (e) {
      threw = true;
    }
    return { threw: threw, rejected: comment === null || comment === undefined };
  }

  function runHarness() {
    if (typeof window.validateComment !== "function" ||
        typeof window.renderComment !== "function") {
      const el = document.getElementById("result");
      el.className = "fail";
      el.textContent = "FAIL — validateComment/renderComment not found; app.js did not load.";
      return;
    }

    let allPass = true;
    try { delete Object.prototype.isAdmin; } catch (e) {}

    // ---- A) Run the scripted attack set. ----
    for (const atk of ATTACK_SET) {
      const out = driveOne(atk.body);
      const r = root();
      const liveImg = !!r.querySelector("img");
      const jsHref = Array.prototype.some.call(
        r.querySelectorAll("a[href]"),
        function (a) { return /^javascript:/i.test(a.getAttribute("href") || ""); }
      );
      const inlineHandler = !!r.querySelector("[onclick]");
      const polluted = ({}).isAdmin;

      const neutralized =
        !out.threw && !alertFired && !liveImg && !jsHref &&
        !inlineHandler && polluted === undefined;

      allPass = check(neutralized,
        "attack '" + atk.name + "': " +
        (neutralized ? "neutralized" : "LANDED") +
        " — threw:" + out.threw + " alert:" + alertFired +
        " img:" + liveImg + " jsHref:" + jsHref +
        " onclick:" + inlineHandler + " isAdmin:" + String(polluted)) && allPass;

      try { delete Object.prototype.isAdmin; } catch (e) {}
    }

    // ---- B) Independence test: disable the sanitizer, prove the safe sink holds. ----
    // Put a script string in the plain TEXT field (not the rich field). If the
    // text field is rendered through a safe sink, it stays inert even with the
    // sanitizer bypassed — that is an independent downstream layer holding.
    const hasDOMPurify = typeof window.DOMPurify === "object" && window.DOMPurify;
    const ORIGINAL_SANITIZE = hasDOMPurify ? window.DOMPurify.sanitize : null;
    if (hasDOMPurify) window.DOMPurify.sanitize = function (s) { return s; }; // BYPASS (diagnostic only)

    const r = root();
    r.replaceChildren();
    alertFired = false;
    let indepThrew = false;
    try {
      const c = window.validateComment(JSON.stringify(base({ text: "<img src=x onerror=alert(5)>" })));
      if (c) window.renderComment(c, r);
    } catch (e) { indepThrew = true; }

    const textPara = r.querySelector("p");
    const textImg = textPara ? textPara.querySelector("img") : r.querySelector("img");
    const safeSinkHeld = !indepThrew && !alertFired && !textImg;

    if (hasDOMPurify) window.DOMPurify.sanitize = ORIGINAL_SANITIZE; // RESTORE immediately

    allPass = check(safeSinkHeld,
      "independence test (sanitizer disabled): the safe sink for the text field " +
      "still neutralized the payload — alert:" + alertFired +
      " img-in-text:" + !!textImg + " (the sanitizer is now restored)") && allPass;

    // Final verdict.
    window.alert = originalAlert;
    try { delete Object.prototype.isAdmin; } catch (e) {}

    const summary =
      (allPass ? "PASS" : "FAIL") + " — " +
      (allPass
        ? "The widget resists the full scripted attack set with Object.prototype " +
          "intact, and the independence test shows the safe sink holding while " +
          "the sanitizer is disabled. The feature is HARDENED with independent " +
          "layers."
        : "At least one payload landed, or the safe sink did not hold once the " +
          "sanitizer was bypassed (a single point of failure). See the FAIL " +
          "lines above. The feature is VULNERABLE — layer the five controls.") +
      "\n\n" + lines.join("\n");

    const el = document.getElementById("result");
    el.className = allPass ? "pass" : "fail";
    el.textContent = summary;
    console.log("[verify] summary: " + (allPass ? "PASS" : "FAIL"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runHarness);
  } else {
    runHarness();
  }
})();
