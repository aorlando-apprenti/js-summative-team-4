// app.js — Secure Render Pipeline (VULNERABLE STARTER)
//
// A feature does the same three things almost every page does: it fetches some
// data, parses the bytes into a value, and renders that value to the screen.
// fetch -> parse -> render. This starter collapses all three into one careless
// chain with no control at any boundary, so it is open to BOTH problems at once:
//
//   * insecure object handling (no try/catch, no shape check, no __proto__ guard)
//   * XSS (every field reaches the DOM through innerHTML, a markup sink)
//
// verify.js drives runPipeline(body, root) with a good body plus a set of
// malformed and hostile ones. Against this starter the attacks SUCCEED:
// a truncated body throws, a wrong-type field renders, a __proto__ payload
// pollutes Object.prototype, and a script string executes.

// The pipeline has three stages. Right now parse and render are jammed together
// with no checkpoint between them. Your job is to give each stage its own
// control: a defensive parse, then a render that uses safe sinks.

function parseStage(text) {
  // TODO (parse boundary): this is the first defense point. Right now this does
  // a bare JSON.parse and trusts whatever comes back. Make it a DEFENSIVE PARSE:
  //   1. wrap JSON.parse in try/catch and return null on a SyntaxError
  //      (a malformed body is a rejection condition, not a crash);
  //   2. validate the shape and types — confirm `title`, `body`, `link`, and
  //      `richText` all exist and are strings; return null if any is wrong;
  //   3. LAST, reject the prototype-pollution keys __proto__ / constructor /
  //      prototype (use Object.hasOwn) BEFORE the object is copied or trusted;
  //   4. build the result with Object.create(null) and copy only the keys you
  //      validated, so a poisoned inherited property has nowhere to land.
  // Return the validated object, or null to fail closed.
  return JSON.parse(text); // <-- throws on a bad body; trusts every shape/key
}

function renderStage(data, root) {
  // TODO (render boundary): this is the second defense point. A value that
  // passed parse is NOT automatically safe to render — a well-typed string is
  // still a working script if it lands in a markup sink. Rebuild this so every
  // untrusted value reaches the DOM through a SAFE sink:
  //   * title and body -> textContent (built with createElement, never innerHTML)
  //   * link -> setAttribute("href", ...) only after a scheme allow-list check
  //     (http:/https:/mailto:); reject javascript: and data: URLs;
  //   * richText is the ONE field that genuinely carries HTML -> run it through
  //     DOMPurify.sanitize(...) and assign only the sanitized result.
  // The single line below is the canonical pipeline bug: it concatenates every
  // untrusted field into one HTML string and assigns it to innerHTML.
  root.innerHTML =
    "<h2>" + data.title + "</h2>" +
    "<p>" + data.body + "</p>" +
    '<a href="' + data.link + '">Read more</a>' +
    "<div>" + data.richText + "</div>";
}

// Shared application state the feature caches parsed responses into. A real app
// keeps state like this around between renders.
const appState = { lastArticle: {} };

// Recursively deep-merge `source` onto `target`. When `parseStage` returns an
// object that still carries a "__proto__" key, this merge writes onto
// Object.prototype — a prototype-pollution vector with no guard in front of it.
function deepMerge(target, source) {
  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]); // key === "__proto__" -> pollutes
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Orchestrator. A real version fetches the body first; the harness hands the
// raw body text in directly so the lab stays network-free.
function runPipeline(body, root) {
  // TODO (orchestration): when the parse stage cannot validate a body it should
  // return null, and this orchestrator should FAIL CLOSED — render a safe empty
  // state instead of any partial or unvalidated content. Right now it passes
  // whatever parseStage returned straight into render with no check, and the
  // deep-merge below trusts every key the parse stage let through.
  const data = parseStage(body);
  // Cache the parsed article into shared state via a deep merge. With no parse
  // guard, a "__proto__" key in `data` pollutes Object.prototype here.
  appState.lastArticle = deepMerge({}, data);
  renderStage(data, root);
}

// Expose the entry point so the attack harness can drive it directly.
window.runPipeline = runPipeline;
