# Reflected XSS Lab — Search Banner

A small search page reads the `q` query parameter from the URL and echoes it
back into a results banner. Right now it builds that banner by handing your
input to the browser as **markup**, so a crafted `q` value becomes a running
program instead of a search term.

## How to run

Open `index.html` in a browser (double-click it, or serve the folder with any
static file server). The page loads `app.js` (the feature) and `verify.js` (an
attack harness). The harness runs automatically and prints its verdict into the
`#result` box and the browser console.

## Reproduce the attack

1. Load the page with the attack URL:
   `index.html?q=<img src=x onerror=alert(1)>`
   (or click the attack link on the page).
2. The `<img>` fails to load `src=x`, fires its `onerror` handler, and runs
   `alert(1)`. The payload executed — that is reflected XSS.

The source is `location.search` (the `q` parameter); the sink is `innerHTML`.

## Your task

Open `app.js` and find the line marked with `// TODO:` inside `renderBanner`.
That is the defense point. The untrusted value is being assigned to
`innerHTML`, which parses it as HTML. Change the render so the value is written
as **inert literal text** instead — assign it with `textContent`:

```js
resultsEl.textContent = "Results for: " + query;
```

The fix lives at the **sink**, not at the input. Do not try to strip `<` and
`>` or filter the word `script` from the input — encoded and event-handler
payloads defeat blocklists. Switching the sink is the reliable fix.

## Pass condition

Reload the page. The harness in `#result` should report **PASS**: the payload
`<img src=x onerror=alert(1)>` now renders as the visible literal text
`Results for: <img src=x onerror=alert(1)>`, no `<img>` element reaches the DOM,
and no handler executes.
