try {
  var APPEARANCE_KEY = "appearance";
  var LEGACY_THEME_KEY = "theme";

  var stored = localStorage.getItem(APPEARANCE_KEY);
  var appearance = stored;
  if (appearance !== "light" && appearance !== "dark" && appearance !== "system") {
    var legacy = localStorage.getItem(LEGACY_THEME_KEY);
    appearance = legacy === "light" || legacy === "dark" ? legacy : "system";
  }

  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var resolved =
    appearance === "system" ? (prefersDark ? "dark" : "light") : appearance;

  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Restore cached structural tokens (FOUC guard)
  var cachedVars = localStorage.getItem("theme_variables");
  if (cachedVars) {
    var vars = JSON.parse(cachedVars);
    Object.keys(vars).forEach(function (key) {
      document.documentElement.style.setProperty(key, vars[key]);
    });
  }
} catch {
  // ignore
}
