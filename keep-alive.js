const PING_INTERVAL = 5 * 60 * 1000; // 5 minutos
const COORDINATION_KEY = 'keepAliveMaster';
let pingInterval;
let channel;

export function initKeepAlive(serverUrl) {
    // 1. Desactivar en desarrollo
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        console.log('[KeepAlive] Modo desarrollo - Desactivado');
        return;
    }

    // 2. Coordinación entre pestañas
    channel = new BroadcastChannel('keepalive_channel');
    
    channel.onmessage = (e) => {
        if (e.data === 'ping') {
            // Otra pestaña está activa, no hagas nada
            clearInterval(pingInterval);
            pingInterval = null;
        }
    };

    // 3. Elección de pestaña maestra
    const becomeMaster = () => {
        localStorage.setItem(COORDINATION_KEY, Date.now());
        channel.postMessage('ping');
        
        const ping = async () => {
            try {
                await fetch(`${serverUrl}/api/render-ping`, {
                    cache: 'no-store',
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log('[KeepAlive] Ping exitoso', new Date().toLocaleTimeString());
            } catch (error) {
                console.error('[KeepAlive] Error:', error.message);
            }
        };

        ping(); // Ping inmediato
        pingInterval = setInterval(ping, PING_INTERVAL);
    };

    // 4. Verificar si ya hay una pestaña maestra
    const lastPing = localStorage.getItem(COORDINATION_KEY);
    if (!lastPing || Date.now() - lastPing > PING_INTERVAL * 1.5) {
        becomeMaster();
    }

    // 5. Limpieza al cerrar
    window.addEventListener('beforeunload', () => {
        if (pingInterval) {
            clearInterval(pingInterval);
            localStorage.removeItem(COORDINATION_KEY);
        }
        channel.close();
    });
}