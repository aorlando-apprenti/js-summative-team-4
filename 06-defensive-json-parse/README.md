# Defensive JSON.parse on Untrusted Input

A tiny client-side lab. A profile page parses a response body and renders the
user record. A resolved fetch only proves bytes arrived — it proves nothing
about the shape, types, or ranges of those bytes. This starter trusts the parsed
shape blindly, so a malformed, truncated, or wrong-typed body either crashes the
render path or pushes corrupt data downstream.

## How to run

Open `index.html` in a browser (no build step, no server needed). The page
loads `app.js` and the harness `verify.js`, runs four response bodies through the
handler, and writes a PASS/FAIL verdict into the `#result` box. Open the console
for the per-fixture log.

## The files

- `index.html` — minimal page; loads `app.js` and `verify.js`; shows the verdict.
- `app.js` — the handler under test. **This is what you change.**
- `verify.js` — the attack harness. Do not edit it; it is identical to the
  instructor copy and is what grades your work.
- `README.md` — this file.

## Your task

Right now `verify.js` reports **VULNERABILITY REPRODUCED**: the naive handler in
`app.js` reaches straight into `data.user.name` and `data.user.roles` with no
checks, so the bad bodies throw or yield a corrupt profile.

Find the single `// TODO:` in `app.js` and rebuild `loadProfile` to apply the
inbound control points in order, each failing closed:

1. **Safe parse.** Read the body as text and wrap `JSON.parse` so a malformed or
   truncated body returns `{ ok: false, reason }` instead of throwing. Guard
   empty / non-string input before parsing.
2. **Shape validation.** Confirm the value is a non-null object, that `user`
   exists and is an object, and that `id` is a number, `name` is a string, and
   `roles` is an array of strings — using `Object.hasOwn`, `typeof`, and
   `Array.isArray`. Read no field before its check passes.
3. **Bounds checks.** Enforce `name.length <= 100` and confirm every role is in
   the allowed set.

Return `{ ok: true, profile }` for the valid body and `{ ok: false, reason }`
(with a distinct reason) for each bad one — and never throw for any body.

You are done when `verify.js` flips to **BLOCKED**: the valid body is accepted
and `truncated`, `wrong-shape`, and `wrong-types` are each rejected cleanly, with
no unhandled exception in the console.

Remember: a successful parse proves only that the text was valid JSON. It proves
nothing about whether the shape is usable. `wrong-types` parses fine and must
still be rejected.
