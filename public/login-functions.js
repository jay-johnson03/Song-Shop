// Temporary shim to load the renamed script (login-logic.js)
// Keeps backward compatibility if any cached pages still reference login-functions.js
(function() {
  const script = document.createElement('script');
  script.src = '/login-logic.js';
  script.onload = () => console.info('Loaded login-logic.js via login-functions.js shim');
  script.onerror = () => console.error('Failed to load login-logic.js');
  document.head.appendChild(script);
})();
