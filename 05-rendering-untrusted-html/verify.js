// verify.js — payload battery for the "render untrusted HTML safely" lab.
//
// This file is IDENTICAL in the student and instructor trees. It contains no
// sanitizer of its own. It renders a battery of XSS payloads through whatever
// renderComment(comment, host) app.js provides, then inspects the resulting DOM
// for surviving executable vectors and for the firing sentinel.
//
// Against the vulnerable starter (innerHTML = comment.html) the payloads survive
// and execute  -> overall FAIL (attack wins).
// Against the hardened solution (sanitized before assignment) nothing survives,
// and benign formatting is preserved -> overall PASS (attack blocked).

(function () {
  "use strict";

  // Sentinel: any payload that manages to execute flips this.
  window.__xssFired = false;
  const fire = () => { window.__xssFired = true; };
  // Expose under the names the payloads call so an executing handler trips it.
  window.__xss = fire;

  // The XSS battery — one payload per dangerous vector. Each calls window.__xss()
  // so that if it executes during render, the sentinel flips.
  const BATTERY = [
    "<script>window.__xss()</script>",                       // script tag
    "<img src=x onerror=window.__xss()>",                    // event-handler attr
    "<svg onload=window.__xss()></svg>",                     // SVG handler
    '<a href="javascript:window.__xss()">click</a>',         // dangerous URL scheme
    "<div><style>@keyframes x{}</style></div>",              // mutation-style
  ];

  // A benign comment that MUST survive sanitization (over-stripping is a failure).
  const BENIGN = '<b>Great</b> <i>post</i> — see <a href="https://example.com/x">here</a><ul><li>one</li></ul>';

  const host = document.getElementById("comments");
  const result = document.getElementById("result");

  function finish(lines, passed) {
    const verdict = passed
      ? "PASS — every payload was neutralized and benign formatting survived."
      : "FAIL — a payload survived (or benign formatting was destroyed).";
    result.className = passed ? "pass" : "fail";
    result.textContent = verdict + "\n\n" + lines.join("\n");
    (passed ? console.log : console.error)("[verify] " + verdict);
    lines.forEach((l) => console.log("[verify] " + l));
  }

  if (typeof renderComment !== "function") {
    finish(["renderComment() is not defined in app.js — cannot run the battery."], false);
    return;
  }

  // Render every payload, then the benign comment.
  try {
    for (const html of BATTERY) {
      renderComment({ html }, host);
    }
    renderComment({ html: BENIGN }, host);
  } catch (e) {
    finish(["renderComment() threw: " + e.message], false);
    return;
  }

  // Nudge any surviving error/load handlers so they fire deterministically.
  host.querySelectorAll("img").forEach((img) => img.dispatchEvent(new Event("error")));
  host.querySelectorAll("svg").forEach((svg) => svg.dispatchEvent(new Event("load")));
  // If a javascript: link survived, simulate the click-time execution.
  host.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (/^\s*javascript:/i.test(href)) {
      try { (0, eval)(href.replace(/^\s*javascript:/i, "")); } catch (e) {}
    }
  });

  setTimeout(() => {
    const lines = [];
    let passed = true;

    // Half 1: nothing executed and no executable vector survives in the DOM.
    const survivors = host.querySelectorAll("script, [onerror], [onload], svg");
    const jsLinks = [...host.querySelectorAll("a[href]")].filter(
      (a) => /^\s*javascript:/i.test(a.getAttribute("href") || "")
    );

    if (window.__xssFired) { passed = false; lines.push("Execution:       VULNERABLE — a payload ran (sentinel fired)."); }
    else { lines.push("Execution:       safe — no payload executed."); }

    if (survivors.length > 0) { passed = false; lines.push("Surviving nodes: VULNERABLE — " + survivors.length + " script/handler/svg node(s) survived."); }
    else { lines.push("Surviving nodes: safe — no script, on* handler, or <svg> node survived."); }

    if (jsLinks.length > 0) { passed = false; lines.push("URL schemes:     VULNERABLE — a javascript: link survived."); }
    else { lines.push("URL schemes:     safe — no javascript: link survived."); }

    // Half 2: benign formatting was preserved (over-stripping is a real failure).
    const last = host.lastElementChild; // the benign comment's container
    const keptBold = !!(last && last.querySelector("b"));
    const keptLink = !!(last && last.querySelector('a[href^="https:"]'));
    const keptList = !!(last && last.querySelector("ul li"));
    const benignOk = keptBold && keptLink && keptList;
    if (!benignOk) { passed = false; lines.push("Benign output:   FAIL — formatting was over-stripped (bold/link/list missing)."); }
    else { lines.push("Benign output:   safe — bold, safe link, and list all preserved."); }

    finish(lines, passed);
  }, 50);
})();
