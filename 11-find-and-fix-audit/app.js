// app.js — the orchestrator for the Team Dashboard (STARTER).
//
// This file wires untrusted SOURCES to the data layer (parse.js) and the view
// layer (render.js). It is the place to start an audit: pick a source here,
// then follow it into the layer functions to the sink it reaches.
//
// Sources in this app:
//   * location.search ?q=        -> renderSearch  (DOM-based)
//   * a fetched member list      -> renderMembers (the bios are stored/persisted)
//   * a fetched settings blob    -> applySettings (object merge)
//
// To keep the lab network-free, the "fetched" data is provided inline below,
// exactly as a server would send it (raw JSON text + a member array).

// Stand-in for a fetched member list. In a real app these bios and websites are
// saved by other users — i.e. persisted, attacker-controllable data.
const MEMBER_LIST = [
  { name: "Ada Lovelace", bio: "Mathematician. Loves <em>algorithms</em>.", website: "https://example.com/ada" },
  { name: "Alan Turing", bio: "Codebreaker.", website: "https://example.com/alan" },
];

// Stand-in for a fetched settings blob (raw JSON text).
const SETTINGS_TEXT = '{"theme":"dark","pageSize":25}';

function init() {
  // SOURCE: the q query parameter -> the search renderer.
  const q = new URLSearchParams(location.search).get("q") || "";
  renderSearch(q, document.getElementById("search-results"));

  // The member list -> the member renderer.
  renderMembers(MEMBER_LIST, document.getElementById("members"));

  // The settings blob -> the merge.
  applySettings(SETTINGS_TEXT);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
