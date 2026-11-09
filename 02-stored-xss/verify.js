// Attack harness — IDENTICAL in the student and instructor trees.
//
// Stored XSS proof. The harness persists a payload comment, then exercises BOTH
// render paths the lab cares about (renderAll on load, and addComment after
// submit). It reports PASS only if NEITHER path parses the payload as markup:
//   - against the VULNERABLE app.js at least one path parses the payload as
//     live markup (attack SUCCEEDS) -> harness reports FAIL;
//   - against the HARDENED app.js both paths render the payload as inert text
//     (attack BLOCKED) -> harness reports PASS.
//
// Detection is twofold: a sentinel (window.alert is overridden to capture any
// handler execution) and DOM inspection (whether the untrusted string became
// live element nodes such as an <img> inside the feed).

(function () {
  "use strict";

  // The canonical stored-XSS payload from the lab (cookie-theft style).
  const PAYLOAD = "<img src=x onerror=alert(document.cookie)>";
  const STORAGE_KEY = "comments";

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

  // True if the feed currently contains an injected element node from a payload.
  function feedHasInjectedElement() {
    const feed = document.getElementById("feed");
    // A safely-rendered feed contains only <li>/<span> built by app code, never
    // an <img>. An <img> (or other payload tag) inside the feed proves markup
    // from the comment body was parsed.
    return !!feed.querySelector("img");
  }

  function runHarness() {
    if (typeof window.renderAll !== "function" ||
        typeof window.addComment !== "function") {
      report(false, "renderAll()/addComment() not found; app.js did not load.");
      return;
    }

    // --- Path 1: renderAll() over a persisted payload (the "reload" case). ---
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ author: "attacker", body: PAYLOAD }])
    );
    window.renderAll();
    const loadPathExploited = feedHasInjectedElement();

    // --- Path 2: addComment() with a payload (the "add a comment" case). ---
    window.addComment("attacker2", PAYLOAD);
    const addPathExploited = feedHasInjectedElement();

    setTimeout(function () {
      window.alert = originalAlert; // restore
      // Clean up the seeded data so reopening the page starts clean.
      localStorage.removeItem(STORAGE_KEY);

      const attackSucceeded =
        loadPathExploited || addPathExploited || alertFired;

      if (attackSucceeded) {
        const where = loadPathExploited && addPathExploited
          ? "both render paths (renderAll and addComment)"
          : loadPathExploited ? "the renderAll (load) path"
          : addPathExploited ? "the addComment (add) path"
          : "an executed handler";
        report(
          false,
          "Attack SUCCEEDED on " + where + ": the persisted payload " +
            PAYLOAD + " was parsed as HTML and a live <img> reached the feed. " +
            "This app.js is VULNERABLE — comment data reaches an HTML-parsing " +
            "sink (innerHTML). Build feed nodes with createElement + " +
            "textContent and route BOTH paths through one safe helper."
        );
      } else {
        report(
          true,
          "Attack BLOCKED on both render paths: the persisted payload rendered " +
            "as inert literal text, no <img> element was created, and no " +
            "handler executed. This app.js is HARDENED — author and body are " +
            "written with safe DOM APIs (createElement + textContent) on every " +
            "render path (encode-on-output)."
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
