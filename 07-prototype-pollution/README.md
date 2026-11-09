# Prototype Pollution via Insecure Object Handling

A tiny client-side lab. An app applies server-sent settings over local defaults
using a recursive deep-merge. `JSON.parse` is safe on its own — it stores
`"__proto__"` as an ordinary own key and pollutes nothing. The vulnerability is
in the merge: a naive routine copies that key onto a plain object, which writes
through to `Object.prototype` and poisons every object on the page.

## How to run

Open `index.html` in a browser (no build step, no server needed). The page loads
`app.js`, `defaults.js`, and the harness `verify.js`, runs a benign update and
two attack payloads through the merge, and writes a PASS/FAIL verdict into the
`#result` box. Open the console for the per-payload log.

The harness scrubs the probe keys off `Object.prototype` after every test, so the
page stays usable whether the attack succeeds or not.

## The files

- `index.html` — minimal page; loads `app.js` and `verify.js`; shows the verdict.
- `app.js` — the settings merge under test. **This is what you change.**
- `defaults.js` — the application defaults the update is merged over. Support
  file; you do not need to edit it.
- `verify.js` — the attack harness. Do not edit it; it is identical to the
  instructor copy and is what grades your work.
- `README.md` — this file.

## Your task

Right now `verify.js` reports **ATTACK REPRODUCED**: the naive `deepMerge` in
`app.js` has no key guard and builds onto a plain `{}`, so both the flat
`__proto__` payload and the nested one write `isAdmin` onto `Object.prototype`.
After that, an `if (currentUser.isAdmin)` check passes for everyone — even with
`currentUser = {}` — because the object inherits the injected property.

Find the single `// TODO:` in `app.js` and rewrite the merge so it:

1. Builds the result on `Object.create(null)` (a base with no prototype to
   pollute).
2. Skips any key equal to `"__proto__"`, `"constructor"`, or `"prototype"` at
   **every** recursion level — not just the top. The nested payload exists
   specifically to defeat a top-level-only guard.
3. Reads only own keys with `Object.hasOwn`.
4. Optionally strips the dangerous keys at parse time with a `JSON.parse`
   `reviver` in `parseSettings`.

You are done when `verify.js` flips to **BLOCKED**: neither attack payload
pollutes `Object.prototype` (flat or nested) and the benign update still applies.

Note that `Object.create(null)` and the per-level key guard are *independent*
defenses — neither replaces the other, and both belong in your solution.
