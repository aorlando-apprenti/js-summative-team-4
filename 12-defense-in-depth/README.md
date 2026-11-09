# Defense-in-Depth Lab — Comment Widget

A realistic user-generated "comment with profile card" widget. It parses a
comment response and renders an author, a timestamp, comment text, a linked
profile, and an optional rich-text body. As shipped it has only thin, partial
defenses, so a single bug exposes the whole feature. Your job is to harden it
with **five independent layers** and then *prove* the layers are independent.

## How to run

Open `index.html` in a browser. No build, no install. The page loads DOMPurify
from a CDN, then `app.js` (the widget) and `verify.js` (the attack harness). The
harness runs automatically and writes per-payload PASS/FAIL plus a summary to
the `#result` box and the console. With the starter you will see **FAIL** —
every attack lands.

## The idea

Defense in depth means no single bug can compromise the feature, because more
than one *independent* control stands between the attacker and the damage. The
test you apply to every control: **"if this one had a bug, what else stops the
attack?"** Map every field to its layer before writing any code.

## Your task: layer five independent controls

`app.js` has a `// TODO:` marker at each layer. Build them all:

1. **Validation layer** (`validateComment`): wrap `JSON.parse` in `try/catch`
   (fail closed), and confirm every field — `author`, `timestamp`, `text`,
   `website`, `richText` — is a string within `MAX_LEN`. Reject anything else.
2. **Object-handling layer** (`validateComment`): reject `__proto__` /
   `constructor` / `prototype` with `Object.hasOwn` **before** building the
   object, and build it with `Object.create(null)` (drop the unguarded
   `deepMerge`).
3. **Safe-sink layer** (`renderComment`): render `author`, `timestamp`, and
   `text` with `textContent` built from `createElement` — no `innerHTML`.
4. **Sanitization layer** (`renderComment`): route the rich-text body, and only
   that field, through `DOMPurify.sanitize(...)`, assigning the sanitized result.
5. **URL layer** (`renderComment`): set the profile link with `setAttribute`
   after a scheme allow-list check (`safeUrl`), and wire any behavior with
   `addEventListener` — never a raw `href`, never an inline `onclick`.

Do **not** over-apply DOMPurify to the plain fields — that makes them depend on
the sanitizer instead of on a trivially-correct text sink, which weakens
independence. One sanitized field; every other field through a text sink or a
scheme-checked attribute.

## What the harness does

`verify.js` runs two things:

- a **scripted attack set** — a script-in-text payload, a script-in-author
  payload, a `javascript:` profile URL, a script-in-rich-text payload, a
  `__proto__` payload, an over-long field, and a truncated body; and
- an **independence test** — it disables DOMPurify, replays a script-in-*text*
  payload, and confirms the safe sink for that plain field still neutralizes it
  (then restores the sanitizer).

## Pass condition

The harness reports **PASS** when:

- every payload in the attack set is neutralized (no script executes,
  `({}).isAdmin` is `undefined`, malformed/over-long bodies fail closed with no
  thrown exception); and
- the independence test shows the safe sink holding while the sanitizer is
  disabled (and the sanitizer is restored afterward).
