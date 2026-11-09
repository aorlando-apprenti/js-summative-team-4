# JSON.stringify Pitfalls and Safe Serialization

A hands-on lab on the outbound edge of the untrusted boundary: when you turn an
object into a string, `JSON.stringify(obj)` emits *every* own enumerable property
it can reach — including a session token, an internal flag, or any sensitive
field that rode along on the object. Over-broad serialization is a leak that
never throws and never shows up in a quick test, because emitting too much always
"works."

## What is in here

- `index.html` — the demo page. Open it in a browser to run the lab.
- `app.js` — the serializer under test. In this starter it stringifies the whole
  session object, so the secret leaks.
- `verify.js` — the attack harness. It serializes a session that carries a secret
  and checks whether the secret leaked into the output. (Identical to the
  instructor copy — only `app.js` differs.)
- `README.md` — this file.

## How to run it

Open `index.html` in a browser. The result area on the page (and the console)
shows PASS or FAIL. With the starter as shipped, you will see **FAIL**: the
attack succeeds because the secret `sessionToken` leaked into the serialized
string. That is the lab's starting state.

## Your task

Find the `// TODO` in `app.js` and fix the serializer so it emits **only** an
explicit allow-list of fields — `userId`, `displayName`, `theme`, and
`lastSeen` — and nothing else.

You can enforce the allow-list any of three ways:

- the **array form** of `JSON.stringify`'s second argument:
  `JSON.stringify(session, ["userId", "displayName", "theme", "lastSeen"])`,
- a **replacer function** that returns `undefined` for anything not allowed, or
- a **`toJSON` method** on a session model that returns only the safe shape.

Prefer the allow-list over a denylist: a sensitive field added next sprint is
excluded by default rather than leaked until someone remembers to deny it.

When you reload the page, the harness should report **PASS** — the secret no
longer appears in the serialized string, and the four allow-listed fields still
serialize correctly.
