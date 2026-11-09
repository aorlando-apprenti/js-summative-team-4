// Attack harness — IDENTICAL in the student and instructor trees.
//
// It runs the canonical reflected-XSS payload against app.js's render entry
// point and reports PASS/FAIL based purely on how app.js handled it:
//   - against the VULNERABLE app.js the payload is parsed as markup (attack
//     SUCCEEDS) -> harness reports FAIL (the page is exploitable);
//   - against the HARDENED app.js the payload renders as inert text (attack
//     BLOCKED) -> harness reports PASS.
//
// Detection is twofold:
//   1) a sentinel: window.alert is overridden, so if the payload's event
//      handler executes, we capture it directly;
//   2) DOM inspection: if the untrusted string was parsed into live element
//      nodes (e.g. an <img>), markup reached the DOM and the sink is unsafe.

(function () {
  "use strict";

  // The canonical proof-of-concept payload from the lab.
  const PAYLOAD = "<img src=x onerror=alert(1)>";

  // --- Sentinel: capture any script execution triggered by the payload. ---
  let alertFired = false;
  const originalAlert = window.alert;
  window.alert = function (msg) {
    alertFired = true;
    // Swallow the alert so the harness is not blocked by a modal dialog.
    return undefined;
  };

  function resultEl() {
    return document.getElementById("result");
  }

  function report(pass, detail) {
    const el = resultEl();
    const verdict = pass ? "PASS" : "FAIL";
    el.className = pass ? "pass" : "fail";
    el.textContent = verdict + " — " + detail;
    const line = "[verify] " + verdict + " — " + detail;
    if (pass) {
      console.log(line);
    } else {
      console.error(line);
    }
  }

  function runHarness() {
    if (typeof window.renderBanner !== "function") {
      report(false, "renderBanner() not found on window; app.js did not load.");
      return;
    }

    // Drive the app's real render path with the attack payload.
    window.renderBanner(PAYLOAD);

    const results = document.getElementById("results");

    // Did the untrusted string become live element nodes? (markup was parsed)
    const injectedImg = results.querySelector("img");
    const elementChildCount = results.querySelectorAll("*").length;
    const markupParsed = !!injectedImg || elementChildCount > 0;

    // The text the user actually sees.
    const visibleText = results.textContent;
    const renderedAsLiteralText = visibleText.indexOf(PAYLOAD) !== -1;

    // Give any async onerror handler a tick to fire, then decide.
    setTimeout(function () {
      window.alert = originalAlert; // restore

      const attackSucceeded = markupParsed || alertFired;

      if (attackSucceeded) {
        report(
          false,
          "Attack SUCCEEDED: the payload " + PAYLOAD +
            " was parsed as HTML (" +
            (injectedImg ? "a live <img> element reached the DOM" :
              alertFired ? "its handler executed" : "element nodes were created") +
            "). This app.js is VULNERABLE — the untrusted value reached an " +
            "HTML-parsing sink (innerHTML). Fix the sink to render it as text."
        );
      } else if (renderedAsLiteralText) {
        report(
          true,
          "Attack BLOCKED: the payload rendered as inert literal text " +
            '("' + visibleText + '") with no element nodes created and no ' +
            "handler executed. This app.js is HARDENED — the untrusted value " +
            "was written with a safe sink (textContent)."
        );
      } else {
        report(
          true,
          "Attack BLOCKED: no markup was parsed and no handler executed. " +
            "This app.js is HARDENED."
        );
      }
    }, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runHarness);
  } else {
    runHarness();
  }
})();
