// DOM-based XSS lab — vulnerable starter.
//
// A single-page tabbed view reads location.hash to pick the active tab and
// renders a panel heading plus a "tab id" detail line. Both the source and the
// sinks live entirely in client-side JavaScript — the fragment after # is never
// sent to the server, so server-side defenses cannot help. The only control
// point is the client-side sink.
//
// SOURCE: location.hash (read in getActiveTab).
// SINKS:  innerHTML (sink 1) and insertAdjacentHTML (sink 2) in render().

function getActiveTab() {
  // The fragment after # — untrusted, read entirely on the client.
  return decodeURIComponent(location.hash.slice(1)) || "home";
}

function render() {
  const tabName = getActiveTab();
  const panel = document.getElementById("panel");

  // TODO: Defense point — sink 1. The untrusted hash value is assigned to
  // innerHTML, which parses it as HTML and runs any handlers it carries.
  // Replace this so the value is rendered as inert text.
  //
  //   Hint: panel.replaceChildren(); panel.textContent = "Viewing: " + tabName;
  panel.innerHTML = "Viewing: " + tabName;                 // sink 1

  // TODO: Defense point — sink 2. A second sink builds a detail string from the
  // same untrusted value and inserts it as HTML. Fixing only sink 1 leaves this
  // open — the trace from source to EVERY sink is what catches both. Refactor
  // this to build a node safely (createElement + textContent) and insert the
  // node, or use insertAdjacentText.
  //
  //   Hint:
  //   const detail = document.createElement("small");
  //   detail.textContent = "tab id: " + tabName;
  //   panel.append(detail);
  const detailString = "<small>tab id: " + tabName + "</small>";
  panel.insertAdjacentHTML("beforeend", detailString);     // sink 2
}

window.addEventListener("hashchange", render);

// Initial render on load.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", render);
} else {
  render();
}

// Expose the render entry point so the attack harness can drive it.
window.render = render;
window.getActiveTab = getActiveTab;
