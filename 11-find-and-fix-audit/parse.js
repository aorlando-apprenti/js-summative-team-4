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
  try {
    const cfg = JSON.parse(text);

    if (typeof cfg !== "object" || 
      cfg === null || 
      Array.isArray(cfg) ||
      typeof cfg.title !== "string" ||
      typeof cfg.maxItems !== "number" ||
      cfg.maxItems <= 0
    ) {
      throw new Error("Invalid config format");
    }

    return {
    title: cfg.title,        // assumed to be a string; never verified
    maxItems: cfg.maxItems,  // assumed to be a number; never verified
  };
  } catch (error) {
    return { title: "", maxItems: 0 }; // Return safe defaults on error
  }
}

// Recursively deep-merge `source` onto `target` (so nested settings objects are
// combined rather than replaced). This is a classic prototype-pollution vector:
// when a key is "__proto__", `target[key]` reaches Object.prototype, and the
// nested merge writes onto it.
function deepMerge(target, source) {

  const badKeys = ["__proto__", "constructor", "prototype"];

  for (const key of Object.keys(source)) {
    if (badKeys.includes(key)) {
      continue;
    }

    const value = source[key];

    if (typeof value === "object" && 
      value !== null && !Array.isArray(value)) {

      if (!Object.hasOwn(target, key) ||
        typeof target[key] !== "object" ||
        target[key] === null ||
        Array.isArray(target[key])
      ) { 
        target[key] = {}; 
      }

      deepMerge(target[key], value);

    } else {
      target[key] = value;
    }
    return target;
  }

  return target;
}

// Merge a fetched settings blob on top of the app defaults.
function applySettings(text) {
  // A deep merge of an untrusted object into trusted state with no __proto__
  // guard. If `parsed` carries a "__proto__" key, deepMerge writes onto
  // Object.prototype and every object on the page inherits it.
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }

    return deepMerge({ ...DEFAULT_SETTINGS }, parsed);

  } catch (e) {
    console.error("Failed to apply settings");
  }
}

// Expose entry points for app.js and the harness.
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
window.parseConfig = parseConfig;
window.applySettings = applySettings;
