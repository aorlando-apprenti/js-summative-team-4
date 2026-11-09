// Attack harness — IDENTICAL in the student and instructor trees.
//
// It drives app.js's pipeline entry point, window.runPipeline(body, root), with
// one well-formed body and a small attack set. Each fixture targets exactly one
// control point on the fetch -> parse -> render pipeline:
//
//   good          -> the happy path renders the expected content
//   truncated     -> JSON.parse throws; the parse try/catch must fail it closed
//   wrong-type    -> a mistyped field; the shape check must reject it
//   proto         -> a __proto__ payload; the pollution guard must reject it
//   script        -> a script-bearing field reaches render; the safe sink must
//                    keep it inert (and DOMPurify must strip it from richText)
//
// The harness reports PASS/FAIL purely from how app.js behaved:
//   - against the VULNERABLE app.js the attacks SUCCEED (script executes, the
//     prototype is polluted, a bad body throws an uncaught error) -> FAIL;
//   - against the HARDENED app.js every bad body fails closed and every script
//     string renders as inert text -> PASS.
//
// Detection is concrete, not cosmetic: a window.alert sentinel, DOM inspection
// for live <img> nodes, an Object.prototype read-back, and a thrown-error trap.

(function () {
  "use strict";

  // ---- Fixtures. Each is a raw response BODY (text), as a server would send. ----
  const FIXTURES = {
    good: JSON.stringify({
      title: "Quarterly Update",
      body: "All systems nominal.",
      link: "https://example.com/report",
      richText: "<p>Read the <strong>full report</strong>.</p>",
    }),
    // Truncated mid-object: JSON.parse will throw a SyntaxError.
    truncated: '{"title":"Oops","body":"cut off here',
    // title is a number, not a string: the shape check must reject it.
    wrongType: JSON.stringify({
      title: 42,
      body: "fine",
      link: "https://example.com",
      richText: "<p>ok</p>",
    }),
    // __proto__ payload: the pollution guard must reject it before any copy.
    proto: '{"title":"Hi","body":"b","link":"https://example.com","richText":"<p>x</p>","__proto__":{"isAdmin":true}}',
    // A script-bearing string in EVERY rendered field. A safe sink renders the
    // plain fields inert; DOMPurify strips the handler from the rich-text field.
    script: JSON.stringify({
      title: "<img src=x onerror=alert(1)>",
      body: "<img src=x onerror=alert(2)>",
      link: "javascript:alert(3)",
      richText: '<img src=x onerror=alert(4)><p>hello</p>',
    }),
  };

  // ---- Sentinel: capture any script execution triggered by a payload. ----
  let alertFired = false;
  const originalAlert = window.alert;
  window.alert = function () { alertFired = true; return undefined; };

  function resultEl() { return document.getElementById("result"); }

  const lines = [];
  function log(ok, msg) {
    const tag = ok ? "PASS" : "FAIL";
    const line = "[" + tag + "] " + msg;
    lines.push(line);
    if (ok) { console.log(line); } else { console.error(line); }
    return ok;
  }

  // Run the pipeline against one body and report whether it threw.
  function drive(body, root) {
    try {
      window.runPipeline(body, root);
      return { threw: false };
    } catch (err) {
      return { threw: true, err: err };
    }
  }

  function runHarness() {
    if (typeof window.runPipeline !== "function") {
      resultEl().className = "fail";
      resultEl().textContent =
        "FAIL — window.runPipeline(body, root) not found; app.js did not load.";
      return;
    }

    const root = document.getElementById("article");
    let allPass = true;

    // Clean the prototype before we start, so the read-back is meaningful.
    try { delete Object.prototype.isAdmin; } catch (e) {}

    // 1) Happy path: good body renders the expected title.
    root.replaceChildren();
    const good = drive(FIXTURES.good, root);
    const renderedGood = root.textContent.indexOf("Quarterly Update") !== -1;
    allPass = log(!good.threw && renderedGood,
      "good body: renders expected content (no throw, title present) — got " +
      (good.threw ? "THREW" : renderedGood ? "rendered" : "did not render")) && allPass;

    // 2) Truncated body: must fail closed (no throw), render nothing unsafe.
    root.replaceChildren();
    const trunc = drive(FIXTURES.truncated, root);
    allPass = log(!trunc.threw,
      "truncated body: fails closed with no uncaught exception — got " +
      (trunc.threw ? ("THREW " + trunc.err) : "no throw")) && allPass;

    // 3) Wrong-type field: must be rejected (safe empty state), no throw.
    root.replaceChildren();
    const wrong = drive(FIXTURES.wrongType, root);
    const renderedNumber = root.textContent.indexOf("42") !== -1;
    allPass = log(!wrong.threw && !renderedNumber,
      "wrong-type field: rejected at the shape check, not rendered — got " +
      (wrong.threw ? ("THREW " + wrong.err) : renderedNumber ? "rendered the bad value" : "rejected")) && allPass;

    // 4) Prototype pollution: ({}).isAdmin must read back undefined afterward.
    root.replaceChildren();
    drive(FIXTURES.proto, root);
    const polluted = ({}).isAdmin;
    allPass = log(polluted === undefined,
      "__proto__ payload: pollution guard held, ({}).isAdmin === " +
      String(polluted) + " (expected undefined)") && allPass;
    try { delete Object.prototype.isAdmin; } catch (e) {}

    // 5) Script-bearing fields: nothing executes; no live <img> in plain fields.
    root.replaceChildren();
    alertFired = false;
    drive(FIXTURES.script, root);

    // Give any async onerror a tick before judging, then finalize.
    setTimeout(function () {
      window.alert = originalAlert; // restore the sentinel

      const liveImg = root.querySelector("img");
      const jsLink = Array.prototype.some.call(
        root.querySelectorAll("a[href]"),
        function (a) { return /^javascript:/i.test(a.getAttribute("href") || ""); }
      );
      const scriptInert = !alertFired && !liveImg && !jsLink;
      allPass = log(scriptInert,
        "script-bearing fields: rendered inert — " +
        "alert fired: " + alertFired + ", live <img>: " + !!liveImg +
        ", javascript: href: " + jsLink) && allPass;

      const summary =
        (allPass ? "PASS" : "FAIL") + " — " +
        (allPass
          ? "The pipeline holds: the good body renders, every malformed or " +
            "hostile body fails closed, the prototype is intact, and every " +
            "script string is inert. This app.js is HARDENED."
          : "The pipeline is open: at least one bad body crashed or rendered, " +
            "the prototype was polluted, or a script string executed. This " +
            "app.js is VULNERABLE — add a control at each boundary.") +
        "\n\n" + lines.join("\n");

      const el = resultEl();
      el.className = allPass ? "pass" : "fail";
      el.textContent = summary;
      console.log("[verify] summary: " + (allPass ? "PASS" : "FAIL"));
    }, 60);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runHarness);
  } else {
    runHarness();
  }
})();
