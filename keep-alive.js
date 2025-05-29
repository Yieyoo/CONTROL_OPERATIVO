// Versión SIN coordinación entre pestañas - Para el index principal
export function initKeepAlive(serverUrl) {
    // Desactivar solo en desarrollo (localhost)
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        console.log('KeepAlive: Modo desarrollo - Desactivado');
        return;
    }

    // Ping único al cargar (sin intervalos)
    fetch(`${serverUrl}/api/render-ping`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        return response.json();
    })
    .then(data => console.log('KeepAlive: Ping inicial exitoso', data))
    .catch(error => console.error('KeepAlive: Error en ping inicial', error));
}