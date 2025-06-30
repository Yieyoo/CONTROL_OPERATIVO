const PING_INTERVAL = 4.5 * 60 * 1000; // 4.5 minutos
const MAX_RETRIES = 3;
const RETRY_DELAY = 30000; // 30 segundos
const DEGRADED_INTERVAL = 60000; // 1 minuto

let pingInterval;
let sessionId = generateSessionId();
let isDegradedMode = false;

// Generador de ID de sesión mejorado
function generateSessionId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

// Sistema de notificación al usuario
function showConnectionWarning(show) {
    let warning = document.getElementById('connection-warning');
    
    if (show && !warning) {
        warning = document.createElement('div');
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
                    font-family: Arial, sans-serif;
                }
                @keyframes pulse {
                    0% { opacity: 0.8; }
                    50% { opacity: 1; }
                    100% { opacity: 0.8; }
                }
            </style>
            ⚠️ Conexión inestable - Trabajando offline
        `;
        document.body.appendChild(warning);
    } else if (!show && warning) {
        warning.remove();
    }
}

// Ping inteligente con reintentos
async function sendPing(serverUrl, attempt = 1) {
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
                lastPing: localStorage.getItem('lastPingSuccess'),
                userAgent: navigator.userAgent
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const pingTime = (performance.now() - startTime).toFixed(2);
        localStorage.setItem('lastPingSuccess', new Date().toISOString());
        console.log(`[KeepAlive] Ping exitoso (${pingTime}ms)`);
        
        // Restaurar intervalo normal si estábamos en modo degradado
        if (isDegradedMode) {
            isDegradedMode = false;
            showConnectionWarning(false);
            resetPingInterval(serverUrl, PING_INTERVAL);
        }
        
        return true;
    } catch (error) {
        console.error(`[KeepAlive] Intento ${attempt} fallido:`, error);
        
        // Reintento con backoff
        if (attempt < MAX_RETRIES) {
            setTimeout(() => sendPing(serverUrl, attempt + 1), RETRY_DELAY);
        } else {
            // Entrar en modo degradado
            if (!isDegradedMode) {
                isDegradedMode = true;
                showConnectionWarning(true);
                resetPingInterval(serverUrl, DEGRADED_INTERVAL);
            }
        }
        return false;
    }
}

// Manejo del intervalo mejorado
function resetPingInterval(serverUrl, interval) {
    clearInterval(pingInterval);
    pingInterval = setInterval(() => sendPing(serverUrl), interval);
}

export function initKeepAlive(serverUrl, options = {}) {
    // 1. Verificación simple del entorno (sin process.env)
    if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
        console.log('[KeepAlive] Entorno local - Desactivado');
        return;
    }

    // 2. Iniciar el sistema
    const startPingSystem = () => {
        if (options.immediatePing) {
            sendPing(serverUrl).then(success => {
                if (!success) {
                    resetPingInterval(serverUrl, RETRY_DELAY);
                }
            });
        }
        resetPingInterval(serverUrl, PING_INTERVAL);
    };

    // 3. Manejo de pestañas/ventanas
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            sendPing(serverUrl);
        }
    };
    
    // 4. Event listeners optimizados
    const throttledSendPing = throttle(() => sendPing(serverUrl), 5000);
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', throttledSendPing);
    document.addEventListener('mousemove', throttledSendPing, { passive: true });
    document.addEventListener('scroll', throttledSendPing, { passive: true });
    
    window.addEventListener('beforeunload', () => {
        clearInterval(pingInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', throttledSendPing);
        document.removeEventListener('mousemove', throttledSendPing);
        document.removeEventListener('scroll', throttledSendPing);
    });

    // 5. Iniciar después de que la página esté completamente cargada
    if (document.readyState === 'complete') {
        startPingSystem();
    } else {
        window.addEventListener('load', startPingSystem);
    }
}

// Helper para throttling
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}