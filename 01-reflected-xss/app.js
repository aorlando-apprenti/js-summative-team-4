// Reflected XSS lab — vulnerable starter.
//
// Feature: read the `q` query parameter and echo it into a results banner.
// SOURCE: location.search (the `q` parameter).
// SINK:   how the value reaches the DOM (see renderBanner below).
//
// The harness (verify.js) calls renderBanner(query) with an attack payload and
// checks whether it executed.

function renderBanner(query) {
  const resultsEl = document.getElementById("results");

  // TODO: This is the defense point. The line below sends the untrusted `query`
  // to innerHTML, which parses it as HTML and runs any event handlers it carries
  // (for example <img src=x onerror=alert(1)>). Replace this so the value is
  // rendered as inert literal text instead of parsed as markup.
  //
  //   Hint: assign the value with `textContent` instead of `innerHTML`, e.g.
  //   resultsEl.textContent = "Results for: " + query;
  resultsEl.innerHTML = "Results for: " + query;
}

// Wire up the real feature on page load, using the live URL as the source.
function initFromUrl() {
  const params = new URLSearchParams(location.search);
  const q = params.get("q") || "";
  renderBanner(q);
}

initFromUrl();

// Expose the render entry point so the attack harness can drive it directly.
window.renderBanner = renderBanner;
