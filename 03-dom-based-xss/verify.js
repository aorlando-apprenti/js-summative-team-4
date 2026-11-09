// Attack harness — IDENTICAL in the student and instructor trees.
//
// DOM-based XSS proof. The harness puts the canonical payload into
// location.hash (the client-side source the app reads) and drives the app's
// render() entry point, then inspects the panel for BOTH sinks the lab exposes.
// It reports PASS only if the payload is NOT parsed as markup at either sink:
//   - against the VULNERABLE app.js the hash value is parsed as live markup at
//     innerHTML and/or insertAdjacentHTML (attack SUCCEEDS) -> reports FAIL;
//   - against the HARDENED app.js the value renders as inert text at both sinks
//     (attack BLOCKED) -> reports PASS.
//
// Detection is twofold: a sentinel (window.alert is overridden to capture any
// handler execution) and DOM inspection (whether the untrusted fragment became
// a live element node such as an <img> inside the panel). Note that the safe
// solution legitimately builds a <small> element, so detection keys on the
// payload's own tag (<img>), not on element count.

(function () {
  "use strict";

  // The canonical DOM-XSS fragment payload from the lab.
  const PAYLOAD = "<img src=x onerror=alert(1)>";

  let alertFired = false;
  const originalAlert = window.alert;
  window.alert = function () {
    alertFired = true;
    return undefined;
  };

  function report(pass, detail) {
    const el = document.getElementById("result");
    const verdict = pass ? "PASS" : "FAIL";
    el.className = pass ? "pass" : "fail";
    el.textContent = verdict + " — " + detail;
    const line = "[verify] " + verdict + " — " + detail;
    if (pass) { console.log(line); } else { console.error(line); }
  }

  function runHarness() {
    if (typeof window.render !== "function") {
      report(false, "render() not found on window; app.js did not load.");
      return;
    }

    const previousHash = location.hash;

    // Put the payload into the client-side source and drive the real render.
    location.hash = "#" + encodeURIComponent(PAYLOAD);
    window.render();

    const panel = document.getElementById("panel");

    // Did the untrusted fragment become a live <img> element? (markup parsed)
    // The safe solution builds only text and a <small> detail node, never an
    // <img>, so an <img> here proves a payload tag was parsed at a sink.
    const injectedImg = panel.querySelector("img");
    const markupParsed = !!injectedImg;

    const visibleText = panel.textContent;
    const renderedAsLiteralText = visibleText.indexOf(PAYLOAD) !== -1;

    setTimeout(function () {
      window.alert = originalAlert;          // restore
      // Restore the original hash so the page is left as found.
      location.hash = previousHash;

      const attackSucceeded = markupParsed || alertFired;

      if (attackSucceeded) {
        report(
          false,
          "Attack SUCCEEDED: the hash payload " + PAYLOAD + " was parsed as " +
            "HTML (" + (injectedImg ? "a live <img> reached the panel" :
              "its handler executed") + "). This app.js is VULNERABLE — the " +
            "location.hash value reaches an HTML-parsing sink (innerHTML / " +
            "insertAdjacentHTML). Fix BOTH sinks: use textContent and build " +
            "the detail node with createElement + textContent + append."
        );
      } else if (renderedAsLiteralText) {
        report(
          true,
          "Attack BLOCKED: the hash payload rendered as inert literal text " +
            '("' + visibleText + '") at both sinks — no <img> element was ' +
            "created and no handler executed. This app.js is HARDENED — the " +
            "client-side value is written with safe sinks (textContent / " +
            "createElement + append)."
        );
      } else {
        report(
          true,
          "Attack BLOCKED: no payload markup was parsed and no handler " +
            "executed at either sink. This app.js is HARDENED."
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
