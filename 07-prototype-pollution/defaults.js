// defaults.js — the application's default settings.
//
// A benign settings update is merged over these. The attack payloads target the
// prototype, not these values, which is exactly what makes pollution so hard to
// spot: the object you produced looks correct while an unrelated object is the
// one that changed.
export const DEFAULT_SETTINGS = {
  theme: "light",
  notifications: true,
  profile: {
    displayName: "Guest",
    language: "en",
  },
};
