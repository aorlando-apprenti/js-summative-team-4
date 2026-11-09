# Insecure Object Handling Patterns

A hands-on lab on what happens *after* an untrusted object enters your app. Three
ordinary-looking operations each hand an attacker a lever:

- **Mass assignment** — `Object.assign(user, parsed)` lets the payload decide
  which fields it sets, including `isAdmin`.
- **Unsafe dynamic read** — `settings[parsed.preferredKey]` with an untrusted key
  can reach the prototype chain (`settings["constructor"]` is the `Object`
  constructor, not a value you stored).
- **Loose-equality gate** — `parsed.tier == 1` accepts coerced values like the
  string `"1"` that a strict check would reject.

The starter `app.js` commits all three at once.

## What is in here

- `index.html` — the demo page. Open it in a browser to run the lab.
- `app.js` — the handler under test. In this starter it bulk-copies, reads with
  an untrusted key, and gates with loose equality.
- `verify.js` — the attack harness. It applies a hostile profile and checks
  whether the privileged `isAdmin` field got assigned (plus the other two
  patterns). Identical to the instructor copy — only `app.js` differs.
- `README.md` — this file.

## How to run it

Open `index.html` in a browser. The result area on the page (and the console)
shows PASS or FAIL. With the starter as shipped, you will see **FAIL**: the
attack succeeds because `isAdmin:true` was applied, the dynamic read returned the
`Object` constructor, and the string `"1"` satisfied the numeric gate. That is
the lab's starting state.

## Your task

Find the `// TODO` in `app.js` and harden all three points:

1. **Allow-list copy.** Replace `Object.assign(user, parsed)` with a loop over a
   fixed list of permitted keys (`["displayName", "theme", "tier"]`), copying each
   only when `Object.hasOwn(parsed, key)` is true. Never read keys off `parsed`
   directly, so `isAdmin` and `internalId` are never applied.
2. **Guarded dynamic read.** Read `preferredKey` through a `Map` (or guard with
   `Object.hasOwn`) so an untrusted `"constructor"` key yields `undefined` instead
   of a prototype-chain value.
3. **Strict gate.** Replace `parsed.tier == 1` with
   `typeof parsed.tier === "number" && parsed.tier === 1`, so only the number `1`
   passes.

Prefer allow-lists over denylists: a new sensitive field added next sprint is
excluded by default. Remember that client-side allow-listing protects in-memory
integrity and the UI; the server must still enforce the same fields independently.

When you reload the page, the harness should report **PASS** — the hostile
profile is fully refused, and a benign profile still applies its allowed fields.
