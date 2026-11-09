# Find-and-Fix Audit Lab — Team Dashboard

A small single-page "team dashboard" app, seeded with several real flaws across
both XSS and unsafe parsing. Your job is to run a complete audit cycle on
someone else's code: **find, prioritize, fix, confirm.**

## The app

| File | Role |
|---|---|
| `index.html` | the page; loads DOMPurify, then the three source files and the harness |
| `app.js` | the orchestrator — wires untrusted sources to the layers |
| `parse.js` | the data layer — parses fetched config and merges settings |
| `render.js` | the view layer — renders the search banner and member list |
| `verify.js` | the attack harness (replays the payloads; do not edit) |
| `attacks.md` | the proof-of-concept payloads |

The feature reads a `?q=` search term, renders a list of team members (each with
a bio, a profile link, and a "say hi" button), and applies a fetched settings
blob.

## How to run

Open `index.html` in a browser. No build, no install. The harness runs
automatically and writes per-finding PASS/FAIL plus a summary to the `#result`
box and the console. With the starter you will see **FAIL** — several payloads
land.

## Your task: the audit cycle

**There are no `// TODO` markers. Finding the flaws is the work.** A flaw is a
*path* — an untrusted source reaching a dangerous sink with no control between —
not a scary-looking keyword. Trace each source to its sink.

1. **Audit.** Produce a findings list. For each, name the untrusted source, the
   dangerous sink, the source-to-sink trace, and the payload from `attacks.md`.
   There are roughly six exploitable findings spanning both competencies. (One
   member field is rendered safely on purpose — note that as a non-finding.)
2. **Prioritize.** Rank by exploitability × impact. A URL parameter written
   straight to a markup sink, or a `__proto__` merge that corrupts every object
   on the page, outranks a flaw that only affects the current view.
3. **Remediate.** Apply the correct safe pattern at the control point on each
   path:
   - render flaws &rarr; `textContent` / safe DOM APIs, DOMPurify for a field
     that truly carries HTML, scheme allow-listing for `href`, `addEventListener`
     instead of inline `on*`;
   - data flaws &rarr; `try/catch` around `JSON.parse`, shape and type
     validation, and a `__proto__` / `constructor` / `prototype` guard placed
     **before** any merge.
4. **Confirm.** Re-run each *original* payload from `attacks.md` and show it no
   longer executes or pollutes — including reading back `({}).isAdmin`.

## What to look at

- `parse.js` — `parseConfig` (bare `JSON.parse`, no shape check) and
  `applySettings` (a deep merge with no `__proto__` guard).
- `render.js` — `renderSearch` (markup sink), the bio (markup sink fed by stored
  data), the profile `href` (no scheme check), and the "say hi" button (an
  inline `onclick` built from the name).

## Pass condition

The harness reports **PASS** when every payload in `attacks.md` is neutralized:
no script node reaches the DOM, no `javascript:` href or name-built inline
`onclick` is written, the config parse fails closed with no thrown exception,
and `({}).isAdmin` reads back `undefined`. The findings-to-confirmation chain is
the deliverable, not merely a page that renders.
