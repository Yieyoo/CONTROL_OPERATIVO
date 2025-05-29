const PING_INTERVAL = 5 * 60 * 1000; // 5 minutos
let pingInterval;

export function initKeepAlive(serverUrl, options = {}) {
    // 1. Desactivar en desarrollo
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        console.log('[KeepAlive] Modo desarrollo - Desactivado');
        return;
    }

    // 2. Ping inmediato (solo si se solicita)
    if (options.immediatePing) {
        fetch(`${serverUrl}/api/render-ping`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(() => console.log('[KeepAlive] Ping INMEDIATO exitoso'))
        .catch(console.error);
    }

    // 3. Pings periódicos (en TODAS las páginas)
    const sendPing = () => {
        fetch(`${serverUrl}/api/render-ping`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(() => console.log(`[KeepAlive] Ping periódico (${new Date().toLocaleTimeString()})`))
        .catch(console.error);
    };

    // Iniciar intervalos (sin coordinación entre pestañas)
    pingInterval = setInterval(sendPing, PING_INTERVAL);
    sendPing(); // Primer ping inmediato

    // Limpieza
    window.addEventListener('beforeunload', () => {
        clearInterval(pingInterval);
    });
}