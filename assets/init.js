// Marks JS availability before first paint (strict CSP script-src 'self' compliant)
// and redirects any legacy root hash route (e.g. /#/login, /#/convite/...) to the /app/ SPA mount.
document.documentElement.classList.add('js');
if (typeof window !== 'undefined' && window.location && window.location.hash.startsWith('#/')) {
  window.location.replace('/app/' + (window.location.search || '') + window.location.hash);
}
