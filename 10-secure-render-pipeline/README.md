# Secure Render Pipeline: fetch &rarr; parse &rarr; render

A feature that pulls an "article" response, turns the bytes into a value, and
puts that value on the screen. Almost every interactive page does these same
three things in the same order: **fetch, parse, render.** This starter collapses
all three into one careless chain with no checkpoint between them, so it is open
to two problems at once: insecure object handling (no validation of the parsed
data) and XSS (every field reaches the DOM through `innerHTML`).

## How to run

Open `index.html` in a browser (double-click it, or serve the folder with any
static file server). No build, no install. The page loads DOMPurify from a CDN,
then `app.js` (the feature) and `verify.js` (the attack harness). The harness
runs automatically and writes its verdict into the `#result` box and the
console.

## What the harness sends

`verify.js` drives `runPipeline(body, root)` with one good body and a small
attack set, where each fixture targets exactly one control point:

| Fixture | Targets | Must happen |
|---|---|---|
| `good` | the happy path | renders the expected content |
| `truncated` | the parse `try/catch` | fails closed, **no thrown exception** |
| `wrong-type` (numeric `title`) | the shape check | rejected, not rendered |
| `proto` (`__proto__` key) | the pollution guard | `({}).isAdmin` stays `undefined` |
| `script` (script in every field) | the safe sinks | every field renders inert |

With the starter you will see **FAIL**: the truncated body throws, the
wrong-type field renders, the `__proto__` payload pollutes `Object.prototype`,
and the script strings execute.

## Your task

Rebuild the one-line chain as a pipeline with a guard at every joint. There are
three `// TODO:` markers in `app.js`, one per boundary:

1. **`parseStage(text)` — the parse boundary.** Write a defensive parse, in
   this order: wrap `JSON.parse` in `try/catch` and return `null` on a
   `SyntaxError`; validate that `title`, `body`, `link`, and `richText` all
   exist and are strings; **last**, reject the `__proto__` / `constructor` /
   `prototype` keys with `Object.hasOwn` before any copy; then build the result
   with `Object.create(null)` and copy only the validated keys.
2. **`renderStage(data, root)` — the render boundary.** Route every untrusted
   value through a safe sink: `title` and `body` via `textContent`; `link` via
   `setAttribute("href", ...)` only after a scheme allow-list check
   (`http:`/`https:`/`mailto:`); and `richText` — the one field that genuinely
   carries HTML — through `DOMPurify.sanitize(...)`, assigning only the
   sanitized result.
3. **`runPipeline(body, root)` — the orchestrator.** When `parseStage` returns
   `null`, **fail closed**: render a safe empty state instead of any partial
   content.

Remember the division of labor: **parse owns shape and pollution, render owns
sinks.** A value validated at parse is still not safe to render — keep both
controls.

## Pass condition

Reload the page. The harness should report **PASS**:

- `good` renders the expected content;
- `truncated` and `wrong-type` each fail closed with **no thrown exception**;
- after the `__proto__` payload, `({}).isAdmin` reads back `undefined`; and
- every script-bearing field renders as inert text — no `alert` fires, no live
  `<img>` reaches the DOM, and no `javascript:` href is written.
