// Sets the theme class before the first paint. This prevents a flash of the wrong theme.
(function () {
  try {
    var stored = localStorage.getItem('devtools-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    // Storage is not available. The default light theme stays.
  }
})();
