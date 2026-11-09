# Attack set — proof-of-concept payloads

These are the exact payloads the harness (`verify.js`) replays. Use them while
auditing, and re-run *these same* payloads to confirm each fix. A softer test
proves nothing — confirmation means the original attack no longer works.

| # | Source | Payload | Lands in | Class |
|---|---|---|---|---|
| 1 | `?q=` search term | `<img src=x onerror=alert(1)>` | search banner | DOM-based XSS |
| 2 | stored member `bio` | `<img src=x onerror=alert(2)>` | member card | stored XSS |
| 3 | member `website` | `javascript:alert(3)` | profile link `href` | URL / `javascript:` |
| 4 | member `name` | `x') ; alert(4) ; ('` | "say hi" button `onclick` | inline event handler |
| 5 | fetched config | `{"title":"oops` (truncated) | `JSON.parse` | unsafe parse / crash |
| 6 | fetched settings | `{"theme":"dark","__proto__":{"isAdmin":true}}` | settings merge | prototype pollution |

## How to confirm each fix

- **XSS (1, 2):** after the fix the payload string appears as **literal text**
  (or is stripped). Read back `el.querySelector("img")` — it must be `null`, and
  no `alert` may fire.
- **URL (3):** the `href` must not start with `javascript:`. The link is either
  written with a safe scheme or omitted.
- **Inline handler (4):** the button must have **no** `onclick` attribute built
  from the name; behavior is wired with `addEventListener`.
- **Parse (5):** the malformed config must **fail closed** — no thrown
  exception escapes; the function returns a rejection instead of crashing.
- **Pollution (6):** after processing the payload, `({}).isAdmin` must read back
  `undefined`.

## Audit hint

A flaw is a *path*, not a keyword. Do not grep for `innerHTML` — trace each
untrusted source (a URL param, a stored field, a fetched body) forward to the
sink it reaches. Some `innerHTML`/`textContent` lines are already safe; one of
the member fields is rendered safely on purpose. Note that in your findings.
