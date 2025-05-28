// keep-alive.js
export function initKeepAlive(serverUrl) {
  if (window.location.hostname.includes('localhost') || 
      window.location.hostname === '127.0.0.1') {
    console.log('Modo desarrollo: keep-alive desactivado');
    return;
  }

  const ping = async () => {
    try {
      console.log(`Enviando ping a ${serverUrl}`);
      const response = await fetch(`${serverUrl}/api/render-ping`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Ping exitoso:', data);
    } catch (error) {
      console.error('Error en ping:', error);
    }
  };

  // Primer ping inmediato
  ping();
  
  // Ping periódico cada 5 minutos (300,000 ms)
  return setInterval(ping, 5 * 60 * 1000);
}