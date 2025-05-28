// keep-alive.js
export function initKeepAlive(serverUrl) {
  if (window.location.hostname.includes('localhost')) return;

  const ping = () => fetch(`${serverUrl}/api/render-ping`, { 
    cache: 'no-store' 
  }).catch(console.error);

  ping(); // Primer ping
  return setInterval(ping, 8 * 60 * 1000); // Ping periódico
}