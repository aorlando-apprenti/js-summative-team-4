# Rendering Untrusted HTML Safely

A rich-comment feature that renders untrusted HTML. As shipped it assigns the
raw comment straight to `innerHTML`, so a malicious comment executes on render.
Your job is to make it safe — without breaking the formatting the feature exists
to show.

## What this is

`renderComment(comment, host)` in `app.js` renders a comment whose `html` field
can legitimately contain `<b>`, `<i>`, `<a>`, and `<ul>`. Because the feature
renders **HTML**, `textContent` is not an option here — it would display the
literal tags and break the feature. That makes safe rendering a **sanitization**
problem.

Sanitization is an XSS **output** defense: it cleans untrusted HTML on its way
*out* to the DOM, at the render boundary, immediately before the string is
assigned to a sink. It is not a general-purpose input filter.

## How to run

Open `index.html` in a browser (it loads DOMPurify from a CDN, so be online the
first time). No build, no server. The page renders a payload battery through
`renderComment` and writes a verdict to `#result` (and the console).

With the starter code you will see **FAIL** — payloads execute and survive in
the DOM.

## Your task

Edit `renderComment()` in `app.js` (do not touch `verify.js`) so the verdict
reads **PASS**: every payload renders inert *and* benign formatting (bold,
italics, safe links, lists) is preserved. Build at least one safe path:

1. **DOMPurify (the professional default).** Call `DOMPurify.sanitize(comment.html, …)`
   with a strict `ALLOWED_TAGS` / `ALLOWED_ATTR` config, and assign the result
   with nothing concatenated afterward.
2. **Manual allow-list (optional, to understand the mechanism).** Parse with
   `new DOMParser().parseFromString(html, "text/html")` into a detached, inert
   tree; drop any tag not on a small allow-list; strip any attribute not
   permitted; re-validate `href` schemes; then serialize and assign that string.

Remember: **sanitize last, assign immediately, append nothing.** A concatenation
after the sanitizer runs reintroduces a vector the sanitizer never saw.

## Pass condition

The lab passes when every payload renders inert (no execution, no surviving
`<script>` / `on*` / `javascript:` / `<svg>` vector) **and** the benign comment's
bold, safe link, and list all survive. Over-stripping the formatting is a real
failure, not a safe outcome.
