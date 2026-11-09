// verify.js — attack harness for the "dangerous contexts" lab.
//
// This file is IDENTICAL in the student and instructor trees. It does not
// contain the fix. It runs three context-specific payloads against whatever
// renderCard() app.js provides and reports whether each one fired.
//
//   - URL context:           a javascript: href that would execute on click
//   - Attribute context:     a "><img ...> value that would break out of markup
//   - Event-handler context: an onclick value that would execute on click
//
// Against the vulnerable starter all three fire  -> overall FAIL (attack wins).
// Against the hardened solution none fire         -> overall PASS (attack blocked).

(function () {
  "use strict";

  // Sentinel each payload tries to flip. If a payload executes, it sets its flag.
  const fired = { url: false, attr: false, handler: false };
  window.__xssFired = fired;

  // The malicious profile. Each field targets a different rendering context.
  const maliciousProfile = {
    displayName: "Mallory",
    website: "javascript:window.__xssFired.url = true",
    avatar: '"><img src=x onerror="window.__xssFired.attr = true">',
    contactAction: "window.__xssFired.handler = true",
  };

  const result = document.getElementById("result");
  const card = document.getElementById("card");

  function finish(lines, passed) {
    const verdict = passed ? "PASS — all three payloads were blocked." : "FAIL — at least one payload fired.";
    result.className = passed ? "pass" : "fail";
    result.textContent = verdict + "\n\n" + lines.join("\n");
    (passed ? console.log : console.error)("[verify] " + verdict);
    lines.forEach((l) => console.log("[verify] " + l));
  }

  if (typeof renderCard !== "function") {
    finish(["renderCard() is not defined in app.js — cannot run the harness."], false);
    return;
  }

  // Render the malicious card.
  try {
    renderCard(maliciousProfile);
  } catch (e) {
    finish(["renderCard() threw: " + e.message], false);
    return;
  }

  // --- URL context: simulate a click on the website link. ---------------------
  // A javascript: href executes when the link is activated. We dispatch a real
  // click; if the href scheme was validated away, nothing runs.
  const link = card.querySelector("a");
  if (link) {
    // Suppress actual navigation so the harness page stays put.
    link.addEventListener("click", (e) => e.preventDefault(), { once: false });
    // Manually evaluate a javascript: href the way a navigation would, but only
    // if the element still carries one (the fix removes/replaces it).
    const href = link.getAttribute("href") || "";
    if (/^\s*javascript:/i.test(href)) {
      try { (0, eval)(href.replace(/^\s*javascript:/i, "")); } catch (e) {}
    }
  }

  // --- Attribute context: did the avatar value break out into a 2nd element? ---
  // The breakout payload would inject a second <img> whose onerror fires.
  // We force any error handlers by checking image count and triggering onerror.
  const imgs = card.querySelectorAll("img");
  imgs.forEach((img) => {
    // If a broken-out <img onerror=...> exists, its error has likely already
    // fired (src=x fails to load). Nudge it to be deterministic across browsers.
    if (img.hasAttribute("onerror") || img.getAttribute("src") === "x") {
      img.dispatchEvent(new Event("error"));
    }
  });

  // --- Event-handler context: click the contact button. -----------------------
  const btn = card.querySelector("button");
  if (btn) {
    btn.click();
  }

  // Collect findings after a tick so async error events settle.
  setTimeout(() => {
    const lines = [];
    let passed = true;

    // Attribute breakout is detected two ways: the onerror sentinel firing
    // (real browsers) AND the structural signal of an extra <img> appearing
    // (the breakout injects a second element). Either one means the payload won.
    const imgCount = card.querySelectorAll("img").length;
    const brokeOut = fired.attr || imgCount > 1;

    if (fired.url) { passed = false; lines.push("URL context:           VULNERABLE — javascript: href executed."); }
    else { lines.push("URL context:           safe — javascript: scheme was rejected."); }

    if (brokeOut) { passed = false; lines.push("Attribute context:     VULNERABLE — payload broke out into a new element."); }
    else { lines.push("Attribute context:     safe — value stayed trapped, no extra <img> created."); }

    if (fired.handler) { passed = false; lines.push("Event-handler context: VULNERABLE — onclick value executed as code."); }
    else { lines.push("Event-handler context: safe — handler value was not compiled."); }

    lines.push("");
    lines.push("img count in card: " + imgCount + " (1 expected; a breakout creates a 2nd).");

    finish(lines, passed);
  }, 50);
})();
