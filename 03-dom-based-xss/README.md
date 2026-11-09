# DOM-Based XSS Lab — Hash-Routed Tabs

A single-page tabbed view reads `location.hash` (the part of the URL after `#`)
to decide which tab is active, then writes a panel heading and a "tab id" detail
line from it. Both the source and the sinks are in client-side JavaScript — the
fragment is **never sent to the server**, so a web application firewall,
server-side encoder, or request log can never see this attack. The only control
point is the client-side sink.

## How to run

Open `index.html` in a browser (or serve the folder). It loads `app.js` (the
feature) and `verify.js` (the attack harness), which runs automatically and
writes its verdict into `#result` and the console.

## Reproduce the attack

1. (Optional, to see the server is blind) Open the browser network tab, load a
   URL with a `#` fragment, and note that the request line carries no fragment.
2. Load the page with the attack fragment:
   `index.html#<img src=x onerror=alert(1)>`
3. The hash reaches `innerHTML` (and `insertAdjacentHTML`) and the payload
   executes.

The source is `location.hash` (read in `getActiveTab`); the sinks are
`innerHTML` and `insertAdjacentHTML` in `render()`.

## Your task

Open `app.js`. There are two `// TODO:` markers in `render()` — one per sink.
Trace the hash value from `getActiveTab()` to **every** sink and fix both:

1. **Sink 1 (`innerHTML`):** render the heading as text —
   `panel.replaceChildren(); panel.textContent = "Viewing: " + tabName;`
2. **Sink 2 (`insertAdjacentHTML`):** build the detail node safely instead of
   inserting an HTML string:
   ```js
   const detail = document.createElement("small");
   detail.textContent = "tab id: " + tabName;
   panel.append(detail);
   ```

Fixing only one sink leaves the vulnerability fully open — the trace is what
catches both. The dangerous moment is the **assignment to the sink**, not the
read of the hash.

## Pass condition

Reload with the attack fragment. The harness should report **PASS**: the payload
renders as inert literal text (for example `Viewing: <img src=x onerror=alert(1)>`),
no `<img>` element reaches the panel, and no handler executes — with both sinks
fixed.
