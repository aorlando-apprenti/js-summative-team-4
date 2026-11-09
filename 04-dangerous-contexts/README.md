# Dangerous Contexts: URLs, Attributes, and Event Handlers

A small profile-card feature that renders three untrusted fields into three
different dangerous contexts. As shipped, all three are exploitable — your job
is to close them.

## What this is

`renderCard(profile)` in `app.js` builds a user-profile card. Three fields come
from other users and are untrusted:

| Field | Lands in | Context |
|---|---|---|
| `profile.website` | the link's `href` | URL |
| `profile.avatar` | an `<img>` `src` | attribute |
| `profile.contactAction` | the button's `onclick` | event handler |

`textContent` solves the HTML-text context, but it does nothing for any of
these. The safe API depends on *where the data lands*, not on the data itself.

## How to run

Open `index.html` in a browser. No build, no server, no install. The page
renders the card and an attack harness (`verify.js`) runs three payloads and
writes a verdict to the `#result` area (and the console):

- a `javascript:` URL in `website`
- a `"><img src=x onerror=...>` breakout in `avatar`
- a bare `onclick` body in `contactAction`

With the starter code you will see **FAIL** — every payload fires.

## Your task

Edit `renderCard()` in `app.js` (do not touch `verify.js`) so the harness
reports **PASS** while the card still renders for a benign profile. Apply the
control that fits each context:

1. **URL context.** Parse `profile.website` with `new URL(value, document.baseURI)`
   and allow only safe schemes (`https:`, `http:`, `mailto:`). On rejection,
   do not assign the `href` — fall back to a safe default and log it. Do not
   string-match the prefix; whitespace and case tricks bypass that.
2. **Attribute context.** Build the avatar with `createElement` +
   `setAttribute("src", ...)` so there is no markup for the value to break out
   of — and still validate the scheme first, because the contexts compose.
3. **Event-handler context.** Replace the inline `onclick` with
   `addEventListener("click", ...)`. Pass `profile.contactAction` into a
   function as **data**; never let it become the handler source.

## Pass condition

The lab passes when none of the three payloads execute or break out (no value
runs, exactly one `<img>` in the card), and the card still renders correctly for
benign values. Re-open `index.html` and confirm the verdict reads **PASS**.
