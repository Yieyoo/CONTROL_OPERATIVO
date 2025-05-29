let pingInterval;
let isActive = false;

export function initKeepAlive(serverUrl) {
  if (isActive) return;
  isActive = true;

  // Desactivar en desarrollo
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    console.log('Modo desarrollo: keep-alive desactivado');
    return;
  }

  const ping = async () => {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${serverUrl}/api/render-ping`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      
      console.log('Ping exitoso:', await response.json());
    } catch (error) {
      console.error('Error en ping:', error.name === 'AbortError' ? 'Timeout' : error.message);
    }
  };

  // Primer ping inmediato
  ping();
  
  // Ping cada 5 minutos
  pingInterval = setInterval(ping, 5 * 60 * 1000);

  // Limpieza al cerrar
  window.addEventListener('beforeunload', () => {
    clearInterval(pingInterval);
    isActive = false;
  });
}