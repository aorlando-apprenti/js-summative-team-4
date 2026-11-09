// parse.js — the data layer (VULNERABLE STARTER).
//
// This module turns server-style JSON into application values. It contains the
// app's DATA flaws (insecure parsing / object handling). Audit each function by
// tracing where the untrusted text comes from and what is done with the result.
//
// Entry points (driven by app.js and by verify.js):
//   parseConfig(text)         -> reads a fetched config blob
//   applySettings(text)       -> merges a fetched settings blob into defaults
//
// NOTE: there are no // TODO markers in this lab. Finding the flaws is the work.
// Trace each untrusted value to where it lands; the flaw is the unbroken path.

// App defaults that the fetched settings are merged on top of.
const DEFAULT_SETTINGS = { theme: "light", pageSize: 10 };

// Read a fetched config blob and hand back its fields.
function parseConfig(text) {
  // A bare JSON.parse: no try/catch (a malformed body throws straight through
  // the caller), and the result is read with no shape or type checks at all.
  const cfg = JSON.parse(text);
  return {
    title: cfg.title,        // assumed to be a string; never verified
    maxItems: cfg.maxItems,  // assumed to be a number; never verified
  };
}

// Recursively deep-merge `source` onto `target` (so nested settings objects are
// combined rather than replaced). This is a classic prototype-pollution vector:
// when a key is "__proto__", `target[key]` reaches Object.prototype, and the
// nested merge writes onto it.
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

// Merge a fetched settings blob on top of the app defaults.
function applySettings(text) {
  const parsed = JSON.parse(text);
  // A deep merge of an untrusted object into trusted state with no __proto__
  // guard. If `parsed` carries a "__proto__" key, deepMerge writes onto
  // Object.prototype and every object on the page inherits it.
  const settings = deepMerge({ ...DEFAULT_SETTINGS }, parsed);
  return settings;
}

// Expose entry points for app.js and the harness.
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
window.parseConfig = parseConfig;
window.applySettings = applySettings;
