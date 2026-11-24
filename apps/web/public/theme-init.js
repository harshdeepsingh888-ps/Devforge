// Sets the theme before the first paint so a dark-mode user never sees a white
// flash. It is a separate file, not an inline <script>, because the API's
// Content-Security-Policy (script-src 'self') refuses inline scripts. It must
// stay a plain synchronous script in <head>: a module or a deferred script
// would run after the first paint and bring the flash back.
(function () {
  try {
    var mode = localStorage.getItem("devforge_theme_mode") || "AUTO";
    var resolved = "light";
    if (mode === "LIGHT") {
      resolved = "light";
    } else if (mode === "DARK") {
      resolved = "dark";
    } else {
      var h = new Date().getHours();
      resolved = h >= 7 && h < 19 ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", resolved);
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {}
})();
