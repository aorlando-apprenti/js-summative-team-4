// app.js — VULNERABLE starter.
//
// renderCard() builds a user-profile card from a `profile` object. Three of its
// fields are untrusted (they come from other users) and each lands in a
// different dangerous context:
//
//   (1) profile.website       -> the link's href      (URL context)
//   (2) profile.avatar        -> an <img> src          (attribute context)
//   (3) profile.contactAction -> the button's onclick  (event-handler context)
//
// As written, all three are exploitable. Open index.html and read the verdict
// in #result: the attack harness will report FAIL because every payload fires.
//
// YOUR TASK: close all three holes inside renderCard() so the harness reports
// PASS, while the card still renders correctly for a benign profile. Use the
// control that fits each context:
//   - URL context:    parse with the URL API and allow only safe schemes.
//   - Attribute:      build the <img> with createElement + setAttribute("src", ...)
//                     (no string-built markup), and still validate the URL scheme
//                     (contexts compose).
//   - Event handler:  use addEventListener instead of an inline onclick; pass the
//                     untrusted value to a function as data, never as code.

// The legitimate behavior the Contact button should perform with benign data.
function showContact(value) {
  console.log("Contact action requested:", value);
}

function renderCard(profile) {
  const root = document.querySelector("#card");
  root.textContent = ""; // clear any previous render

  // (1) URL context.
  const link = document.createElement("a");
  link.textContent = profile.displayName; // text context — already safe
  // TODO: Validate profile.website before it reaches a URL sink, then apply the
  //       same defenses to the avatar (2) and contact button (3) below.
  link.href = profile.website; // VULNERABLE: javascript: scheme executes on click

  // (2) Attribute context.
  const avatarWrap = document.createElement("div");
  avatarWrap.innerHTML = '<img src="' + profile.avatar + '">'; // VULNERABLE: breakout

  // (3) Event-handler context.
  const btn = document.createElement("button");
  btn.textContent = "Contact";
  btn.setAttribute("onclick", profile.contactAction); // VULNERABLE: value compiled as code

  root.append(link, avatarWrap, btn);
}

window.renderCard = renderCard;
