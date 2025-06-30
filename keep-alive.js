const PING_INTERVAL = 4.5 * 60 * 1000; // 4.5 minutos (más frecuente)
let pingInterval;
let sessionId = typeof window !== 'undefined' ? Math.random().toString(36).substring(2, 15) : 'server-session';

export function initKeepAlive(serverUrl, options = {}) {
    // 1. Optimización para desarrollo (versión compatible con navegador)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('[KeepAlive] Modo desarrollo - Desactivado');
        return;
    }

    // Verificar si estamos en un entorno con window (navegador)
    if (typeof window === 'undefined') {
        console.warn('[KeepAlive] No se ejecutará en entorno sin ventana (window)');
        return;
    }

    // 2. Ping inteligente con reintentos
    const sendPing = async (attempt = 1) => {
        try {
            const startTime = performance.now();
            const response = await fetch(`${serverUrl}/api/health-check`, {
                method: 'POST',
                cache: 'no-store',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Session-ID': sessionId,
                    'X-Ping-Attempt': attempt
                },
                body: JSON.stringify({
                    origin: window.location.href,
                    lastPing: localStorage.getItem('lastPingSuccess')
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const pingTime = (performance.now() - startTime).toFixed(2);
            localStorage.setItem('lastPingSuccess', new Date().toISOString());
            console.log(`[KeepAlive] Ping exitoso (${pingTime}ms)`);
            
            // Ajuste dinámico del intervalo
            if (attempt > 1) {
                clearInterval(pingInterval);
                pingInterval = setInterval(sendPing, PING_INTERVAL);
            }
            
            return true;
        } catch (error) {
            console.error(`[KeepAlive] Intento ${attempt} fallido:`, error);
            
            // Reintento agresivo
            if (attempt < 3) {
                setTimeout(() => sendPing(attempt + 1), 30000); // 30 segundos
            } else {
                // Notificar al usuario solo después de múltiples fallos
                if (attempt === 3) {
                    showDegradedWarning();
                }
                // Reducir intervalo temporalmente
                clearInterval(pingInterval);
                pingInterval = setInterval(sendPing, 60000); // 1 minuto
            }
            return false;
        }
    };

    // 3. Sistema de notificación al usuario
    const showDegradedWarning = () => {
        if (!document || document.getElementById('connection-warning')) return;
        
        const warning = document.createElement('div');
        warning.id = 'connection-warning';
        warning.innerHTML = `
            <style>
                #connection-warning {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #ff9800;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    z-index: 9999;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 0.8; }
                    50% { opacity: 1; }
                    100% { opacity: 0.8; }
                }
            </style>
            ⚠️ Conexión inestable - Intentando reconectar...
        `;
        document.body.appendChild(warning);
    };

    // 4. Iniciar el sistema
    if (options.immediatePing) {
        sendPing().then(success => {
            if (!success) {
                pingInterval = setInterval(sendPing, 30000); // 30 segundos si falla
            }
        });
    }

    pingInterval = setInterval(sendPing, PING_INTERVAL);
    
    // 5. Mejor manejo de pestañas/ventanas
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            sendPing();
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', () => {
        clearInterval(pingInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

    // 6. Pings estratégicos durante actividad
    document.addEventListener('mousemove', sendPing, { once: true });
    document.addEventListener('scroll', sendPing, { once: true });
    window.addEventListener('focus', sendPing);
}